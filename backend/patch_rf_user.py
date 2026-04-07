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
        try:
            pwd = hash_password("retired123")
            res = await session.execute(text("SELECT id FROM colleges LIMIT 1"))
            college = res.scalar()

            pd = json.dumps({"college_id": "RF001", "designation_at_retirement": "Associate Professor", "retirement_date": "2022-07-31", "years_of_service": 30, "specialization": "Database Systems", "is_available_for_consultation": True, "services_willing": ["mentoring", "consulting", "advisory", "guest_lectures"], "availability_level": "regular", "entitlements": {"medical_benefits": True, "library_access": True, "email_access": True, "campus_facilities": False}})

            await session.execute(text(
                "INSERT INTO public.users (id, college_id, email, password_hash, role, name, profile_data) "
                "VALUES ('RF001', :col, 'retired.faculty@acadmix.com', :pwd, 'retired_faculty', 'Dr. Rajesh Kumar', CAST(:pd AS jsonb)) "
                "ON CONFLICT (id) DO UPDATE SET password_hash = :pwd, role = 'retired_faculty', name = 'Dr. Rajesh Kumar', profile_data = CAST(:pd AS jsonb)"
            ), {'col': college, 'pwd': pwd, 'pd': pd})
            await session.commit()
            print("RF001 upserted successfully!")

            check = await session.execute(text("SELECT role, name FROM public.users WHERE id = 'RF001'"))
            r = check.fetchone()
            print(f"Verify: role={r[0]}, name={r[1]}")

            from server import verify_password
            check2 = await session.execute(text("SELECT password_hash FROM public.users WHERE id = 'RF001'"))
            print(f"Password verify: {verify_password('retired123', check2.scalar())}")
        except Exception as e:
            print(f"ERROR: {str(e)[:300]}")

asyncio.run(seed())
