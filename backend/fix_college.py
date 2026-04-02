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
    
    # Update students AND teachers who are missing the 'college' field
    res = await db.users.update_many(
        {"college": {"$exists": False}},
        {"$set": {"college": "GNITC"}}
    )
    print(f"Patched {res.modified_count} user objects to have college='GNITC'.")

if __name__ == "__main__":
    asyncio.run(main())
