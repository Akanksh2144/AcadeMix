import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv('.env')

def distribute():
    client = MongoClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Target distribution
    distribution = {
        "CSC": 17,
        "CSD": 69,
        "CSE": 521,
        "CSM": 154,
        "ECE": 21,
        "IT": 76
    }
    
    # Fetch all students
    students = list(db.users.find({"role": "student"}))
    print(f"Total students found: {len(students)}")
    
    updates = []
    
    student_index = 0
    total_distributed = 0
    
    # Assign exactly the number requested
    for section, count in distribution.items():
        for _ in range(count):
            if student_index < len(students):
                student_id = students[student_index]["_id"]
                updates.append({
                    "q": {"_id": student_id},
                    "limit": 1,
                    "u": {"$set": {"department": "ET", "section": section}}
                })
                student_index += 1
                total_distributed += 1
                
    # If there are left over students, just assign them to CSE to not leave them hanging
    while student_index < len(students):
        student_id = students[student_index]["_id"]
        updates.append({
            "q": {"_id": student_id},
            "limit": 1,
            "u": {"$set": {"department": "ET", "section": "CSE"}}
        })
        student_index += 1
        total_distributed += 1
        
    print(f"Total distributed updates prepared: {len(updates)}")
    
    if updates:
        # We can do this with bulk_write but let's just do an update_many loop or raw command
        for batch in range(0, len(updates), 100):
            db.command({
                "update": "users",
                "updates": updates[batch:batch+100]
            })
            
    # Verify
    pipeline = [
        {"$match": {"role": "student"}},
        {"$group": {"_id": "$section", "count": {"$sum": 1}}}
    ]
    results = list(db.users.aggregate(pipeline))
    print("New distribution in DB:")
    for r in results:
        print(f"  {r['_id']}: {r['count']}")
        
if __name__ == "__main__":
    distribute()
