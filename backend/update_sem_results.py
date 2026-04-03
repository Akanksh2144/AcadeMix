import asyncio, os, re, pdfplumber
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv('backend/.env')

# PDF extraction
results_dir = r'c:\AcadMix\results'
# Map: filename -> semester number
file_sem_map = {
    'OverallMarks-Details 1-1.pdf': 1,
    'OverallMarks-Details 1-2.pdf': 2,
    'OverallMarks-Details 2-1.pdf': 3,
    'OverallMarks-Details 2-2.pdf': 4,
    'OverallMarks-Details 3-1.pdf': 5,
    '3-2.pdf': 6,
}

sub_pattern = re.compile(
    r'\d+\s+(22[A-Z0-9]+)\s+(.+?)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\(\d+\)\s+(\S+)\s+([\d.]+)\s+(PASS|FAIL)'
)

all_semesters = {}
for fname, sem in file_sem_map.items():
    path = os.path.join(results_dir, fname)
    with pdfplumber.open(path) as pdf:
        full_text = '\n'.join(p.extract_text() or '' for p in pdf.pages)
    
    sgpa_m = re.findall(r'SGPA\s*:\s*([\d.]+)', full_text)
    cgpa_m = re.findall(r'CGPA\s*:\s*([\d.]+)', full_text)
    
    subjects = []
    for m in sub_pattern.finditer(full_text):
        code, name, grade, credits, status = m.groups()
        subjects.append({
            'code': code.strip(),
            'name': name.strip(),
            'grade': grade.strip(),
            'credits': float(credits),
            'status': status.strip()
        })
    
    all_semesters[sem] = {
        'semester': sem,
        'sgpa': float(sgpa_m[0]) if sgpa_m else 0,
        'cgpa': float(cgpa_m[0]) if cgpa_m else 0,
        'subjects': subjects
    }
    print(f"Sem {sem}: SGPA={all_semesters[sem]['sgpa']}, CGPA={all_semesters[sem]['cgpa']}, {len(subjects)} subjects")


async def main():
    db = AsyncIOMotorClient(os.getenv('MONGO_URL'))[os.getenv('DB_NAME')]
    student_id = '69ce6e1475b1f2a5a7bf6bcb'
    
    # Delete old results
    r = await db.semester_results.delete_many({'student_id': student_id})
    print(f"Deleted {r.deleted_count} old records")
    
    # Insert all 6 semesters
    docs = []
    for sem in sorted(all_semesters.keys()):
        data = all_semesters[sem]
        docs.append({
            'student_id': student_id,
            'semester': data['semester'],
            'sgpa': data['sgpa'],
            'cgpa': data['cgpa'],
            'subjects': data['subjects'],
            'created_at': datetime.now(timezone.utc)
        })
    
    result = await db.semester_results.insert_many(docs)
    print(f"Inserted {len(result.inserted_ids)} semester results")
    
    # Verify
    for d in docs:
        print(f"  Sem {d['semester']}: SGPA={d['sgpa']}, CGPA={d['cgpa']}, {len(d['subjects'])} subjects")

asyncio.run(main())
