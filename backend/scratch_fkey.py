import asyncio
from database import AdminSessionLocal
from sqlalchemy import text

async def main():
    async with AdminSessionLocal() as s:
        res = await s.execute(text("SELECT id, name FROM colleges LIMIT 10"))
        print("COLLEGES:", res.all())
        
        user_res = await s.execute(text("SELECT id, college_id FROM users WHERE id = '69ce6e1475b1f2a5a7bf6bcb'"))
        print("USER:", user_res.all())

if __name__ == "__main__":
    asyncio.run(main())
