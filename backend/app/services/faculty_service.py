"""
Faculty Service — logic and data access for the Faculty domain.
Encapsulates profile management, academic assignments, requests (leaves/permissions), and academic submissions.
"""

from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import delete

from app import models
from app.core.exceptions import ResourceNotFoundError, AuthorizationError
from app.core.utils import get_current_academic_year

class FacultyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Profile Management ──────────────────────────────────────────────────

    async def get_profile(self, user_id: str) -> Dict[str, Any]:
        u = await self.db.get(models.User, user_id)
        if not u:
            raise ResourceNotFoundError("User", user_id)
            
        profile = u.profile_data or {}
        return {
            "id": u.id, "name": u.name, "email": u.email, "role": u.role,
            "college_id": u.college_id, "department": profile.get("department", u.profile_data.get("department")),
            "designation": profile.get("designation", ""),
            "date_of_joining": profile.get("date_of_joining", ""),
            "personal": profile.get("personal", {}),
            "educational": profile.get("educational", []),
            "experience": profile.get("experience", []),
            "research": profile.get("research", []),
            "publications": profile.get("publications", []),
            "patents": profile.get("patents", []),
            "memberships": profile.get("memberships", []),
            "training": profile.get("training", []),
        }

    async def update_profile(self, user_id: str, updates: Dict[str, Any]) -> None:
        u = await self.db.get(models.User, user_id)
        if not u:
            raise ResourceNotFoundError("User", user_id)
            
        profile = dict(u.profile_data or {})
        
        # Ensure status field on list collections
        list_sections = ["educational", "experience", "research", "publications", "patents", "memberships", "training"]
        for section_name in list_sections:
            if section_name in updates and updates[section_name] is not None:
                for record in updates[section_name]:
                    if isinstance(record, dict) and "status" not in record:
                        record["status"] = "draft"
        
        profile.update(updates)
        u.profile_data = profile
        flag_modified(u, "profile_data")
        
        await self.db.commit()

    async def list_department_teachers(self, college_id: str) -> List[Dict[str, Any]]:
        stmt = select(models.User).where(
            models.User.college_id == college_id,
            models.User.role.in_(["teacher", "hod"])
        )
        result = await self.db.execute(stmt)
        teachers = result.scalars().all()
        return [{"id": t.id, "name": t.name, "email": t.email, "role": t.role, **(t.profile_data or {})} for t in teachers]

    # ── Subject Definitions / Assignments ───────────────────────────────────

    async def list_assignments(self, college_id: str, user_role: str, user_id: str) -> List[Dict[str, Any]]:
        stmt = select(models.FacultyAssignment).where(models.FacultyAssignment.college_id == college_id)
        if user_role == "teacher":
            stmt = stmt.where(models.FacultyAssignment.teacher_id == user_id)
            
        result = await self.db.execute(stmt)
        rows = result.scalars().all()
        return [
            {
                "id": r.id, "course_id": r.subject_code, "teacher_id": r.teacher_id, 
                "subject_code": r.subject_code, "subject_name": r.subject_name, 
                "department": r.department, "batch": r.batch, "section": r.section, "semester": r.semester
            } for r in rows
        ]

    async def create_assignment(self, college_id: str, data: Dict[str, Any]) -> str:
        teacher_r = await self.db.execute(select(models.User).where(models.User.id == data["teacher_id"]))
        if not teacher_r.scalars().first():
            raise ResourceNotFoundError("Teacher", data["teacher_id"])
            
        row = models.FacultyAssignment(
            college_id=college_id,
            teacher_id=data["teacher_id"],
            subject_code=data["subject_code"],
            subject_name=data["subject_name"],
            department=data["department"],
            batch=data["batch"],
            section=data["section"],
            semester=data["semester"]
        )
        self.db.add(row)
        await self.db.commit()
        return str(row.id)

    async def delete_assignment(self, college_id: str, assignment_id: str) -> None:
        result = await self.db.execute(select(models.FacultyAssignment).where(
            models.FacultyAssignment.id == assignment_id,
            models.FacultyAssignment.college_id == college_id
        ))
        row = result.scalars().first()
        if not row:
            raise ResourceNotFoundError("FacultyAssignment", assignment_id)
        
        await self.db.delete(row)
        await self.db.commit()

    # ── Mentorship & Tracking ───────────────────────────────────────────────

    async def get_student_progression(self, user: Dict[str, Any], student_id: str) -> List[Dict[str, Any]]:
        college_id = user["college_id"]
        role = user["role"]
        user_id = user["id"]
        
        if role not in ["hod", "teacher", "faculty", "admin"]:
            raise AuthorizationError("Role not allowed to view progression")
            
        academic_year = await get_current_academic_year(self.db, college_id)
        
        if role in ["teacher", "faculty"]:
            m_r = await self.db.execute(select(models.MentorAssignment).where(
                models.MentorAssignment.faculty_id == user_id,
                models.MentorAssignment.student_id == student_id,
                models.MentorAssignment.academic_year == academic_year,
                models.MentorAssignment.is_active == True
            ))
            is_mentor = m_r.scalars().first() is not None
            
            stud_r = await self.db.execute(select(models.User).where(
                models.User.id == student_id,
                models.User.college_id == college_id
            ))
            stud = stud_r.scalars().first()
            is_cic = False
            if stud and stud.profile_data:
                c_r = await self.db.execute(select(models.ClassInCharge).where(
                    models.ClassInCharge.faculty_id == user_id,
                    models.ClassInCharge.academic_year == academic_year,
                    models.ClassInCharge.department == (stud.profile_data or {}).get("department", ""),
                    models.ClassInCharge.batch == (stud.profile_data or {}).get("batch", ""),
                    models.ClassInCharge.section == (stud.profile_data or {}).get("section", "")
                ))
                is_cic = c_r.scalars().first() is not None
                
            if not (is_mentor or is_cic):
                raise AuthorizationError("Not authorized to view this student's progression data")
                
        p_r = await self.db.execute(select(models.StudentProgression).where(
            models.StudentProgression.student_id == student_id,
            models.StudentProgression.college_id == college_id
        ).order_by(models.StudentProgression.created_at.desc()))
        
        return [{
            "id": p.id,
            "academic_year": p.academic_year,
            "progression_type": p.progression_type,
            "details": p.details,
            "created_at": p.created_at.isoformat()
        } for p in p_r.scalars().all()]

    # ── Submissions & Permissions ───────────────────────────────────────────

    async def submit_activity_request(self, college_id: str, faculty_id: str, data: Dict[str, Any]) -> None:
        row = models.ActivityPermission(
            college_id=college_id,
            faculty_id=faculty_id,
            activity_type=data["activity_type"],
            title=data["title"],
            description=data.get("description"),
            date=data.get("date"),
            venue=data.get("venue"),
            phase="pre_event",
            status="pending"
        )
        self.db.add(row)
        await self.db.commit()

    async def submit_out_of_campus(self, college_id: str, faculty_id: str, data: Dict[str, Any]) -> None:
        row = models.OutOfCampusPermission(
            college_id=college_id,
            faculty_id=faculty_id,
            destination=data["destination"],
            purpose=data["purpose"],
            departure_time=data["departure_time"],
            return_time=data.get("return_time"),
            status="pending"
        )
        self.db.add(row)
        await self.db.commit()

    async def submit_free_period(self, college_id: str, faculty_id: str, data: Dict[str, Any]) -> None:
        row = models.FreePeriodRequest(
            college_id=college_id,
            faculty_id=faculty_id,
            period_slot_id=data["period_slot_id"],
            date=data["date"],
            reason=data.get("reason"),
            status="pending"
        )
        self.db.add(row)
        await self.db.commit()

    async def submit_question_paper(self, college_id: str, faculty_id: str, data: Dict[str, Any]) -> str:
        qp = models.QuestionPaperSubmission(
            college_id=college_id,
            faculty_id=faculty_id,
            subject_code=data["subject_code"],
            academic_year=data["academic_year"],
            semester=data["semester"],
            exam_type=data["exam_type"],
            paper_url=data["paper_url"],
            status="submitted"
        )
        self.db.add(qp)
        await self.db.commit()
        return str(qp.id)

    async def list_question_papers(self, college_id: str, faculty_id: str) -> List[models.QuestionPaperSubmission]:
        res = await self.db.execute(
            select(models.QuestionPaperSubmission)
            .where(models.QuestionPaperSubmission.college_id == college_id, models.QuestionPaperSubmission.faculty_id == faculty_id)
            .order_by(models.QuestionPaperSubmission.created_at.desc())
        )
        return res.scalars().all()

    async def submit_study_material(self, college_id: str, faculty_id: str, data: Dict[str, Any]) -> str:
        sm = models.StudyMaterial(
            college_id=college_id,
            faculty_id=faculty_id,
            subject_code=data["subject_code"],
            academic_year=data["academic_year"],
            title=data["title"],
            file_url=data["file_url"],
            material_type=data.get("material_type"),
            status="submitted"
        )
        self.db.add(sm)
        await self.db.commit()
        return str(sm.id)

    async def list_study_materials(self, college_id: str, faculty_id: str) -> List[models.StudyMaterial]:
        res = await self.db.execute(
            select(models.StudyMaterial)
            .where(models.StudyMaterial.college_id == college_id, models.StudyMaterial.faculty_id == faculty_id)
            .order_by(models.StudyMaterial.created_at.desc())
        )
        return res.scalars().all()

    # ── Reading Assigned Work ───────────────────────────────────────────────

    async def get_my_tasks(self, assignee_id: str) -> List[models.TaskAssignment]:
        res = await self.db.execute(
            select(models.TaskAssignment).where(
                models.TaskAssignment.assignee_id == assignee_id,
                models.TaskAssignment.is_deleted == False
            ).order_by(models.TaskAssignment.deadline.asc())
        )
        return res.scalars().all()

    async def get_my_evaluations(self, college_id: str, faculty_id: str) -> List[models.TeachingEvaluation]:
        res = await self.db.execute(
            select(models.TeachingEvaluation)
            .where(models.TeachingEvaluation.college_id == college_id, models.TeachingEvaluation.faculty_id == faculty_id)
            .order_by(models.TeachingEvaluation.evaluation_date.desc())
        )
        return res.scalars().all()
