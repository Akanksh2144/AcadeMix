import asyncio, os
import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv(r'C:\AcadMix\backend\.env')
db_url = os.environ.get('DATABASE_URL')
if not db_url:
    db_url = 'postgresql+asyncpg://postgres:postgres@localhost:5432/acadmix'
engine = create_async_engine(db_url, connect_args={'statement_cache_size': 0})

def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

async def init_prin():
    async with AsyncSession(engine) as session:
        # Generate a proper bcrypt hash for 'teacher123'
        pwd = hash_password("teacher123")
        print(f"Generated bcrypt hash for teacher123: {pwd[:20]}...")

        # Get college id
        res2 = await session.execute(text("SELECT id FROM colleges LIMIT 1"))
        college = res2.scalar()
        print(f"College: {college}")

        if not college:
            print("ABORT: no college found")
            return

        # Check columns
        cols = await session.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
        ))
        col_names = [r[0] for r in cols.fetchall()]
        has_designation = 'designation' in col_names

        if has_designation:
            stmt = text(
                "INSERT INTO users (id, college_id, email, password_hash, role, name, designation, profile_data) "
                "VALUES ('PRIN001', :col, 'principal@acadmix.com', :pwd, 'principal', 'Dr. Radhakrishnan', 'Principal', "
                "'{\"college_id\": \"PRIN001\"}'::jsonb) "
                "ON CONFLICT (id) DO UPDATE SET password_hash = :pwd, "
                "profile_data = '{\"college_id\": \"PRIN001\"}'::jsonb"
            )
        else:
            stmt = text(
                "INSERT INTO users (id, college_id, email, password_hash, role, name, profile_data) "
                "VALUES ('PRIN001', :col, 'principal@acadmix.com', :pwd, 'principal', 'Dr. Radhakrishnan', "
                "'{\"college_id\": \"PRIN001\"}'::jsonb) "
                "ON CONFLICT (id) DO UPDATE SET password_hash = :pwd, "
                "profile_data = '{\"college_id\": \"PRIN001\"}'::jsonb"
            )

        res3 = await session.execute(stmt, {'col': college, 'pwd': pwd})
        await session.commit()
        print(f"Principal user PRIN001 upserted! Rows affected: {res3.rowcount}")

        # Verify it works
        from server import verify_password as vp
        check = await session.execute(text("SELECT password_hash FROM users WHERE id = 'PRIN001'"))
        stored = check.scalar()
        print(f"Verify 'teacher123' against stored hash: {vp('teacher123', stored)}")

asyncio.run(init_prin())
