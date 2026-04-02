import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def migrate():
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    DB_NAME = os.getenv("DB_NAME", "academix")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # The old department values that should become section values under ET
    OLD_DEPTS = ["DS", "CS", "IT", "AIML", "CSE", "CSM", "CSD", "CSC", "ECE"]
    
    # 1. Migrate teachers from old depts to ET
    # Only GNITC teachers or teachers with no college (seed data from quizportal)
    result = await db.users.update_many(
        {"role": "teacher", "department": {"$in": OLD_DEPTS}},
        [{"$set": {
            "section": "$department",
            "department": "ET"
        }}]
    )
    print(f"Teachers migrated: {result.modified_count}")
    
    # 2. Migrate faculty_assignments from old depts to ET
    result = await db.faculty_assignments.update_many(
        {"department": {"$in": OLD_DEPTS}},
        [{"$set": {
            "section": "$department",
            "department": "ET"
        }}]
    )
    print(f"Faculty assignments migrated: {result.modified_count}")
    
    # 3. Migrate mark_entries from old depts to ET
    result = await db.mark_entries.update_many(
        {"department": {"$in": OLD_DEPTS}},
        [{"$set": {
            "section": "$department",
            "department": "ET"
        }}]
    )
    print(f"Mark entries migrated: {result.modified_count}")
    
    # 4. Migrate endterm_entries from old depts to ET
    result = await db.endterm_entries.update_many(
        {"department": {"$in": OLD_DEPTS}},
        [{"$set": {
            "section": "$department",
            "department": "ET"
        }}]
    )
    print(f"Endterm entries migrated: {result.modified_count}")
    
    # Verify
    teacher_count = await db.users.count_documents({"role": {"$in": ["teacher", "hod"]}, "department": "ET"})
    assign_count = await db.faculty_assignments.count_documents({"department": "ET"})
    mark_count = await db.mark_entries.count_documents({"department": "ET"})
    print(f"\n=== Post-migration ET counts ===")
    print(f"  Teachers+HOD: {teacher_count}")
    print(f"  Faculty Assignments: {assign_count}")
    print(f"  Mark Entries: {mark_count}")

if __name__ == "__main__":
    asyncio.run(migrate())
