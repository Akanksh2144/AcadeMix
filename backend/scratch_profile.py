import asyncio
from database import AdminSessionLocal
from sqlalchemy import text

async def main():
    async with AdminSessionLocal() as s:
        user_res = await s.execute(text("SELECT profile_data FROM users WHERE id = '69ce6e1475b1f2a5a7bf6bcb'"))
        print("PROFILE:", user_res.all())

if __name__ == "__main__":
    asyncio.run(main())
