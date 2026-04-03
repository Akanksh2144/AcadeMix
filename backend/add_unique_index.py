import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv('.env')

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "AcadeMix")

async def main():
    if not MONGO_URL:
        print("MONGO_URL not found in .env")
        return
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("Creating unique index on quiz_attempts: {quiz_id: 1, student_id: 1, attempt_number: 1}...")
    await db.quiz_attempts.create_index(
        [("quiz_id", 1), ("student_id", 1), ("attempt_number", 1)],
        unique=True
    )
    print("Index created successfully!")

if __name__ == "__main__":
    asyncio.run(main())
