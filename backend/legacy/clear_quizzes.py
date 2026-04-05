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
        print("Missing MONGO_URL or DB_NAME")
        return
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
    db = client[db_name]
    collections = await db.list_collection_names()
    print("Collections:", collections)
    
    quiz_collections = [c for c in collections if 'quiz' in c]
    print("Quiz-related collections:", quiz_collections)
    
    for c in quiz_collections:
        print(f"Dropping collection {c}...")
        await db[c].drop()
    
    print("Done clearing quizzes.")

if __name__ == "__main__":
    asyncio.run(main())
