import asyncio
from database import AdminSessionLocal
from sqlalchemy import text

async def main():
    async with AdminSessionLocal() as s:
        res = await s.execute(text("SELECT id, title FROM coding_challenges LIMIT 5"))
        rows = res.all()
        print("ROWS:", rows)

if __name__ == "__main__":
    asyncio.run(main())
