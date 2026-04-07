import asyncio, os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv(r'C:\AcadMix\backend\.env')
db_url = os.environ.get('DATABASE_URL')
if not db_url: db_url = 'postgresql+asyncpg://postgres:postgres@localhost:5432/acadmix'
engine = create_async_engine(db_url, connect_args={'statement_cache_size': 0})

async def init_prin():
    async with AsyncSession(engine) as session:
        # copy hash from T001
        res = await session.execute(text("SELECT password_hash FROM users WHERE id='T001' LIMIT 1"))
        pwd = res.scalar() or ''
        
        # copy college
        res2 = await session.execute(text("SELECT id FROM colleges LIMIT 1"))
        college = res2.scalar()
        
        if pwd and college:
            stmt = text("""
            INSERT INTO users (id, college_id, email, password_hash, role, name, designation) 
            VALUES ('PRIN001', :col, 'principal@acadmix.com', :pwd, 'principal', 'Dr. Radhakrishnan', 'Principal')
            ON CONFLICT (id) DO UPDATE SET password_hash = :pwd;
            """)
            await session.execute(stmt, {'col': college, 'pwd': pwd})
            await session.commit()
            print('Principal user PRIN001 added to DB! Password is teacher123')

asyncio.run(init_prin())
