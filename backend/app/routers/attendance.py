from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from database import get_db
from app.core.security import get_current_user
from app.core.security import require_role
from app.services.attendance_service import AttendanceService
import app.schemas as server_schemas
from app.schemas import *

router = APIRouter()

def get_attendance_service(session: AsyncSession = Depends(get_db)):
    return AttendanceService(session)

@router.get("/faculty/attendance/today")
async def get_today_attendance_status(
    user: dict = Depends(require_role("teacher", "faculty", "hod")), 
    svc: AttendanceService = Depends(get_attendance_service)
):
    b_acad_year = None
    try:
        from server import get_current_academic_year
        b_acad_year = await get_current_academic_year(svc.session, user["college_id"])
    except Exception:
        pass
    return await svc.get_today_faculty_status(user, b_acad_year)

@router.post("/faculty/attendance/mark")
async def mark_attendance_batch(
    req: server_schemas.AttendanceMarkBatch, 
    user: dict = Depends(require_role("teacher", "faculty", "hod")), 
    svc: AttendanceService = Depends(get_attendance_service)
):
    return await svc.mark_batch(req, user)

@router.get("/student/attendance")
async def get_student_consolidated_attendance(
    user: dict = Depends(require_role("student")), 
    svc: AttendanceService = Depends(get_attendance_service)
):
    return await svc.get_student_consolidated(user["id"])

@router.get("/student/attendance/detail")
async def get_student_attendance_detail(
    subject_code: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    user: dict = Depends(require_role("student")),
    svc: AttendanceService = Depends(get_attendance_service)
):
    return await svc.get_student_detail(user["id"], subject_code, month, year)

@router.get("/student/attendance/calendar")
async def get_student_attendance_calendar(
    month: Optional[int] = None,
    year: Optional[int] = None,
    user: dict = Depends(require_role("student")),
    svc: AttendanceService = Depends(get_attendance_service)
):
    return await svc.get_student_calendar(user["id"], month, year)

@router.get("/hod/attendance/defaulters")
async def get_attendance_defaulters(
    threshold: float = 75.0,
    academic_year: Optional[str] = None,
    user: dict = Depends(require_role("hod", "admin")),
    svc: AttendanceService = Depends(get_attendance_service)
):
    dept_id = user.get("profile_data", {}).get("department_id", "")
    return await svc.get_defaulters(user["college_id"], dept_id, threshold)

@router.put("/admin/override-attendance")
async def override_student_attendance(
    subject_code: str,
    student_id: str,
    req: server_schemas.AttendanceOverride,
    user: dict = Depends(require_role("teacher", "hod")),
    svc: AttendanceService = Depends(get_attendance_service)
):
    return await svc.override_attendance(subject_code, student_id, req, user)
