import asyncio
import os
import certifi
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

async def main():
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        return
        
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
    db = client[db_name]
    
    docs = await db.users.find({'role': 'student'}).to_list(2000)
    count = 0
    for d in docs:
        if d.get('id'):
            await db.users.update_one(
                {'_id': d['_id']}, 
                {'$set': {'email': d['id'] + '@gniindia.org'}}
            )
            count += 1
            
    print(f"Success. Updated {count} student emails to use uppercase roll numbers.")

if __name__ == "__main__":
    asyncio.run(main())
