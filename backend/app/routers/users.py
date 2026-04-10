"""
Users Router — thin HTTP layer delegating to UserService.
"""

import secrets
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.core.security import get_current_user, require_role
from app.core.audit import log_audit
from app import models
from app.schemas import PermissionFlagsUpdate, UserUpdate, RegisterRequest
from app.services.user_service import UserService
from sqlalchemy.future import select

router = APIRouter()


# ── Permission Management ────────────────────────────────────────────────────

@router.get("/admin/users/{user_id}/permissions")
async def get_user_permissions(
    user_id: str,
    user: dict = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_db),
):
    perm_r = await session.execute(
        select(models.UserPermission).where(models.UserPermission.user_id == user_id)
    )
    row = perm_r.scalars().first()
    return {"user_id": user_id, "flags": row.flags if row else {}}


@router.put("/admin/users/{user_id}/permissions")
async def set_user_permissions(
    user_id: str,
    req: PermissionFlagsUpdate,
    user: dict = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_db),
):
    target_r = await session.execute(
        select(models.User).where(
            models.User.id == user_id,
            models.User.college_id == user["college_id"],
        )
    )
    if not target_r.scalars().first():
        raise HTTPException(status_code=404, detail="User not found")

    perm_r = await session.execute(
        select(models.UserPermission).where(models.UserPermission.user_id == user_id)
    )
    row = perm_r.scalars().first()
    if row:
        row.flags = req.flags
    else:
        row = models.UserPermission(user_id=user_id, college_id=user["college_id"], flags=req.flags)
        session.add(row)
    await log_audit(session, user["id"], "user_permissions", "update", {"target_user": user_id, "flags": req.flags})
    await session.commit()
    return {"message": "Permissions updated", "flags": req.flags}


@router.patch("/admin/users/{user_id}/permissions")
async def patch_user_permissions(
    user_id: str,
    req: PermissionFlagsUpdate,
    user: dict = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_db),
):
    target_r = await session.execute(
        select(models.User).where(
            models.User.id == user_id,
            models.User.college_id == user["college_id"],
        )
    )
    if not target_r.scalars().first():
        raise HTTPException(status_code=404, detail="User not found")

    perm_r = await session.execute(
        select(models.UserPermission).where(models.UserPermission.user_id == user_id)
    )
    row = perm_r.scalars().first()
    if row:
        merged = {**(row.flags or {}), **req.flags}
        row.flags = merged
    else:
        row = models.UserPermission(user_id=user_id, college_id=user["college_id"], flags=req.flags)
        session.add(row)
    await session.commit()
    return {"message": "Permissions merged", "flags": row.flags}


# ── User CRUD (via UserService) ──────────────────────────────────────────────

@router.get("/users")
async def list_users(
    role: Optional[str] = None,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_role("admin", "teacher", "hod", "exam_cell")),
    session: AsyncSession = Depends(get_db),
):
    svc = UserService(session)
    return await svc.list_users(user["college_id"], role=role, skip=offset, limit=limit)


@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    user: dict = Depends(require_role("admin", "teacher", "hod", "exam_cell")),
    session: AsyncSession = Depends(get_db),
):
    svc = UserService(session)
    return await svc.get_user(user_id, user["college_id"])


@router.post("/users")
async def create_user(
    req: RegisterRequest,
    user: dict = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_db),
):
    svc = UserService(session)
    return await svc.create_user(req.model_dump(), user["college_id"])


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    req: UserUpdate,
    user: dict = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_db),
):
    svc = UserService(session)
    return await svc.update_user(user_id, req.model_dump(exclude_unset=True), user["college_id"])


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    user: dict = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_db),
):
    svc = UserService(session)
    await svc.delete_user(user_id, user["college_id"])
    return {"message": "User deleted"}


# ── Admin Operations ─────────────────────────────────────────────────────────

@router.post("/admin/users/bulk-import")
async def bulk_import_users(
    role: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_role("admin", "super_admin")),
    session: AsyncSession = Depends(get_db),
):
    svc = UserService(session)
    contents = await file.read()
    created = await svc.bulk_import(contents, file.filename, role, user["college_id"])
    return {"message": f"Successfully imported {created} {role}s"}


@router.post("/admin/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    admin: dict = Depends(require_role("admin", "super_admin")),
    session: AsyncSession = Depends(get_db),
):
    svc = UserService(session)
    temp = await svc.reset_password(user_id, admin["id"], admin["college_id"])
    return {"message": "Password reset successfully", "temporary_password": temp}


@router.get("/admin/users/export")
async def export_users(
    role: str = "student",
    batch: Optional[str] = None,
    user: dict = Depends(require_role("admin", "super_admin")),
    session: AsyncSession = Depends(get_db),
):
    svc = UserService(session)
    csv_data = await svc.export_csv(user["college_id"], role=role, batch=batch)
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=users_export_{role}.csv"},
    )
