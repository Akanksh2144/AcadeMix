"""Seed a parent user (PARENT001) and link to existing student (22WJ8A6745)."""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select
from database import AsyncSessionLocal
import models

async def seed():
    async with AsyncSessionLocal() as s:
        # Check if parent already exists by profile_data college_id
        r = await s.execute(
            select(models.User).where(
                models.User.profile_data["college_id"].astext == "PARENT001"
            )
        )
        parent_user = r.scalars().first()

        if parent_user:
            print("PARENT001 already exists, skipping user creation.")
        else:
            # Find the college
            cr = await s.execute(select(models.College).limit(1))
            college = cr.scalars().first()
            if not college:
                print("ERROR: No college found. Run the main seed first.")
                return

            from passlib.context import CryptContext
            pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

            parent_user = models.User(
                name="Ramesh Patel",
                email="parent@acadmix.org",
                password_hash=pwd.hash("parent123"),
                role="parent",
                college_id=college.id,
                profile_data={
                    "college_id": "PARENT001",
                    "phone": "+91-9876543210",
                    "notification_preferences": {
                        "attendance_alerts": True,
                        "leave_updates": True,
                        "results": True,
                        "fee_reminders": True
                    }
                }
            )
            s.add(parent_user)
            await s.commit()
            await s.refresh(parent_user)
            print(f"Created PARENT001 (id={parent_user.id})")

        # Find the student
        sr = await s.execute(
            select(models.User).where(
                models.User.profile_data["college_id"].astext == "22WJ8A6745"
            )
        )
        student_user = sr.scalars().first()

        if not student_user:
            print("WARNING: Student 22WJ8A6745 not found. Link not created.")
            return

        # Check if link exists
        lr = await s.execute(
            select(models.ParentStudentLink).where(
                models.ParentStudentLink.parent_id == parent_user.id,
                models.ParentStudentLink.student_id == student_user.id
            )
        )
        if lr.scalars().first():
            print("Link already exists.")
        else:
            link = models.ParentStudentLink(
                college_id=parent_user.college_id,
                parent_id=parent_user.id,
                student_id=student_user.id,
                relationship="father",
                is_primary=True
            )
            s.add(link)
            await s.commit()
            print(f"Linked PARENT001 -> {student_user.name} (relationship=father)")

        print("Successfully seeded PARENT001!")

asyncio.run(seed())
