"""
HOD Service — logic and aggregation for the HOD domain.
Encapsulates department supervision, class/mentor workflows, free periods, tasks, and meetings.
"""

from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete

from app import models
from app.core.exceptions import ResourceNotFoundError, BusinessLogicError, DatabaseIntegrityError
from app.core.utils import get_current_academic_year, grade_to_points


class HodService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Students & Progression ──────────────────────────────────────────────

    async def get_at_risk_students(self, college_id: str, cgpa_threshold: float, backlog_threshold: int) -> List[Dict[str, Any]]:
        students_r = await self.db.execute(
            select(models.User).where(
                models.User.college_id == college_id,
                models.User.role == "student"
            )
        )
        students = students_r.scalars().all()
        at_risk = []
        
        for student in students:
            grades_r = await self.db.execute(
                select(models.SemesterGrade).where(models.SemesterGrade.student_id == student.id)
            )
            grades = grades_r.scalars().all()
            
            if not grades:
                continue
                
            total_credits = sum(g.credits_earned for g in grades)
            total_points = sum(grade_to_points(g.grade) * g.credits_earned for g in grades)
            backlogs = sum(1 for g in grades if g.grade == "F")
            cgpa = round(total_points / total_credits, 2) if total_credits > 0 else 0
            
            if cgpa < cgpa_threshold or backlogs >= backlog_threshold:
                if cgpa < (cgpa_threshold - 1.5) or backlogs >= (backlog_threshold + 2):
                    severity = "critical"
                else:
                    severity = "warning"
                    
                at_risk.append({
                    "id": student.id, 
                    "name": student.name,
                    "college_id": (student.profile_data or {}).get("college_id", ""),
                    "section": (student.profile_data or {}).get("section", ""),
                    "batch": (student.profile_data or {}).get("batch", ""),
                    "cgpa": cgpa,
                    "cgpa_threshold": cgpa_threshold,
                    "backlogs": backlogs,
                    "backlog_threshold": backlog_threshold,
                    "severity": severity
                })
                
        at_risk.sort(key=lambda x: (x["severity"] != "critical", x["cgpa"]))
        return at_risk

    async def create_progression(self, user: dict, req_data: Dict[str, Any]) -> str:
        college_id = user["college_id"]
        academic_year = await get_current_academic_year(self.db, college_id)
        prog = models.StudentProgression(
            college_id=college_id,
            student_id=req_data["student_id"],
            academic_year=academic_year,
            progression_type=req_data["progression_type"],
            details=req_data["details"]
        )
        self.db.add(prog)
        await self.db.commit()
        await self.db.refresh(prog)
        return str(prog.id)

    async def delete_progression(self, college_id: str, prog_id: str) -> None:
        await self.db.execute(delete(models.StudentProgression).where(
            models.StudentProgression.id == prog_id, models.StudentProgression.college_id == college_id
        ))
        await self.db.commit()

    # ── Assignments ─────────────────────────────────────────────────────────

    async def get_class_in_charges(self, college_id: str) -> List[Dict[str, Any]]:
        result = await self.db.execute(
            select(models.ClassInCharge, models.User).join(
                models.User, models.ClassInCharge.faculty_id == models.User.id
            ).where(
                models.ClassInCharge.college_id == college_id
            )
        )
        return [{
            "id": c.id, "faculty_id": c.faculty_id, "faculty_name": u.name,
            "department": c.department, "batch": c.batch, "section": c.section, 
            "semester": c.semester, "academic_year": c.academic_year
        } for c, u in result.all()]

    async def assign_class_in_charges(self, user: dict, req_data: Dict[str, Any]) -> int:
        college_id = user["college_id"]
        academic_year = await get_current_academic_year(self.db, college_id)
        created = []
        for fac_id in req_data["faculty_ids"]:
            cic = models.ClassInCharge(
                college_id=college_id,
                faculty_id=fac_id,
                department=req_data["department"],
                batch=req_data["batch"],
                section=req_data["section"],
                semester=req_data["semester"],
                academic_year=academic_year
            )
            self.db.add(cic)
            created.append(cic)
        try:
            await self.db.commit()
            return len(created)
        except Exception:
            await self.db.rollback()
            raise BusinessLogicError("Assignment conflicts with an existing assignment or invalid data.")

    async def delete_class_in_charge(self, college_id: str, assignment_id: str) -> None:
        await self.db.execute(delete(models.ClassInCharge).where(
            models.ClassInCharge.id == assignment_id, models.ClassInCharge.college_id == college_id
        ))
        await self.db.commit()

    async def get_mentor_assignments(self, college_id: str) -> List[Dict[str, Any]]:
        result = await self.db.execute(
            select(models.MentorAssignment, models.User).join(
                models.User, models.MentorAssignment.student_id == models.User.id
            ).where(
                models.MentorAssignment.college_id == college_id,
                models.MentorAssignment.is_active == True
            )
        )
        
        assignments = result.all()
        if not assignments: 
            return []
        
        faculty_ids = {m.faculty_id for m, _ in assignments}
        fac_result = await self.db.execute(select(models.User.id, models.User.name).where(models.User.id.in_(faculty_ids)))
        faculty_names = {u_id: name for u_id, name in fac_result.all()}
        
        return [{
            "id": m.id, "faculty_id": m.faculty_id, "faculty_name": faculty_names.get(m.faculty_id, "Unknown"),
            "student_id": m.student_id, "student_name": s.name, "academic_year": m.academic_year
        } for m, s in assignments]

    async def assign_mentors(self, user: dict, req_data: Dict[str, Any]) -> int:
        college_id = user["college_id"]
        academic_year = await get_current_academic_year(self.db, college_id)
        created = 0
        for stud_id in req_data["student_ids"]:
            existing_r = await self.db.execute(select(models.MentorAssignment).where(
                models.MentorAssignment.college_id == college_id,
                models.MentorAssignment.student_id == stud_id,
                models.MentorAssignment.academic_year == academic_year,
                models.MentorAssignment.is_active == True
            ))
            if existing_r.scalars().first():
                continue 
            
            m = models.MentorAssignment(
                college_id=college_id,
                faculty_id=req_data["faculty_id"],
                student_id=stud_id,
                academic_year=academic_year,
                is_active=True
            )
            self.db.add(m)
            created += 1
        
        await self.db.commit()
        return created

    async def deactivate_mentor_assignment(self, college_id: str, assignment_id: str) -> None:
        r = await self.db.execute(select(models.MentorAssignment).where(
            models.MentorAssignment.id == assignment_id, models.MentorAssignment.college_id == college_id
        ))
        m = r.scalars().first()
        if not m:
            raise ResourceNotFoundError("MentorAssignment", assignment_id)
        m.is_active = False
        await self.db.commit()

    # ── Activity & Overrides ────────────────────────────────────────────────

    async def review_activity_permission(self, college_id: str, hod_id: str, permission_id: str, action: str) -> str:
        result = await self.db.execute(
            select(models.ActivityPermission).where(
                models.ActivityPermission.id == permission_id,
                models.ActivityPermission.college_id == college_id
            )
        )
        perm = result.scalars().first()
        if not perm:
            raise ResourceNotFoundError("ActivityPermission", permission_id)
            
        perm.status = "approved" if action == "approve" else "rejected"
        perm.hod_approved_by = hod_id
        await self.db.commit()
        return perm.status

    async def get_pending_free_periods(self, college_id: str) -> List[Dict[str, Any]]:
        res = await self.db.execute(
            select(models.FreePeriodRequest).where(
                models.FreePeriodRequest.college_id == college_id,
                models.FreePeriodRequest.status == "pending",
                models.FreePeriodRequest.is_deleted == False
            )
        )
        reqs = res.scalars().all()
        if reqs:
            fac_ids = list(set(r.faculty_id for r in reqs))
            name_r = await self.db.execute(select(models.User.id, models.User.name).where(models.User.id.in_(fac_ids)))
            name_map = {r[0]: r[1] for r in name_r.fetchall()}
            return [
                {**{c.name: getattr(r, c.name) for c in r.__table__.columns}, "faculty_name": name_map.get(r.faculty_id, "")}
                for r in reqs
            ]
        return []

    async def review_free_period(self, college_id: str, hod_id: str, req_id: str, status: str) -> str:
        r = await self.db.execute(select(models.FreePeriodRequest).where(
            models.FreePeriodRequest.id == req_id, models.FreePeriodRequest.college_id == college_id
        ))
        fp = r.scalars().first()
        if not fp:
            raise ResourceNotFoundError("FreePeriodRequest", req_id)
        fp.status = status or "approved"
        fp.processed_by = hod_id
        await self.db.commit()
        return fp.status

    # ── Tasks & Meetings ────────────────────────────────────────────────────

    async def create_task(self, college_id: str, assigner_id: str, data: Dict[str, Any]) -> str:
        row = models.TaskAssignment(
            college_id=college_id,
            assigner_id=assigner_id,
            assignee_id=data["assignee_id"],
            title=data["title"],
            description=data["description"],
            deadline=data["deadline"],
            priority=data.get("priority", "medium"),
            status="pending"
        )
        self.db.add(row)
        await self.db.commit()
        return str(row.id)

    async def get_tasks(self, college_id: str, assigner_id: str) -> List[Dict[str, Any]]:
        res = await self.db.execute(
            select(models.TaskAssignment).where(
                models.TaskAssignment.college_id == college_id,
                models.TaskAssignment.assigner_id == assigner_id,
                models.TaskAssignment.is_deleted == False
            ).order_by(models.TaskAssignment.deadline.asc())
        )
        tasks = res.scalars().all()
        if tasks:
            ids = list(set(t.assignee_id for t in tasks))
            name_r = await self.db.execute(select(models.User.id, models.User.name).where(models.User.id.in_(ids)))
            name_map = {r[0]: r[1] for r in name_r.fetchall()}
            return [
                {**{c.name: getattr(t, c.name) for c in t.__table__.columns}, "assignee_name": name_map.get(t.assignee_id, "")}
                for t in tasks
            ]
        return []

    async def update_task(self, college_id: str, task_id: str, data: Dict[str, Any]) -> None:
        r = await self.db.execute(select(models.TaskAssignment).where(
            models.TaskAssignment.id == task_id, models.TaskAssignment.college_id == college_id
        ))
        task = r.scalars().first()
        if not task:
            raise ResourceNotFoundError("TaskAssignment", task_id)
        for field in ["status", "priority", "description", "deadline", "title"]:
            if field in data:
                setattr(task, field, data[field])
        await self.db.commit()

    async def create_meeting(self, college_id: str, organizer_id: str, data: Dict[str, Any]) -> str:
        row = models.DepartmentMeeting(
            college_id=college_id,
            department_id=data["department_id"],
            organizer_id=organizer_id,
            date=data["date"],
            agenda=data.get("agenda", "")
        )
        self.db.add(row)
        await self.db.commit()
        return str(row.id)

    async def get_meetings(self, college_id: str, department_id: str = None) -> List[models.DepartmentMeeting]:
        q = select(models.DepartmentMeeting).where(
            models.DepartmentMeeting.college_id == college_id,
            models.DepartmentMeeting.is_deleted == False
        )
        if department_id:
            q = q.where(models.DepartmentMeeting.department_id == department_id)
        res = await self.db.execute(q.order_by(models.DepartmentMeeting.date.desc()))
        return res.scalars().all()

    async def update_meeting_minutes(self, college_id: str, meeting_id: str, data: Dict[str, Any]) -> None:
        r = await self.db.execute(select(models.DepartmentMeeting).where(
            models.DepartmentMeeting.id == meeting_id, models.DepartmentMeeting.college_id == college_id
        ))
        meeting = r.scalars().first()
        if not meeting:
            raise ResourceNotFoundError("DepartmentMeeting", meeting_id)
        meeting.minutes = data.get("minutes", "")
        meeting.attendance_record = data.get("attendance_record")
        await self.db.commit()
