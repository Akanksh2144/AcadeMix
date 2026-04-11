"""
User Service — handles user management business logic.
Encapsulates CRUD operations, bulk import, password reset, and export.
"""

import csv
import io
import secrets
from typing import Dict, Any, Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm.attributes import flag_modified

from app import models
from app.models.core import UserProfile
from app.core.security import hash_password
from app.core.exceptions import (
    ResourceNotFoundError,
    BusinessLogicError,
    DatabaseIntegrityError,
)
from app.core.audit import log_audit


class UserService:
    """Stateless service for user management operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user(self, user_id: str, college_id: str) -> Dict[str, Any]:
        """Fetch a single user within the tenant boundary."""
        result = await self.db.execute(
            select(models.User).outerjoin(UserProfile, models.User.id == UserProfile.user_id).where(
                models.User.id == user_id,
                models.User.college_id == college_id,
            )
        )
        u = result.scalars().first()
        if not u:
            raise ResourceNotFoundError("User", user_id)
        return self._to_dict(u)

    async def list_users(
        self, college_id: str, role: Optional[str] = None, skip: int = 0, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List users within a tenant, optionally filtered by role."""
        stmt = select(models.User).outerjoin(UserProfile, models.User.id == UserProfile.user_id).where(models.User.college_id == college_id)
        if role:
            stmt = stmt.where(models.User.role == role)
        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return [self._to_dict(u) for u in result.scalars().all()]

    async def create_user(self, data: Dict[str, Any], college_id: str) -> Dict[str, Any]:
        """Create a new user within a tenant. Prevents duplicate college IDs."""
        normalized_cid = data["college_id"].upper()

        existing = await self.db.execute(
            select(models.User).outerjoin(UserProfile, models.User.id == UserProfile.user_id).where(
                UserProfile.roll_number == normalized_cid,
                models.User.college_id == college_id
            )
        )
        if existing.scalars().first():
            raise DatabaseIntegrityError("College ID already exists")

        new_user = models.User(
            name=data["name"],
            email=data["email"].lower(),
            password_hash=hash_password(data["password"]),
            role=data.get("role", "student"),
            college_id=college_id,
        )
        self.db.add(new_user)
        await self.db.flush()

        profile = UserProfile(
            user_id=new_user.id,
            college_id=college_id,
            roll_number=normalized_cid,
            department=data.get("department", ""),
            batch=data.get("batch", ""),
            section=data.get("section", ""),
        )
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(new_user)
        return self._to_dict(new_user)

    async def update_user(
        self, user_id: str, data: Dict[str, Any], college_id: str
    ) -> Dict[str, Any]:
        """Update a user's attributes. Profile data is merged, not replaced."""
        result = await self.db.execute(
            select(models.User).outerjoin(UserProfile, models.User.id == UserProfile.user_id).where(
                models.User.id == user_id,
                models.User.college_id == college_id,
            )
        )
        u = result.scalars().first()
        if not u:
            raise ResourceNotFoundError("User", user_id)

        if data.get("name") is not None:
            u.name = data["name"]
        if data.get("email") is not None:
            u.email = data["email"].lower()
        if data.get("role") is not None:
            u.role = data["role"]
        if data.get("password") and data["password"].strip():
            u.password_hash = hash_password(data["password"])

        if not u.profile:
            p = UserProfile(user_id=u.id, college_id=u.college_id)
            self.db.add(p)
            u.profile = p
            await self.db.flush()

        if "college_id" in data:
            u.profile.roll_number = data["college_id"].upper()
        if "department" in data:
            u.profile.department = data["department"]
        if "batch" in data:
            u.profile.batch = data["batch"]
        if "section" in data:
            u.profile.section = data["section"]

        await self.db.commit()
        await self.db.refresh(u)
        return self._to_dict(u)

    async def delete_user(self, user_id: str, college_id: str) -> None:
        """Hard-delete a user within the tenant boundary."""
        result = await self.db.execute(
            select(models.User).outerjoin(UserProfile, models.User.id == UserProfile.user_id).where(
                models.User.id == user_id,
                models.User.college_id == college_id,
            )
        )
        u = result.scalars().first()
        if not u:
            raise ResourceNotFoundError("User", user_id)
        await self.db.delete(u)
        await self.db.commit()

    async def reset_password(
        self, user_id: str, admin_id: str, college_id: str
    ) -> str:
        """Generate a temporary password and flag force-change."""
        result = await self.db.execute(
            select(models.User).outerjoin(UserProfile, models.User.id == UserProfile.user_id).where(
                models.User.id == user_id,
                models.User.college_id == college_id,
            )
        )
        target = result.scalars().first()
        if not target:
            raise ResourceNotFoundError("User", user_id)

        temp_password = secrets.token_urlsafe(8)
        target.password_hash = hash_password(temp_password)

        if not target.profile:
            p = UserProfile(user_id=target.id, college_id=target.college_id)
            self.db.add(p)
            target.profile = p
            await self.db.flush()
            
        target.profile.force_password_change = True

        await log_audit(self.db, admin_id, "user", "reset_password", {"target_id": user_id})
        await self.db.commit()
        return temp_password

    async def bulk_import(
        self, file_bytes: bytes, filename: str, role: str, college_id: str
    ) -> int:
        """Import users from a CSV file. Returns count of newly created users."""
        if role not in ("student", "faculty"):
            raise BusinessLogicError("Role must be student or faculty")

        if not filename.endswith(".csv"):
            raise BusinessLogicError("Only CSV files are supported")

        data = []
        reader = csv.DictReader(io.StringIO(file_bytes.decode("utf-8")))
        for row in reader:
            data.append(row)

        created = 0
        for row in data:
            student_id = row.get("id") or row.get("student_id") or row.get("roll_number")
            if not student_id:
                continue
            student_id = str(student_id).strip()
            if not student_id.isalnum() and "-" not in student_id:
                raise BusinessLogicError(f"Invalid format for Student ID: {student_id}. Import aborted.")

            existing_r = await self.db.execute(
                select(models.User).outerjoin(UserProfile, models.User.id == UserProfile.user_id).where(
                    models.User.id == student_id,
                    models.User.college_id == college_id,
                )
            )
            if existing_r.scalars().first():
                continue

            new_user = models.User(
                id=student_id,
                name=row.get("name", "Unknown"),
                email=row.get("email", f"{student_id}@student.college.edu"),
                role=role,
                college_id=college_id,
                password_hash=hash_password("password123"),
            )
            self.db.add(new_user)
            await self.db.flush()
            
            profile = UserProfile(
                user_id=new_user.id,
                college_id=college_id,
                roll_number=student_id,
                department=row.get("department", ""),
                batch=row.get("batch", ""),
                force_password_change=True,
            )
            self.db.add(profile)
            created += 1

        await self.db.commit()
        return created

    async def export_csv(
        self, college_id: str, role: str = "student", batch: Optional[str] = None
    ) -> str:
        """Export users as CSV string."""
        stmt = select(models.User).outerjoin(UserProfile, models.User.id == UserProfile.user_id).where(
            models.User.college_id == college_id,
            models.User.role == role,
        )
        res = await self.db.execute(stmt)
        users = res.scalars().all()

        if batch:
            users = [u for u in users if (u.profile_data or {}).get("batch") == batch]

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Name", "Email", "Department", "Batch", "Role"])
        for u in users:
            pd = u.profile_data or {}
            writer.writerow([u.id, u.name, u.email, pd.get("department", ""), pd.get("batch", ""), u.role])
        output.seek(0)
        return output.getvalue()

    # ── Private helpers ──────────────────────────────────────────────────

    @staticmethod
    def _to_dict(u: models.User) -> Dict[str, Any]:
        return {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "college_id": u.college_id,
            **(u.profile_data or {}),
        }
