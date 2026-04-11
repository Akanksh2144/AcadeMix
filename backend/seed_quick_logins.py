import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

from app.core.config import settings
from app.models.core import College, User, UserProfile
from app.core.security import hash_password

async def seed_quick_logins():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        print("Looking for base College...")
        college_r = await db.execute(select(College).where(College.name == settings.COLLEGE_NAME))
        college = college_r.scalars().first()
        
        if not college:
            print(f"Error: College '{settings.COLLEGE_NAME}' not found. Start Uvicorn first so it can seed it.")
            return

        roles_to_seed = [
            {"role": "student", "roll_number": "22WJ8A6745", "password": "22WJ8A6745", "email": "student@gni.edu", "name": "Aarav Sharma", "department": "DS", "batch": "2026", "section": "A"},
            {"role": "teacher", "roll_number": "T001", "password": "teacher123", "email": "t001@gni.edu", "name": "Dr. Rekha Verma", "department": "DS"},
            {"role": "hod", "roll_number": "HOD001", "password": "hod123", "email": "hod001@gni.edu", "name": "Dr. Suresh Nair", "department": "DS"},
            {"role": "exam_cell", "roll_number": "EC001", "password": "examcell123", "email": "ec001@gni.edu", "name": "Priya Reddy", "department": "Admin"},
            {"role": "nodal_officer", "roll_number": "NODAL001", "password": "nodal123", "email": "nodal@dhte.gov", "name": "K. Venkatesh", "department": "DHTE"},
            {"role": "tp_officer", "roll_number": "TPO001", "password": "tpo123", "email": "tpo001@gni.edu", "name": "Rahul Mehta", "department": "T&P"},
            {"role": "alumni", "roll_number": "ALUMNI001", "password": "alumni123", "email": "alumni001@gni.edu", "name": "Sneha Iyer", "department": "DS", "batch": "2023"},
            {"role": "parent", "roll_number": "PARENT001", "password": "parent123", "email": "parent001@gni.edu", "name": "Ramesh Sharma"},
            {"role": "industry", "roll_number": "IND001", "password": "industry123", "email": "ind001@gni.edu", "name": "Vikram Patel"},
            {"role": "principal", "roll_number": "PRIN001", "password": "teacher123", "email": "prin001@gni.edu", "name": "Dr. Lakshmi Devi", "department": "Admin"},
            {"role": "retired_faculty", "roll_number": "RF001", "password": "retired123", "email": "rf001@gni.edu", "name": "Prof. G. Rao", "department": "DS"},
            {"role": "expert", "roll_number": "EXP001", "password": "expert123", "email": "exp001@gni.edu", "name": "Dr. Anand Kumar", "department": "DS"}
        ]

        count = 0
        for data in roles_to_seed:
            existing_r = await db.execute(
                select(User).outerjoin(UserProfile).where(
                    (UserProfile.roll_number == data["roll_number"]) | (User.email == data["email"]),
                    User.college_id == college.id
                )
            )
            if not existing_r.scalars().first():
                user = User(
                    college_id=college.id,
                    role=data["role"],
                    email=data["email"],
                    name=data["name"],
                    password_hash=hash_password(data["password"])
                )
                db.add(user)
                await db.flush()
                
                profile = UserProfile(
                    user_id=user.id,
                    college_id=college.id,
                    roll_number=data["roll_number"],
                    department=data.get("department", "CSE"),
                    batch=data.get("batch"),
                    section=data.get("section")
                )
                db.add(profile)
                count += 1
                print(f"Seeded {data['role']} with login {data['roll_number']} or {data['email']}")
        
        await db.commit()
        print(f"Successfully seeded {count} quick login mock users.")

if __name__ == "__main__":
    asyncio.run(seed_quick_logins())
