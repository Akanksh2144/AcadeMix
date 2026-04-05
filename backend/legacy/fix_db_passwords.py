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
    
    # Rename hashed_password to password_hash
    res = await db.users.update_many(
        {"hashed_password": {"$exists": True}},
        {"$rename": {"hashed_password": "password_hash"}}
    )
    print(f"Renamed {res.modified_count} user objects to use standard 'password_hash'.")

if __name__ == "__main__":
    asyncio.run(main())
