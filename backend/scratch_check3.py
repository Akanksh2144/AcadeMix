import asyncio
from database import AsyncSessionLocal, tenant_context
from sqlalchemy.future import select
from app import models

async def main():
    tenant_context.set("super_admin")  # or test college ID
    async with AsyncSessionLocal() as s:
        stmt = select(models.CodingChallenge).where(models.CodingChallenge.id == 'acccd9ad-e07f-40ea-871a-7f2b84424827')
        cr = await s.execute(stmt)
        challenge = cr.scalars().first()
        print("SUPER ADMIN FOUND:", challenge is not None)

    tenant_context.set("col_1234")  # test college ID
    async with AsyncSessionLocal() as s:
        stmt = select(models.CodingChallenge).where(models.CodingChallenge.id == 'acccd9ad-e07f-40ea-871a-7f2b84424827')
        cr = await s.execute(stmt)
        challenge = cr.scalars().first()
        print("COLLEGE ID FOUND:", challenge is not None)

if __name__ == "__main__":
    asyncio.run(main())
