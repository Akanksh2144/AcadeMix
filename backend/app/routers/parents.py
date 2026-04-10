"""
Parents Router — thin HTTP layer delegating to ParentService.
"""

from fastapi.responses import HTMLResponse
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.core.security import require_role
from app.services.parent_service import ParentService

router = APIRouter()


def get_parent_service(session: AsyncSession = Depends(get_db)):
    return ParentService(session)


@router.get("/parent/children")
async def get_parent_children(
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    """List all students linked to this parent."""
    return await svc.get_my_children(user["college_id"], user["id"])


@router.get("/parent/children/{student_id}/academics")
async def parent_child_academics(
    student_id: str,
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    return await svc.get_academics(user, student_id)


@router.get("/parent/children/{student_id}/attendance")
async def parent_child_attendance(
    student_id: str,
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    return await svc.get_attendance(user, student_id)


@router.get("/parent/children/{student_id}/timetable")
async def parent_child_timetable(
    student_id: str,
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    return await svc.get_timetable(user, student_id)


@router.get("/parent/children/{student_id}/subjects")
async def parent_child_subjects(
    student_id: str,
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    return await svc.get_subjects(user, student_id)


@router.get("/parent/children/{student_id}/exam-schedule")
async def parent_child_exam_schedule(
    student_id: str,
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    return await svc.get_exam_schedule(user, student_id)


@router.get("/parent/children/{student_id}/leaves")
async def parent_child_leaves(
    student_id: str,
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    return await svc.get_leaves(user, student_id)


@router.get("/parent/children/{student_id}/faculty-contacts")
async def parent_child_faculty(
    student_id: str,
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    return await svc.get_faculty_contacts(user, student_id)


@router.get("/parent/children/{student_id}/mentor")
async def parent_child_mentor(
    student_id: str,
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    return await svc.get_mentor(user, student_id)


@router.get("/parent/children/{student_id}/progress-report", response_class=HTMLResponse)
async def parent_progress_report(
    student_id: str,
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    html = await svc.get_progress_report_html(user, student_id)
    return HTMLResponse(content=html)


@router.put("/parent/notification-preferences")
async def update_notification_prefs(
    prefs: dict = Body(...),
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    await svc.update_notification_prefs(user["id"], prefs)
    return {"message": "Notification preferences updated"}


@router.get("/parent/ward-info")
async def get_ward_info(
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    return await svc.get_ward_info(user)


@router.get("/parent/attendance")
async def get_ward_attendance_generic(
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    return await svc.get_ward_attendance(user)


@router.get("/parent/scholarships")
async def get_ward_scholarships(
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    return await svc.get_ward_scholarships(user)


@router.get("/parent/placements")
async def get_ward_placements(
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    return await svc.get_ward_placements(user)


@router.get("/parent/grades")
async def get_ward_grades(
    user: dict = Depends(require_role("parent")),
    svc: ParentService = Depends(get_parent_service)
):
    return await svc.get_ward_grades(user)
