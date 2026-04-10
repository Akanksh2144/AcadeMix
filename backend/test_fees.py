import asyncio
from database import AsyncSessionLocal
from app.services.fees_service import FeesService
import sys
async def main():
    async with AsyncSessionLocal() as session:
        service = FeesService(session)
        print('Testing get_student_due_fees...')
        res = await service.get_student_due_fees('22WJ8A6745', 'GNI')
        print(res)
asyncio.run(main())
