"""
HOD Router — thin HTTP layer delegating to HodService.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.core.security import get_current_user, require_role
from app.schemas.academic import ClassInChargeCreate, MentorAssignmentCreate, StudentProgressionCreate
from app.schemas.administrative import ActivityReview, TaskAssignmentCreate, MeetingCreate
from app.services.hod_service import HodService

router = APIRouter()


def get_hod_service(session: AsyncSession = Depends(get_db)):
    return HodService(session)


@router.get("/hod/at-risk-students")
async def get_at_risk_students(
    cgpa_threshold: float = 5.0,
    backlog_threshold: int = 2,
    user: dict = Depends(require_role("hod", "admin")),
    svc: HodService = Depends(get_hod_service)
):
    return await svc.get_at_risk_students(user["college_id"], cgpa_threshold, backlog_threshold)


@router.get("/hod/assignments/class-in-charge")
async def get_class_in_charges(
    user: dict = Depends(require_role("hod", "admin")),
    svc: HodService = Depends(get_hod_service)
):
    return await svc.get_class_in_charges(user["college_id"])


@router.post("/hod/assignments/class-in-charge")
async def create_class_in_charge(
    req: ClassInChargeCreate,
    user: dict = Depends(require_role("hod", "admin")),
    svc: HodService = Depends(get_hod_service)
):
    count = await svc.assign_class_in_charges(user, req.model_dump())
    return {"message": f"{count} class in-charges assigned"}


@router.delete("/hod/assignments/class-in-charge/{assignment_id}")
async def delete_class_in_charge(
    assignment_id: str,
    user: dict = Depends(require_role("hod", "admin")),
    svc: HodService = Depends(get_hod_service)
):
    await svc.delete_class_in_charge(user["college_id"], assignment_id)
    return {"message": "Assignment deleted"}


@router.get("/hod/assignments/mentors")
async def get_mentor_assignments(
    user: dict = Depends(require_role("hod", "admin")),
    svc: HodService = Depends(get_hod_service)
):
    return await svc.get_mentor_assignments(user["college_id"])


@router.post("/hod/assignments/mentors")
async def create_mentor_assignments(
    req: MentorAssignmentCreate,
    user: dict = Depends(require_role("hod", "admin")),
    svc: HodService = Depends(get_hod_service)
):
    count = await svc.assign_mentors(user, req.model_dump())
    return {"message": f"{count} students assigned to mentor"}


@router.delete("/hod/assignments/mentors/{assignment_id}")
async def deactivate_mentor_assignment(
    assignment_id: str,
    user: dict = Depends(require_role("hod", "admin")),
    svc: HodService = Depends(get_hod_service)
):
    await svc.deactivate_mentor_assignment(user["college_id"], assignment_id)
    return {"message": "Assignment deactivated"}


@router.post("/hod/progression")
async def create_progression(
    req: StudentProgressionCreate,
    user: dict = Depends(require_role("hod", "admin")),
    svc: HodService = Depends(get_hod_service)
):
    prog_id = await svc.create_progression(user, req.model_dump())
    return {"id": prog_id, "message": "Progression record created"}


@router.delete("/hod/progression/{prog_id}")
async def delete_progression(
    prog_id: str,
    user: dict = Depends(require_role("hod", "admin")),
    svc: HodService = Depends(get_hod_service)
):
    await svc.delete_progression(user["college_id"], prog_id)
    return {"message": "Progression record deleted"}


@router.put("/hod/activity-permissions/{permission_id}/review")
async def review_activity_permission(
    permission_id: str,
    req: ActivityReview,
    user: dict = Depends(require_role("hod", "admin")),
    svc: HodService = Depends(get_hod_service)
):
    status = await svc.review_activity_permission(
        user["college_id"], user["id"], permission_id, req.action
    )
    return {"message": f"Activity permission {status}"}


@router.post("/hod/tasks")
async def create_hod_task(
    req: TaskAssignmentCreate,
    user: dict = Depends(require_role("hod", "principal")),
    svc: HodService = Depends(get_hod_service)
):
    task_id = await svc.create_task(user["college_id"], user["id"], req.model_dump())
    return {"message": "Task assigned", "id": task_id}


@router.get("/hod/tasks")
async def get_hod_tasks(
    user: dict = Depends(require_role("hod", "principal")),
    svc: HodService = Depends(get_hod_service)
):
    return await svc.get_tasks(user["college_id"], user["id"])


@router.put("/hod/tasks/{task_id}")
async def update_hod_task(
    task_id: str,
    req: dict = Body(...),
    user: dict = Depends(require_role("hod", "principal")),
    svc: HodService = Depends(get_hod_service)
):
    await svc.update_task(user["college_id"], task_id, req)
    return {"message": "Task updated"}


@router.post("/hod/meetings")
async def create_meeting(
    req: MeetingCreate,
    user: dict = Depends(require_role("hod", "principal")),
    svc: HodService = Depends(get_hod_service)
):
    meeting_id = await svc.create_meeting(user["college_id"], user["id"], req.model_dump())
    return {"message": "Meeting scheduled", "id": meeting_id}


@router.get("/hod/meetings")
async def get_hod_meetings(
    department_id: Optional[str] = None,
    user: dict = Depends(require_role("hod", "principal")),
    svc: HodService = Depends(get_hod_service)
):
    return await svc.get_meetings(user["college_id"], department_id)


@router.put("/hod/meetings/{meeting_id}/minutes")
async def update_meeting_minutes(
    meeting_id: str,
    req: dict = Body(...),
    user: dict = Depends(require_role("hod", "principal")),
    svc: HodService = Depends(get_hod_service)
):
    await svc.update_meeting_minutes(user["college_id"], meeting_id, req)
    return {"message": "Minutes updated"}


@router.get("/hod/free-period-requests")
async def get_pending_free_period_requests(
    user: dict = Depends(require_role("hod")),
    svc: HodService = Depends(get_hod_service)
):
    return await svc.get_pending_free_periods(user["college_id"])


@router.put("/hod/free-period-requests/{req_id}")
async def review_free_period_request(
    req_id: str,
    req: dict = Body(...),
    user: dict = Depends(require_role("hod")),
    svc: HodService = Depends(get_hod_service)
):
    status = await svc.review_free_period(
        user["college_id"], user["id"], req_id, req.get("status", "approved")
    )
    return {"message": f"Request {status}"}
