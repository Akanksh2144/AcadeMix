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

@router.get("/results/semester/{student_id}")
async def get_semester_results(student_id: str, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if user["role"] == "student" and user["id"] != student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await session.execute(
        select(models.SemesterGrade)
        .where(models.SemesterGrade.student_id == student_id)
        .order_by(models.SemesterGrade.semester.asc())
    )
    rows = result.scalars().all()
    from collections import defaultdict
    sem_map = defaultdict(list)
    for row in rows:
        sem_map[row.semester].append({"course_id": row.course_id, "grade": row.grade, "credits": row.credits_earned})
    return [
        {"student_id": student_id, "semester": sem, "subjects": subjects}
        for sem, subjects in sorted(sem_map.items())
    ]


@router.post("/results/semester")
async def create_semester_result(req: SemesterResultCreate, user: dict = Depends(require_role("teacher", "admin")), session: AsyncSession = Depends(get_db)):
    for subj in req.subjects:
        row = models.SemesterGrade(
            student_id=req.student_id,
            semester=req.semester,
            course_id=subj.get("code", subj.get("name", "UNKNOWN")),
            grade=subj.get("grade", "O"),
            credits_earned=int(subj.get("credits", 3)),
        )
        session.add(row)
    await session.commit()
    return {"message": "Semester result saved", "semester": req.semester, "student_id": req.student_id}
