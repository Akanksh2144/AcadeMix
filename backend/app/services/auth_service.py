"""
Auth Service — handles authentication business logic.
Encapsulates login brute-force protection, credential verification,
token creation, logout revocation, and token refresh.
"""

import jwt
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app import models
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    redis_client,
    JWT_SECRET,
    JWT_ALGORITHM,
)
from app.core.exceptions import DomainException, ResourceNotFoundError
from database import AsyncSessionLocal


class AuthenticationError(DomainException):
    """Raised on login failures."""
    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(message=message, status_code=401)


class RateLimitedError(DomainException):
    """Raised when brute-force threshold is exceeded."""
    def __init__(self):
        super().__init__(
            message="Too many failed attempts. Try again in 5 minutes.",
            status_code=429,
        )


class AuthService:
    """Stateless service for authentication operations."""

    MAX_LOGIN_FAILURES = 5
    LOCKOUT_SECONDS = 300

    def __init__(self, db: AsyncSession):
        self.db = db

    async def login(self, college_id: str, password: str) -> Dict[str, Any]:
        """Authenticate a user and return token data + user profile.

        Returns:
            dict with user info and access/refresh tokens.

        Raises:
            RateLimitedError: Too many failed attempts.
            AuthenticationError: Invalid credentials.
        """
        normalized = college_id.strip().upper()
        key = f"login_failures:{normalized}"

        # Rate-limit check
        if redis_client:
            failures = redis_client.get(key)
            if failures and int(failures) >= self.MAX_LOGIN_FAILURES:
                raise RateLimitedError()

        # Lookup user (case-insensitive for both roll_number and email)
        from sqlalchemy import func
        result = await self.db.execute(
            select(models.User)
            .outerjoin(models.UserProfile)
            .where(
                (models.UserProfile.roll_number == normalized)
                | (func.upper(models.User.email) == normalized)
            )
        )
        user = result.scalars().first()

        if not user or not verify_password(password, user.password_hash):
            if redis_client:
                redis_client.incr(key)
                redis_client.expire(key, self.LOCKOUT_SECONDS)
            raise AuthenticationError()

        # Success — clear failure counter
        if redis_client:
            redis_client.delete(key)

        # Build permissions from role table
        perms = await self._resolve_role_permissions(user)

        tid = user.college_id or ""
        access = create_access_token(user.id, user.role, tid, perms)
        refresh = create_refresh_token(user.id)

        user_out = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "college_id": user.college_id,
            "tenant_id": user.college_id,
            "access_token": access,
            "refresh_token": refresh,
        }
        if user.profile_data:
            user_out.update({k: v for k, v in user.profile_data.items() if k != "password_hash"})

        return user_out

    async def get_current_user_profile(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich the current user dict with permission flags and teaching scope."""
        perm_r = await self.db.execute(
            select(models.UserPermission).where(models.UserPermission.user_id == user["id"])
        )
        perm_row = perm_r.scalars().first()
        permission_flags = perm_row.flags if perm_row else {}

        scope = {}
        if user["role"] in ("teacher", "faculty", "hod"):
            assigns_r = await self.db.execute(
                select(models.FacultyAssignment).where(
                    models.FacultyAssignment.teacher_id == user["id"]
                )
            )
            assigns = assigns_r.scalars().all()
            if assigns:
                scope["subject_codes"] = list({a.subject_code for a in assigns})
                scope["batch_ids"] = list({a.batch for a in assigns})
                scope["department"] = assigns[0].department

        return {**user, "permissions": permission_flags, "scope": scope}

    def logout(self, refresh_token: Optional[str]) -> None:
        """Blacklist a refresh token if Redis is available."""
        if not refresh_token:
            return
        try:
            payload = jwt.decode(refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            jti = payload.get("jti")
            if redis_client and jti:
                redis_client.setex(f"revoked_refresh:{jti}", 604800, "revoked")
        except jwt.InvalidTokenError:
            pass

    async def refresh(self, refresh_token: Optional[str]) -> Dict[str, Any]:
        """Validate a refresh token and issue a new access token.

        Returns:
            dict with new access_token and expires_in.

        Raises:
            AuthenticationError: Invalid/expired/revoked refresh token.
        """
        if not refresh_token:
            raise AuthenticationError("No refresh token")

        try:
            payload = jwt.decode(refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("type") != "refresh":
                raise AuthenticationError("Invalid token type")

            jti = payload.get("jti")
            if redis_client and redis_client.exists(f"revoked_refresh:{jti}"):
                raise AuthenticationError("Refresh token revoked")

            user_id = payload["sub"]
            result = await self.db.execute(
                select(models.User).where(models.User.id == user_id)
            )
            user = result.scalars().first()
            if not user:
                raise AuthenticationError("User not found")

            new_access = create_access_token(user_id, user.role, user.college_id)
            return {"access_token": new_access, "expires_in": 900}

        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Refresh token expired")
        except jwt.InvalidTokenError:
            raise AuthenticationError("Invalid refresh token")

    # ── Private helpers ──────────────────────────────────────────────────

    async def _resolve_role_permissions(self, user: models.User) -> dict:
        """Load custom permissions for non-standard roles."""
        if user.role in ("student", "super_admin", "admin"):
            return {}
        role_result = await self.db.execute(
            select(models.Role).where(
                models.Role.name == user.role,
                models.Role.college_id == user.college_id,
            )
        )
        r = role_result.scalars().first()
        return r.permissions if r else {}
