import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.core.config import settings
from app.models.core import User, UserProfile

async def check_student():
    engine = create_async_engine(settings.DATABASE_URL, connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Find student by roll number
        result = await db.execute(
            select(User).outerjoin(UserProfile).where(UserProfile.roll_number == "22WJ8A6745")
        )
        user = result.scalars().first()
        if user:
            print(f"User found: id={user.id}")
            print(f"  name: '{user.name}'")
            print(f"  email: '{user.email}'")
            print(f"  role: '{user.role}'")
            print(f"  profile_data: {user.profile_data}")
            
            # Check UserProfile
            profile_r = await db.execute(select(UserProfile).where(UserProfile.user_id == user.id))
            profile = profile_r.scalars().first()
            if profile:
                print(f"  UserProfile: roll={profile.roll_number}, dept={profile.department}, batch={profile.batch}, section={profile.section}")
            else:
                print(f"  UserProfile: NOT FOUND")
        else:
            print("Student 22WJ8A6745 NOT FOUND")

asyncio.run(check_student())
