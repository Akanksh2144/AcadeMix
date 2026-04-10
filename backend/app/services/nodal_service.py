"""
Nodal Service — handles state/DHTE logic for the Nodal Officer domain.
Encapsulates cross-college aggregations for attendance, results, circulars, and inspections.
"""

from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case
from datetime import datetime, timezone

from app import models
from app.core.exceptions import ResourceNotFoundError


def _row_to_dict(row):
    if not row: return None
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


class NodalService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_nodal_jurisdiction_colleges(self, nodal_officer_id: str) -> List[str]:
        res = await self.db.execute(
            select(models.NodalOfficerJurisdiction.college_id)
            .where(models.NodalOfficerJurisdiction.nodal_officer_id == nodal_officer_id)
            .where(models.NodalOfficerJurisdiction.is_active == True)
        )
        return res.scalars().all()

    # ── Colleges & Health Aggregations ──────────────────────────────────────

    async def get_colleges(self, nodal_officer_id: str) -> List[Dict[str, Any]]:
        c_ids = await self.get_nodal_jurisdiction_colleges(nodal_officer_id)
        if not c_ids:
            return []
            
        res = await self.db.execute(select(models.College).where(models.College.id.in_(c_ids)))
        colleges = res.scalars().all()
        return [{"id": c.id, "name": c.name, "domain": c.domain} for c in colleges]

    async def get_attendance_compliance(self, nodal_officer_id: str) -> List[Dict[str, Any]]:
        c_ids = await self.get_nodal_jurisdiction_colleges(nodal_officer_id)
        if not c_ids: return []
        
        stmt = select(
            models.AttendanceRecord.college_id,
            func.count(models.AttendanceRecord.id).label("total"),
            func.sum(case((models.AttendanceRecord.status == 'present', 1), else_=0)).label("present")
        ).where(
            models.AttendanceRecord.college_id.in_(c_ids),
            models.AttendanceRecord.is_deleted == False
        ).group_by(models.AttendanceRecord.college_id)
        att_r = await self.db.execute(stmt)
        att_map = {r.college_id: {"total": r.total, "present": r.present} for r in att_r.fetchall()}
        
        res = await self.db.execute(select(models.College.id, models.College.name).where(models.College.id.in_(c_ids)))
        colleges = res.fetchall()
        data = []
        for c in colleges:
            att = att_map.get(c.id, {"total": 0, "present": 0})
            pct = round((att["present"] / att["total"] * 100) if att["total"] else 0, 2)
            data.append({"college_id": c.id, "college_name": c.name, "total_records": att["total"], "present_count": att["present"], "compliance_pct": pct})
        return data

    async def get_results_status(self, nodal_officer_id: str) -> List[Dict[str, Any]]:
        c_ids = await self.get_nodal_jurisdiction_colleges(nodal_officer_id)
        if not c_ids: return []
        
        stmt = select(
            models.User.college_id,
            func.count(models.SemesterGrade.id).label("total"),
            func.sum(case((models.SemesterGrade.grade.notin_(['F', 'AB']), 1), else_=0)).label("passed")
        ).join(
            models.User, models.User.id == models.SemesterGrade.student_id
        ).where(
            models.User.college_id.in_(c_ids)
        ).group_by(models.User.college_id)
        gr_r = await self.db.execute(stmt)
        gr_map = {r.college_id: {"total": r.total, "passed": r.passed} for r in gr_r.fetchall()}
        
        res = await self.db.execute(select(models.College.id, models.College.name).where(models.College.id.in_(c_ids)))
        data = []
        for c in res.fetchall():
            g = gr_map.get(c.id, {"total": 0, "passed": 0})
            pct = round((g["passed"] / g["total"] * 100) if g["total"] else 0, 2)
            data.append({"college_id": c.id, "college_name": c.name, "total_grades": g["total"], "passed": g["passed"], "pass_percentage": pct})
        return data

    async def get_cia_submission(self, nodal_officer_id: str) -> List[Dict[str, Any]]:
        c_ids = await self.get_nodal_jurisdiction_colleges(nodal_officer_id)
        if not c_ids: return []
        
        stmt = select(
            models.User.college_id,
            func.count(models.MarkEntry.id).label("total_entries")
        ).join(
            models.User, models.User.id == models.MarkEntry.faculty_id
        ).where(
            models.User.college_id.in_(c_ids)
        ).group_by(models.User.college_id)
        me_r = await self.db.execute(stmt)
        me_map = {r.college_id: r.total_entries for r in me_r.fetchall()}
        
        res = await self.db.execute(select(models.College.id, models.College.name).where(models.College.id.in_(c_ids)))
        return [{"college_id": c.id, "college_name": c.name, "marks_submitted": me_map.get(c.id, 0)} for c in res.fetchall()]

    async def get_faculty_profiles(self, nodal_officer_id: str) -> List[Dict[str, Any]]:
        c_ids = await self.get_nodal_jurisdiction_colleges(nodal_officer_id)
        if not c_ids: return []
        
        fac_stmt = select(
            models.User.college_id,
            func.count(models.User.id).label("total_faculty"),
            func.sum(func.cast(models.User.profile_data != None, models.Integer)).label("with_profile")
        ).where(
            models.User.college_id.in_(c_ids),
            models.User.role.in_(["teacher", "faculty", "hod"])
        ).group_by(models.User.college_id)
        fr = await self.db.execute(fac_stmt)
        fac_map = {r.college_id: {"total": r.total_faculty, "complete": r.with_profile or 0} for r in fr.fetchall()}
        
        res = await self.db.execute(select(models.College.id, models.College.name).where(models.College.id.in_(c_ids)))
        data = []
        for c in res.fetchall():
            f = fac_map.get(c.id, {"total": 0, "complete": 0})
            pct = round((f["complete"] / f["total"] * 100) if f["total"] else 0, 2)
            data.append({"college_id": c.id, "college_name": c.name, "total_faculty": f["total"], "profiles_complete": f["complete"], "completion_rate": pct})
        return data

    async def get_accreditation(self, nodal_officer_id: str) -> List[Dict[str, Any]]:
        c_ids = await self.get_nodal_jurisdiction_colleges(nodal_officer_id)
        res = await self.db.execute(select(models.InstitutionProfile).where(models.InstitutionProfile.college_id.in_(c_ids)))
        profiles = res.scalars().all()
        return [{"college_id": p.college_id, "recognitions": p.recognitions} for p in profiles]

    # ── Action Items (Activities/Experts/Inspections/Circulars) ─────────────

    async def get_activity_reports(self, nodal_officer_id: str) -> List[Dict[str, Any]]:
        c_ids = await self.get_nodal_jurisdiction_colleges(nodal_officer_id)
        if not c_ids: return []
        res = await self.db.execute(
            select(models.ActivityPermission)
            .where(models.ActivityPermission.college_id.in_(c_ids))
            .where(models.ActivityPermission.principal_noted_at != None)
        )
        return [_row_to_dict(a) for a in res.scalars().all()]

    async def acknowledge_activity(self, report_id: str, notes: str) -> None:
        res = await self.db.execute(select(models.ActivityPermission).where(models.ActivityPermission.id == report_id))
        act = res.scalars().first()
        if not act: 
            raise ResourceNotFoundError("ActivityPermission", report_id)
        
        act.nodal_acknowledged_at = datetime.now(timezone.utc)
        act.nodal_notes = notes
        await self.db.commit()

    async def create_circular(self, nodal_officer_id: str, data: Dict[str, Any]) -> str:
        circ = models.DHCircular(
            issued_by=nodal_officer_id,
            title=data["title"],
            content=data["content"],
            document_url=data["document_url"],
            is_mandatory=data["is_mandatory"],
            target_colleges=data["target_colleges"]
        )
        self.db.add(circ)
        await self.db.commit()
        return str(circ.id)

    async def get_circulars(self, nodal_officer_id: str, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        res = await self.db.execute(select(models.DHCircular).where(models.DHCircular.issued_by == nodal_officer_id).offset(skip).limit(limit))
        circs = res.scalars().all()
        c_ids = [c.id for c in circs]
        ack_map = {}
        if c_ids:
            acks_r = await self.db.execute(select(models.CircularAcknowledgment).where(models.CircularAcknowledgment.circular_id.in_(c_ids)))
            for a in acks_r.scalars().all():
                ack_map.setdefault(a.circular_id, []).append({"college_id": a.college_id, "date": a.acknowledged_at})
        ans = []
        for c in circs:
            c_dict = _row_to_dict(c)
            c_dict["acknowledgments"] = ack_map.get(c.id, [])
            ans.append(c_dict)
        return ans

    async def create_submission_req(self, nodal_officer_id: str, data: Dict[str, Any]) -> str:
        req = models.DHSubmissionRequirement(
            nodal_officer_id=nodal_officer_id,
            title=data["title"],
            description=data["description"],
            data_type=data["data_type"],
            deadline=data["deadline"],
            target_colleges=data["target_colleges"]
        )
        self.db.add(req)
        await self.db.commit()
        return str(req.id)

    async def get_submissions_status(self, nodal_officer_id: str, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        res = await self.db.execute(select(models.DHSubmissionRequirement).where(models.DHSubmissionRequirement.nodal_officer_id == nodal_officer_id).offset(skip).limit(limit))
        reqs = res.scalars().all()
        r_ids = [r.id for r in reqs]
        rec_map = {}
        if r_ids:
            rec_res = await self.db.execute(select(models.DHSubmissionRecord).where(models.DHSubmissionRecord.requirement_id.in_(r_ids)))
            for rec in rec_res.scalars().all():
                rec_map.setdefault(rec.requirement_id, []).append({"college_id": rec.college_id, "status": rec.status})
        ans = []
        for r in reqs:
            r_dict = _row_to_dict(r)
            r_dict["records"] = rec_map.get(r.id, [])
            ans.append(r_dict)
        return ans

    async def assign_expert(self, nodal_officer_id: str, data: Dict[str, Any]) -> str:
        assign = models.ExpertAssignment(
            expert_user_id=data["expert_user_id"],
            college_id=data["college_id"],
            subject_code=data["subject_code"],
            department_id=data["department_id"],
            academic_year=data["academic_year"],
            assigned_by=nodal_officer_id
        )
        self.db.add(assign)
        await self.db.commit()
        return str(assign.id)

    async def create_inspection(self, nodal_officer_id: str, data: Dict[str, Any]) -> str:
        insp = models.InspectionRecord(
            nodal_officer_id=nodal_officer_id,
            college_id=data["college_id"],
            inspection_date=data["inspection_date"],
            inspection_type=data["inspection_type"],
            team_members=data["team_members"],
            findings=data["findings"],
            action_points=data["action_points"],
            compliance_score=data["compliance_score"],
            status="draft"
        )
        self.db.add(insp)
        await self.db.commit()
        return str(insp.id)

    async def get_inspections(self, nodal_officer_id: str, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        res = await self.db.execute(select(models.InspectionRecord).where(models.InspectionRecord.nodal_officer_id == nodal_officer_id).offset(skip).limit(limit))
        insps = res.scalars().all()
        i_ids = [i.id for i in insps]
        resps_map = {}
        if i_ids:
            rsp_res = await self.db.execute(select(models.InspectionResponse).where(models.InspectionResponse.inspection_id.in_(i_ids)))
            for r in rsp_res.scalars().all():
                resps_map.setdefault(r.inspection_id, []).append({"response": r.response_text, "date": r.response_date})
        ans = []
        for insp in insps:
            r_dict = _row_to_dict(insp)
            r_dict["responses"] = resps_map.get(insp.id, [])
            ans.append(r_dict)
        return ans

    # ── College Admin Facing Functionality ───────────────────────────────────

    async def acknowledge_circular(self, college_id: str, user_id: str, circular_id: str) -> None:
        ack = models.CircularAcknowledgment(circular_id=circular_id, college_id=college_id, acknowledged_by=user_id)
        self.db.add(ack)
        await self.db.commit()

    async def get_admin_circulars(self, college_id: str) -> List[models.DHCircular]:
        res = await self.db.execute(select(models.DHCircular))
        circs = res.scalars().all()
        return [c for c in circs if (c.target_colleges and (college_id in c.target_colleges or "all" in c.target_colleges))]

    async def get_admin_submissions(self, college_id: str) -> List[models.DHSubmissionRequirement]:
        res = await self.db.execute(select(models.DHSubmissionRequirement))
        reqs = res.scalars().all()
        return [r for r in reqs if (r.target_colleges and (college_id in r.target_colleges or "all" in r.target_colleges))]

    async def submit_requirement_data(self, college_id: str, user_id: str, requirement_id: str, submission_url: str) -> None:
        from app.core.exceptions import AuthorizationError
        
        req_res = await self.db.execute(select(models.DHSubmissionRequirement).where(models.DHSubmissionRequirement.id == requirement_id))
        requirement = req_res.scalars().first()
        if not requirement: 
            raise ResourceNotFoundError("DHSubmissionRequirement", requirement_id)
            
        if requirement.target_colleges and "all" not in requirement.target_colleges and college_id not in requirement.target_colleges:
            raise AuthorizationError("Your college is not targeted by this submission requirement")
            
        rec = models.DHSubmissionRecord(
            requirement_id=requirement_id,
            college_id=college_id,
            submitted_by=user_id,
            submission_url=submission_url,
            status="submitted"
        )
        self.db.add(rec)
        await self.db.commit()

    async def get_admin_inspections(self, college_id: str) -> List[models.InspectionRecord]:
        res = await self.db.execute(select(models.InspectionRecord).where(models.InspectionRecord.college_id == college_id))
        return res.scalars().all()

    async def submit_inspection_response(self, college_id: str, user_id: str, inspection_id: str, response_text: str) -> None:
        res = models.InspectionResponse(
            inspection_id=inspection_id,
            college_id=college_id,
            response_by=user_id,
            response_text=response_text
        )
        self.db.add(res)
        
        insp_res = await self.db.execute(
            select(models.InspectionRecord).where(
                models.InspectionRecord.id == inspection_id,
                models.InspectionRecord.college_id == college_id
            )
        )
        insp = insp_res.scalars().first()
        if not insp:
            raise ResourceNotFoundError("InspectionRecord for college", inspection_id)
            
        insp.status = "college_responded"
        await self.db.commit()
