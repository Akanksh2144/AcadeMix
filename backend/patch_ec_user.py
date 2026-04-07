import asyncio, os, json
import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv(r'C:\AcadMix\backend\.env')
db_url = os.environ.get('DATABASE_URL')
engine = create_async_engine(db_url, connect_args={'statement_cache_size': 0})

def hash_password(pw):
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

async def seed():
    async with AsyncSession(engine) as session:
        res = await session.execute(text("SELECT id FROM colleges LIMIT 1"))
        college = res.scalar()

        pwd = hash_password("examcell123")
        pd = json.dumps({"college_id": "EC001"})

        try:
            await session.execute(text(
                "INSERT INTO public.users (id, college_id, email, password_hash, role, name, profile_data) "
                "VALUES ('EC001', :col, 'examcell@acadmix.com', :pwd, 'exam_cell', 'Exam Cell Officer', CAST(:pd AS jsonb)) "
                "ON CONFLICT (id) DO UPDATE SET password_hash = :pwd, role = 'exam_cell', name = 'Exam Cell Officer', profile_data = CAST(:pd AS jsonb)"
            ), {'col': college, 'pwd': pwd, 'pd': pd})
            await session.commit()
            print("EC001 upserted!")

            from server import verify_password
            check = await session.execute(text("SELECT password_hash FROM public.users WHERE id = 'EC001'"))
            print(f"Verify: {verify_password('examcell123', check.scalar())}")
        except Exception as e:
            print(f"ERROR: {str(e)[:300]}")

asyncio.run(seed())
