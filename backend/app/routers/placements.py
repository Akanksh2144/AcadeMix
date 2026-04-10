from fastapi import APIRouter, Depends, HTTPException, Query, Request, Body, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from database import get_db
from app.core.security import get_current_user
from app.core.security import require_role
from app import models
import app.schemas as server_schemas
from app.schemas import *

router = APIRouter()


@router.get("/placements/student")
async def student_placements(user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    college_id = user.get("college_id", "")
    dept = user.get("department", "")
    email = user.get("email", "")
    stmt = select(models.Placement).where(models.Placement.college_id == college_id)
    result = await session.execute(stmt)
    rows = result.scalars().all()
    out = []
    for p in rows:
        details = p.details or {}
        candidates = details.get("candidates", [])
        is_shortlisted = any(c.get("college_id") == college_id or c.get("email") == email for c in candidates)
        open_dept = details.get("department", "ALL")
        is_open = details.get("open_to_all") and open_dept in (dept, "ALL", "all", "")
        if is_shortlisted or is_open:
            out.append({"id": p.id, "company": p.company, "role": p.role, "package": p.package, "date": p.date, **{k: v for k, v in details.items() if k != "candidates"}})
    out.sort(key=lambda x: x.get("drive_date", ""))
    return out


@router.post("/placements")
async def create_placement(req: dict, user: dict = Depends(require_role("admin", "hod")), session: AsyncSession = Depends(get_db)):
    row = models.Placement(
        college_id=user["college_id"],
        company=req.get("company", ""),
        role=req.get("role", ""),
        package=req.get("package", ""),
        date=req.get("date", ""),
        details={k: v for k, v in req.items() if k not in ("company", "role", "package", "date")}
    )
    row.details = {**(row.details or {}), "created_by": user["id"]}
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return {"id": row.id, "company": row.company, "role": row.role, "date": row.date}


@router.get("/placements")
async def list_placements(user: dict = Depends(require_role("admin", "hod", "teacher")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.Placement).where(models.Placement.college_id == user["college_id"])
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [{"id": p.id, "company": p.company, "role": p.role, "package": p.package, "date": p.date, **(p.details or {})} for p in rows]


@router.get("/tpo/drives/{drive_id}/applicants")
async def get_drive_applicants(drive_id: str, user: dict = Depends(require_role("tp_officer", "admin", "super_admin")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.PlacementApplication).where(
        models.PlacementApplication.drive_id == drive_id,
        models.PlacementApplication.college_id == user["college_id"]
    )
    res = await session.execute(stmt)
    return res.scalars().all()


@router.put("/tpo/drives/{drive_id}/shortlist")
async def bulk_shortlist(drive_id: str, req: ShortlistRequest, user: dict = Depends(require_role("tp_officer", "admin", "super_admin")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.PlacementApplication).where(
        models.PlacementApplication.drive_id == drive_id,
        models.PlacementApplication.college_id == user["college_id"],
        models.PlacementApplication.student_id.in_(req.student_ids)
    )
    res = await session.execute(stmt)
    apps = res.scalars().all()
    for app in apps:
        if app.status == "registered":
            app.status = "shortlisted"
            
    await session.commit()
    return {"message": f"Successfully shortlisted {len(apps)} candidates"}


@router.put("/tpo/drives/{drive_id}/results")
async def append_round_result(drive_id: str, req: ResultRequest, user: dict = Depends(require_role("tp_officer", "admin", "super_admin")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.PlacementApplication).where(
        models.PlacementApplication.drive_id == drive_id,
        models.PlacementApplication.student_id == req.student_id,
        models.PlacementApplication.college_id == user["college_id"]
    )
    res = await session.execute(stmt)
    app = res.scalars().first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    res_list = app.round_results or []
    from datetime import datetime
    res_list.append({
        "round": req.round_name,
        "result": req.result,
        "remarks": req.remarks,
        "evaluated_at": datetime.utcnow().isoformat()
    })
    app.round_results = res_list
    
    if req.result == "fail":
        app.status = "rejected"
        
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(app, "round_results")
    await session.commit()
    return {"message": "Result appended"}


@router.put("/tpo/drives/{drive_id}/select")
async def select_candidate(drive_id: str, req: SelectRequest, user: dict = Depends(require_role("tp_officer", "admin", "super_admin")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.PlacementApplication).where(
        models.PlacementApplication.drive_id == drive_id,
        models.PlacementApplication.student_id == req.student_id,
        models.PlacementApplication.college_id == user["college_id"]
    )
    res = await session.execute(stmt)
    app = res.scalars().first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    app.status = "selected"
    app.offer_details = {
        "ctc": req.ctc,
        "role": req.role,
        "joining_date": req.joining_date,
        "location": req.location,
        "offer_url": req.offer_url,
        "is_accepted": False
    }
    await session.commit()
    return {"message": "Candidate selected and generated offer metadata"}


@router.get("/tpo/statistics")
async def get_tpo_statistics(user: dict = Depends(require_role("tp_officer", "admin", "super_admin")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.PlacementApplication).where(
        models.PlacementApplication.college_id == user["college_id"],
        models.PlacementApplication.status == "selected"
    )
    res = await session.execute(stmt)
    selected = res.scalars().all()
    
    total_ctc = 0
    highest = 0
    for s in selected:
        if s.offer_details:
            ctc = float(s.offer_details.get("ctc") or 0)
            total_ctc += ctc
            if ctc > highest:
                highest = ctc
                
    avg = total_ctc / len(selected) if selected else 0
    return {
        "total_selected": len(selected),
        "highest_package": highest,
        "average_package": avg
    }


@router.get("/tpo/statistics/export")
async def export_tpo_statistics(user: dict = Depends(require_role("tp_officer", "admin", "super_admin")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.PlacementApplication).where(
        models.PlacementApplication.college_id == user["college_id"],
        models.PlacementApplication.status == "selected"
    )
    res = await session.execute(stmt)
    selected = res.scalars().all()
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Placement Record"
    ws.append(["Student ID", "Drive ID", "Role", "CTC (LPA)", "Location"])
    
    for s in selected:
        details = s.offer_details or {}
        ws.append([
            s.student_id,
            s.drive_id,
            details.get("role", ""),
            details.get("ctc", ""),
            details.get("location", "")
        ])
        
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
        headers={"Content-Disposition": "attachment; filename=placement_statistics.xlsx"}
    )


@router.get("/tpo/alumni-jobs")
async def get_tpo_alumni_jobs(
    user: dict = Depends(require_role("tpo", "tp_officer", "admin")),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.AlumniJobPosting).where(models.AlumniJobPosting.college_id == user["college_id"])
    jobs = (await session.execute(stmt)).scalars().all()
    return jobs


@router.put("/tpo/alumni-jobs/{job_id}/moderate")
async def moderate_alumni_job(
    job_id: str,
    status: str = Body(..., embed=True), # "active" or "rejected"
    user: dict = Depends(require_role("tpo", "tp_officer", "admin")),
    session: AsyncSession = Depends(get_db)
):
    job = await session.get(models.AlumniJobPosting, job_id)
    if not job or job.college_id != user["college_id"]:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job.status = status
    await session.commit()
    return {"message": f"Job posting marked as {status}"}
