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
    
    docs = await db.users.count_documents({"college": ""})
    docs_exist = await db.users.count_documents({"college": {"$exists": False}})
    docs_total = await db.users.count_documents({"role": "student"})
    
    print("College == '':", docs)
    print("College missing:", docs_exist)
    print("Total students:", docs_total)

if __name__ == "__main__":
    asyncio.run(main())
