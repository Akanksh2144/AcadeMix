"""
Principal Service — handles logic and aggregation for the Principal domain.
Encapsulates dashboard stats, cross-departmental reports, profile management, and institution settings.
"""

from datetime import datetime, timezone, date as date_type
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, text, and_, or_

from app import models
from app.core.exceptions import ResourceNotFoundError, BusinessLogicError
from app.core.audit import log_audit
from app.services.marks_service import MarksService

class PrincipalService:
    """Service handling multi-departmental aggregations and administrative oversight."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Institutional Profile ───────────────────────────────────────────────

    async def get_institution_profile(self, college_id: str) -> Dict[str, Any]:
        result = await self.db.execute(
            select(models.InstitutionProfile).where(
                models.InstitutionProfile.college_id == college_id
            )
        )
        profile = result.scalars().first()
        if not profile:
            return {}

        return {
            "id": profile.id,
            "recognitions": profile.recognitions,
            "infrastructure": profile.infrastructure,
            "library": profile.library,
            "mous": profile.mous,
            "extension_activities": profile.extension_activities,
            "research_publications": profile.research_publications,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None
        }

    async def update_institution_profile(
        self, college_id: str, admin_id: str, update_data: Dict[str, Any]
    ) -> None:
        result = await self.db.execute(
            select(models.InstitutionProfile).where(
                models.InstitutionProfile.college_id == college_id
            )
        )
        profile = result.scalars().first()

        if not profile:
            profile = models.InstitutionProfile(
                college_id=college_id,
                updated_by=admin_id
            )
            self.db.add(profile)
        else:
            profile.updated_by = admin_id

        # Update fields that were provided
        for field in [
            "recognitions", "infrastructure", "library", "mous",
            "extension_activities", "research_publications"
        ]:
            if field in update_data and update_data[field] is not None:
                setattr(profile, field, update_data[field])

        await log_audit(self.db, admin_id, "institution_profile", "update", {})
        await self.db.commit()

    # ── Dashboards & Quick Stats ─────────────────────────────────────────────

    async def get_dashboard_summary(self, college_id: str) -> Dict[str, int]:
        students_count = await self.db.scalar(
            select(func.count(models.User.id)).where(
                models.User.college_id == college_id,
                models.User.role == "student"
            )
        )
        
        faculty_count = await self.db.scalar(
            select(func.count(models.User.id)).where(
                models.User.college_id == college_id,
                models.User.role.in_(["teacher", "faculty"])
            )
        )
        
        depts_count = await self.db.scalar(
            select(func.count(models.Department.id)).where(
                models.Department.college_id == college_id
            )
        )
        
        pending_hod_leaves = await self.db.scalar(
            select(func.count(models.LeaveRequest.id)).where(
                models.LeaveRequest.college_id == college_id,
                models.LeaveRequest.applicant_role == "hod",
                models.LeaveRequest.status == "pending"
            )
        )

        pending_activities = await self.db.scalar(
            select(func.count(models.ActivityPermission.id)).where(
                models.ActivityPermission.college_id == college_id,
                models.ActivityPermission.hod_permission_decision == "approved",
                models.ActivityPermission.principal_noted_at.is_(None)
            )
        )

        return {
            "total_students": students_count or 0,
            "total_faculty": faculty_count or 0,
            "total_departments": depts_count or 0,
            "pending_hod_leaves": pending_hod_leaves or 0,
            "pending_activities": pending_activities or 0
        }

    # ── Reports ─────────────────────────────────────────────────────────────

    async def get_academic_performance(self, college_id: str, semester: int) -> List[Dict[str, Any]]:
        from sqlalchemy import Integer
        stmt = select(
            models.SemesterGrade.course_id,
            models.User.profile_data['department'].astext.label('department_id'),
            func.count(models.SemesterGrade.id).label("total_students"),
            func.sum(
                func.cast(
                    and_(
                        models.SemesterGrade.grade != 'F',
                        models.SemesterGrade.grade != 'AB'
                    ), Integer
                )
            ).label("passed_students")
        ).join(
            models.User, models.User.id == models.SemesterGrade.student_id
        ).where(
            models.User.college_id == college_id,
            models.SemesterGrade.semester == semester
        ).group_by(
            models.SemesterGrade.course_id,
            models.User.profile_data['department'].astext
        )
        
        result = await self.db.execute(stmt)
        data = []
        for row in result.all():
            total = row.total_students or 0
            passed = row.passed_students or 0
            data.append({
                "course_id": row.course_id,
                "department_id": row.department_id,
                "total_students": total,
                "passed_students": passed,
                "failed_students": total - passed,
                "pass_percentage": round((passed / total * 100) if total > 0 else 0, 2)
            })
        return data

    async def get_attendance_compliance(self, college_id: str, academic_year: str) -> List[Dict[str, Any]]:
        # Defaulters (<75%) grouped by department
        defaulters_stmt = text('''
            SELECT 
                u.profile_data->>'department' AS department,
                COUNT(u.id) AS total_students,
                SUM(CASE WHEN 
                    (CAST(u.profile_data->>'total_classes_attended' AS FLOAT) / 
                     NULLIF(CAST(u.profile_data->>'total_classes_held' AS FLOAT), 0)) < 0.75 
                THEN 1 ELSE 0 END) AS defaulters_count
            FROM users u
            WHERE u.college_id = :college_id AND u.role = 'student'
            GROUP BY u.profile_data->>'department'
        ''')
        
        defaulters_r = await self.db.execute(defaulters_stmt, {"college_id": college_id})
        dept_defaulters = {}
        for row in defaulters_r:
            dept = row.department or "Unknown"
            dept_defaulters[dept] = {
                "total_students": row.total_students,
                "defaulters_count": row.defaulters_count,
                "compliance_rate": round(100 - ((row.defaulters_count or 0)/(row.total_students or 1)* 100), 2)
            }
            
        unmarked_stmt = text('''
            SELECT 
                ps.department_id as department,
                COUNT(ps.id) as unmarked_slots
            FROM period_slots ps
            LEFT JOIN attendance_records ar ON ar.period_slot_id = ps.id AND ar.is_deleted = false
            WHERE ps.college_id = :college_id AND ps.academic_year = :academic_year AND ar.id IS NULL AND ps.is_deleted = false
            GROUP BY ps.department_id
        ''')
        unmarked_r = await self.db.execute(unmarked_stmt, {"college_id": college_id, "academic_year": academic_year})
        unmarked_slots = {row.department: row.unmarked_slots for row in unmarked_r}
            
        all_depts = set(list(dept_defaulters.keys()) + list(unmarked_slots.keys()))
        final_data = []
        for dept in all_depts:
            final_data.append({
                "department_id": dept,
                "student_attendance": dept_defaulters.get(dept, {"total_students": 0, "defaulters_count": 0, "compliance_rate": 0}),
                "unmarked_faculty_slots": unmarked_slots.get(dept, 0)
            })
            
        return final_data

    async def get_staff_profiles_status(self, college_id: str) -> List[Dict[str, Any]]:
        stmt = text('''
            SELECT 
                profile_data->>'department' as department,
                COUNT(*) as total_faculty,
                SUM(CASE WHEN 
                    jsonb_typeof(profile_data->'educational') = 'array' AND jsonb_array_length(profile_data->'educational') > 0
                    AND profile_data ? 'experience'
                THEN 1 ELSE 0 END) as complete_profiles
            FROM users
            WHERE college_id = :college_id AND role IN ('teacher', 'faculty', 'hod')
            GROUP BY profile_data->>'department'
        ''')
        
        rows = await self.db.execute(stmt, {"college_id": college_id})
        return [{
            "department_id": r.department or "Unknown",
            "total_faculty": r.total_faculty,
            "complete_profiles": r.complete_profiles,
            "incomplete_profiles": r.total_faculty - r.complete_profiles,
            "completeness_percentage": round((r.complete_profiles / r.total_faculty * 100) if r.total_faculty > 0 else 0)
        } for r in rows]

    async def get_extension_activities(self, college_id: str) -> List[Dict[str, Any]]:
        try:
            stmt = select(
                models.ActivityPermission.activity_type,
                func.count(models.ActivityPermission.id).label("total")
            ).where(
                models.ActivityPermission.college_id == college_id,
                models.ActivityPermission.activity_type.in_(["ncc", "nss"]),
                models.ActivityPermission.hod_report_decision == "accepted"
            ).group_by(models.ActivityPermission.activity_type)
            r = await self.db.execute(stmt)
            return [{"activity_type": row.activity_type, "completed_events": row.total} for row in r.all()]
        except Exception:
            prof_r = await self.db.execute(select(models.InstitutionProfile).where(models.InstitutionProfile.college_id == college_id))
            profile = prof_r.scalars().first()
            return profile.extension_activities if profile and profile.extension_activities else []

    async def get_annual_consolidation(self, user: Dict[str, Any], academic_year: str) -> Dict[str, Any]:
        college_id = user["college_id"]
        attendance = await self.get_attendance_compliance(college_id, academic_year)
        infra = (await self.get_institution_profile(college_id)).get("infrastructure", {})
        extension = await self.get_extension_activities(college_id)
        
        # CIA via MarksService
        cia_svc = MarksService(self.db)
        cia = await cia_svc.get_status_report(user, None, academic_year)

        return {
            "academic_year": academic_year,
            "generated_on": datetime.now(timezone.utc).isoformat(),
            "attendance_compliance": attendance,
            "cia_status": cia,
            "infrastructure": infra,
            "extension_activities": extension,
            "placement_overview": {
                "total_placed": 0, 
                "average_ctc": 0, 
                "department_breakdown": [], 
                "academic_year": None
            }
        }

    # ── Utility & Reassignments ──────────────────────────────────────────────

    async def add_calendar_event(self, college_id: str, new_event: Dict[str, Any]) -> None:
        cal_r = await self.db.execute(
            select(models.AcademicCalendar).where(
                models.AcademicCalendar.college_id == college_id,
                models.AcademicCalendar.end_date >= date_type.today()
            ).order_by(models.AcademicCalendar.start_date.desc()).limit(1)
        )
        calendar = cal_r.scalars().first()
        if not calendar:
            raise ResourceNotFoundError("AcademicCalendar", "Active")
        
        current_events = calendar.events or []
        current_events.append(new_event)
        calendar.events = current_events
        await self.db.commit()

    async def reassign_grievance(self, college_id: str, grievance_id: str, target_dept_id: str) -> str:
        dept_r = await self.db.execute(select(models.Department).where(
            models.Department.college_id == college_id,
            or_(models.Department.id == target_dept_id, models.Department.code == target_dept_id)
        ))
        dept = dept_r.scalars().first()
        if not dept or not dept.hod_user_id:
            raise BusinessLogicError(f"Department '{target_dept_id}' not found or has no HOD assigned")
            
        gr = await self.db.execute(select(models.Grievance).where(
            models.Grievance.id == grievance_id,
            models.Grievance.college_id == college_id
        ))
        grievance = gr.scalars().first()
        if not grievance:
            raise ResourceNotFoundError("Grievance", grievance_id)
            
        grievance.assigned_to = dept.hod_user_id
        grievance.status = "in_review"
        await self.db.commit()
        return dept.name
