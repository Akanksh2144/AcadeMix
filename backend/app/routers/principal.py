"""
Principal Router — thin HTTP layer delegating to PrincipalService.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database import get_db
from app.core.security import get_current_user, require_role
from app import models
from app.schemas.administrative import InstitutionProfileUpdate
from app.services.principal_service import PrincipalService

router = APIRouter()


def get_principal_service(session: AsyncSession = Depends(get_db)):
    return PrincipalService(session)


@router.get("/principal/institution-profile")
async def get_institution_profile(
    user: dict = Depends(require_role("admin", "principal")),
    svc: PrincipalService = Depends(get_principal_service)
):
    return await svc.get_institution_profile(user["college_id"])


@router.put("/principal/institution-profile")
async def update_institution_profile(
    req: InstitutionProfileUpdate,
    user: dict = Depends(require_role("admin", "principal")),
    svc: PrincipalService = Depends(get_principal_service)
):
    await svc.update_institution_profile(
        user["college_id"], user["id"], req.model_dump(exclude_unset=True)
    )
    return {"message": "Institution profile updated successfully"}


@router.get("/principal/dashboard")
async def get_principal_dashboard_summary(
    user: dict = Depends(require_role("principal", "admin")),
    svc: PrincipalService = Depends(get_principal_service)
):
    return await svc.get_dashboard_summary(user["college_id"])


@router.post("/principal/calendar-events")
async def add_principal_calendar_event(
    req: dict = Body(...),
    user: dict = Depends(require_role("principal", "admin")),
    svc: PrincipalService = Depends(get_principal_service)
):
    new_event = {
        "date": req.get("date"),
        "type": req.get("type", "principal_event"),
        "title": req.get("title", "Institutional Event"),
        "description": req.get("description", "")
    }
    await svc.add_calendar_event(user["college_id"], new_event)
    return {"message": "Event added to institutional calendar successfully"}


@router.get("/principal/reports/academic-performance")
async def get_academic_performance(
    semester: int,
    academic_year: Optional[str] = None,
    user: dict = Depends(require_role("principal", "admin")),
    svc: PrincipalService = Depends(get_principal_service)
):
    return await svc.get_academic_performance(user["college_id"], semester)


@router.get("/principal/reports/attendance-compliance")
async def get_attendance_compliance(
    academic_year: str,
    user: dict = Depends(require_role("principal", "admin")),
    svc: PrincipalService = Depends(get_principal_service)
):
    return await svc.get_attendance_compliance(user["college_id"], academic_year)


@router.get("/principal/reports/staff-profiles")
async def get_staff_profiles_status(
    user: dict = Depends(require_role("principal", "admin")),
    svc: PrincipalService = Depends(get_principal_service)
):
    return await svc.get_staff_profiles_status(user["college_id"])


@router.put("/principal/grievances/{grievance_id}/reassign")
async def reassign_grievance(
    grievance_id: str,
    req: dict = Body(...),
    user: dict = Depends(require_role("principal", "admin")),
    svc: PrincipalService = Depends(get_principal_service)
):
    dept_name = await svc.reassign_grievance(
        user["college_id"], grievance_id, req.get("department_id", "")
    )
    return {"message": f"Grievance reassigned to HOD of {dept_name}"}


@router.get("/principal/infrastructure")
async def get_principal_infrastructure(
    user: dict = Depends(require_role("principal", "admin")),
    svc: PrincipalService = Depends(get_principal_service)
):
    prof = await svc.get_institution_profile(user["college_id"])
    return prof.get("infrastructure", {})


@router.get("/principal/reports/extension-activities")
async def get_extension_activities(
    user: dict = Depends(require_role("principal", "admin")),
    svc: PrincipalService = Depends(get_principal_service)
):
    return await svc.get_extension_activities(user["college_id"])


@router.get("/principal/reports/placement")
async def get_principal_placement(
    user: dict = Depends(require_role("principal", "admin"))
):
    return {
        "total_placed": 0,
        "average_ctc": 0,
        "department_breakdown": [],
        "academic_year": None
    }


@router.get("/principal/reports/annual")
async def get_annual_report_consolidation(
    academic_year: str,
    user: dict = Depends(require_role("principal", "admin")),
    svc: PrincipalService = Depends(get_principal_service)
):
    return await svc.get_annual_consolidation(user, academic_year)


# ── Simple Queries Kept Inline ───────────────────────────────────────────────

@router.get("/principal/leave/pending")
async def get_pending_hod_leaves(
    user: dict = Depends(require_role("principal", "admin")),
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(
        select(models.LeaveRequest, models.User).join(
            models.User, models.LeaveRequest.applicant_id == models.User.id
        ).where(
            models.LeaveRequest.college_id == user["college_id"],
            models.LeaveRequest.status.in_(["pending", "cancellation_requested", "partially_cancelled"]),
            models.LeaveRequest.applicant_role == "hod"
        )
    )
    rows = result.all()
    return [{
        "id": l.id, "applicant_id": l.applicant_id, "applicant_name": u.name, "applicant_email": u.email,
        "applicant_department": u.profile_data.get("department") if u.profile_data else "Unknown",
        "leave_type": l.leave_type, "from_date": l.from_date.isoformat(), "to_date": l.to_date.isoformat(),
        "reason": l.reason, "document_url": l.document_url, "created_at": l.created_at.isoformat()
    } for l, u in rows]


@router.get("/principal/activity-reports")
async def get_principal_activity_reports(
    user: dict = Depends(require_role("principal", "admin")),
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(
        select(models.ActivityPermission, models.User).join(
            models.User, models.ActivityPermission.faculty_id == models.User.id
        ).where(
            models.ActivityPermission.college_id == user["college_id"],
            models.ActivityPermission.hod_report_decision == "accepted",
            models.ActivityPermission.principal_noted_at.is_(None)
        )
    )
    rows = result.all()
    return [{
        "id": a.id, "faculty_name": u.name, "department": u.profile_data.get("department") if u.profile_data else "Unknown",
        "activity_type": a.activity_type, "event_title": a.event_title, "event_date": a.event_date.isoformat() if a.event_date else None,
        "phase": a.phase, "created_at": a.created_at.isoformat() if a.created_at else None
    } for a, u in rows]


@router.get("/principal/tasks")
async def get_all_tasks(
    status: Optional[str] = None,
    user: dict = Depends(require_role("principal", "admin")),
    session: AsyncSession = Depends(get_db)
):
    q = select(models.TaskAssignment).where(
        models.TaskAssignment.college_id == user["college_id"],
        models.TaskAssignment.is_deleted == False
    )
    if status:
        q = q.where(models.TaskAssignment.status == status)
    res = await session.execute(q.order_by(models.TaskAssignment.deadline.asc()))
    return res.scalars().all()


@router.get("/principal/meetings")
async def get_all_meetings(
    user: dict = Depends(require_role("principal", "admin")),
    session: AsyncSession = Depends(get_db)
):
    res = await session.execute(
        select(models.DepartmentMeeting).where(
            models.DepartmentMeeting.college_id == user["college_id"],
            models.DepartmentMeeting.is_deleted == False
        ).order_by(models.DepartmentMeeting.date.desc())
    )
    return res.scalars().all()
