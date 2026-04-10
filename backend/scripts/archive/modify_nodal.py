import re

with open(r'c:\AcadMix\backend\nodal_routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Issue 13 get_nodal_circulars
old_circs = '''    @app.get("/api/nodal/circulars")
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
        return {"data": ans}'''

new_circs = '''    @app.get("/api/nodal/circulars")
    async def get_nodal_circulars(skip: int = 0, limit: int = 100, user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        res = await session.execute(select(models.DHCircular).where(models.DHCircular.issued_by == user["id"]).offset(skip).limit(limit))
        circs = res.scalars().all()
        c_ids = [c.id for c in circs]
        ack_map = {}
        if c_ids:
            acks_r = await session.execute(select(models.CircularAcknowledgment).where(models.CircularAcknowledgment.circular_id.in_(c_ids)))
            for a in acks_r.scalars().all():
                ack_map.setdefault(a.circular_id, []).append({"college_id": a.college_id, "date": a.acknowledged_at})
        ans = []
        for c in circs:
            c_dict = _row_to_dict(c)
            c_dict["acknowledgments"] = ack_map.get(c.id, [])
            ans.append(c_dict)
        return {"data": ans}'''

content = content.replace(old_circs, new_circs)

# Issue 14 get_nodal_subs
old_subs = '''    @app.get("/api/nodal/submissions/status")
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
        return {"data": ans}'''

new_subs = '''    @app.get("/api/nodal/submissions/status")
    async def get_nodal_subs(skip: int = 0, limit: int = 100, user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        res = await session.execute(select(models.DHSubmissionRequirement).where(models.DHSubmissionRequirement.nodal_officer_id == user["id"]).offset(skip).limit(limit))
        reqs = res.scalars().all()
        r_ids = [r.id for r in reqs]
        rec_map = {}
        if r_ids:
            rec_res = await session.execute(select(models.DHSubmissionRecord).where(models.DHSubmissionRecord.requirement_id.in_(r_ids)))
            for rec in rec_res.scalars().all():
                rec_map.setdefault(rec.requirement_id, []).append({"college_id": rec.college_id, "status": rec.status})
        ans = []
        for r in reqs:
            r_dict = _row_to_dict(r)
            r_dict["records"] = rec_map.get(r.id, [])
            ans.append(r_dict)
        return {"data": ans}'''
content = content.replace(old_subs, new_subs)

# Issue 15 get_nodal_inspections
old_inspections = '''    @app.get("/api/nodal/inspections")
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
        return {"data": ans}'''

new_inspections = '''    @app.get("/api/nodal/inspections")
    async def get_nodal_inspections(skip: int = 0, limit: int = 100, user=Depends(require_role("nodal_officer")), session: AsyncSession = Depends(get_db)):
        res = await session.execute(select(models.InspectionRecord).where(models.InspectionRecord.nodal_officer_id == user["id"]).offset(skip).limit(limit))
        insps = res.scalars().all()
        i_ids = [i.id for i in insps]
        resps_map = {}
        if i_ids:
            rsp_res = await session.execute(select(models.InspectionResponse).where(models.InspectionResponse.inspection_id.in_(i_ids)))
            for r in rsp_res.scalars().all():
                resps_map.setdefault(r.inspection_id, []).append({"response": r.response_text, "date": r.response_date})
        ans = []
        for insp in insps:
            r_dict = _row_to_dict(insp)
            r_dict["responses"] = resps_map.get(insp.id, [])
            ans.append(r_dict)
        return {"data": ans}'''
content = content.replace(old_inspections, new_inspections)

with open(r'c:\AcadMix\backend\nodal_routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
