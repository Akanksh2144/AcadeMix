"""
Training & Placement Officer Router.
Handles all T&P related operations for companies, drives, and student applications.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from database import get_db
from app.core.security import require_role
from app.services.tpo_service import TPOService

router = APIRouter()

def get_tpo_service(session: AsyncSession = Depends(get_db)):
    return TPOService(session)


@router.get("/tpo/companies")
async def get_companies(
    user: dict = Depends(require_role("tpo", "admin")),
    svc: TPOService = Depends(get_tpo_service)
):
    return {"data": await svc.get_companies(user["college_id"])}


@router.post("/tpo/companies")
async def create_company(
    data: dict,
    user: dict = Depends(require_role("tpo", "admin")),
    svc: TPOService = Depends(get_tpo_service)
):
    uid = await svc.create_company(user["college_id"], data)
    return {"success": True, "id": uid}


@router.get("/tpo/drives")
async def get_drives(
    user: dict = Depends(require_role("tpo", "admin", "student")),
    svc: TPOService = Depends(get_tpo_service)
):
    return {"data": await svc.get_drives(user["college_id"])}


@router.post("/tpo/drives")
async def create_drive(
    data: dict,
    user: dict = Depends(require_role("tpo", "admin")),
    svc: TPOService = Depends(get_tpo_service)
):
    uid = await svc.create_drive(user["college_id"], data)
    return {"success": True, "id": uid}


@router.put("/tpo/drives/{drive_id}")
async def update_drive(
    drive_id: str,
    data: dict,
    user: dict = Depends(require_role("tpo", "admin")),
    svc: TPOService = Depends(get_tpo_service)
):
    await svc.update_drive(user["college_id"], drive_id, data)
    return {"success": True}


@router.get("/tpo/drives/{drive_id}/applicants")
async def get_applicants(
    drive_id: str,
    user: dict = Depends(require_role("tpo", "admin")),
    svc: TPOService = Depends(get_tpo_service)
):
    return {"data": await svc.get_applicants(user["college_id"], drive_id)}


@router.put("/tpo/drives/{drive_id}/shortlist")
async def shortlist_bulk(
    drive_id: str,
    payload: dict,
    user: dict = Depends(require_role("tpo", "admin")),
    svc: TPOService = Depends(get_tpo_service)
):
    # payload expects { "student_ids": [...] }
    await svc.shortlist_bulk(user["college_id"], drive_id, payload.get("student_ids", []))
    return {"success": True}


@router.put("/tpo/drives/{drive_id}/results")
async def log_result(
    drive_id: str,
    data: dict,
    user: dict = Depends(require_role("tpo", "admin")),
    svc: TPOService = Depends(get_tpo_service)
):
    await svc.log_result(user["college_id"], drive_id, data)
    return {"success": True}


@router.put("/tpo/drives/{drive_id}/select")
async def select_candidate(
    drive_id: str,
    data: dict,
    user: dict = Depends(require_role("tpo", "admin")),
    svc: TPOService = Depends(get_tpo_service)
):
    await svc.select_candidate(user["college_id"], drive_id, data)
    return {"success": True}


@router.get("/tpo/statistics")
async def get_stats(
    user: dict = Depends(require_role("tpo", "admin", "principal")),
    svc: TPOService = Depends(get_tpo_service)
):
    return await svc.get_stats(user["college_id"])
