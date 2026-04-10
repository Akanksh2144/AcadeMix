from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional

from database import get_db
from app import models
from app.core.security import get_current_user, require_role
from app.services.leave_service import LeaveService

# We'll need to define the schema imports locally or redefine them.
# The `server.py` currently holds all schemas. Ideally they go in `app/schemas` but until Stage X we can import from `server.py` or redefine here.
# Temporarily re-importing schemas from server.py (or redefining).
# Let's import from server.py which functions as our central schema repository for now.
import app.schemas as server_schemas
from app.schemas import *

router = APIRouter()

def get_leave_service(session: AsyncSession = Depends(get_db)):
    return LeaveService(session)

@router.post("/leave/apply")
async def apply_leave(
    req: server_schemas.LeaveApply, 
    user: dict = Depends(get_current_user), 
    svc: LeaveService = Depends(get_leave_service)
):
    leave = await svc.apply(req, user)
    return {"id": leave.id, "message": "Leave request submitted"}

@router.patch("/leave/{leave_id}/cancel")
async def cancel_leave(
    leave_id: str, 
    req: server_schemas.LeaveCancelRequest, 
    user: dict = Depends(get_current_user), 
    svc: LeaveService = Depends(get_leave_service)
):
    leave = await svc.get_leave(leave_id, applicant_id=user["id"])
    await svc.request_cancellation(leave, req.cancel_from, req.cancel_to, user)
    if not req.cancel_from:
        return {"message": "Pending leave cancelled successfully" if leave.status == "cancelled" else "Cancellation request submitted for HOD approval"}
    return {"message": "Cancellation request submitted for HOD approval"}

@router.get("/leave/my")
async def get_my_leaves(
    user: dict = Depends(require_role("student", "teacher", "faculty", "hod", "principal", "admin", "exam_cell", "super_admin")), 
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(
        select(models.LeaveRequest).where(
            models.LeaveRequest.applicant_id == user["id"],
            models.LeaveRequest.college_id == user["college_id"]
        ).order_by(models.LeaveRequest.created_at.desc())
    )
    leaves = result.scalars().all()
    return [{
        "id": l.id, "leave_type": l.leave_type,
        "from_date": l.from_date.isoformat(), "to_date": l.to_date.isoformat(),
        "reason": l.reason, "status": l.status,
        "reviewed_at": l.reviewed_at.isoformat() if l.reviewed_at else None,
        "review_remarks": l.review_remarks
    } for l in leaves]

@router.get("/hod/leave/pending")
async def get_pending_faculty_leaves(
    user: dict = Depends(require_role("hod", "admin")), 
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(
        select(models.LeaveRequest, models.User).join(
            models.User, models.LeaveRequest.applicant_id == models.User.id
        ).where(
            models.LeaveRequest.college_id == user["college_id"],
            models.LeaveRequest.status.in_(["pending", "cancellation_requested", "partially_cancelled"]),
            models.LeaveRequest.applicant_role.in_(["teacher", "faculty"])
        )
    )
    return [{
        "id": l.id, "applicant_id": l.applicant_id, "applicant_name": u.name, "applicant_email": u.email,
        "leave_type": l.leave_type, "from_date": l.from_date.isoformat(), "to_date": l.to_date.isoformat(),
        "reason": l.reason, "document_url": l.document_url, "created_at": l.created_at.isoformat()
    } for l, u in result.all()]

@router.get("/hod/leave/student-pending")
async def get_pending_student_leaves(
    user: dict = Depends(require_role("hod", "admin")), 
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(
        select(models.LeaveRequest, models.User).join(
            models.User, models.LeaveRequest.applicant_id == models.User.id
        ).where(
            models.LeaveRequest.college_id == user["college_id"],
            models.LeaveRequest.status.in_(["pending", "cancellation_requested", "partially_cancelled"]),
            models.LeaveRequest.applicant_role == "student"
        )
    )
    return [{
        "id": l.id, "applicant_id": l.applicant_id, "applicant_name": u.name, 
        "batch": u.profile_data.get("batch") if u.profile_data else None,
        "leave_type": l.leave_type, "from_date": l.from_date.isoformat(), "to_date": l.to_date.isoformat(),
        "reason": l.reason, "created_at": l.created_at.isoformat()
    } for l, u in result.all()]

@router.put("/hod/leave/{leave_id}/review")
async def review_leave_route(
    leave_id: str, 
    req: server_schemas.LeaveReview, 
    user: dict = Depends(get_current_user), 
    svc: LeaveService = Depends(get_leave_service)
):
    leave = await svc.get_leave(leave_id, college_id=user["college_id"])
    b_acad_year = None
    try:
        from server import get_current_academic_year
        b_acad_year = await get_current_academic_year(svc.session, user["college_id"])
    except Exception:
        pass
    affected_slots = await svc.review_leave(leave, req.action, req.remarks, user, b_acad_year)
    return {"message": f"Leave {req.action}d", "affected_slots": len(affected_slots)}

@router.patch("/hod/leave/{leave_id}/review-cancellation")
async def review_leave_cancellation_route(
    leave_id: str, 
    req: server_schemas.LeaveReview, 
    user: dict = Depends(require_role("hod", "admin")), 
    svc: LeaveService = Depends(get_leave_service)
):
    leave = await svc.get_leave(leave_id, college_id=user["college_id"])
    await svc.review_cancellation(leave, req.action, req.remarks, user)
    return {"message": "Cancellation handled successfully"}

# Include Free periods logic closely tied to leave cancellations
@router.get("/hod/free-periods")
async def get_free_period_pool(
    user: dict = Depends(require_role("hod", "admin")), 
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.PeriodSlot, models.User).outerjoin(
        models.User, models.PeriodSlot.original_faculty_id == models.User.id
    ).where(
        models.PeriodSlot.college_id == user["college_id"],
        models.PeriodSlot.slot_type == "released"
    )
    result = await session.execute(stmt)
    return [{
        "id": s.id, "day": s.day, "period_no": s.period_no, "start_time": s.start_time, "end_time": s.end_time,
        "batch": s.batch, "section": s.section, "department_id": s.department_id,
        "subject_code": s.subject_code, "subject_name": s.subject_name,
        "original_faculty_name": u.name if u else "Unknown",
        "slot_type": s.slot_type
    } for s, u in result.all()]

@router.put("/hod/free-periods/{slot_id}/assign")
async def assign_substitute_faculty(
    slot_id: str, 
    req: server_schemas.SubstituteAssign, 
    user: dict = Depends(require_role("hod", "admin")), 
    session: AsyncSession = Depends(get_db)
):
    slot_r = await session.execute(
        select(models.PeriodSlot).where(
            models.PeriodSlot.id == slot_id,
            models.PeriodSlot.college_id == user["college_id"],
            models.PeriodSlot.slot_type == "released"
        )
    )
    slot = slot_r.scalars().first()
    if not slot:
        raise HTTPException(status_code=404, detail="Released slot not found")
        
    slot.faculty_id = req.faculty_id
    slot.slot_type = "substitute"
    await session.commit()
    return {"message": "Substitute faculty assigned successfully"}

@router.delete("/hod/free-periods/{slot_id}/assign")
async def revert_substitute_assignment(
    slot_id: str, 
    user: dict = Depends(require_role("hod", "admin")), 
    session: AsyncSession = Depends(get_db)
):
    slot_r = await session.execute(
        select(models.PeriodSlot).where(
            models.PeriodSlot.id == slot_id,
            models.PeriodSlot.college_id == user["college_id"],
            models.PeriodSlot.slot_type == "substitute"
        )
    )
    slot = slot_r.scalars().first()
    if not slot:
        raise HTTPException(status_code=404, detail="Substitute slot not found")
        
    slot.faculty_id = None
    slot.slot_type = "released"
    await session.commit()
    return {"message": "Substitute assignment reverted to released pool"}
