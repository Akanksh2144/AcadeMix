import asyncio, os, json
import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv(r'C:\AcadMix\backend\.env')
db_url = os.environ.get('DATABASE_URL')
engine = create_async_engine(db_url, connect_args={'statement_cache_size': 0})

async def debug():
    async with AsyncSession(engine) as session:
        cols = await session.execute(text(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
        ))
        for r in cols.fetchall():
            print(f"  {r[0]:30s} {r[1]}")

asyncio.run(debug())
