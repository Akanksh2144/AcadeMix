"""
Admin Service — handles logic and aggregations for root/super college admins.
Encapsulates system wide metrics, research aggregations, profile approvals, audits, and grievance resolutions.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm.attributes import flag_modified

from app import models
from app.core.exceptions import ResourceNotFoundError, BusinessLogicError


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Dashboards & Broad Stats ─────────────────────────────────────────────

    async def get_dashboard_stats(self, college_id: str) -> Dict[str, Any]:
        studs_r = await self.db.execute(select(func.count(models.User.id)).where(models.User.college_id == college_id, models.User.role == "student"))
        student_count = studs_r.scalar() or 0
        
        facs_r = await self.db.execute(select(func.count(models.User.id)).where(models.User.college_id == college_id, models.User.role.in_(["faculty", "teacher"])))
        faculty_count = facs_r.scalar() or 0
        
        depts_r = await self.db.execute(select(func.count(models.Department.id)).where(models.Department.college_id == college_id))
        dept_count = depts_r.scalar() or 0
        
        return {
            "total_students": student_count,
            "total_faculty": faculty_count,
            "total_departments": dept_count,
            "system_health": "Optimal",
            "pending_approvals_estimate": 0 
        }

    # ── Staff Profile Approvals ─────────────────────────────────────────────

    async def get_pending_staff_profiles(self, college_id: str) -> List[Dict[str, Any]]:
        stmt = select(models.User).where(
            models.User.college_id == college_id,
            models.User.role.in_(["faculty", "teacher"])
        )
        res = await self.db.execute(stmt)
        faculty = res.scalars().all()
        
        pending = []
        for f in faculty:
            pd = f.profile_data or {}
            has_pending = False
            for section in ["education", "experience", "research"]:
                for record in pd.get(section, []):
                    if record.get("status") == "submitted":
                        has_pending = True
                        break
            if has_pending:
                pending.append({"id": f.id, "name": f.name, "department": pd.get("department", "")})
                
        return pending

    async def review_staff_profile(self, college_id: str, user_id: str, section: str, record_index: int, action: str, remarks: str) -> None:
        user_req = await self.db.execute(select(models.User).where(models.User.id == user_id, models.User.college_id == college_id))
        target = user_req.scalars().first()
        if not target:
            raise ResourceNotFoundError("User", user_id)
            
        pd = target.profile_data or {}
        records = pd.get(section, [])
        if record_index < 0 or record_index >= len(records):
            raise BusinessLogicError("Invalid record index")
            
        records[record_index]["status"] = "approved" if action == "approve" else "rejected"
        records[record_index]["remarks"] = remarks
        
        pd[section] = records
        target.profile_data = pd
        flag_modified(target, "profile_data")
        await self.db.commit()

    # ── Report Generation (NAAC logic) ───────────────────────────────────────

    async def get_faculty_research_report(self, college_id: str) -> List[Dict[str, Any]]:
        stmt = select(models.User).where(
            models.User.college_id == college_id,
            models.User.role.in_(["teacher", "faculty"])
        )
        result = await self.db.execute(stmt)
        faculty = result.scalars().all()
        
        report = []
        for f in faculty:
            profile = f.profile_data or {}
            research = profile.get("research", [])
            publications = profile.get("publications", [])
            
            report.append({
                "faculty_id": f.id,
                "name": f.name,
                "department": profile.get("department", "N/A"),
                "research_projects": research,
                "publications": publications,
                "total_publications": len(publications),
                "total_research": len(research)
            })
        return report

    async def get_alumni_outcomes(self, college_id: str) -> Dict[str, Any]:
        alumni_count = (await self.db.execute(
            select(func.count(models.User.id)).where(models.User.college_id == college_id, models.User.role == "alumni")
        )).scalar()
        
        contrib_sum = (await self.db.execute(
            select(func.sum(models.AlumniContribution.amount)).where(models.AlumniContribution.college_id == college_id)
        )).scalar() or 0
        
        mentor_req_count = (await self.db.execute(
            select(func.count(models.AlumniMentorship.id)).where(models.AlumniMentorship.college_id == college_id)
        )).scalar()
        
        return {
            "total_alumni": alumni_count,
            "total_contribution_amount": contrib_sum,
            "total_mentorships": mentor_req_count
        }

    async def get_retired_faculty_research_report(self, college_id: str) -> List[Dict[str, Any]]:
        result = await self.db.execute(
            select(models.RetiredFacultyResearch, models.User).join(
                models.User, models.RetiredFacultyResearch.retired_faculty_id == models.User.id
            ).where(
                models.RetiredFacultyResearch.college_id == college_id,
                models.RetiredFacultyResearch.is_deleted == False,
            )
        )
        rows = result.all()
        return [{
            "id": r.id, "title": r.title, "faculty_name": u.name,
            "funding_agency": r.funding_agency, "status": r.status,
            "grant_amount": r.grant_amount,
            "start_date": r.start_date.isoformat() if r.start_date else None,
            "end_date": r.end_date.isoformat() if r.end_date else None,
            "co_investigators": r.co_investigators or [],
            "publication_urls": r.publication_urls or [],
        } for r, u in rows]

    async def get_consultancy_report(self, college_id: str) -> Dict[str, Any]:
        result = await self.db.execute(
            select(models.ConsultancyEngagement, models.User).join(
                models.User, models.ConsultancyEngagement.retired_faculty_id == models.User.id
            ).where(
                models.ConsultancyEngagement.college_id == college_id,
                models.ConsultancyEngagement.is_deleted == False,
            )
        )
        rows = result.all()
        total_paid = sum(c.fee_amount or 0 for c, _ in rows if c.is_paid)
        return {
            "total": len(rows),
            "total_revenue": total_paid,
            "engagements": [{
                "id": c.id, "faculty_name": u.name,
                "client_organization": c.client_organization, "topic": c.topic,
                "is_paid": c.is_paid, "fee_amount": c.fee_amount,
                "start_date": c.start_date.isoformat() if c.start_date else None,
                "end_date": c.end_date.isoformat() if c.end_date else None,
            } for c, u in rows]
        }

    # ── Operational Tasks ────────────────────────────────────────────────────

    async def get_unregistered_students(self, college_id: str, window_id: str) -> List[Dict[str, Any]]:
        win_r = await self.db.execute(select(models.RegistrationWindow).where(models.RegistrationWindow.id == window_id, models.RegistrationWindow.college_id == college_id))
        window = win_r.scalars().first()
        if not window:
            raise ResourceNotFoundError("RegistrationWindow", window_id)
            
        all_studs_r = await self.db.execute(select(models.User).where(models.User.role == "student", models.User.college_id == college_id))
        all_studs = {u.id: u for u in all_studs_r.scalars().all()}
        
        regs_r = await self.db.execute(select(models.CourseRegistration).where(models.CourseRegistration.semester == window.semester, models.CourseRegistration.academic_year == window.academic_year))
        reg_student_ids = {r.student_id for r in regs_r.scalars().all()}
        
        unregistered = []
        for sid, user in all_studs.items():
            if sid not in reg_student_ids:
                pd = user.profile_data or {}
                unregistered.append({
                    "id": user.id,
                    "name": user.name,
                    "department": pd.get("department", ""),
                    "batch": pd.get("batch", "")
                })
                
        return unregistered

    async def get_post_activity_reports(self, college_id: str) -> List[models.ActivityPermission]:
        reports_r = await self.db.execute(
            select(models.ActivityPermission).where(
                models.ActivityPermission.college_id == college_id,
                models.ActivityPermission.phase == "post_event",
                models.ActivityPermission.hod_report_decision == "approved"
            )
        )
        return reports_r.scalars().all()

    async def create_parent_link(self, college_id: str, data: Dict[str, Any]) -> None:
        link = models.ParentStudentLink(
            college_id=college_id,
            parent_id=data["parent_id"],
            student_id=data["student_id"],
            relationship=data.get("relationship", "guardian"),
            is_primary=data.get("is_primary", False)
        )
        self.db.add(link)
        await self.db.commit()

    async def get_parent_links(self, college_id: str) -> List[models.ParentStudentLink]:
        stmt = select(models.ParentStudentLink).where(
            models.ParentStudentLink.college_id == college_id,
            models.ParentStudentLink.is_deleted == False
        )
        return (await self.db.execute(stmt)).scalars().all()

    # ── Grievances ───────────────────────────────────────────────────────────

    async def get_grievances(self, college_id: str, status: Optional[str] = None, role: Optional[str] = None) -> List[Dict[str, Any]]:
        stmt = select(models.Grievance, models.User.name).join(
            models.User, models.User.id == models.Grievance.submitted_by
        ).where(
            models.Grievance.college_id == college_id,
            models.Grievance.is_deleted == False
        )
        if status:
            stmt = stmt.where(models.Grievance.status == status)
        if role:
            stmt = stmt.where(models.Grievance.submitted_by_role == role)
        stmt = stmt.order_by(models.Grievance.created_at.desc())

        results = (await self.db.execute(stmt)).all()
        return [{
            "id": g.id, "category": g.category, "subject": g.subject,
            "description": g.description, "status": g.status,
            "submitted_by_role": g.submitted_by_role, "submitted_by_name": name,
            "assigned_to": g.assigned_to, "resolution_notes": g.resolution_notes,
            "created_at": g.created_at.isoformat() if g.created_at else None
        } for g, name in results]

    async def resolve_grievance(self, college_id: str, user_id: str, grievance_id: str, data: Dict[str, Any]) -> str:
        g = await self.db.get(models.Grievance, grievance_id)
        if not g or g.college_id != college_id:
            raise ResourceNotFoundError("Grievance", grievance_id)

        g.status = data.get("status", "resolved")
        g.resolution_notes = data.get("resolution_notes")
        g.assigned_to = data.get("assigned_to", user_id)
        await self.db.commit()
        return g.status
