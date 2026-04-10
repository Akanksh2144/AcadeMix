import asyncio
from database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as session:
        try:
            r = await session.execute(text("SELECT 1"))
            print("OK", r.scalar())
        except Exception as e:
            print("ERROR", e.__class__.__name__, e)

asyncio.run(main())
