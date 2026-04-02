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
    
    # We want to remove all old mock HODs.
    # Tariq Hussain has college_id "T010". So we delete all roles "hod" except him.
    res = await db.users.delete_many({
        "role": "hod",
        "college_id": {"$ne": "T010"}
    })
    
    print(f"Purged {res.deleted_count} mock HOD accounts from the system (like Dr. Venkat Rao, etc).")
    
    # Let's verify who is left as HOD
    left = await db.users.find({"role": "hod"}).to_list(10)
    print("Remaining HODs in system:")
    for doc in left:
        print(f"- {doc.get('name')} (ID: {doc.get('college_id')}, Dept: {doc.get('department')})")
        
    # Let's verify who is left as Teacher
    teachers = await db.users.find({"role": "teacher"}).to_list(100)
    print(f"\nRemaining teachers in system: {len(teachers)}")

if __name__ == "__main__":
    asyncio.run(main())
