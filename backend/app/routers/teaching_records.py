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


@router.get("/faculty/teaching-records")
async def get_teaching_records(
    month: Optional[int] = None,
    year: Optional[int] = None,
    user: dict = Depends(require_role("teacher", "faculty", "hod")),
    session: AsyncSession = Depends(get_db)
):
    """Get teaching records for the faculty, optionally filtered by month/year."""
    params = {"faculty_id": user["id"]}
    where_clauses = ["tr.faculty_id = :faculty_id", "tr.is_deleted = false"]
    
    if month and year:
        where_clauses.append("EXTRACT(MONTH FROM tr.date) = :month")
        where_clauses.append("EXTRACT(YEAR FROM tr.date) = :year")
        params["month"] = month
        params["year"] = year

    where_sql = " AND ".join(where_clauses)
    stmt = text(f"""
        SELECT 
            tr.id, tr.date, tr.planned_topic, tr.actual_topic, 
            tr.methodology, tr.remarks, tr.is_class_record_submitted,
            tr.period_slot_id,
            ps.period_no, ps.start_time, ps.end_time, ps.day,
            ps.subject_code, ps.subject_name, ps.batch, ps.section
        FROM teaching_records tr
        JOIN period_slots ps ON tr.period_slot_id = ps.id
        WHERE {where_sql}
        ORDER BY tr.date DESC, ps.period_no ASC
    """)
    result = await session.execute(stmt, params)
    rows = result.all()
    return [{
        "id": r.id, "date": str(r.date),
        "planned_topic": r.planned_topic, "actual_topic": r.actual_topic,
        "methodology": r.methodology, "remarks": r.remarks,
        "is_class_record_submitted": r.is_class_record_submitted,
        "period_slot_id": r.period_slot_id,
        "period_no": r.period_no, "start_time": r.start_time, "end_time": r.end_time,
        "day": r.day, "subject_code": r.subject_code, "subject_name": r.subject_name,
        "batch": r.batch, "section": r.section
    } for r in rows]


@router.post("/faculty/teaching-plan")
async def save_teaching_plan(
    req: TeachingPlanCreate,
    user: dict = Depends(require_role("teacher", "faculty", "hod")),
    session: AsyncSession = Depends(get_db)
):
    """Save a teaching plan (planned topic). Enforces T+14 day window server-side."""
    try:
        target_date = datetime.strptime(req.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    today = datetime.now(timezone.utc).date()
    if (target_date - today).days > 14:
        raise HTTPException(status_code=400, detail=f"Teaching plan can only be set up to 14 days in advance. Target date {req.date} is {(target_date - today).days} days away.")

    # Verify the period slot belongs to this faculty
    slot = await session.get(models.PeriodSlot, req.period_slot_id)
    if not slot or slot.faculty_id != user["id"]:
        raise HTTPException(status_code=404, detail="Period slot not found or does not belong to you.")

    # Check for existing record (upsert logic)
    existing = await session.execute(
        select(models.TeachingRecord).where(
            models.TeachingRecord.faculty_id == user["id"],
            models.TeachingRecord.period_slot_id == req.period_slot_id,
            models.TeachingRecord.date == target_date,
            models.TeachingRecord.is_deleted == False
        )
    )
    record = existing.scalars().first()
    if record:
        record.planned_topic = req.planned_topic
    else:
        record = models.TeachingRecord(
            college_id=user["college_id"],
            faculty_id=user["id"],
            period_slot_id=req.period_slot_id,
            date=target_date,
            planned_topic=req.planned_topic
        )
        session.add(record)
    
    await session.commit()
    return {"id": record.id, "message": "Teaching plan saved"}


@router.post("/faculty/class-record")
async def save_class_record(
    req: ClassRecordCreate,
    user: dict = Depends(require_role("teacher", "faculty", "hod")),
    session: AsyncSession = Depends(get_db)
):
    """Save a class record (actual topic + methodology). Enforces T to T-3 day window server-side."""
    try:
        target_date = datetime.strptime(req.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    today = datetime.now(timezone.utc).date()
    if target_date > today:
        raise HTTPException(status_code=400, detail="Cannot submit class record for a future date.")
    if (today - target_date).days > 3:
        raise HTTPException(status_code=400, detail=f"Class record submission window closed. Date {req.date} is {(today - target_date).days} days ago (limit is 3 days).")

    # Verify slot ownership
    slot = await session.get(models.PeriodSlot, req.period_slot_id)
    if not slot or slot.faculty_id != user["id"]:
        raise HTTPException(status_code=404, detail="Period slot not found or does not belong to you.")

    # Upsert
    existing = await session.execute(
        select(models.TeachingRecord).where(
            models.TeachingRecord.faculty_id == user["id"],
            models.TeachingRecord.period_slot_id == req.period_slot_id,
            models.TeachingRecord.date == target_date,
            models.TeachingRecord.is_deleted == False
        )
    )
    record = existing.scalars().first()
    if record:
        record.actual_topic = req.actual_topic
        record.methodology = req.methodology
        record.remarks = req.remarks
        record.is_class_record_submitted = True
    else:
        record = models.TeachingRecord(
            college_id=user["college_id"],
            faculty_id=user["id"],
            period_slot_id=req.period_slot_id,
            date=target_date,
            actual_topic=req.actual_topic,
            methodology=req.methodology,
            remarks=req.remarks,
            is_class_record_submitted=True
        )
        session.add(record)

    await session.commit()
    return {"id": record.id, "message": "Class record submitted"}


@router.patch("/faculty/teaching-records/{record_id}")
async def update_teaching_record(
    record_id: str,
    req: TeachingRecordUpdate,
    user: dict = Depends(require_role("teacher", "faculty", "hod")),
    session: AsyncSession = Depends(get_db)
):
    """Edit an existing teaching record. Enforces same time windows as create."""
    record = await session.get(models.TeachingRecord, record_id)
    if not record or record.faculty_id != user["id"] or record.is_deleted:
        raise HTTPException(status_code=404, detail="Teaching record not found.")

    today = datetime.now(timezone.utc).date()

    # If updating planned_topic, enforce T+14 window
    if req.planned_topic is not None:
        if record.date < today:
            raise HTTPException(status_code=400, detail="Cannot edit teaching plan for a past date.")
        if (record.date - today).days > 14:
            raise HTTPException(status_code=400, detail="Teaching plan can only be edited up to 14 days in advance.")
        record.planned_topic = req.planned_topic

    # If updating actual_topic/methodology, enforce T to T-3 window
    if req.actual_topic is not None or req.methodology is not None:
        if record.date > today:
            raise HTTPException(status_code=400, detail="Cannot submit class record for a future date.")
        if (today - record.date).days > 3:
            raise HTTPException(status_code=400, detail=f"Class record edit window closed ({(today - record.date).days} days ago, limit is 3).")
        if req.actual_topic is not None:
            record.actual_topic = req.actual_topic
        if req.methodology is not None:
            if req.methodology not in VALID_METHODOLOGIES:
                raise HTTPException(status_code=400, detail=f"Invalid methodology. Must be one of: {', '.join(VALID_METHODOLOGIES)}")
            record.methodology = req.methodology
        record.is_class_record_submitted = True

    if req.remarks is not None:
        record.remarks = req.remarks

    await session.commit()
    return {"id": record.id, "message": "Teaching record updated"}
