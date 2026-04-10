import asyncio
from database import AdminSessionLocal
from sqlalchemy import text

async def main():
    async with AdminSessionLocal() as s:
        res = await s.execute(text("SELECT polname, polcmd, polqual, polwithcheck FROM pg_policy WHERE polrelid = (SELECT oid FROM pg_class WHERE relname = 'challenge_progress')"))
        print("POLICIES:", res.all())

if __name__ == "__main__":
    asyncio.run(main())
