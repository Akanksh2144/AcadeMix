import asyncio, os, json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select
from dotenv import load_dotenv
import bcrypt

import models

load_dotenv(r'C:\AcadMix\backend\.env')
engine = create_async_engine(os.environ.get('DATABASE_URL'), connect_args={'statement_cache_size': 0})

def hash_pw(pw):
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

async def seed():
    async with AsyncSession(engine) as session:
        col_id = (await session.execute(select(models.College.id).limit(1))).scalar()
        if not col_id:
            print("No college")
            return
            
        print(f"Using College ID: {col_id}")

        user = (await session.execute(select(models.User).where(models.User.id == 'EXP001'))).scalars().first()
        if not user:
            user = models.User(id='EXP001', college_id=col_id)
            session.add(user)
        
        user.role = 'expert'
        user.email = 'expert@dhte.gov.in'
        user.name = 'Dr. S. K. Sharma'
        user.password_hash = hash_pw("expert123")
        user.profile_data = {
            "college_id": "EXP001", 
            "expertise": ["Data Structures", "Operating Systems"],
            "designation": "State DHTE Subject Expert"
        }
        await session.commit()
        
        # Delete old assignments
        await session.execute(models.ExpertAssignment.__table__.delete().where(models.ExpertAssignment.expert_user_id == 'EXP001'))
        
        a1 = models.ExpertAssignment(college_id=col_id, expert_user_id='EXP001', subject_code='22ET301', academic_year='2023-2024', is_active=True)
        a2 = models.ExpertAssignment(college_id=col_id, expert_user_id='EXP001', subject_code='22ET302', academic_year='2023-2024', is_active=True)
        session.add(a1)
        session.add(a2)
        
        await session.commit()
        print("Successfully Seeded EXP001 and Assignments!")

asyncio.run(seed())
