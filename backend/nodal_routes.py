from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import models
from database import get_db

# We need the require_role and get_current_user from server.py, but since we cannot easily import them 
# without circular imports, we will inject them into setup_nodal_routes.

def _row_to_dict(row):
    if not row: return None
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}

def setup_nodal_routes(app, require_role, get_current_user):
    
    async def get_nodal_jurisdiction_colleges(user_id: str, session: AsyncSession) -> List[str]:
        res = await session.execute(
            select(models.NodalOfficerJurisdiction.college_id)
            .where(models.NodalOfficerJurisdiction.nodal_officer_id == user_id)
            .where(models.NodalOfficerJurisdiction.is_active == True)
        )
        return res.scalars().all()

    # 1. Colleges
    @app.get("/api/nodal/colleges")
    async def get_nodal_colleges(user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        c_ids = await get_nodal_jurisdiction_colleges(user["id"], session)
        if not c_ids:
            return {"data": []}
            
        res = await session.execute(select(models.College).where(models.College.id.in_(c_ids)))
        colleges = res.scalars().all()
        
        # In a real app we would aggregate students/faculty count here for each college
        return {"data": [{"id": c.id, "name": c.name, "domain": c.domain} for c in colleges]}

    # 2. Attendance Compliance
    @app.get("/api/nodal/reports/attendance-compliance")
    async def get_nodal_attendance(user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        c_ids = await get_nodal_jurisdiction_colleges(user["id"], session)
        if not c_ids: return {"data": []}
        # Real aggregation: count total + present attendance records per college
        from sqlalchemy import case
        stmt = select(
            models.AttendanceRecord.college_id,
            func.count(models.AttendanceRecord.id).label("total"),
            func.sum(case((models.AttendanceRecord.status == 'present', 1), else_=0)).label("present")
        ).where(
            models.AttendanceRecord.college_id.in_(c_ids),
            models.AttendanceRecord.is_deleted == False
        ).group_by(models.AttendanceRecord.college_id)
        att_r = await session.execute(stmt)
        att_map = {r.college_id: {"total": r.total, "present": r.present} for r in att_r.fetchall()}
        
        res = await session.execute(select(models.College.id, models.College.name).where(models.College.id.in_(c_ids)))
        colleges = res.fetchall()
        data = []
        for c in colleges:
            att = att_map.get(c.id, {"total": 0, "present": 0})
            pct = round((att["present"] / att["total"] * 100) if att["total"] else 0, 2)
            data.append({"college_id": c.id, "college_name": c.name, "total_records": att["total"], "present_count": att["present"], "compliance_pct": pct})
        return {"data": data}

    # 3. Results Status
    @app.get("/api/nodal/reports/results-status")
    async def get_nodal_results(user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        c_ids = await get_nodal_jurisdiction_colleges(user["id"], session)
        if not c_ids: return {"data": []}
        # Real query: count grades per college via User join
        from sqlalchemy import case
        stmt = select(
            models.User.college_id,
            func.count(models.SemesterGrade.id).label("total"),
            func.sum(case((models.SemesterGrade.grade.notin_(['F', 'AB']), 1), else_=0)).label("passed")
        ).join(
            models.User, models.User.id == models.SemesterGrade.student_id
        ).where(
            models.User.college_id.in_(c_ids)
        ).group_by(models.User.college_id)
        gr_r = await session.execute(stmt)
        gr_map = {r.college_id: {"total": r.total, "passed": r.passed} for r in gr_r.fetchall()}
        
        res = await session.execute(select(models.College.id, models.College.name).where(models.College.id.in_(c_ids)))
        data = []
        for c in res.fetchall():
            g = gr_map.get(c.id, {"total": 0, "passed": 0})
            pct = round((g["passed"] / g["total"] * 100) if g["total"] else 0, 2)
            data.append({"college_id": c.id, "college_name": c.name, "total_grades": g["total"], "passed": g["passed"], "pass_percentage": pct})
        return {"data": data}

    # 4. CIA Submission
    @app.get("/api/nodal/reports/cia-submission")
    async def get_nodal_cia_submission(user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        c_ids = await get_nodal_jurisdiction_colleges(user["id"], session)
        if not c_ids: return {"data": []}
        # Real: count mark entries per college via faculty_id -> User.college_id
        stmt = select(
            models.User.college_id,
            func.count(models.MarkEntry.id).label("total_entries")
        ).join(
            models.User, models.User.id == models.MarkEntry.faculty_id
        ).where(
            models.User.college_id.in_(c_ids)
        ).group_by(models.User.college_id)
        me_r = await session.execute(stmt)
        me_map = {r.college_id: r.total_entries for r in me_r.fetchall()}
        
        res = await session.execute(select(models.College.id, models.College.name).where(models.College.id.in_(c_ids)))
        return {"data": [{"college_id": c.id, "college_name": c.name, "marks_submitted": me_map.get(c.id, 0)} for c in res.fetchall()]}

    # 5. Faculty Profiles
    @app.get("/api/nodal/reports/faculty-profiles")
    async def get_nodal_faculty_profiles(user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        c_ids = await get_nodal_jurisdiction_colleges(user["id"], session)
        if not c_ids: return {"data": []}
        # Real: count faculty and profile completeness
        fac_stmt = select(
            models.User.college_id,
            func.count(models.User.id).label("total_faculty"),
            func.sum(func.cast(models.User.profile_data != None, models.Integer)).label("with_profile")
        ).where(
            models.User.college_id.in_(c_ids),
            models.User.role.in_(["teacher", "faculty", "hod"])
        ).group_by(models.User.college_id)
        fr = await session.execute(fac_stmt)
        fac_map = {r.college_id: {"total": r.total_faculty, "complete": r.with_profile or 0} for r in fr.fetchall()}
        
        res = await session.execute(select(models.College.id, models.College.name).where(models.College.id.in_(c_ids)))
        data = []
        for c in res.fetchall():
            f = fac_map.get(c.id, {"total": 0, "complete": 0})
            pct = round((f["complete"] / f["total"] * 100) if f["total"] else 0, 2)
            data.append({"college_id": c.id, "college_name": c.name, "total_faculty": f["total"], "profiles_complete": f["complete"], "completion_rate": pct})
        return {"data": data}

    # 6. Accreditation
    @app.get("/api/nodal/reports/accreditation")
    async def get_nodal_accreditation(user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        c_ids = await get_nodal_jurisdiction_colleges(user["id"], session)
        res = await session.execute(select(models.InstitutionProfile).where(models.InstitutionProfile.college_id.in_(c_ids)))
        profiles = res.scalars().all()
        return {"data": [{"college_id": p.college_id, "recognitions": p.recognitions} for p in profiles]}

    # 7 & 8. Activity Reports
    @app.get("/api/nodal/activity-reports")
    async def get_nodal_activities(user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        c_ids = await get_nodal_jurisdiction_colleges(user["id"], session)
        if not c_ids: return {"data": []}
        res = await session.execute(
            select(models.ActivityPermission)
            .where(models.ActivityPermission.college_id.in_(c_ids))
            .where(models.ActivityPermission.principal_noted_at != None)
        )
        return {"data": [_row_to_dict(a) for a in res.scalars().all()]}

    class AcknowledgePayload(BaseModel):
        notes: str

    @app.put("/api/nodal/activity-reports/{report_id}/acknowledge")
    async def ack_nodal_activity(report_id: str, payload: AcknowledgePayload, user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        res = await session.execute(select(models.ActivityPermission).where(models.ActivityPermission.id == report_id))
        act = res.scalars().first()
        if not act: raise HTTPException(status_code=404)
        from datetime import datetime, timezone
        act.nodal_acknowledged_at = datetime.now(timezone.utc)
        act.nodal_notes = payload.notes
        await session.commit()
        return {"success": True}

    # 9 & 10. Circulars
    class CircularPayload(BaseModel):
        title: str
        content: str
        document_url: str
        is_mandatory: bool
        target_colleges: list

    @app.post("/api/nodal/circulars")
    async def create_circular(payload: CircularPayload, user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        circ = models.DHCircular(
            issued_by=user["id"],
            title=payload.title,
            content=payload.content,
            document_url=payload.document_url,
            is_mandatory=payload.is_mandatory,
            target_colleges=payload.target_colleges
        )
        session.add(circ)
        await session.commit()
        return {"success": True, "id": circ.id}

    @app.get("/api/nodal/circulars")
    async def get_nodal_circulars(user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        res = await session.execute(select(models.DHCircular).where(models.DHCircular.issued_by == user["id"]))
        circs = res.scalars().all()
        # attach acknowledgments
        ans = []
        for c in circs:
            ack_res = await session.execute(select(models.CircularAcknowledgment).where(models.CircularAcknowledgment.circular_id == c.id))
            acks = ack_res.scalars().all()
            c_dict = _row_to_dict(c)
            c_dict["acknowledgments"] = [{"college_id": a.college_id, "date": a.acknowledged_at} for a in acks]
            ans.append(c_dict)
        return {"data": ans}

    # 11 & 12. Submissions
    class RequirementPayload(BaseModel):
        title: str
        description: str
        data_type: str
        deadline: str
        target_colleges: list

    @app.post("/api/nodal/submission-requirements")
    async def create_sub_req(payload: RequirementPayload, user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        req = models.DHSubmissionRequirement(
            nodal_officer_id=user["id"],
            title=payload.title,
            description=payload.description,
            data_type=payload.data_type,
            deadline=payload.deadline, # DB handles coerce if standard ISO
            target_colleges=payload.target_colleges
        )
        session.add(req)
        await session.commit()
        return {"success": True, "id": req.id}

    @app.get("/api/nodal/submissions/status")
    async def get_nodal_subs(user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        res = await session.execute(select(models.DHSubmissionRequirement).where(models.DHSubmissionRequirement.nodal_officer_id == user["id"]))
        reqs = res.scalars().all()
        ans = []
        for r in reqs:
            rec_res = await session.execute(select(models.DHSubmissionRecord).where(models.DHSubmissionRecord.requirement_id == r.id))
            recs = rec_res.scalars().all()
            r_dict = _row_to_dict(r)
            r_dict["records"] = [{"college_id": rec.college_id, "status": rec.status} for rec in recs]
            ans.append(r_dict)
        return {"data": ans}

    # 13. Expert Assignment Loop
    class AssignExpertPayload(BaseModel):
        expert_user_id: str
        college_id: str
        subject_code: str
        department_id: str
        academic_year: str

    @app.post("/api/nodal/experts/assign")
    async def nodal_expert_assign(payload: AssignExpertPayload, user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        assign = models.ExpertAssignment(
            expert_user_id=payload.expert_user_id,
            college_id=payload.college_id,
            subject_code=payload.subject_code,
            department_id=payload.department_id,
            academic_year=payload.academic_year,
            assigned_by=user["id"]
        )
        session.add(assign)
        await session.commit()
        return {"success": True, "id": assign.id}

    # 14 & 15. Inspections
    class InspectionPayload(BaseModel):
        college_id: str
        inspection_date: str
        inspection_type: str
        team_members: list
        findings: list
        action_points: list
        compliance_score: float

    @app.post("/api/nodal/inspections")
    async def nodal_inspection(payload: InspectionPayload, user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        insp = models.InspectionRecord(
            nodal_officer_id=user["id"],
            college_id=payload.college_id,
            inspection_date=payload.inspection_date,
            inspection_type=payload.inspection_type,
            team_members=payload.team_members,
            findings=payload.findings,
            action_points=payload.action_points,
            compliance_score=payload.compliance_score,
            status="draft"
        )
        session.add(insp)
        await session.commit()
        return {"success": True, "id": insp.id}

    @app.get("/api/nodal/inspections")
    async def get_nodal_inspections(user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        res = await session.execute(select(models.InspectionRecord).where(models.InspectionRecord.nodal_officer_id == user["id"]))
        insps = res.scalars().all()
        ans = []
        for insp in insps:
            r_dict = _row_to_dict(insp)
            rsp_res = await session.execute(select(models.InspectionResponse).where(models.InspectionResponse.inspection_id == insp.id))
            resps = rsp_res.scalars().all()
            r_dict["responses"] = [{"response": r.response_text, "date": r.response_date} for r in resps]
            ans.append(r_dict)
        return {"data": ans}

    # ---------------- COLLEGE ADMIN FACING ENDPOINTS ----------------

    # 16 & 17 Circulars
    @app.post("/api/admin/circulars/{circular_id}/acknowledge")
    async def admin_ack_circular(circular_id: str, request: Request, session: AsyncSession = Depends(get_db)):
        user = await get_current_user(request, session)
        if user["role"] not in ["super_admin", "admin"]: raise HTTPException(403)
        ack = models.CircularAcknowledgment(circular_id=circular_id, college_id=user["college_id"], acknowledged_by=user["id"])
        session.add(ack)
        await session.commit()
        return {"success": True}

    @app.get("/api/admin/circulars")
    async def admin_get_circulars(request: Request, session: AsyncSession = Depends(get_db)):
        user = await get_current_user(request, session)
        if user["role"] not in ["super_admin", "admin"]: raise HTTPException(403)
        res = await session.execute(select(models.DHCircular))
        circs = res.scalars().all()
        return {"data": [c for c in circs if (c.target_colleges and (user["college_id"] in c.target_colleges or "all" in c.target_colleges))]}
    
    # 18 & 19 Submissions
    @app.get("/api/admin/submissions")
    async def admin_get_submissions(request: Request, session: AsyncSession = Depends(get_db)):
        user = await get_current_user(request, session)
        if user["role"] not in ["super_admin", "admin"]: raise HTTPException(403)
        res = await session.execute(select(models.DHSubmissionRequirement))
        reqs = res.scalars().all()
        return {"data": [r for r in reqs if (r.target_colleges and (user["college_id"] in r.target_colleges or "all" in r.target_colleges))]}
    
    class SubmitDataPayload(BaseModel):
        submission_url: str

    @app.post("/api/admin/submissions/{requirement_id}")
    async def admin_submit_req(requirement_id: str, payload: SubmitDataPayload, request: Request, session: AsyncSession = Depends(get_db)):
        user = await get_current_user(request, session)
        if user["role"] not in ["super_admin", "admin"]: raise HTTPException(403)
        rec = models.DHSubmissionRecord(
            requirement_id=requirement_id,
            college_id=user["college_id"],
            submitted_by=user["id"],
            submission_url=payload.submission_url,
            status="submitted"
        )
        session.add(rec)
        await session.commit()
        return {"success": True}
    
    # 20 & 21 Inspections
    @app.get("/api/admin/inspections")
    async def admin_get_inspections(request: Request, session: AsyncSession = Depends(get_db)):
        user = await get_current_user(request, session)
        if user["role"] not in ["super_admin", "admin"]: raise HTTPException(403)
        res = await session.execute(select(models.InspectionRecord).where(models.InspectionRecord.college_id == user["college_id"]))
        return {"data": res.scalars().all()}

    class InspResponsePayload(BaseModel):
        response_text: str

    @app.post("/api/admin/inspections/{inspection_id}/respond")
    async def admin_respond_insp(inspection_id: str, payload: InspResponsePayload, request: Request, session: AsyncSession = Depends(get_db)):
        user = await get_current_user(request, session)
        if user["role"] not in ["super_admin", "admin"]: raise HTTPException(403)
        res = models.InspectionResponse(
            inspection_id=inspection_id,
            college_id=user["college_id"],
            response_by=user["id"],
            response_text=payload.response_text
        )
        session.add(res)
        # update inspection status
        insp_res = await session.execute(select(models.InspectionRecord).where(models.InspectionRecord.id == inspection_id))
        insp = insp_res.scalars().first()
        if insp: insp.status = "college_responded"
        await session.commit()
        return {"success": True}
