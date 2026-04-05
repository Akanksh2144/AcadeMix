import asyncio
import os
import certifi
import pandas as pd
import bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

def get_password_hash(password):
    # Passlib bcrypt hashes normally use £2b prefix, bcrypt uses $2b
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def main():
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        print("Missing MONGO_URL or DB_NAME")
        return
        
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
    db = client[db_name]
    
    print("Deleting existing student mock data aggressively...")
    result = await db.users.delete_many({"id": {"$nin": ["A001", "T001", "HOD001", "A002", "T002"]}})
    print(f"Deleted {result.deleted_count} records.")
    
    print("Reading ET department Excel file...")
    df = pd.read_excel('c:/AcadMix/sample_data/ET department(1).xlsx')
    
    # Drop duplicates to prevent BulkWriteError on _id (HT No)
    df = df.drop_duplicates(subset=['H.T.NO.'])
    
    students = []
    for _, row in df.iterrows():
        try:
            roll_no = str(row['H.T.NO.']).strip().upper()
            if not roll_no or roll_no == 'NAN':
                continue
            
            name = str(row['Name of the Student']).strip()
            branch = str(row['Branch']).strip()
            
            # Batch inference: 22 -> 2026. 
            # Or statically 2026 if all are 2026 batch. Let's use 2026 statically as requested.
            batch = "2026"
            if len(roll_no) >= 2 and roll_no[:2].isdigit():
                batch = str(2000 + int(roll_no[:2]) + 4)
                
            student = {
                "id": roll_no,
                "college_id": roll_no,
                "role": "student",
                "name": name,
                "email": f"{roll_no.lower()}@gniindia.org",
                "hashed_password": get_password_hash(roll_no),
                "department": "ET",
                "batch": batch,
                "section": branch,
                "cgpa": 0.0 # Default starting CGPA
            }
            students.append(student)
        except Exception as e:
            print(f"Error processing row: {e}")
            continue
            
    if students:
        print(f"Inserting {len(students)} ET students...")
        from pymongo.errors import BulkWriteError
        try:
            await db.users.insert_many(students, ordered=False)
            print("Success! Data migration completed.")
        except BulkWriteError as bwe:
            print(f"BulkWriteError details: {bwe.details['writeErrors'][:2]}")
            print(f"Successfully inserted: {bwe.details['nInserted']}")
    else:
        print("No students were parsed from the Excel file.")

if __name__ == "__main__":
    asyncio.run(main())
