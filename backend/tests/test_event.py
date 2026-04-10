import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal
from app import models
import logging

async def main():
    print("STARTING TEST QUERY")
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(models.CourseRegistration).limit(1))
    print("FINISHED TEST QUERY")
        
asyncio.run(main())
