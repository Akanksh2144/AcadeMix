"""
Nodal Router — thin HTTP layer delegating to NodalService.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional

from database import get_db
from app.core.security import require_role, get_current_user
from app.services.nodal_service import NodalService

nodal_router = APIRouter()


def get_nodal_service(session: AsyncSession = Depends(get_db)):
    return NodalService(session)


# ── Nodal Officer Facing Endpoints ─────────────────────────────────────────

@nodal_router.get("/nodal/colleges")
async def get_nodal_colleges(
    user=Depends(require_role("nodal_officer")),
    svc: NodalService = Depends(get_nodal_service)
):
    return {"data": await svc.get_colleges(user["id"])}


@nodal_router.get("/nodal/reports/attendance-compliance")
async def get_nodal_attendance(
    user=Depends(require_role("nodal_officer")),
    svc: NodalService = Depends(get_nodal_service)
):
    return {"data": await svc.get_attendance_compliance(user["id"])}


@nodal_router.get("/nodal/reports/results-status")
async def get_nodal_results(
    user=Depends(require_role("nodal_officer")),
    svc: NodalService = Depends(get_nodal_service)
):
    return {"data": await svc.get_results_status(user["id"])}


@nodal_router.get("/nodal/reports/cia-submission")
async def get_nodal_cia_submission(
    user=Depends(require_role("nodal_officer")),
    svc: NodalService = Depends(get_nodal_service)
):
    return {"data": await svc.get_cia_submission(user["id"])}


@nodal_router.get("/nodal/reports/faculty-profiles")
async def get_nodal_faculty_profiles(
    user=Depends(require_role("nodal_officer")),
    svc: NodalService = Depends(get_nodal_service)
):
    return {"data": await svc.get_faculty_profiles(user["id"])}


@nodal_router.get("/nodal/reports/accreditation")
async def get_nodal_accreditation(
    user=Depends(require_role("nodal_officer")),
    svc: NodalService = Depends(get_nodal_service)
):
    return {"data": await svc.get_accreditation(user["id"])}


@nodal_router.get("/nodal/activity-reports")
async def get_nodal_activities(
    user=Depends(require_role("nodal_officer")),
    svc: NodalService = Depends(get_nodal_service)
):
    return {"data": await svc.get_activity_reports(user["id"])}


class AcknowledgePayload(BaseModel):
    notes: str


@nodal_router.put("/nodal/activity-reports/{report_id}/acknowledge")
async def ack_nodal_activity(
    report_id: str,
    payload: AcknowledgePayload,
    user=Depends(require_role("nodal_officer")),
    svc: NodalService = Depends(get_nodal_service)
):
    await svc.acknowledge_activity(report_id, payload.notes)
    return {"success": True}


class CircularPayload(BaseModel):
    title: str
    content: str
    document_url: str
    is_mandatory: bool
    target_colleges: list


@nodal_router.post("/nodal/circulars")
async def create_circular(
    payload: CircularPayload,
    user=Depends(require_role("nodal_officer")),
    svc: NodalService = Depends(get_nodal_service)
):
    uid = await svc.create_circular(user["id"], payload.model_dump())
    return {"success": True, "id": uid}


@nodal_router.get("/nodal/circulars")
async def get_nodal_circulars(
    skip: int = 0,
    limit: int = 100,
    user=Depends(require_role("nodal_officer")),
    svc: NodalService = Depends(get_nodal_service)
):
    return {"data": await svc.get_circulars(user["id"], skip, limit)}


class RequirementPayload(BaseModel):
    title: str
    description: str
    data_type: str
    deadline: str
    target_colleges: list


@nodal_router.post("/nodal/submission-requirements")
async def create_sub_req(
    payload: RequirementPayload,
    user=Depends(require_role("nodal_officer")),
    svc: NodalService = Depends(get_nodal_service)
):
    uid = await svc.create_submission_req(user["id"], payload.model_dump())
    return {"success": True, "id": uid}


@nodal_router.get("/nodal/submissions/status")
async def get_nodal_subs(
    skip: int = 0,
    limit: int = 100,
    user=Depends(require_role("nodal_officer")),
    svc: NodalService = Depends(get_nodal_service)
):
    return {"data": await svc.get_submissions_status(user["id"], skip, limit)}


class AssignExpertPayload(BaseModel):
    expert_user_id: str
    college_id: str
    subject_code: str
    department_id: str
    academic_year: str


@nodal_router.post("/nodal/experts/assign")
async def nodal_expert_assign(
    payload: AssignExpertPayload,
    user=Depends(require_role("nodal_officer")),
    svc: NodalService = Depends(get_nodal_service)
):
    uid = await svc.assign_expert(user["id"], payload.model_dump())
    return {"success": True, "id": uid}


class InspectionPayload(BaseModel):
    college_id: str
    inspection_date: str
    inspection_type: str
    team_members: list
    findings: list
    action_points: list
    compliance_score: float


@nodal_router.post("/nodal/inspections")
async def nodal_inspection(
    payload: InspectionPayload,
    user=Depends(require_role("nodal_officer")),
    svc: NodalService = Depends(get_nodal_service)
):
    uid = await svc.create_inspection(user["id"], payload.model_dump())
    return {"success": True, "id": uid}


@nodal_router.get("/nodal/inspections")
async def get_nodal_inspections(
    skip: int = 0,
    limit: int = 100,
    user=Depends(require_role("nodal_officer")),
    svc: NodalService = Depends(get_nodal_service)
):
    return {"data": await svc.get_inspections(user["id"], skip, limit)}


# ── College Admin Facing Endpoints ─────────────────────────────────────────

@nodal_router.post("/admin/circulars/{circular_id}/acknowledge")
async def admin_ack_circular(
    circular_id: str,
    request: Request,
    user=Depends(require_role("admin", "super_admin")),
    svc: NodalService = Depends(get_nodal_service)
):
    await svc.acknowledge_circular(user["college_id"], user["id"], circular_id)
    return {"success": True}


@nodal_router.get("/admin/circulars")
async def admin_get_circulars(
    request: Request,
    user=Depends(require_role("admin", "super_admin")),
    svc: NodalService = Depends(get_nodal_service)
):
    return {"data": await svc.get_admin_circulars(user["college_id"])}


@nodal_router.get("/admin/submissions")
async def admin_get_submissions(
    request: Request,
    user=Depends(require_role("admin", "super_admin")),
    svc: NodalService = Depends(get_nodal_service)
):
    return {"data": await svc.get_admin_submissions(user["college_id"])}


class SubmitDataPayload(BaseModel):
    submission_url: str


@nodal_router.post("/admin/submissions/{requirement_id}")
async def admin_submit_req(
    requirement_id: str,
    payload: SubmitDataPayload,
    request: Request,
    user=Depends(require_role("admin", "super_admin")),
    svc: NodalService = Depends(get_nodal_service)
):
    await svc.submit_requirement_data(user["college_id"], user["id"], requirement_id, payload.submission_url)
    return {"success": True}


@nodal_router.get("/admin/inspections")
async def admin_get_inspections(
    request: Request,
    user=Depends(require_role("admin", "super_admin")),
    svc: NodalService = Depends(get_nodal_service)
):
    return {"data": await svc.get_admin_inspections(user["college_id"])}


class InspResponsePayload(BaseModel):
    response_text: str


@nodal_router.post("/admin/inspections/{inspection_id}/respond")
async def admin_respond_insp(
    inspection_id: str,
    payload: InspResponsePayload,
    request: Request,
    user=Depends(require_role("admin", "super_admin")),
    svc: NodalService = Depends(get_nodal_service)
):
    await svc.submit_inspection_response(user["college_id"], user["id"], inspection_id, payload.response_text)
    return {"success": True}
