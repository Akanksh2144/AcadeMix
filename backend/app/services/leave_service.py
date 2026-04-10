from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete

from app import models
from app.core.audit import log_audit

class LeaveService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_leave(self, leave_id: str, applicant_id: str = None, college_id: str = None) -> models.LeaveRequest:
        query = select(models.LeaveRequest).where(models.LeaveRequest.id == leave_id)
        if applicant_id:
            query = query.where(models.LeaveRequest.applicant_id == applicant_id)
        if college_id:
            query = query.where(models.LeaveRequest.college_id == college_id)
            
        result = await self.session.execute(query)
        leave = result.scalars().first()
        if not leave:
            raise HTTPException(status_code=404, detail="Leave request not found")
        return leave

    async def apply(self, req, user: dict) -> models.LeaveRequest:
        try:
            from_dt = datetime.strptime(req.from_date, "%Y-%m-%d")
            to_dt = datetime.strptime(req.to_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

        leave = models.LeaveRequest(
            college_id=user["college_id"],
            applicant_id=user["id"],
            applicant_role=user["role"],
            leave_type=req.leave_type,
            from_date=from_dt,
            to_date=to_dt,
            reason=req.reason,
            document_url=req.document_url
        )
        self.session.add(leave)
        await self.session.commit()
        await self.session.refresh(leave)
        return leave

    async def request_cancellation(self, leave: models.LeaveRequest, cancel_from: str, cancel_to: str, user: dict) -> models.LeaveRequest:
        if leave.status == "pending":
            leave.status = "cancelled"
            await log_audit(self.session, user["id"], "leave_request", "cancel_pending", {"leave_id": leave.id})
            await self.session.commit()
            return leave
            
        if leave.status != "approved":
            raise HTTPException(status_code=400, detail="Only approved or pending leaves can be cancelled")

        if cancel_from or cancel_to:
            if not cancel_from or not cancel_to:
                raise HTTPException(status_code=400, detail="Both cancel_from and cancel_to are required for partial cancellation")
            try:
                cancel_from_dt = datetime.strptime(cancel_from, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                cancel_to_dt = datetime.strptime(cancel_to, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")
                
            if cancel_from_dt < leave.from_date or cancel_to_dt > leave.to_date or cancel_from_dt > cancel_to_dt:
                raise HTTPException(status_code=400, detail="Cancellation dates must be valid and fall within the originally approved leave period")
                
            if cancel_to_dt.date() < datetime.now(timezone.utc).date() and leave.to_date.date() < datetime.now(timezone.utc).date():
                raise HTTPException(status_code=400, detail="Cannot cancel a leave that has already been fully completed")

            leave.status = "partially_cancelled"
            leave.cancellation_meta = {"cancel_from": cancel_from, "cancel_to": cancel_to}
        else:
            if leave.to_date.date() < datetime.now(timezone.utc).date():
                 raise HTTPException(status_code=400, detail="Cannot cancel a leave that has already been fully completed")
            leave.status = "cancellation_requested"
            leave.cancellation_meta = None

        await log_audit(self.session, user["id"], "leave_request", "request_cancellation", {"leave_id": leave.id, "partial": bool(cancel_from)})
        await self.session.commit()
        return leave

    async def _handle_faculty_slot_release(self, leave: models.LeaveRequest, current_academic_year: str = None):
        affected_slot_ids = []
        leave_days = []
        
        # Determine the days of the week involved in the leave period
        current_date_iter = leave.from_date
        while current_date_iter <= leave.to_date:
            days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
            day_str = days[current_date_iter.weekday()]
            if day_str not in leave_days:
                leave_days.append(day_str)
            current_date_iter += timedelta(days=1)
        
        if leave_days:
            query = select(models.PeriodSlot).where(
                models.PeriodSlot.faculty_id == leave.applicant_id,
                models.PeriodSlot.day.in_(leave_days)
            )
            if current_academic_year:
                query = query.where(models.PeriodSlot.academic_year == current_academic_year)
                
            slots_r = await self.session.execute(query)
            slots = slots_r.scalars().all()
            for slot in slots:
                slot.original_faculty_id = slot.faculty_id
                slot.faculty_id = None
                slot.slot_type = "released"
                affected_slot_ids.append(slot.id)
            leave.affected_slots = affected_slot_ids
            
        return affected_slot_ids

    async def review_leave(self, leave: models.LeaveRequest, action: str, remarks: str, user: dict, current_academic_year: str = None):
        reviewer_role = user["role"]
        if leave.applicant_role == "hod" and reviewer_role not in ["principal", "admin"]:
            raise HTTPException(status_code=403, detail="HOD leaves can only be approved by Principal or Admin.")
        if leave.applicant_role in ["teacher", "faculty"] and reviewer_role not in ["hod", "principal", "admin"]:
            raise HTTPException(status_code=403, detail="Faculty leaves must be approved by HOD, Principal or Admin.")

        if leave.status != "pending":
            raise HTTPException(status_code=400, detail="Leave is already reviewed")

        leave.status = action
        leave.reviewed_by = user["id"]
        leave.reviewed_at = datetime.now(timezone.utc)
        leave.review_remarks = remarks

        affected_slots = []
        if action == "approve" and leave.applicant_role in ["teacher", "faculty"]:
            affected_slots = await self._handle_faculty_slot_release(leave, current_academic_year)

        await log_audit(self.session, user["id"], "leave_request", action, {"leave_id": leave.id})
        await self.session.commit()
        return affected_slots

    async def review_cancellation(self, leave: models.LeaveRequest, action: str, remarks: str, user: dict):
        if leave.status not in ["cancellation_requested", "partially_cancelled"]:
            raise HTTPException(status_code=400, detail="Leave does not have a pending cancellation request")

        if action == "reject":
            # Revert status to approved
            leave.status = "approved"
            leave.review_remarks = f"Cancellation Rejected: {remarks or ''}"
            leave.cancellation_meta = None
            await log_audit(self.session, user["id"], "leave_request", "reject_cancellation", {"leave_id": leave.id})
            await self.session.commit()
            return
            
        # Action is approve
        old_status = leave.status
        leave.status = "cancelled" if old_status == "cancellation_requested" else "approved" # if partial, rest is still approved
        
        cancel_from = leave.from_date
        cancel_to = leave.to_date
        if old_status == "partially_cancelled" and leave.cancellation_meta:
            cancel_from = datetime.strptime(leave.cancellation_meta.get("cancel_from"), "%Y-%m-%d").replace(tzinfo=timezone.utc)
            cancel_to = datetime.strptime(leave.cancellation_meta.get("cancel_to"), "%Y-%m-%d").replace(tzinfo=timezone.utc)

        # 1. Faculty Free Period / PeriodSlot Reversal
        if leave.applicant_role in ["teacher", "faculty"] and leave.affected_slots:
            slots_to_reclaim = []
            slots_r = await self.session.execute(
                select(models.PeriodSlot).where(
                    models.PeriodSlot.id.in_(leave.affected_slots),
                    models.PeriodSlot.college_id == user["college_id"]
                )
            )
            for slot in slots_r.scalars().all():
                if slot.slot_type == "released":
                    slot.faculty_id = slot.original_faculty_id
                    slot.slot_type = "regular"
                    slots_to_reclaim.append(slot.id)
                    # Remove from affected
                    if slot.id in leave.affected_slots:
                        leave.affected_slots.remove(slot.id)
                        
        # 2. Student Attendance Record (system_leave) Deletion
        elif leave.applicant_role == "student":
            await self.session.execute(
                delete(models.AttendanceRecord).where(
                    models.AttendanceRecord.student_id == leave.applicant_id,
                    models.AttendanceRecord.college_id == user["college_id"],
                    models.AttendanceRecord.source == "system_leave",
                    models.AttendanceRecord.date >= cancel_from.date(),
                    models.AttendanceRecord.date <= cancel_to.date()
                )
            )

        leave.review_remarks = f"Cancellation Approved: {remarks or ''}"
        await log_audit(self.session, user["id"], "leave_request", "approve_cancellation", {"leave_id": leave.id})
        await self.session.commit()
