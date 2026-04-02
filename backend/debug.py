import asyncio
import os
import certifi
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc

async def main():
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
        
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
    db = client[db_name]
    
    dept_query = "ET"
    
    try:
        total_teachers = await db.users.count_documents({"role": "teacher", "department": dept_query})
        total_students = await db.users.count_documents({"role": "student", "department": dept_query})
        total_assignments = await db.faculty_assignments.count_documents({"department": dept_query})
        pending_reviews = await db.mark_entries.count_documents({"department": dept_query, "status": "submitted"})
        approved = await db.mark_entries.count_documents({"department": dept_query, "status": "approved"})
        recent_subs = await db.mark_entries.find({"department": dept_query}).sort("submitted_at", -1).to_list(15)
        published_results = await db.endterm_entries.find({"department": dept_query, "status": "published"}).sort("published_at", -1).to_list(15)
        
        combined = []
        for s in recent_subs:
            item = serialize_doc(s)
            item["activity_type"] = "marks_review"
            combined.append(item)
        for p in published_results:
            item = serialize_doc(p)
            item["activity_type"] = "results_published"
            combined.append(item)
            
        combined.sort(key=lambda x: str(x.get("submitted_at") or x.get("published_at") or ""), reverse=True)
        print("Success! Combined:", combined)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
