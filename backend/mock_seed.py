import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.core import College, Department, User, UserProfile, Role
from app.core.security import hash_password

from app.models import Base

async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    
    # Force schema creation via run_sync
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        print("Starting mock seed sequence...")
        # Clean
        await db.execute(College.__table__.delete())
        await db.commit()

        # 1. College
        col = College(id="C001", name="Test College", database_url="mock", storage_bucket="mock")
        db.add(col)

        # 2. Dept
        dept = Department(id="D001", college_id="C001", name="Computer Science", code="CSE")
        db.add(dept)

        # 3. Roles
        role = Role(college_id="C001", name="student", permissions={})
        db.add(role)

        # 4. User
        user = User(
            id="U001", college_id="C001", role="student", email="student@test.com",
            name="John Doe", password_hash=hash_password("password")
        )
        db.add(user)

        # 5. UserProfile (Relational)
        profile = UserProfile(
            user_id="U001", college_id="C001", department="CSE", batch="2025",
            section="A", current_semester=6, telemetry_strikes=0, acad_tokens=100.0
        )
        db.add(profile)

        await db.commit()
        print("Seeded successfully!")

        # 6. Verify relation back-compat
        res = await db.execute(UserProfile.__table__.select())
        print("Raw profiles:", len(res.all()))

if __name__ == "__main__":
    asyncio.run(seed())
