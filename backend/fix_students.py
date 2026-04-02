import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('.env')
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

async def fix_students():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Update students who have no college field
    # We set college to GNITC and batch to 2026
    result = await db.users.update_many(
        {"role": "student", "college": {"$exists": False}},
        {"$set": {"college": "GNITC", "batch": "2026"}}
    )
    
    print(f"Updated {result.modified_count} students to have college='GNITC' and batch='2026'.")

if __name__ == "__main__":
    asyncio.run(fix_students())
