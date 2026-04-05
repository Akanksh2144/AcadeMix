import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv('backend/.env')

async def main():
    db = AsyncIOMotorClient(os.getenv('MONGO_URL'))[os.getenv('DB_NAME')]
    
    # Fix batch for student
    r = await db.users.update_one(
        {'college_id': '22WJ8A6745'},
        {'$set': {'batch': '2026'}}
    )
    print(f"Updated batch for 22WJ8A6745: {r.modified_count}")
    
    # Verify
    u = await db.users.find_one({'college_id': '22WJ8A6745'}, {'batch':1, 'department':1, 'section':1, 'college':1})
    print(f"Verified: batch={u.get('batch')}, dept={u.get('department')}, section={u.get('section')}, college={u.get('college')}")

asyncio.run(main())
