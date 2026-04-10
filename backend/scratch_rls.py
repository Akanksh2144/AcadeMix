import asyncio
from database import AdminSessionLocal
from sqlalchemy import text

async def main():
    async with AdminSessionLocal() as s:
        # Check if RLS is enabled on coding_challenges
        res = await s.execute(text("SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'coding_challenges'"))
        print("RLS STATUS:", res.all())
        
        # Check if there are any policies on it
        res = await s.execute(text("SELECT polname, polcmd, polqual FROM pg_policy WHERE polrelid = (SELECT oid FROM pg_class WHERE relname = 'coding_challenges')"))
        print("POLICIES:", res.all())

if __name__ == "__main__":
    asyncio.run(main())
