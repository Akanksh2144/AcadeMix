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
    
    # Let's set HOD001 and any other HOD to department ET
    r = await db.users.update_many({'role': 'hod'}, {'$set': {'department': 'ET'}})
    print(f"Updated {r.modified_count} HOD documents to department 'ET'.")

if __name__ == "__main__":
    asyncio.run(main())
