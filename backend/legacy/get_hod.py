import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal
from models import User

async def get_hod():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.role == 'hod'))
        u = res.scalars().first()
        if u:
            print("HOD Email:", u.email)
            print("College ID:", u.profile_data.get('college_id'))
        else:
            print("No HOD found.")

if __name__ == "__main__":
    asyncio.run(get_hod())
