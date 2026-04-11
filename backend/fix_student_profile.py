import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.core.config import settings
from app.models.core import UserProfile

async def fix_student_profile():
    engine = create_async_engine(settings.DATABASE_URL, connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        result = await db.execute(
            select(UserProfile).where(UserProfile.roll_number == "22WJ8A6745")
        )
        profile = result.scalars().first()
        if profile:
            profile.department = "DS"
            profile.batch = "2026"
            profile.section = "A"
            await db.commit()
            print(f"Fixed: dept={profile.department}, batch={profile.batch}, section={profile.section}")
        else:
            print("NOT FOUND")

asyncio.run(fix_student_profile())
