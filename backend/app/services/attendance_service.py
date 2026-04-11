from datetime import datetime, timezone
from app.core.exceptions import ResourceNotFoundError, InputValidationError, AuthorizationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, func, text, delete
from typing import List, Optional, Dict, Any

from app import models
from app.core.audit import log_audit

class AttendanceService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_today_faculty_status(self, user: dict, current_academic_year: str) -> List[Dict[str, Any]]:
        today = datetime.now(timezone.utc)
        days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
        current_day = days[today.weekday()]
        current_date = today.date()

        slots_r = await self.session.execute(
            select(models.PeriodSlot).where(
                models.PeriodSlot.faculty_id == user["id"],
                models.PeriodSlot.day == current_day,
                models.PeriodSlot.academic_year == current_academic_year
            ).order_by(models.PeriodSlot.period_no)
        )
        slots = slots_r.scalars().all()

        if not slots:
            return []

        slot_ids = [s.id for s in slots]
        
        att_r = await self.session.execute(
            select(models.AttendanceRecord.period_slot_id, func.count(models.AttendanceRecord.id))
            .where(
                models.AttendanceRecord.period_slot_id.in_(slot_ids),
                models.AttendanceRecord.date == current_date
            )
            .group_by(models.AttendanceRecord.period_slot_id)
        )
        marked_counts = {row.period_slot_id: row.count for row in att_r.all()}

        return [{
            "slot": {
                "id": s.id, "period_no": s.period_no, "start_time": s.start_time, "end_time": s.end_time,
                "batch": s.batch, "section": s.section, "subject_code": s.subject_code, "subject_name": s.subject_name
            },
            "is_marked": s.id in marked_counts,
            "recorded_count": marked_counts.get(s.id, 0)
        } for s in slots]

    async def mark_batch(self, req, user: dict) -> Dict[str, Any]:
        try:
            mark_date = datetime.strptime(req.date, "%Y-%m-%d").date()
        except ValueError:
            raise InputValidationError("Invalid date format")

        slot_r = await self.session.execute(
            select(models.PeriodSlot).where(
                models.PeriodSlot.id == req.period_slot_id,
                models.PeriodSlot.college_id == user["college_id"]
            )
        )
        slot = slot_r.scalars().first()
        if not slot:
            raise ResourceNotFoundError("PeriodSlot", req.period_slot_id)

        if slot.faculty_id != user["id"]:
            raise AuthorizationError("You are not assigned to this period slot")

        now = datetime.now()
        try:
            period_end_time = datetime.strptime(slot.end_time, "%H:%M").time()
            period_end_dt = datetime.combine(mark_date, period_end_time)
            delta_hours = (now - period_end_dt).total_seconds() / 3600
            is_late_entry = delta_hours > 3
        except ValueError:
            is_late_entry = False

        await self.session.execute(
            update(models.AttendanceRecord).where(
                models.AttendanceRecord.period_slot_id == slot.id,
                models.AttendanceRecord.date == mark_date
            ).values(is_deleted=True, deleted_at=func.now())
        )

        records = [
            models.AttendanceRecord(
                college_id=user["college_id"],
                period_slot_id=slot.id,
                date=mark_date,
                faculty_id=user["id"],
                student_id=entry.student_id,
                subject_code=slot.subject_code,
                status=entry.status,
                is_late_entry=is_late_entry,
                remarks=entry.remarks
            )
            for entry in req.entries
        ]
        self.session.add_all(records)
        await log_audit(self.session, user["id"], "attendance", "mark_batch", 
                        {"slot_id": slot.id, "date": req.date, "is_late": is_late_entry, "count": len(records)})
        await self.session.commit()
        
        return {"message": f"Successfully marked attendance for {len(records)} students", "is_late_entry": is_late_entry}

    async def get_student_consolidated(self, student_id: str) -> List[Dict[str, Any]]:
        stmt = text("""
            SELECT 
                subject_code,
                COUNT(*) FILTER (WHERE status = 'present' OR status = 'od') AS present_count,
                COUNT(*) AS total_count
            FROM attendance_records
            WHERE student_id = :student_id AND is_deleted = false
            GROUP BY subject_code
        """)
        result = await self.session.execute(stmt, {"student_id": student_id})
        
        response = []
        for row in result.all():
            pct = round(row.present_count * 100.0 / row.total_count, 1) if row.total_count > 0 else 0
            response.append({
                "subject_code": row.subject_code,
                "present_count": row.present_count,
                "total_count": row.total_count,
                "percentage": pct
            })
        return response

    async def get_student_detail(self, student_id: str, subject_code: Optional[str] = None, month: Optional[int] = None, year: Optional[int] = None) -> List[Dict[str, Any]]:
        params = {"student_id": student_id}
        where_clauses = ["ar.student_id = :student_id", "ar.is_deleted = false"]
        
        if subject_code:
            where_clauses.append("ar.subject_code = :subject_code")
            params["subject_code"] = subject_code
        if month and year:
            where_clauses.append("EXTRACT(MONTH FROM ar.date) = :month")
            where_clauses.append("EXTRACT(YEAR FROM ar.date) = :year")
            params["month"] = month
            params["year"] = year

        where_sql = " AND ".join(where_clauses)
        stmt = text(f"""
            SELECT 
                ar.date, ar.subject_code, ar.status, ar.remarks,
                ps.period_no, ps.start_time, ps.end_time, ps.subject_name
            FROM attendance_records ar
            JOIN period_slots ps ON ar.period_slot_id = ps.id
            WHERE {where_sql}
            ORDER BY ar.date DESC, ps.period_no ASC
        """)
        result = await self.session.execute(stmt, params)

        return [{
            "date": str(r.date),
            "subject_code": r.subject_code,
            "subject_name": r.subject_name,
            "period_no": r.period_no,
            "start_time": r.start_time,
            "end_time": r.end_time,
            "status": r.status,
            "remarks": r.remarks
        } for r in result.all()]

    async def get_defaulters(self, college_id: str, department_id: str, threshold: float = 75.0) -> List[Dict[str, Any]]:
        stmt = text("""
            SELECT 
                student_id,
                u.name as student_name,
                u.profile_data->>'batch' as batch,
                subject_code,
                ROUND((COUNT(*) FILTER (WHERE status = 'present' OR status = 'od') * 100.0 / COUNT(*))::numeric, 1) as percentage
            FROM attendance_records ar
            JOIN users u ON ar.student_id = u.id
            WHERE ar.college_id = :college_id 
              AND ar.is_deleted = false 
              AND u.profile_data->>'department_id' = :department_id
            GROUP BY student_id, u.name, u.profile_data->>'batch', subject_code
            HAVING (COUNT(*) FILTER (WHERE status = 'present' OR status = 'od') * 100.0 / COUNT(*)) < :threshold
            ORDER BY batch, student_name, subject_code
        """)
        
        result = await self.session.execute(stmt, {
            "college_id": college_id, 
            "department_id": department_id,
            "threshold": threshold
        })
        
        return [{
            "student_id": r.student_id,
            "name": r.student_name,
            "batch": r.batch,
            "subject_code": r.subject_code,
            "percentage": float(r.percentage) if r.percentage is not None else 0.0
        } for r in result.all()]

    async def override_attendance(self, subject_code: str, student_id: str, req, user: dict) -> Dict[str, str]:
        from sqlalchemy import cast, Date
        stmt = select(models.AttendanceRecord).where(
            models.AttendanceRecord.student_id == student_id,
            models.AttendanceRecord.subject_code == subject_code,
            models.AttendanceRecord.date == cast(req.date, Date),
            models.AttendanceRecord.period_slot_id == req.period_slot_id,
            models.AttendanceRecord.is_deleted == False
        )
        result = await self.session.execute(stmt)
        record = result.scalars().first()
        
        if not record:
            raise ResourceNotFoundError("AttendanceRecord", f"{student_id}/{subject_code}/{req.date}")
            
        record.status = req.status
        record.is_override = True
        record.source = "override"
        record.remarks = req.reason or record.remarks
        await self.session.commit()
        return {"message": "Override applied successfully."}

    async def get_student_calendar(self, student_id: str, month: Optional[int] = None, year: Optional[int] = None) -> Dict[str, Any]:
        from sqlalchemy import extract
        stmt = select(models.AttendanceRecord).where(
            models.AttendanceRecord.student_id == student_id,
            models.AttendanceRecord.is_deleted == False
        )
        if month and year:
            stmt = stmt.where(extract("month", models.AttendanceRecord.date) == month)
            stmt = stmt.where(extract("year", models.AttendanceRecord.date) == year)
            
        result = await self.session.execute(stmt)
        
        calendar = {}
        for r in result.scalars().all():
            d = str(r.date)
            if d not in calendar:
                calendar[d] = {"present": 0, "absent": 0, "od": 0, "details": []}
            
            status = r.status.lower() if r.status else ""
            if status in calendar[d]:
                calendar[d][status] += 1
                
            calendar[d]["details"].append({
                "subject_code": r.subject_code,
                "period_no": r.period_no,
                "status": status,
                "is_late": r.is_late_entry
            })
        return calendar
