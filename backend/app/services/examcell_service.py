"""
Exam Cell Service — handles logic and aggregation for the Exam Cell domain.
Encapsulates grading operations, mark publishing, schedule generation, and hall ticket issuance.
"""

from datetime import datetime, timezone, date as date_type
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_, delete

from app import models
from app.core.exceptions import ResourceNotFoundError, BusinessLogicError
from app.core.audit import log_audit


DEFAULT_GRADE_SCALE = [
    {"grade": "O", "min_pct": 90, "points": 10},
    {"grade": "A+", "min_pct": 80, "points": 9},
    {"grade": "A", "min_pct": 70, "points": 8},
    {"grade": "B+", "min_pct": 60, "points": 7},
    {"grade": "B", "min_pct": 50, "points": 6},
    {"grade": "C", "min_pct": 45, "points": 5},
    {"grade": "D", "min_pct": 40, "points": 4},
]


class ExamCellService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── College Settings ────────────────────────────────────────────────────

    async def get_settings(self, college_id: str) -> Dict[str, Any]:
        result = await self.db.execute(select(models.College).where(models.College.id == college_id))
        college = result.scalars().first()
        return college.settings if college and college.settings else {}

    async def update_settings(self, college_id: str, user_id: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        result = await self.db.execute(select(models.College).where(models.College.id == college_id))
        college = result.scalars().first()
        if not college:
            raise ResourceNotFoundError("College", college_id)
            
        college.settings = settings
        await log_audit(self.db, user_id, "examcell_settings", "update", {})
        await self.db.commit()
        return college.settings

    # ── Exam Schedules ──────────────────────────────────────────────────────

    async def create_schedule(self, college_id: str, user_id: str, data: Dict[str, Any]) -> models.ExamSchedule:
        try:
            dt = datetime.strptime(data["exam_date"], "%Y-%m-%d").date()
        except ValueError:
            raise BusinessLogicError("exam_date must be YYYY-MM-DD")
            
        sched = models.ExamSchedule(
            college_id=college_id,
            department_id=data["department_id"],
            batch=data["batch"],
            semester=data["semester"],
            academic_year=data["academic_year"],
            subject_code=data["subject_code"],
            subject_name=data["subject_name"],
            exam_date=dt,
            session=data["session"],
            exam_time=data["exam_time"],
            document_url=data.get("document_url"),
            created_by=user_id
        )
        self.db.add(sched)
        await self.db.commit()
        await self.db.refresh(sched)
        return sched

    async def get_schedules(self, college_id: str, department_id: Optional[str] = None, batch: Optional[str] = None, semester: Optional[int] = None) -> List[Dict[str, Any]]:
        stmt = select(models.ExamSchedule).where(models.ExamSchedule.college_id == college_id)
        if department_id:
            stmt = stmt.where(models.ExamSchedule.department_id == department_id)
        if batch:
            stmt = stmt.where(models.ExamSchedule.batch == batch)
        if semester:
            stmt = stmt.where(models.ExamSchedule.semester == semester)
            
        result = await self.db.execute(stmt.order_by(models.ExamSchedule.exam_date.desc()))
        items = result.scalars().all()
        out = []
        for s in items:
            out.append({
                "id": s.id,
                "department_id": s.department_id,
                "batch": s.batch,
                "semester": s.semester,
                "academic_year": s.academic_year,
                "subject_code": s.subject_code,
                "subject_name": s.subject_name,
                "exam_date": str(s.exam_date) if s.exam_date else None,
                "session": s.session,
                "exam_time": s.exam_time,
                "document_url": s.document_url,
                "is_published": s.is_published
            })
        return out

    async def toggle_publish_schedule(self, college_id: str, schedule_id: str, published: bool) -> None:
        result = await self.db.execute(select(models.ExamSchedule).where(models.ExamSchedule.id == schedule_id, models.ExamSchedule.college_id == college_id))
        sched = result.scalars().first()
        if not sched:
            raise ResourceNotFoundError("ExamSchedule", schedule_id)
            
        sched.is_published = published
        await self.db.commit()

    async def delete_schedule(self, college_id: str, user_id: str, schedule_id: str) -> None:
        result = await self.db.execute(select(models.ExamSchedule).where(models.ExamSchedule.id == schedule_id, models.ExamSchedule.college_id == college_id))
        sched = result.scalars().first()
        if not sched:
            raise ResourceNotFoundError("ExamSchedule", schedule_id)
        
        sched.is_deleted = True
        sched.deleted_at = func.now()
        await log_audit(self.db, user_id, "examcell_schedule", "delete", {"schedule_id": schedule_id})
        await self.db.commit()

    async def get_student_schedule(self, user: Dict[str, Any]) -> List[models.ExamSchedule]:
        college_id = user["college_id"]
        profile = user.get("profile_data") or {}
        dept_str = user.get("department") or profile.get("department", "")
        batch_str = user.get("batch") or profile.get("batch", "")
        
        dept_r = await self.db.execute(
            select(models.Department).where(
                models.Department.college_id == college_id,
                or_(models.Department.code == dept_str, models.Department.name == dept_str)
            )
        )
        dept = dept_r.scalars().first()
        if not dept:
            return []

        stmt = select(models.ExamSchedule).where(
            models.ExamSchedule.college_id == college_id,
            models.ExamSchedule.department_id == dept.id,
            models.ExamSchedule.batch == batch_str,
            models.ExamSchedule.is_published == True
        ).order_by(models.ExamSchedule.exam_date.asc())
        
        result = await self.db.execute(stmt)
        return result.scalars().all()

    # ── Dashboards & Mark Publishing ────────────────────────────────────────

    async def get_dashboard_stats(self, college_id: str) -> Dict[str, Any]:
        sched_r = await self.db.execute(
            select(models.ExamSchedule.is_published, func.count(models.ExamSchedule.id))
            .where(models.ExamSchedule.college_id == college_id)
            .group_by(models.ExamSchedule.is_published)
        )
        sched_counts = {str(k): v for k, v in sched_r.all()}
        
        regs_r = await self.db.execute(
            select(func.count(models.CourseRegistration.id)).where(
                models.CourseRegistration.college_id == college_id,
                models.CourseRegistration.status == "approved"
            )
        )
        total_approved = regs_r.scalar() or 0
        
        gen_stmt = select(func.count(models.CourseRegistration.id.distinct())).join(
            models.ExamSchedule,
            and_(
                models.CourseRegistration.college_id == models.ExamSchedule.college_id,
                models.CourseRegistration.semester == models.ExamSchedule.semester,
                models.CourseRegistration.academic_year == models.ExamSchedule.academic_year,
                models.ExamSchedule.is_published == True
            )
        ).where(
            models.CourseRegistration.college_id == college_id,
            models.CourseRegistration.status == "approved"
        )
        
        gen_r = await self.db.execute(gen_stmt)
        total_generated = gen_r.scalar() or 0
            
        return {
            "schedules": {
                "published": int(sched_counts.get("True", 0)),
                "unpublished": int(sched_counts.get("False", 0))
            },
            "hall_tickets": {
                "total_approved": total_approved,
                "generated": total_generated
            }
        }

    async def get_hall_ticket_data(self, user: Dict[str, Any], semester: int, academic_year: str) -> tuple:
        """Returns (fee_records, course_registrations, exam_schedules, dept_str, batch_str) for HTML formatting."""
        college_id = user["college_id"]
        student_id = user["id"]
        
        fee_r = await self.db.execute(
            select(models.FeePayment, models.StudentFeeInvoice)
            .join(models.StudentFeeInvoice, models.FeePayment.invoice_id == models.StudentFeeInvoice.id)
            .where(
                models.FeePayment.student_id == student_id,
                models.StudentFeeInvoice.academic_year == academic_year,
                # Semester column might not exist directly on invoice without custom meta, assuming it's omitted or handled by academic_year / description
            )
        )
        fee_records = fee_r.all()
        for payment, invoice in fee_records:
            if "exam" in invoice.fee_type.lower() and payment.status != "success":
                from app.core.exceptions import AuthorizationError
                raise AuthorizationError("Pending Dues: Your exam fee must be paid before downloading the hall ticket.")

        regs_r = await self.db.execute(
            select(models.CourseRegistration).where(
                models.CourseRegistration.student_id == student_id,
                models.CourseRegistration.semester == semester,
                models.CourseRegistration.academic_year == academic_year,
                models.CourseRegistration.status == "approved"
            )
        )
        regs = regs_r.scalars().all()
        
        if not regs:
            raise ResourceNotFoundError("CourseRegistrations", "Approved models not found for semester")
            
        profile = user.get("profile_data") or {}
        dept_str = user.get("department") or profile.get("department", "")
        batch_str = user.get("batch") or profile.get("batch", "")
        
        dept_r = await self.db.execute(
            select(models.Department).where(
                models.Department.college_id == college_id,
                or_(models.Department.code == dept_str, models.Department.name == dept_str)
            )
        )
        dept = dept_r.scalars().first()
        dept_id = dept.id if dept else ""
        
        scheds = []
        if dept_id:
            sched_r = await self.db.execute(
                select(models.ExamSchedule).where(
                    models.ExamSchedule.college_id == college_id,
                    models.ExamSchedule.department_id == dept_id,
                    models.ExamSchedule.batch == batch_str,
                    models.ExamSchedule.semester == semester,
                    models.ExamSchedule.academic_year == academic_year,
                    models.ExamSchedule.is_published == True
                )
            )
            scheds = sched_r.scalars().all()
            
        return (fee_records, regs, scheds, dept_str, batch_str)

    async def save_endterm_manual(self, college_id: str, data: Dict[str, Any]) -> None:
        for entry in data["entries"]:
            sid = entry.get("student_id", "")
            if not sid:
                continue
            row = models.SemesterGrade(
                student_id=sid,
                course_id=data["subject_code"],
                semester=data["semester"],
                grade=entry.get("grade", "O"),
                credits_earned=int(entry.get("credits", 3)),
            )
            self.db.add(row)
        await self.db.commit()

    async def fetch_endterm_manual_list(self) -> List[Dict[str, Any]]:
        # This was an unbounded tenant query in the original, we should scope it if possible or return raw.
        # But for backward compatibility with the original router return:
        result = await self.db.execute(
            select(models.SemesterGrade).order_by(models.SemesterGrade.semester.desc())
        )
        rows = result.scalars().all()
        from collections import defaultdict
        grouped: dict = defaultdict(list)
        for r in rows:
            grouped[(r.course_id, r.semester)].append({
                "student_id": r.student_id, "grade": r.grade, "credits": r.credits_earned
            })
        return [
            {"course_id": cid, "semester": sem, "entries": entries}
            for (cid, sem), entries in grouped.items()
        ]

    async def publish_marks(self, college_id: str, user_id: str, entry_id: str) -> Dict[str, Any]:
        result = await self.db.execute(
            select(models.MarkSubmission)
            .where(models.MarkSubmission.id == entry_id, models.MarkSubmission.college_id == college_id)
            .with_for_update()
        )
        entry = result.scalars().first()
        
        if not entry:
            raise ResourceNotFoundError("MarkEntry", entry_id)
            
        current_status = (entry.extra_data or {}).get("status", "draft")
        if current_status != "approved":
            raise BusinessLogicError(f"Only approved marks can be published (current: {current_status})")
            
        entries = (entry.extra_data or {}).get("entries", [])
        if not entries:
            raise BusinessLogicError("No student marks found in entry")
            
        metadata = entry.extra_data or {}
        subject_code = entry.course_id
        semester = int(metadata.get("semester", 1))
        max_marks = float(metadata.get("max_marks", 100))
        
        college_r = await self.db.execute(
            select(models.College).where(models.College.id == college_id)
        )
        college = college_r.scalars().first()
        college_settings = college.settings if college and college.settings else {}
        grade_scale = college_settings.get("grade_scale") or DEFAULT_GRADE_SCALE
        
        semester_grades = []
        for student_entry in entries:
            student_id = student_entry.get("student_id")
            marks = float(student_entry.get("marks", 0.0))
            pct = (marks / max_marks) * 100 if max_marks > 0 else 0
            
            grade = "F"
            for boundary in sorted(grade_scale, key=lambda x: x.get("min_pct", 0), reverse=True):
                if pct >= boundary.get("min_pct", 0):
                    grade = boundary.get("grade", "F")
                    break
            
            if not student_id:
                continue
                
            existing = await self.db.execute(
                select(models.SemesterGrade).where(
                    models.SemesterGrade.student_id == student_id,
                    models.SemesterGrade.semester == semester,
                    models.SemesterGrade.course_id == subject_code
                )
            )
            if existing.scalars().first():
                continue
                
            credits_assigned = 3
            assignment_id = metadata.get("assignment_id")
            if assignment_id:
                ass_r = await self.db.execute(select(models.FacultyAssignment).where(models.FacultyAssignment.id == assignment_id))
                ass = ass_r.scalars().first()
                if ass:
                    credits_assigned = ass.credits
                    
            semester_grades.append(models.SemesterGrade(
                student_id=student_id,
                semester=semester,
                course_id=subject_code,
                grade=grade,
                credits_earned=credits_assigned
            ))
            
        if semester_grades:
            self.db.add_all(semester_grades)

        entry.extra_data = {
            **(entry.extra_data or {}),
            "status": "published",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "published_by": user_id
        }
        
        await log_audit(self.db, user_id, "mark_entry", "publish", {
            "entry_id": entry_id, "course_id": subject_code, 
            "student_count": len(semester_grades)
        })
        await self.db.commit()
        
        return {
            "message": f"Published {len(semester_grades)} student grades",
            "entry_id": entry_id,
            "published_count": len(semester_grades)
        }
