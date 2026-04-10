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


@router.get("/admin/permissions/summary")
async def permissions_summary(user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    """List all users with their permission flags for the admin panel."""
    result = await session.execute(
        select(models.User, models.UserPermission)
        .outerjoin(models.UserPermission, models.User.id == models.UserPermission.user_id)
        .where(models.User.college_id == user["college_id"])
    )
    rows = result.all()
    return [
        {"id": u.id, "name": u.name, "role": u.role, "email": u.email,
         "flags": p.flags if p else {}}
        for u, p in rows
    ]


@router.get("/roles")
async def list_roles(user: dict = Depends(require_role("admin", "teacher", "hod")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.Role).where(models.Role.college_id == user["college_id"])
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("/roles")
async def create_role(req: RoleCreate, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    new_role = models.Role(college_id=user["college_id"], name=req.name, permissions=req.permissions)
    session.add(new_role)
    await session.commit()
    await session.refresh(new_role)
    return new_role


@router.put("/roles/{role_id}")
async def update_role(role_id: str, req: RoleUpdate, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Role).where(models.Role.id == role_id, models.Role.college_id == user["college_id"]))
    role = result.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if req.name is not None:
        role.name = req.name
    if req.permissions is not None:
        role.permissions = req.permissions
    await session.commit()
    await session.refresh(role)
    return role


@router.delete("/roles/{role_id}")
async def delete_role(role_id: str, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Role).where(models.Role.id == role_id, models.Role.college_id == user["college_id"]))
    role = result.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    await session.delete(role)
    await session.commit()
    return {"message": "Role deleted"}
