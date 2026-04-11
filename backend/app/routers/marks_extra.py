from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from database import get_db
from app.core.security import get_current_user
from app.core.security import require_role
from app import models
import app.schemas as server_schemas
from app.schemas import *

router = APIRouter()

@router.get("/marks/my-assignments")
async def my_assignments(user: dict = Depends(require_role("teacher", "hod")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(models.FacultyAssignment).where(models.FacultyAssignment.teacher_id == user["id"])
    )
    rows = result.scalars().all()
    return [{"id": r.id, "course_id": r.subject_code, "subject_code": r.subject_code, "subject_name": r.subject_name, "department": r.department, "batch": r.batch, "section": r.section, "semester": r.semester} for r in rows]


@router.get("/marks/submissions")
async def list_submissions(status: Optional[str] = None, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.MarkSubmission).where(models.MarkSubmission.college_id == user["college_id"])
    
    if status:
        stmt = stmt.where(models.MarkSubmission.status == status)
    else:
        stmt = stmt.where(models.MarkSubmission.status.in_(['submitted', 'approved', 'rejected']))
        
    result = await session.execute(stmt)
    submissions = result.scalars().all()
    
    return [{
        "id": r.id, 
        "course_id": r.subject_code, 
        "exam_type": r.exam_type,
        "max_marks": r.max_marks,
        "status": r.status or "draft",
        "faculty_id": r.faculty_id,
        "semester": r.semester,
        "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
        "reviewed_by": r.reviewed_by,
        "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
    } for r in submissions]
