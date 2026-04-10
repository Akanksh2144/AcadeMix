import asyncio
from database import AsyncSessionLocal
from sqlalchemy.future import select
from app import models
from server import verify_password, hash_password

async def get_user():
    async with AsyncSessionLocal() as s:
        res = await s.execute(select(models.User).where(models.User.id == 'IND001'))
        user = res.scalars().first()
        if user:
            print(f"ID: {user.id}")
            print(f"Role: {user.role}")
            print(f"Pass verifies 'industry123': {verify_password('industry123', user.password_hash)}")
            print(f"Is Active: {user.is_active}")
        else:
            print("IND001 NOT FOUND in DB!")

asyncio.run(get_user())
