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


@router.post("/hod/subject-allocation")
async def create_subject_allocation(req: FacultyAssignment, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    """HOD assigns a faculty member to a subject + batch + section."""
    # Verify teacher exists in same college
    teacher_r = await session.execute(
        select(models.User).where(models.User.id == req.teacher_id, models.User.college_id == user["college_id"])
    )
    if not teacher_r.scalars().first():
        raise HTTPException(status_code=404, detail="Teacher not found in this college")

    course_r = await session.execute(
        select(models.Course).where(
            models.Course.subject_code == req.subject_code,
            models.Course.college_id == user["college_id"]
        )
    )
    if not course_r.scalars().first():
        raise HTTPException(status_code=400, detail=f"Subject code '{req.subject_code}' does not exist in the Course master catalog for this college. Please add it first.")

    new_assign = models.FacultyAssignment(
        college_id=user["college_id"],
        teacher_id=req.teacher_id,
        subject_code=req.subject_code,
        subject_name=req.subject_name,
        department=req.department,
        batch=req.batch,
        section=req.section,
        semester=req.semester,
        academic_year=req.academic_year,
        credits=req.credits,
        hours_per_week=req.hours_per_week,
        is_lab=req.is_lab,
    )
    session.add(new_assign)
    await log_audit(session, user["id"], "subject_allocation", "create",
                    {"subject": req.subject_code, "teacher": req.teacher_id})
    await session.commit()
    await session.refresh(new_assign)
    return {"id": new_assign.id, "message": "Allocation created"}


@router.get("/hod/subject-allocation")
async def list_subject_allocations(
    academic_year: Optional[str] = None,
    semester: Optional[int] = None,
    user: dict = Depends(require_role("hod", "admin")),
    session: AsyncSession = Depends(get_db)
):
    """HOD views the full subject allocation matrix for their college."""
    stmt = select(models.FacultyAssignment).where(
        models.FacultyAssignment.college_id == user["college_id"]
    )
    if academic_year:
        stmt = stmt.where(models.FacultyAssignment.academic_year == academic_year)
    if semester:
        stmt = stmt.where(models.FacultyAssignment.semester == semester)
    result = await session.execute(stmt)
    assigns = result.scalars().all()
    matrix = {}
    for a in assigns:
        if a.subject_code not in matrix:
            matrix[a.subject_code] = {
                "subject_code": a.subject_code,
                "subject_name": a.subject_name,
                "credits": a.credits,
                "assignments": []
            }
        matrix[a.subject_code]["assignments"].append({
             "id": a.id, "teacher_id": a.teacher_id, "department": a.department, 
             "batch": a.batch, "section": a.section, "semester": a.semester, 
             "academic_year": a.academic_year, "hours_per_week": a.hours_per_week, "is_lab": a.is_lab
        })
    return list(matrix.values())


@router.delete("/hod/subject-allocation/{assignment_id}")
async def delete_subject_allocation(assignment_id: str, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    """Remove a subject allocation."""
    result = await session.execute(
        select(models.FacultyAssignment).where(
            models.FacultyAssignment.id == assignment_id,
            models.FacultyAssignment.college_id == user["college_id"]
        )
    )
    row = result.scalars().first()
    if not row:
        raise HTTPException(status_code=404, detail="Allocation not found")
    row.is_deleted = True
    await session.commit()
    return {"message": "Allocation removed"}


@router.get("/faculty/my-subjects")
async def get_my_subjects(
    academic_year: Optional[str] = None,
    user: dict = Depends(require_role("teacher", "faculty", "hod")),
    session: AsyncSession = Depends(get_db)
):
    """Faculty sees their own allocated subjects for the semester."""
    if not academic_year:
        academic_year = await get_current_academic_year(session, user.get("college_id", ""))
    stmt = select(models.FacultyAssignment).where(
        models.FacultyAssignment.teacher_id == user["id"],
        models.FacultyAssignment.academic_year == academic_year
    )
    result = await session.execute(stmt.order_by(models.FacultyAssignment.semester))
    assigns = result.scalars().all()
    return [
        {"id": a.id, "subject_code": a.subject_code, "subject_name": a.subject_name,
         "batch": a.batch, "section": a.section, "semester": a.semester,
         "academic_year": a.academic_year, "credits": a.credits, "is_lab": a.is_lab}
        for a in assigns
    ]



@router.get("/student/subjects")
async def get_student_subjects(
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db)
):
    """Get registered subjects with faculty details for the student."""
    # Get the student's course registrations
    regs_r = await session.execute(
        select(models.CourseRegistration).where(
            models.CourseRegistration.student_id == user["id"],
            models.CourseRegistration.is_deleted == False
        ).order_by(models.CourseRegistration.semester)
    )
    regs = regs_r.scalars().all()

    # Find faculty assignments for matched subjects
    subject_codes = list(set(r.subject_code for r in regs))
    fac_map = {}
    if subject_codes:
        fac_r = await session.execute(
            select(models.FacultyAssignment, models.User).join(
                models.User, models.FacultyAssignment.teacher_id == models.User.id
            ).where(
                models.FacultyAssignment.college_id == user["college_id"],
                models.FacultyAssignment.subject_code.in_(subject_codes),
                models.FacultyAssignment.is_deleted == False
            )
        )
        for fa, u in fac_r.all():
            fac_map[fa.subject_code] = {
                "faculty_name": u.name,
                "credits": fa.credits,
                "hours_per_week": fa.hours_per_week,
                "is_lab": fa.is_lab,
                "subject_name": fa.subject_name
            }

    return [{
        "subject_code": r.subject_code,
        "subject_name": fac_map.get(r.subject_code, {}).get("subject_name", r.subject_code),
        "semester": r.semester,
        "academic_year": r.academic_year,
        "status": r.status,
        "is_arrear": r.is_arrear,
        "faculty_name": fac_map.get(r.subject_code, {}).get("faculty_name", "—"),
        "credits": fac_map.get(r.subject_code, {}).get("credits"),
        "hours_per_week": fac_map.get(r.subject_code, {}).get("hours_per_week"),
        "is_lab": fac_map.get(r.subject_code, {}).get("is_lab", False)
    } for r in regs]
