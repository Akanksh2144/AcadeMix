from fastapi import APIRouter, Depends, HTTPException, Query, Body
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


@router.post("/admin/alumni/batch-graduate")
async def batch_graduate(
    batch: str,
    department: str = None,
    dry_run: bool = True,
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    """Bulks-promotes a student cohort to alumni status."""
    stmt = select(models.User).where(
        models.User.college_id == user["college_id"],
        models.User.role == "student"
    )
    
    users = (await session.execute(stmt)).scalars().all()
    affected = []
    
    for u in users:
        # Match batch year if present in profile
        pd = u.profile_data or {}
        enr_year = pd.get("enrollment_year")
        # Assume batch string e.g. "2020-2024", check if enr_year matches start
        if enr_year and str(enr_year) != batch.split("-")[0]:
            continue
            
        if department and pd.get("department") != department:
            continue
            
        affected.append({"id": u.id, "name": u.name, "email": u.email})
        
        if not dry_run:
            u.role = "alumni"
            # Flag for verification
            new_pd = pd.copy()
            new_pd["is_profile_verified"] = False
            u.profile_data = new_pd
            session.add(u)
    
    if not dry_run:
        await session.commit()
        return {"message": f"Successfully promoted {len(affected)} students to alumni", "count": len(affected)}
    
    return {
        "message": f"Dry run: {len(affected)} students will be promoted to alumni when dry_run=false is set.",
        "count": len(affected),
        "affected_users": affected
    }


@router.get("/admin/alumni/pending")
async def get_pending_alumni(
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.User).where(
        models.User.college_id == user["college_id"],
        models.User.role == "alumni",
        models.User.is_deleted == False
    )
    all_alumni = (await session.execute(stmt)).scalars().all()
    # Filter for unverified in application logic since it's JSONB
    pending = [u for u in all_alumni if not (u.profile_data or {}).get("is_profile_verified", False)]
    
    return [{"id": a.id, "name": a.name, "email": a.email, "profile": a.profile_data} for a in pending]


@router.put("/admin/alumni/{alumni_id}/verify")
async def verify_alumni_profile(
    alumni_id: str,
    action: str = Body(..., embed=True), # "approve" or "reject"
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    alumni = await session.get(models.User, alumni_id)
    if not alumni or alumni.college_id != user["college_id"] or alumni.role != "alumni":
        raise HTTPException(status_code=404, detail="Alumni not found")
        
    pd = alumni.profile_data or {}
    pd["is_profile_verified"] = (action == "approve")
    alumni.profile_data = pd
    
    await session.commit()
    return {"message": f"Profile {'verified' if action == 'approve' else 'rejected'}"}


@router.post("/admin/alumni/contributions")
async def add_alumni_contribution(
    req: dict = Body(...),
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    contribution = models.AlumniContribution(
        college_id=user["college_id"],
        alumni_id=req["alumni_id"],
        contribution_type=req["contribution_type"],
        amount=req["amount"],
        purpose=req.get("purpose"),
        date=func.now(),
        receipt_number=req.get("receipt_number"),
        is_anonymous=req.get("is_anonymous", False),
        acknowledgment_url=req.get("acknowledgment_url")
    )
    session.add(contribution)
    await session.commit()
    return {"message": "Contribution recorded successfully"}

@router.post("/admin/alumni-events")
async def create_alumni_event(
    req: dict = Body(...),
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    event = models.AlumniEvent(
        college_id=user["college_id"],
        created_by=user["id"],
        title=req["title"],
        description=req.get("description"),
        event_type=req["event_type"],
        date=req.get("date", func.now()), # Defaulting simply for dev, standardizing date strings later
        venue=req.get("venue"),
        max_capacity=req.get("max_capacity")
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event


@router.put("/admin/alumni-events/{event_id}")
async def update_alumni_event(
    event_id: str,
    req: dict = Body(...),
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    event = await session.get(models.AlumniEvent, event_id)
    if not event or event.college_id != user["college_id"]:
        raise HTTPException(status_code=404, detail="Event not found")
        
    for k, v in req.items():
        if hasattr(event, k) and k != "id":
            setattr(event, k, v)
            
    await session.commit()
    return {"message": "Event updated"}


@router.put("/admin/alumni-events/{event_id}/attendance")
async def mark_event_attendance(
    event_id: str,
    attended_alumni_ids: list[str] = Body(..., embed=True),
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    event = await session.get(models.AlumniEvent, event_id)
    if not event or event.college_id != user["college_id"]:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Mark false for all first
    await session.execute(
        update(models.AlumniEventRegistration)
        .where(models.AlumniEventRegistration.event_id == event_id)
        .values(attended=False)
    )
    
    # Mark true for provided ids
    if attended_alumni_ids:
        await session.execute(
            update(models.AlumniEventRegistration)
            .where(
                models.AlumniEventRegistration.event_id == event_id,
                models.AlumniEventRegistration.alumni_id.in_(attended_alumni_ids)
            )
            .values(attended=True)
        )
        
    await session.commit()
    return {"message": "Attendance marked successfully"}


@router.put("/admin/alumni/achievements/{achievement_id}/verify")
async def verify_achievement(
    achievement_id: str,
    is_verified: bool = Body(..., embed=True),
    is_featured: bool = Body(False, embed=True),
    user: dict = Depends(require_role("admin", "nodal_officer", "super_admin")),
    session: AsyncSession = Depends(get_db)
):
    achv = await session.get(models.AlumniAchievement, achievement_id)
    if not achv or achv.college_id != user["college_id"]:
        raise HTTPException(status_code=404, detail="Achievement not found")
        
    achv.is_verified = is_verified
    achv.is_featured = is_featured
    await session.commit()
    return {"message": "Achievement verified/featured"}


@router.get("/alumni/profile")
async def get_my_alumni_profile(
    user: dict = Depends(require_role("alumni")),
    session: AsyncSession = Depends(get_db)
):
    u = await session.get(models.User, user["id"])
    return {"id": u.id, "name": u.name, "email": u.email, "profile": u.profile_data}


@router.put("/alumni/profile")
async def update_alumni_profile(
    profile_update: dict = Body(...),
    user: dict = Depends(require_role("alumni")),
    session: AsyncSession = Depends(get_db)
):
    u = await session.get(models.User, user["id"])
    pd = u.profile_data or {}
    pd.update(profile_update)
    u.profile_data = pd
    await session.commit()
    return {"message": "Profile updated", "profile": pd}


@router.get("/alumni/directory")
async def browse_alumni_directory(
    user: dict = Depends(get_current_user), # Any authenticated user in tenant
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.User.id, models.User.name, models.User.profile_data).where(
        models.User.college_id == user["college_id"],
        models.User.role == "alumni",
        models.User.is_deleted == False
    )
    results = (await session.execute(stmt)).all()
    
    directory = []
    for r in results:
        pd = r.profile_data or {}
        if pd.get("is_visible", False):
            # Scrub private contact info based on preferences
            safe_pd = {k: v for k, v in pd.items() if k not in ["contact_preferences", "is_profile_verified"]}
            directory.append({"id": r.id, "name": r.name, "profile": safe_pd})
            
    return directory


@router.post("/alumni/job-postings")
async def post_job_referral(
    req: dict = Body(...),
    user: dict = Depends(require_role("alumni")),
    session: AsyncSession = Depends(get_db)
):
    job = models.AlumniJobPosting(
        college_id=user["college_id"],
        alumni_id=user["id"],
        company=req["company"],
        role=req["role"],
        ctc_range=req.get("ctc_range"),
        location=req.get("location"),
        eligibility=req.get("eligibility"),
        contact_email=req.get("contact_email"),
        referral_note=req.get("referral_note"),
        status="pending_approval"
    )
    session.add(job)
    await session.commit()
    return {"message": "Job posted and pending TPO approval"}


@router.get("/alumni/job-postings")
async def my_job_postings(
    user: dict = Depends(require_role("alumni")),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.AlumniJobPosting).where(models.AlumniJobPosting.alumni_id == user["id"])
    jobs = (await session.execute(stmt)).scalars().all()
    return jobs


@router.post("/alumni/mentorship/{id}/respond")
async def respond_to_mentorship(
    id: str,
    status: str = Body(..., embed=True), # active or declined
    user: dict = Depends(require_role("alumni")),
    session: AsyncSession = Depends(get_db)
):
    m = await session.get(models.AlumniMentorship, id)
    if not m or m.alumni_id != user["id"]:
        raise HTTPException(status_code=404, detail="Mentorship request not found")
        
    m.status = status
    await session.commit()
    return {"message": f"Mentorship marked as {status}"}


@router.post("/alumni/mentorship/{id}/session-note")
async def add_session_note(
    id: str,
    note: str = Body(..., embed=True),
    user: dict = Depends(require_role("alumni")),
    session: AsyncSession = Depends(get_db)
):
    m = await session.get(models.AlumniMentorship, id)
    if not m or m.alumni_id != user["id"]:
        raise HTTPException(status_code=404, detail="Mentorship not found")
        
    notes = m.session_notes or []
    notes.append({"date": str(func.now()), "note": note})
    m.session_notes = notes
    await session.commit()
    return {"message": "Session note added"}


@router.get("/alumni/events")
async def list_alumni_events(
    user: dict = Depends(require_role("alumni")),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.AlumniEvent).where(
        models.AlumniEvent.college_id == user["college_id"],
        models.AlumniEvent.status == "published"
    )
    events = (await session.execute(stmt)).scalars().all()
    
    # get RSVPs
    r_stmt = select(models.AlumniEventRegistration).where(models.AlumniEventRegistration.alumni_id == user["id"])
    rsvps = (await session.execute(r_stmt)).scalars().all()
    rsvp_map = {r.event_id: r.rsvp_status for r in rsvps}
    
    return [{"event": e, "my_rsvp": rsvp_map.get(e.id)} for e in events]


@router.post("/alumni/events/{event_id}/register")
async def rsvp_event(
    event_id: str,
    rsvp_status: str = Body(..., embed=True),
    user: dict = Depends(require_role("alumni")),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.AlumniEventRegistration).where(
        models.AlumniEventRegistration.event_id == event_id,
        models.AlumniEventRegistration.alumni_id == user["id"]
    )
    existing = (await session.execute(stmt)).scalar_one_or_none()
    
    if existing:
        existing.rsvp_status = rsvp_status
    else:
        new_rsvp = models.AlumniEventRegistration(
            event_id=event_id, alumni_id=user["id"], rsvp_status=rsvp_status
        )
        session.add(new_rsvp)
        
    await session.commit()
    return {"message": f"RSVP saved: {rsvp_status}"}


@router.post("/alumni/achievements")
async def submit_achievement(
    req: dict = Body(...),
    user: dict = Depends(require_role("alumni")),
    session: AsyncSession = Depends(get_db)
):
    achv = models.AlumniAchievement(
        college_id=user["college_id"],
        alumni_id=user["id"],
        type=req["type"],
        title=req["title"],
        description=req.get("description"),
        proof_url=req.get("proof_url")
    )
    session.add(achv)
    await session.commit()
    return {"message": "Achievement submitted for verification"}


@router.put("/alumni/progression/higher-studies")
async def update_higher_studies(
    req: dict = Body(...), # expects institution, program
    user: dict = Depends(require_role("alumni")),
    session: AsyncSession = Depends(get_db)
):
    """Allows alumni to update the higher studies progression record entered by HOD."""
    stmt = select(models.StudentProgression).where(
        models.StudentProgression.student_id == user["id"],
        models.StudentProgression.progression_type == "higher_studies"
    )
    prog = (await session.execute(stmt)).scalar_one_or_none()
    
    details = {"institution": req.get("institution"), "program": req.get("program")}
    
    if prog:
        prog.details = details
    else:
        # Create new if HOD never made one
        prog = models.StudentProgression(
            college_id=user["college_id"],
            student_id=user["id"],
            academic_year=str(datetime.now().year),
            progression_type="higher_studies",
            details=details
        )
        session.add(prog)
        
    await session.commit()
    return {"message": "Higher studies progression updated"}


@router.post("/alumni/feedback")
async def submit_feedback(
    req: dict = Body(...),
    user: dict = Depends(require_role("alumni")),
    session: AsyncSession = Depends(get_db)
):
    fb = models.AlumniFeedback(
        college_id=user["college_id"],
        alumni_id=None if req.get("is_anonymous") else user["id"],
        category=req["category"],
        rating=req.get("rating"),
        feedback_text=req["feedback_text"],
        is_anonymous=req.get("is_anonymous", False)
    )
    session.add(fb)
    await session.commit()
    return {"message": "Feedback submitted successfully"}
