from dotenv import load_dotenv
load_dotenv()
import asyncio
from database import AsyncSessionLocal
from sqlalchemy import select
from app import models
from server import verify_password

async def verify_creds():
    try:
        async with AsyncSessionLocal() as session:
            for cid, pw in [("N001", "nodal123"), ("TPO001", "tpo123")]:
                print(f"Checking {cid}...")
                res = await session.execute(
                    select(models.User).where(models.User.email.ilike(cid))
                )
                user = res.scalars().first()
                if not user:
                    print(f"User {cid} not found!")
                    continue
                
                print(f"User {cid} found!")
                match = verify_password(pw, user.password_hash)
                print(f"Password match: {match}")
                print(f"Role: {user.role}, Active: {user.is_active}")
                print(f"Profile Data: {user.profile_data}")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(verify_creds())
