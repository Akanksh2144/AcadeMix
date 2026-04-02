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
    
    docs = await db.users.find({}).to_list(100)
    for d in docs:
        if d.get("role") == "hod":
            print("HOD:", d.get('name'), d.get('college_id'))
        if d.get("name") == "Dr. M. I. Tariq Hussain" or d.get("role") == "teacher":
            pass # print("Teacher:", d.get('name'))

if __name__ == "__main__":
    asyncio.run(main())
