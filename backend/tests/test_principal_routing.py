import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv
from server import review_leave, get_db
from app import models
from server import LeaveReview
from fastapi import HTTPException

load_dotenv()
db_url = os.environ.get('DATABASE_URL')
if not db_url: db_url = 'postgresql+asyncpg://postgres:postgres@localhost:5432/acadmix'
engine = create_async_engine(db_url, connect_args={"statement_cache_size": 0})

async def run_tests():
    async with AsyncSession(engine) as session:
        print("Checking for activity_permissions table...")
        res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='activity_permissions'"))
        table = res.scalar()
        if table:
            print("âœ… PASS: activity_permissions table exists in the database!")
            cols = await session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='activity_permissions'"))
            print("Columns:", [r[0] for r in cols])
        else:
            print("âŒ FAIL: activity_permissions table not found!")

        print("\nTesting Leave Routing Security...")
        college_id = "test_col"
        await session.execute(text(f"INSERT INTO colleges (id, name) VALUES ('{college_id}', 'Test College') ON CONFLICT DO NOTHING"))
        
        principal_id = "prin"
        await session.execute(text(f"INSERT INTO users (id, college_id, email, password_hash, role, name) VALUES ('{principal_id}', '{college_id}', 'prin@t.com', 'pwd', 'principal', 'Prin') ON CONFLICT DO NOTHING"))
        
        hod1_id = "hod1"
        await session.execute(text(f"INSERT INTO users (id, college_id, email, password_hash, role, name) VALUES ('{hod1_id}', '{college_id}', 'h1@t.com', 'pwd', 'hod', 'HOD1') ON CONFLICT DO NOTHING"))
        
        hod2_id = "hod2"
        await session.execute(text(f"INSERT INTO users (id, college_id, email, password_hash, role, name) VALUES ('{hod2_id}', '{college_id}', 'h2@t.com', 'pwd', 'hod', 'HOD2') ON CONFLICT DO NOTHING"))
        
        leave_id = "leave_test"
        await session.execute(text(f"INSERT INTO leave_requests (id, college_id, applicant_id, applicant_role, leave_type, from_date, to_date, status) VALUES ('{leave_id}', '{college_id}', '{hod1_id}', 'hod', 'AL', '2025-01-01', '2025-01-02', 'pending') ON CONFLICT DO NOTHING"))
        await session.commit()
        
        req = LeaveReview(action="approve", remarks="OK")
        
        malicious_user = {"id": hod2_id, "role": "hod", "college_id": college_id}
        try:
            await review_leave(leave_id, req, malicious_user, session)
            print("âŒ FAIL: HOD approved HOD leave! Constraint Failed!")
        except HTTPException as e:
            if e.status_code == 403:
                print("âœ… PASS: HOD was blocked with 403 Forbidden:", e.detail)
            else:
                print(f"âŒ FAIL: Expected 403 but got {e.status_code}: {e.detail}")
                
        principal_user = {"id": principal_id, "role": "principal", "college_id": college_id}
        try:
            await session.execute(text(f"UPDATE leave_requests SET status='pending' WHERE id='{leave_id}'"))
            await session.commit()
            
            res = await review_leave(leave_id, req, principal_user, session)
            print("âœ… PASS: Principal successfully approved HOD leave!", res)
        except Exception as e:
            print("âŒ FAIL: Principal got error:", str(e))
            
        await session.execute(text(f"DELETE FROM leave_requests WHERE id='{leave_id}'"))
        await session.execute(text(f"DELETE FROM users WHERE id IN ('{principal_id}', '{hod1_id}', '{hod2_id}')"))
        await session.execute(text(f"DELETE FROM colleges WHERE id='{college_id}'"))
        await session.commit()

asyncio.run(run_tests())
