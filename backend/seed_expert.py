import asyncio, os, json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text, select
from dotenv import load_dotenv
import bcrypt

load_dotenv(r'C:\AcadMix\backend\.env')
engine = create_async_engine(os.environ.get('DATABASE_URL'), connect_args={'statement_cache_size': 0})

def hash_pw(pw):
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

async def seed():
    async with AsyncSession(engine) as session:
        # Get college
        c_res = await session.execute(text("SELECT id FROM public.colleges LIMIT 1"))
        col_id = c_res.scalar()
        if not col_id:
            print("No college found!")
            return

        # Insert Expert user (EXP001)
        pwd = hash_pw("expert123")
        pd = json.dumps({
            "college_id": "EXP001", 
            "expertise": ["Data Structures", "Operating Systems"],
            "designation": "State DHTE Subject Expert"
        })
        
        # Upsert user EXP001
        await session.execute(text(
            """INSERT INTO public.users (id, college_id, role, email, password_hash, name, is_verified, profile_data)
               VALUES ('EXP001', :col, 'expert', 'expert@dhte.gov.in', :pwd, 'Dr. S. K. Sharma', true, CAST(:pd AS jsonb))
               ON CONFLICT (id) DO UPDATE SET 
                 password_hash=EXCLUDED.password_hash, 
                 profile_data=EXCLUDED.profile_data
            """
        ), {'col': col_id, 'pwd': pwd, 'pd': pd})
        
        # Delete existing assignments so we don't conflict
        await session.execute(text("DELETE FROM public.expert_assignments WHERE expert_user_id='EXP001'"))
        
        # Add a couple of active assignments for EXP001
        import uuid
        a1_id = str(uuid.uuid4())
        await session.execute(text(
            """INSERT INTO public.expert_assignments (id, college_id, expert_user_id, subject_code, academic_year, is_active)
               VALUES (:aid, :cid, 'EXP001', '22ET301', '2023-2024', true)
            """
        ), {'aid': a1_id, 'cid': col_id})

        a2_id = str(uuid.uuid4())
        await session.execute(text(
            """INSERT INTO public.expert_assignments (id, college_id, expert_user_id, subject_code, academic_year, is_active)
               VALUES (:aid, :cid, 'EXP001', '22ET302', '2023-2024', true)
            """
        ), {'aid': a2_id, 'cid': col_id})

        # Insert a dummy question paper submission from T001
        await session.execute(text("DELETE FROM public.question_paper_submissions WHERE subject_code IN ('22ET301', '22ET302')"))
        
        qp_id = str(uuid.uuid4())
        await session.execute(text(
            """INSERT INTO public.question_paper_submissions (id, college_id, faculty_id, subject_code, academic_year, semester, exam_type, paper_url, status)
               VALUES (:qid, :cid, 'T001', '22ET301', '2023-2024', 3, 'mid1', 'https://example.com/qp.pdf', 'submitted')
            """
        ), {'qid': qp_id, 'cid': col_id})

        await session.commit()
        print("Seeded Expert user EXP001 and assignments")

asyncio.run(seed())
