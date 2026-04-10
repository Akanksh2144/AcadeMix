from fastapi import APIRouter, Depends, HTTPException, Query
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


@router.post("/admin/retired-faculty/{user_id}/advisory-roles")
async def create_advisory_role(
    user_id: str, req: AdvisoryRoleCreate,
    user: dict = Depends(require_role("admin", "principal")),
    session: AsyncSession = Depends(get_db)
):
    role = models.RetiredFacultyAdvisory(
        college_id=user["college_id"],
        retired_faculty_id=user_id,
        role_type=req.role_type,
        scope_description=req.scope_description,
        start_date=req.start_date,
        end_date=req.end_date,
        appointed_by=user["id"],
        is_active=True,
    )
    session.add(role)
    await session.commit()
    return {"id": role.id, "message": "Advisory role assigned"}


@router.get("/admin/retired-faculty/available-lecturers")
async def get_available_retired_lecturers(
    user: dict = Depends(require_role("admin", "principal", "hod")),
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(
        select(models.User).where(
            models.User.college_id == user["college_id"],
            models.User.role == "retired_faculty",
            models.User.is_deleted == False,
        )
    )
    users = result.scalars().all()
    available = []
    for u in users:
        pd = u.profile_data or {}
        if pd.get("is_available_for_consultation") or pd.get("services_willing"):
            available.append({
                "id": u.id, "name": u.name, "email": u.email,
                "specialization": pd.get("specialization"),
                "services_willing": pd.get("services_willing", []),
                "availability_level": pd.get("availability_level"),
                "designation_at_retirement": pd.get("designation_at_retirement"),
            })
    return available


@router.get("/admin/retired-faculty/{user_id}/entitlements")
async def get_retired_faculty_entitlements_admin(
    user_id: str,
    user: dict = Depends(require_role("admin", "principal")),
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(
        select(models.User).where(
            models.User.id == user_id,
            models.User.college_id == user["college_id"],
            models.User.role == "retired_faculty",
        )
    )
    rf = result.scalars().first()
    if not rf:
        raise HTTPException(status_code=404, detail="Retired faculty not found")
    pd = rf.profile_data or {}
    return {
        "user_id": rf.id, "name": rf.name,
        "entitlements": pd.get("entitlements", {
            "medical_benefits": False, "library_access": False,
            "email_access": False, "campus_facilities": False,
        })
    }


@router.put("/admin/retired-faculty/{user_id}/entitlements")
async def update_retired_faculty_entitlements(
    user_id: str, req: dict,
    user: dict = Depends(require_role("admin", "principal")),
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(
        select(models.User).where(
            models.User.id == user_id,
            models.User.college_id == user["college_id"],
            models.User.role == "retired_faculty",
        )
    )
    rf = result.scalars().first()
    if not rf:
        raise HTTPException(status_code=404, detail="Retired faculty not found")
    pd = rf.profile_data or {}
    pd["entitlements"] = req.get("entitlements", pd.get("entitlements", {}))
    rf.profile_data = pd
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(rf, "profile_data")
    await session.commit()
    return {"message": "Entitlements updated", "entitlements": pd["entitlements"]}


@router.get("/retired-faculty/dashboard")
async def get_retired_faculty_dashboard(
    user: dict = Depends(require_role("retired_faculty")),
    session: AsyncSession = Depends(get_db)
):
    from sqlalchemy import func as sqlfunc

    advisory_count = await session.execute(
        select(sqlfunc.count(models.RetiredFacultyAdvisory.id)).where(
            models.RetiredFacultyAdvisory.retired_faculty_id == user["id"],
            models.RetiredFacultyAdvisory.is_active == True,
            models.RetiredFacultyAdvisory.is_deleted == False,
        )
    )
    research_count = await session.execute(
        select(sqlfunc.count(models.RetiredFacultyResearch.id)).where(
            models.RetiredFacultyResearch.retired_faculty_id == user["id"],
            models.RetiredFacultyResearch.status == "ongoing",
            models.RetiredFacultyResearch.is_deleted == False,
        )
    )
    consultancy_count = await session.execute(
        select(sqlfunc.count(models.ConsultancyEngagement.id)).where(
            models.ConsultancyEngagement.retired_faculty_id == user["id"],
            models.ConsultancyEngagement.is_deleted == False,
        )
    )
    lecture_count = await session.execute(
        select(sqlfunc.count(models.AlumniGuestLecture.id)).where(
            models.AlumniGuestLecture.lecturer_id == user["id"],
            models.AlumniGuestLecture.source_type == "retired_faculty",
            models.AlumniGuestLecture.is_deleted == False,
        )
    )

    pd = {}
    u_res = await session.execute(select(models.User).where(models.User.id == user["id"]))
    u_row = u_res.scalars().first()
    if u_row:
        pd = u_row.profile_data or {}

    return {
        "active_advisory_roles": advisory_count.scalar() or 0,
        "ongoing_research": research_count.scalar() or 0,
        "total_consultancy": consultancy_count.scalar() or 0,
        "guest_lectures": lecture_count.scalar() or 0,
        "profile": {
            "name": u_row.name if u_row else "",
            "specialization": pd.get("specialization"),
            "designation_at_retirement": pd.get("designation_at_retirement"),
            "retirement_date": pd.get("retirement_date"),
            "years_of_service": pd.get("years_of_service"),
            "services_willing": pd.get("services_willing", []),
            "availability_level": pd.get("availability_level"),
        }
    }


@router.get("/retired-faculty/my-roles")
async def get_my_advisory_roles(
    user: dict = Depends(require_role("retired_faculty")),
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(
        select(models.RetiredFacultyAdvisory).where(
            models.RetiredFacultyAdvisory.retired_faculty_id == user["id"],
            models.RetiredFacultyAdvisory.is_deleted == False,
        ).order_by(models.RetiredFacultyAdvisory.start_date.desc())
    )
    roles = result.scalars().all()
    return [{
        "id": r.id, "role_type": r.role_type,
        "scope_description": r.scope_description,
        "start_date": r.start_date.isoformat() if r.start_date else None,
        "end_date": r.end_date.isoformat() if r.end_date else None,
        "is_active": r.is_active,
    } for r in roles]


@router.get("/retired-faculty/research")
async def get_my_research(
    user: dict = Depends(require_role("retired_faculty")),
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(
        select(models.RetiredFacultyResearch).where(
            models.RetiredFacultyResearch.retired_faculty_id == user["id"],
            models.RetiredFacultyResearch.is_deleted == False,
        ).order_by(models.RetiredFacultyResearch.start_date.desc())
    )
    rows = result.scalars().all()
    return [{
        "id": r.id, "title": r.title, "funding_agency": r.funding_agency,
        "co_investigators": r.co_investigators or [], "status": r.status,
        "grant_amount": r.grant_amount,
        "start_date": r.start_date.isoformat() if r.start_date else None,
        "end_date": r.end_date.isoformat() if r.end_date else None,
        "publication_urls": r.publication_urls or [],
    } for r in rows]


@router.post("/retired-faculty/research")
async def create_research(
    req: ResearchCreate,
    user: dict = Depends(require_role("retired_faculty")),
    session: AsyncSession = Depends(get_db)
):
    r = models.RetiredFacultyResearch(
        college_id=user["college_id"],
        retired_faculty_id=user["id"],
        title=req.title,
        funding_agency=req.funding_agency,
        co_investigators=req.co_investigators,
        start_date=req.start_date,
        end_date=req.end_date,
        status=req.status,
        grant_amount=req.grant_amount,
        publication_urls=req.publication_urls,
    )
    session.add(r)
    await session.commit()
    return {"id": r.id, "message": "Research project created"}


@router.get("/retired-faculty/consultancy")
async def get_my_consultancy(
    user: dict = Depends(require_role("retired_faculty")),
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(
        select(models.ConsultancyEngagement).where(
            models.ConsultancyEngagement.retired_faculty_id == user["id"],
            models.ConsultancyEngagement.is_deleted == False,
        ).order_by(models.ConsultancyEngagement.start_date.desc())
    )
    rows = result.scalars().all()
    return [{
        "id": c.id, "client_organization": c.client_organization,
        "topic": c.topic, "is_paid": c.is_paid, "fee_amount": c.fee_amount,
        "description": c.description,
        "start_date": c.start_date.isoformat() if c.start_date else None,
        "end_date": c.end_date.isoformat() if c.end_date else None,
    } for c in rows]


@router.post("/retired-faculty/consultancy")
async def create_consultancy(
    req: ConsultancyCreate,
    user: dict = Depends(require_role("retired_faculty")),
    session: AsyncSession = Depends(get_db)
):
    c = models.ConsultancyEngagement(
        college_id=user["college_id"],
        retired_faculty_id=user["id"],
        client_organization=req.client_organization,
        topic=req.topic,
        start_date=req.start_date,
        end_date=req.end_date,
        is_paid=req.is_paid,
        fee_amount=req.fee_amount,
        description=req.description,
    )
    session.add(c)
    await session.commit()
    return {"id": c.id, "message": "Consultancy engagement created"}


@router.get("/retired-faculty/my-entitlements")
async def get_my_entitlements(
    user: dict = Depends(require_role("retired_faculty")),
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(
        select(models.User).where(models.User.id == user["id"])
    )
    u = result.scalars().first()
    pd = u.profile_data or {} if u else {}
    return {
        "entitlements": pd.get("entitlements", {
            "medical_benefits": False, "library_access": False,
            "email_access": False, "campus_facilities": False,
        })
    }


@router.post("/retired-faculty/events/{event_id}/register")
async def register_for_event(
    event_id: str,
    user: dict = Depends(require_role("retired_faculty")),
    session: AsyncSession = Depends(get_db)
):
    # Verify event exists
    ev = await session.execute(
        select(models.AlumniEvent).where(
            models.AlumniEvent.id == event_id,
            models.AlumniEvent.college_id == user["college_id"],
        )
    )
    if not ev.scalars().first():
        raise HTTPException(status_code=404, detail="Event not found")

    # Check existing registration
    existing = await session.execute(
        select(models.AlumniEventRegistration).where(
            models.AlumniEventRegistration.event_id == event_id,
            models.AlumniEventRegistration.alumni_id == user["id"],
        )
    )
    if existing.scalars().first():
        return {"message": "Already registered"}

    reg = models.AlumniEventRegistration(
        event_id=event_id,
        alumni_id=user["id"],
        rsvp_status="attending",
    )
    session.add(reg)
    await session.commit()
    return {"id": reg.id, "message": "Registered for event"}
