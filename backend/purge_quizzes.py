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
    
    res1 = await db.quizzes.delete_many({})
    res2 = await db.quiz_attempts.delete_many({})
    print(f"Deleted {res1.deleted_count} quizzes and {res2.deleted_count} quiz attempts.")

if __name__ == "__main__":
    asyncio.run(main())
