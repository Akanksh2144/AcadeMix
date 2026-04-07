from dotenv import load_dotenv
load_dotenv()
import asyncio
from database import AsyncSessionLocal
from sqlalchemy import select
import models
from server import hash_password

async def seed_users():
    try:
        async with AsyncSessionLocal() as session:
            # Get first college
            college_res = await session.execute(select(models.College).limit(1))
            college = college_res.scalars().first()
            if not college:
                print("No college found in DB")
                return
            cid = college.id
            
            # ALUMNI001
            res = await session.execute(select(models.User).where(models.User.email == "ALUMNI001"))
            alumni = res.scalars().first()
            if not alumni:
                alumni = models.User(
                    email="ALUMNI001",
                    name="Alumni Student",
                    password_hash=hash_password("alumni123"),
                    role="alumni",
                    profile_data={"college_id": "ALUMNI001", "is_profile_verified": True},
                    college_id=cid
                )
                session.add(alumni)
            else:
                alumni.password_hash = hash_password("alumni123")
                alumni.profile_data = {"college_id": "ALUMNI001", "is_profile_verified": True}

            await session.commit()
            print("Successfully seeded ALUMNI001!")
    except Exception as e:
        print(f"Exception: {e}")

asyncio.run(seed_users())
