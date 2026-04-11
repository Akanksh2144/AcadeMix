"""Check what tables 'authenticated' can see."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def check():
    engine = create_async_engine(settings.DATABASE_URL, connect_args={"statement_cache_size": 0})
    async with engine.begin() as conn:
        # Switch to authenticated and try querying
        await conn.execute(text("SET ROLE authenticated"))
        try:
            r = await conn.execute(text("SELECT count(*) FROM users"))
            print(f"users: {r.scalar()}")
        except Exception as e:
            print(f"users FAILED: {e}")
        
        try:
            r = await conn.execute(text("SELECT count(*) FROM faculty_assignments"))
            print(f"faculty_assignments: {r.scalar()}")
        except Exception as e:
            print(f"faculty_assignments FAILED: {e}")
        
        try:
            r = await conn.execute(text("SELECT count(*) FROM mark_entries"))
            print(f"mark_entries: {r.scalar()}")
        except Exception as e:
            print(f"mark_entries FAILED: {e}")
        
        # Reset
        await conn.execute(text("RESET ROLE"))

asyncio.run(check())
