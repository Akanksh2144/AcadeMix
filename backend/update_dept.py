import asyncio
import os
import certifi
from dotenv import load_dotenv
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parent / '.env')

async def main():
    url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(url, tlsCAFile=certifi.where())
    db = client[db_name]
    
    result = await db.users.update_one(
        {'college_id': '22WJ8A6745'},
        {'$set': {'department': 'ET', 'section': 'A'}}
    )
    
    print(f'Done. Matched: {result.matched_count}, Modified: {result.modified_count}')
    client.close()

asyncio.run(main())
