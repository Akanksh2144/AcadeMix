import asyncio
from database import AdminSessionLocal
from sqlalchemy import text

async def main():
    async with AdminSessionLocal() as s:
        res = await s.execute(text("""
            SELECT c.relname 
            FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace 
            WHERE c.relrowsecurity = true 
            AND n.nspname = 'public'
            AND NOT EXISTS (
                SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
            )
        """))
        print("TABLES WITH RLS ENABLED BUT NO POLICIES:", res.all())

if __name__ == "__main__":
    asyncio.run(main())
