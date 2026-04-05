import asyncio
import os
import certifi
from dotenv import load_dotenv
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parent / '.env')

async def test():
    url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(url, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=15000)
    db = client[db_name]
    n = await db.users.count_documents({})
    print(f"Connected! Users: {n}")
    client.close()

asyncio.run(test())
