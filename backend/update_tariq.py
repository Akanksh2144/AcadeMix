import asyncio
import os
import certifi
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

async def main():
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
        
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
    db = client[db_name]
    
    # Update Dr. M. I. Tariq Hussain to role="hod" and ensure department="ET"
    res = await db.users.update_many(
        {"name": "Dr. M. I. Tariq Hussain"},
        {"$set": {"role": "hod", "department": "ET", "designation": "Head of Department"}}
    )
    print(f"Updated {res.modified_count} documents.")

    # Also make sure there are no other accidental mock HOD001 users interfering
    # Actually, we can leave HOD001 for test purposes, but just verify.

if __name__ == "__main__":
    asyncio.run(main())
