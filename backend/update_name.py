import os, asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def main():
    load_dotenv(".env")
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    res = await db.users.update_one(
        {"email": "venkat.hod@gnitc.edu"},
        {"$set": {"name": "Dr. M. I. Tariq Hussain"}}
    )
    print("Matched:", res.matched_count, "Modified:", res.modified_count)

asyncio.run(main())
