"""
Admin Router — thin HTTP layer delegating to AdminService.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.core.security import require_role
from app.schemas.users import ProfileReview
from app.services.admin_service import AdminService

router = APIRouter()


def get_admin_service(session: AsyncSession = Depends(get_db)):
    return AdminService(session)


@router.get("/admin/reports/faculty-research")
async def get_faculty_research_report(
    user: dict = Depends(require_role("admin", "principal")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_faculty_research_report(user["college_id"])


@router.get("/admin/staff-profiles/pending")
async def get_pending_staff_profiles(
    admin: dict = Depends(require_role("admin", "super_admin")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_pending_staff_profiles(admin["college_id"])


@router.put("/admin/staff-profiles/{user_id}/review")
async def review_staff_profile(
    user_id: str,
    req: ProfileReview,
    admin: dict = Depends(require_role("admin", "super_admin")),
    svc: AdminService = Depends(get_admin_service)
):
    await svc.review_staff_profile(
        admin["college_id"], user_id, req.section, req.record_index, req.action, req.remarks
    )
    return {"message": "Profile record reviewed"}


@router.get("/admin/registration-windows/{window_id}/unregistered")
async def get_unregistered_students(
    window_id: str,
    admin: dict = Depends(require_role("admin", "super_admin", "exam_cell")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_unregistered_students(admin["college_id"], window_id)


@router.get("/admin/activity-reports")
async def get_activity_reports(
    admin: dict = Depends(require_role("admin", "super_admin")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_post_activity_reports(admin["college_id"])


@router.get("/admin/dashboard-stats")
async def get_admin_dashboard_stats(
    admin: dict = Depends(require_role("admin", "super_admin")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_dashboard_stats(admin["college_id"])


@router.get("/admin/reports/alumni-outcomes")
async def get_alumni_outcomes(
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_alumni_outcomes(user["college_id"])


@router.post("/admin/parents/link")
async def link_parent_student(
    req: dict = Body(...),
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin")),
    svc: AdminService = Depends(get_admin_service)
):
    await svc.create_parent_link(user["college_id"], req)
    return {"message": "Parent-student link created"}


@router.get("/admin/parents/links")
async def list_parent_links(
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_parent_links(user["college_id"])


@router.get("/admin/grievances")
async def admin_grievances(
    status: Optional[str] = None,
    role: Optional[str] = None,
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin", "hod", "principal")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_grievances(user["college_id"], status, role)


@router.put("/admin/grievances/{grievance_id}/resolve")
async def resolve_grievance(
    grievance_id: str,
    req: dict = Body(...),
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin", "hod")),
    svc: AdminService = Depends(get_admin_service)
):
    status = await svc.resolve_grievance(user["college_id"], user["id"], grievance_id, req)
    return {"message": f"Grievance marked as {status}"}


@router.get("/admin/reports/retired-faculty-research")
async def get_retired_faculty_research_report(
    user: dict = Depends(require_role("admin", "principal")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_retired_faculty_research_report(user["college_id"])


@router.get("/admin/reports/consultancy")
async def get_consultancy_report(
    user: dict = Depends(require_role("admin", "principal")),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.get_consultancy_report(user["college_id"])
