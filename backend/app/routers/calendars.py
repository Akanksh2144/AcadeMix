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


@router.post("/admin/academic-calendars")
async def create_academic_calendar(req: AcademicCalendarCreate, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    try:
        start_dt = datetime.strptime(req.start_date, "%Y-%m-%d").date()
        end_dt = datetime.strptime(req.end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DD format")

    if end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="end_date must be after start_date")

    # Prevent overlap for same semester
    dup_r = await session.execute(
        select(models.AcademicCalendar).where(
            models.AcademicCalendar.college_id == user["college_id"],
            models.AcademicCalendar.academic_year == req.academic_year,
            models.AcademicCalendar.semester == req.semester
        )
    )
    if dup_r.scalars().first():
        raise HTTPException(status_code=400, detail="Calendar already exists for this year and semester")

    cal = models.AcademicCalendar(
        college_id=user["college_id"],
        academic_year=req.academic_year,
        semester=req.semester,
        start_date=start_dt,
        end_date=end_dt,
        working_days=req.working_days,
        events=req.events
    )
    session.add(cal)
    await session.commit()
    await session.refresh(cal)
    return {"id": cal.id, "message": "Academic calendar created"}


@router.get("/academic-calendars")
async def list_academic_calendars(academic_year: Optional[str] = None, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    stmt = select(models.AcademicCalendar).where(models.AcademicCalendar.college_id == user["college_id"])
    if academic_year:
        stmt = stmt.where(models.AcademicCalendar.academic_year == academic_year)
    result = await session.execute(stmt)
    cals = result.scalars().all()
    return [{
        "id": c.id, "academic_year": c.academic_year, "semester": c.semester,
        "start_date": c.start_date.isoformat(), "end_date": c.end_date.isoformat(),
        "working_days": c.working_days, "events": c.events
    } for c in cals]


@router.get("/student/academic-calendar")
async def get_student_academic_calendar(
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db)
):
    """Get the academic calendar with events for the student's college."""
    result = await session.execute(
        select(models.AcademicCalendar).where(
            models.AcademicCalendar.college_id == user["college_id"],
            models.AcademicCalendar.is_deleted == False
        ).order_by(models.AcademicCalendar.start_date.desc())
    )
    calendars = result.scalars().all()
    return [{
        "id": c.id,
        "academic_year": c.academic_year,
        "semester": c.semester,
        "start_date": str(c.start_date),
        "end_date": str(c.end_date),
        "working_days": c.working_days or [],
        "events": c.events or []
    } for c in calendars]


@router.get("/admin/academic-calendars/{calendar_id}/year-view")
async def get_calendar_year_view(calendar_id: str, admin: dict = Depends(require_role("admin", "super_admin")), session: AsyncSession = Depends(get_db)):
    cal_r = await session.execute(select(models.AcademicCalendar).where(models.AcademicCalendar.id == calendar_id, models.AcademicCalendar.college_id == admin["college_id"]))
    cal = cal_r.scalars().first()
    if not cal:
        raise HTTPException(status_code=404, detail="Calendar not found")
        
    year_map = {}
    events = cal.events or []
    for evt in events:
        d = evt.get("date")
        if d:
            year_map[d] = {
                "title": evt.get("title", ""),
                "type": evt.get("type", "holiday")
            }
    return year_map
