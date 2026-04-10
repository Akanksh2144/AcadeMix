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


@router.post("/examcell/registration-window")
async def create_registration_window(req: RegistrationWindowCreate, user: dict = Depends(require_role("exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    try:
        open_dt = datetime.strptime(req.open_at, "%Y-%m-%dT%H:%M")
        close_dt = datetime.strptime(req.close_at, "%Y-%m-%dT%H:%M")
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DDTHH:MM format")

    if close_dt <= open_dt:
        raise HTTPException(status_code=400, detail="close_at must be after open_at")

    # Prevent overlapping windows for the same semester
    dup_r = await session.execute(
        select(models.RegistrationWindow).where(
            models.RegistrationWindow.college_id == user["college_id"],
            models.RegistrationWindow.academic_year == req.academic_year,
            models.RegistrationWindow.semester == req.semester
        )
    )
    if dup_r.scalars().first():
        raise HTTPException(status_code=400, detail="Window already exists for this year and semester")

    window = models.RegistrationWindow(
        college_id=user["college_id"],
        semester=req.semester,
        academic_year=req.academic_year,
        open_at=open_dt,
        close_at=close_dt,
        is_active=False,
        created_by=user["id"]
    )
    session.add(window)
    await session.commit()
    await session.refresh(window)
    return {"id": window.id, "message": "Registration window created"}


@router.get("/examcell/registration-window")
async def get_registration_windows(user: dict = Depends(require_role("exam_cell", "admin", "student")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.RegistrationWindow).where(models.RegistrationWindow.college_id == user["college_id"])
    
    # Students only see active windows
    if user["role"] == "student":
        stmt = stmt.where(models.RegistrationWindow.is_active == True)
        
    result = await session.execute(stmt.order_by(models.RegistrationWindow.created_at.desc()))
    windows = result.scalars().all()
    
    return [{
        "id": w.id, "semester": w.semester, "academic_year": w.academic_year,
        "open_at": w.open_at.isoformat(), "close_at": w.close_at.isoformat(),
        "is_active": w.is_active
    } for w in windows]


@router.put("/examcell/registration-window/{window_id}/toggle")
async def toggle_registration_window(window_id: str, active: bool = True, user: dict = Depends(require_role("exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    window_r = await session.execute(
        select(models.RegistrationWindow).where(
            models.RegistrationWindow.id == window_id,
            models.RegistrationWindow.college_id == user["college_id"]
        )
    )
    window = window_r.scalars().first()
    if not window:
        raise HTTPException(status_code=404, detail="Registration window not found")
        
    window.is_active = active
    await log_audit(session, user["id"], "registration_window", "toggle", {"window_id": window.id, "active": active})
    await session.commit()
    return {"message": f"Window {'opened' if active else 'closed'}"}


@router.post("/student/register-courses")
async def register_courses(req: List[CourseRegistrationSchema], user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    if not req:
        raise HTTPException(status_code=400, detail="No courses provided")
        
    # Check if a registration window is open for the target semester(s)
    semesters = list(set([r.semester for r in req]))
    academic_years = list(set([r.academic_year for r in req]))
    
    now = datetime.now()
    window_r = await session.execute(
        select(models.RegistrationWindow).where(
            models.RegistrationWindow.college_id == user["college_id"],
            models.RegistrationWindow.semester.in_(semesters),
            models.RegistrationWindow.academic_year.in_(academic_years),
            models.RegistrationWindow.is_active == True,
            models.RegistrationWindow.open_at <= now,
            models.RegistrationWindow.close_at >= now
        )
    )
    active_windows = window_r.scalars().all()
    active_pairs = [(w.semester, w.academic_year) for w in active_windows]
    
    # Check for duplicates using a single IN clause
    subject_codes = [c.subject_code for c in req]
    dup_r = await session.execute(
        select(models.CourseRegistration.subject_code, models.CourseRegistration.academic_year)
        .where(
            models.CourseRegistration.student_id == user["id"],
            models.CourseRegistration.subject_code.in_(subject_codes)
        )
    )
    existing_pairs = set([(row.subject_code, row.academic_year) for row in dup_r.all()])

    inserted = 0
    for course_data in req:
        # Validate window is open
        if (course_data.semester, course_data.academic_year) not in active_pairs:
            raise HTTPException(status_code=400, detail=f"No active registration window for semester {course_data.semester} ({course_data.academic_year})")
            
        if (course_data.subject_code, course_data.academic_year) not in existing_pairs:
            reg = models.CourseRegistration(
                student_id=user["id"],
                college_id=user["college_id"],
                subject_code=course_data.subject_code,
                semester=course_data.semester,
                academic_year=course_data.academic_year,
                is_arrear=course_data.is_arrear,
                status="registered"
            )
            session.add(reg)
            inserted += 1
            
    await log_audit(session, user["id"], "course_registration", "submit", {"count": inserted})
    await session.commit()
    return {"message": f"Successfully registered for {inserted} courses"}


@router.get("/student/my-registrations")
async def get_my_registrations(user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(models.CourseRegistration).where(
            models.CourseRegistration.student_id == user["id"]
        ).order_by(models.CourseRegistration.academic_year.desc(), models.CourseRegistration.semester.desc())
    )
    regs = result.scalars().all()
    return [{
        "id": r.id, "subject_code": r.subject_code, "semester": r.semester,
        "academic_year": r.academic_year, "is_arrear": r.is_arrear,
        "status": r.status, "registered_at": r.registered_at.isoformat()
    } for r in regs]


@router.get("/examcell/registrations")
async def view_course_registrations(status: Optional[str] = None, user: dict = Depends(require_role("exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.CourseRegistration, models.User).join(
        models.User, models.CourseRegistration.student_id == models.User.id
    ).where(models.CourseRegistration.college_id == user["college_id"])
    
    if status:
        stmt = stmt.where(models.CourseRegistration.status == status)
        
    result = await session.execute(stmt)
    rows = result.all()
    
    return [{
        "id": r.id, "student_id": r.student_id, "student_name": u.name, "student_email": u.email,
        "subject_code": r.subject_code, "semester": r.semester, "academic_year": r.academic_year,
        "is_arrear": r.is_arrear, "status": r.status, "registered_at": r.registered_at.isoformat()
    } for r, u in rows]


@router.put("/examcell/registrations/{reg_id}/approve")
async def approve_registration(reg_id: str, action: str = Query(..., pattern="^(approve|reject)$"), user: dict = Depends(require_role("exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    reg_r = await session.execute(
        select(models.CourseRegistration).where(
            models.CourseRegistration.id == reg_id,
            models.CourseRegistration.college_id == user["college_id"]
        )
    )
    reg = reg_r.scalars().first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
        
    if reg.status != "registered":
        raise HTTPException(status_code=400, detail="Registration is already processed")
        
    reg.status = "approved" if action == "approve" else "rejected"
    reg.reviewed_by = user["id"]
    reg.reviewed_at = datetime.now()
    
    await session.commit()
    return {"message": f"Registration {reg.status}"}


@router.put("/examcell/registrations/bulk-approve")
async def bulk_approve_registrations(semester: int, academic_year: str, user: dict = Depends(require_role("exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    stmt = update(models.CourseRegistration).where(
        models.CourseRegistration.college_id == user["college_id"],
        models.CourseRegistration.semester == semester,
        models.CourseRegistration.academic_year == academic_year,
        models.CourseRegistration.status == "registered"
    ).values(
        status="approved",
        reviewed_by=user["id"],
        reviewed_at=datetime.now()
    )
    
    result = await session.execute(stmt)
    await log_audit(session, user["id"], "course_registration", "bulk_approve", {"semester": semester, "affected": result.rowcount})
    await session.commit()
    
    return {"message": f"Bulk approved {result.rowcount} pending registrations"}


@router.post("/examcell/registrations/manual-add")
async def manual_add_registration(req: ManualRegistrationCreate, user: dict = Depends(require_role("exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    """Allow Exam Cell to explicitly inject a student registration"""
    row = models.CourseRegistration(
        college_id=user["college_id"],
        student_id=req.student_id,
        semester=req.semester,
        academic_year=req.academic_year,
        subject_code=req.subject_code,
        is_arrear=req.is_arrear,
        status="approved" # Automatically approved
    )
    session.add(row)
    await log_audit(session, user["id"], "course_registration", "manual_add", {"student_id": req.student_id, "subject_code": req.subject_code})
    await session.commit()
    return {"message": "Registration added manually."}
