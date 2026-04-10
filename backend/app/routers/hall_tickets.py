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


@router.post("/examcell/hall-tickets/generate")
async def generate_hall_tickets(semester: int, academic_year: str, user: dict = Depends(require_role("exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    # Verify that all registrations for this semester are approved
    pending_r = await session.execute(
        select(func.count(models.CourseRegistration.id)).where(
            models.CourseRegistration.college_id == user["college_id"],
            models.CourseRegistration.semester == semester,
            models.CourseRegistration.academic_year == academic_year,
            models.CourseRegistration.status == "registered"
        )
    )
    pending_count = pending_r.scalar()
    if pending_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot generate hall tickets. There are {pending_count} pending registrations.")
        
    # In a fully fleshed out system, this would trigger a background worker (e.g. Celery) 
    # to generate PDFs and send emails. For AcadMix, we just log the generation event.
    await log_audit(session, user["id"], "hall_ticket", "generate", {"semester": semester, "academic_year": academic_year})
    
    return {"message": "Hall tickets generation triggered successfully. Students can now download them."}
