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

@router.get("/timetable")
async def get_timetable(section: str, semester: int = 3, academic_year: str = "2024-25", user: dict = Depends(require_role("hod", "admin", "teacher", "student")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(models.Timetable).where(
            models.Timetable.college_id == user["college_id"],
            models.Timetable.semester == semester,
            models.Timetable.academic_year == academic_year,
        )
    )
    slots = result.scalars().all()
    return [{
        "id": s.id, "day": s.day, "time_slot": s.time_slot, "room": s.room,
        "semester": s.semester, "course_id": s.course_id, "faculty_id": s.faculty_id,
        "department_id": s.department_id
    } for s in slots]


@router.post("/timetable")
async def save_timetable_slot(req: TimetableSlot, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    # 1. Validate against FacultyAssignment (Explicit DB Link resolving point 5)
    assignment_r = await session.execute(
        select(models.FacultyAssignment).where(
            models.FacultyAssignment.teacher_id == req.teacher_id,
            models.FacultyAssignment.subject_code == req.subject_code,
            models.FacultyAssignment.college_id == user["college_id"]
        )
    )
    assignment = assignment_r.scalars().first()
    if not assignment:
        raise HTTPException(status_code=400, detail="Invalid timetable slot: Teacher is not assigned to this subject code.")

    existing_r = await session.execute(
        select(models.Timetable).where(
            models.Timetable.college_id == user["college_id"],
            models.Timetable.day == req.day,
            models.Timetable.time_slot == str(req.period),
            models.Timetable.semester == req.semester,
        )
    )
    existing = existing_r.scalars().first()
    if existing:
        existing.course_id = req.subject_code
        existing.faculty_id = req.teacher_id
        existing.room = ""
        await session.commit()
        return {"id": existing.id, "day": existing.day, "time_slot": existing.time_slot, "course_id": existing.course_id}
        
    slot = models.Timetable(
        college_id=user["college_id"],
        department_id="", 
        course_id=req.subject_code,
        faculty_id=req.teacher_id,
        semester=req.semester,
        day=req.day,
        time_slot=str(req.period),
        room="",
    )
    # Look up real department UUID based on the assignment, fundamentally decoupling it from User session state.
    dept_r = await session.execute(
        select(models.Department).where(
            models.Department.college_id == user["college_id"],
            or_(models.Department.code == assignment.department, models.Department.name == assignment.department)
        )
    )
    dept = dept_r.scalars().first()
    if dept:
        slot.department_id = dept.id
    else:
        raise HTTPException(status_code=400, detail=f"Department '{assignment.department}' not found. Create it first.")

    session.add(slot)
    await session.commit()
    await session.refresh(slot)
    return {"id": slot.id, "day": slot.day, "time_slot": slot.time_slot, "course_id": slot.course_id}


@router.delete("/timetable/{slot_id}")
async def delete_timetable_slot(slot_id: str, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Timetable).where(models.Timetable.id == slot_id, models.Timetable.college_id == user["college_id"]))
    slot = result.scalars().first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    await session.delete(slot)
    await session.commit()
    return {"message": "Slot deleted"}
