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


@router.get("/departments")
async def list_departments(user: dict = Depends(require_role("admin", "teacher", "hod", "exam_cell")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.Department).where(models.Department.college_id == user["college_id"])
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("/departments")
async def create_department(req: DepartmentCreate, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    new_dept = models.Department(
        college_id=user["college_id"],
        name=req.name,
        code=req.code.upper()
    )
    session.add(new_dept)
    await session.commit()
    await session.refresh(new_dept)
    return new_dept


@router.put("/departments/{dept_id}")
async def update_department(dept_id: str, req: DepartmentUpdate, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Department).where(models.Department.id == dept_id))
    dept = result.scalars().first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    if req.name is not None:
        dept.name = req.name
    if req.code is not None:
        dept.code = req.code.upper()
    await session.commit()
    await session.refresh(dept)
    return dept


@router.delete("/departments/{dept_id}")
async def delete_department(dept_id: str, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Department).where(models.Department.id == dept_id))
    dept = result.scalars().first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    await session.delete(dept)
    await session.commit()
    return {"message": "Department deleted"}
