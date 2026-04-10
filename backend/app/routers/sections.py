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


@router.get("/sections")
async def list_sections(user: dict = Depends(require_role("admin", "teacher", "hod", "exam_cell", "student")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.Section).where(models.Section.college_id == user["college_id"])
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("/sections")
async def create_section(req: SectionCreate, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    # Verify department belongs to college
    dept_res = await session.execute(select(models.Department).where(models.Department.id == req.department_id, models.Department.college_id == user["college_id"]))
    if not dept_res.scalars().first():
        raise HTTPException(status_code=400, detail="Invalid department")
    new_sec = models.Section(college_id=user["college_id"], department_id=req.department_id, name=req.name.upper())
    session.add(new_sec)
    await session.commit()
    await session.refresh(new_sec)
    return new_sec


@router.put("/sections/{sec_id}")
async def update_section(sec_id: str, req: SectionUpdate, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Section).where(models.Section.id == sec_id, models.Section.college_id == user["college_id"]))
    sec = result.scalars().first()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")
    if req.name is not None:
        sec.name = req.name.upper()
    if req.department_id is not None:
        sec.department_id = req.department_id
    await session.commit()
    await session.refresh(sec)
    return sec


@router.delete("/sections/{sec_id}")
async def delete_section(sec_id: str, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Section).where(models.Section.id == sec_id, models.Section.college_id == user["college_id"]))
    sec = result.scalars().first()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")
    await session.delete(sec)
    await session.commit()
    return {"message": "Section deleted"}
