import asyncio
import os
import certifi
import bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

raw_faculty = [
    "Mr. K. Manirathnam Babu",
    "Mrs. V. Anitha",
    "Mr. Ch. Gopi",
    "Mr. D. Gopi Kumar",
    "Mr. K. Raju",
    "Mr. K. Anil Kumar",
    "Mr. M. Dhanraj",
    "Mr. Ch. Nagendra Sai",
    "Ms. Anjaly Santhosh",
    "Mrs. V. Anitha",  # Duplicate
    "Dr. M. I. Tariq Hussain"
]

async def main():
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        print("Missing MONGO_URL or DB_NAME")
        return
        
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
    db = client[db_name]
    
    print("Clearing mark_entries...")
    await db.mark_entries.delete_many({})
    
    print("Clearing faculty_assignments...")
    await db.faculty_assignments.delete_many({})
    
    print("Deleting all 'teacher' mock data...")
    res = await db.users.delete_many({"role": "teacher"})
    print(f"Deleted {res.deleted_count} old teachers.")
    
    # Deduplicate while preserving order
    unique_names = []
    for name in raw_faculty:
        if name not in unique_names:
            unique_names.append(name)
            
    teachers = []
    for i, name in enumerate(unique_names):
        # We start from T001
        tid = f"T{i+1:03d}"
        
        teacher = {
            "id": tid,
            "college_id": tid,
            "role": "teacher",
            "name": name,
            "email": f"faculty{i+1}@gniindia.org",
            "hashed_password": get_password_hash("teacher123"),
            "department": "ET"
        }
        teachers.append(teacher)
        
    if teachers:
        print(f"Inserting {len(teachers)} new teachers...")
        try:
            await db.users.insert_many(teachers, ordered=False)
            print("Successfully injected new faculty base!")
            for t in teachers:
                print(f"{t['id']} | {t['name']} | pass: teacher123")
        except Exception as e:
            print(f"BulkWriteError details: {e}")
            
if __name__ == "__main__":
    asyncio.run(main())
