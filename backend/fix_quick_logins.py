"""Fix all quick-login users to match frontend expectations."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy import update

from app.core.config import settings
from app.models.core import User, UserProfile
from app.core.security import hash_password

# role_in_db -> { correct_role, roll_number, password, batch, section, department }
FIXES = {
    "22WJ8A6745": {"role": "student", "department": "DS", "batch": "2026", "section": "A", "name": "Aarav Sharma"},
    "T001":       {"role": "teacher", "department": "DS", "name": "Dr. Rekha Verma"},
    "HOD001":     {"role": "hod", "department": "DS", "name": "Dr. Suresh Nair"},
    "EC001":      {"role": "exam_cell", "department": "Admin", "name": "Priya Reddy"},
    "NODAL001":   {"role": "nodal_officer", "department": "DHTE", "name": "K. Venkatesh"},
    "TPO001":     {"role": "tp_officer", "department": "T&P", "name": "Rahul Mehta"},
    "ALUMNI001":  {"role": "alumni", "department": "DS", "batch": "2023", "name": "Sneha Iyer"},
    "PARENT001":  {"role": "parent", "name": "Ramesh Sharma"},
    "IND001":     {"role": "industry", "name": "Vikram Patel"},
    "PRIN001":    {"role": "principal", "department": "Admin", "name": "Dr. Lakshmi Devi"},
    "RF001":      {"role": "retired_faculty", "department": "DS", "name": "Prof. G. Rao"},
    "EXP001":     {"role": "expert", "department": "DS", "name": "Dr. Anand Kumar"},
}

async def fix_all():
    engine = create_async_engine(settings.DATABASE_URL, connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        for roll, fix in FIXES.items():
            # Find profile by roll_number
            profile_r = await db.execute(
                select(UserProfile).where(UserProfile.roll_number == roll)
            )
            profile = profile_r.scalars().first()
            if not profile:
                print(f"  [!] {roll}: no UserProfile found -- skipping")
                continue

            # Update UserProfile fields
            if fix.get("department"):
                profile.department = fix["department"]
            if fix.get("batch"):
                profile.batch = fix["batch"]
            if fix.get("section"):
                profile.section = fix["section"]

            # Update User fields (role, name)
            user_r = await db.execute(select(User).where(User.id == profile.user_id))
            user = user_r.scalars().first()
            if user:
                if user.role != fix["role"]:
                    print(f"  [FIX] {roll}: role '{user.role}' -> '{fix['role']}'")
                    user.role = fix["role"]
                if fix.get("name") and user.name != fix["name"]:
                    print(f"  [FIX] {roll}: name '{user.name}' -> '{fix['name']}'")
                    user.name = fix["name"]

            print(f"  [OK] {roll} ({fix['role']}): dept={fix.get('department','-')}, batch={fix.get('batch','-')}, section={fix.get('section','-')}")

        await db.commit()
        print("\n[DONE] All quick-login users fixed.")

asyncio.run(fix_all())
