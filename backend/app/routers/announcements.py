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

@router.get("/announcements")
async def list_announcements(user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    dept = user.get("department", "")
    role = user["role"]
    stmt = select(models.Announcement).where(
        models.Announcement.college_id == user["college_id"]
    ).order_by(models.Announcement.created_at.desc()).limit(50)
    result = await session.execute(stmt)
    rows = result.scalars().all()
    out = []
    for a in rows:
        details = a.details or {}
        vis = details.get("visibility", "all")
        a_dept = details.get("department", "")
        if a_dept and a_dept != dept:
            continue
        if role == "student" and vis not in ("all", "students"):
            continue
        if role == "teacher" and vis not in ("all", "faculty"):
            continue
        out.append({
            "id": a.id, "title": a.title, "message": a.message,
            "priority": a.priority, "visibility": vis,
            "department": a_dept,
            "posted_by": details.get("posted_by", ""),
            "created_at": a.created_at.isoformat() if a.created_at else ""
        })
    return out


@router.post("/announcements")
async def create_announcement(req: AnnouncementCreate, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    row = models.Announcement(
        college_id=user["college_id"],
        title=req.title,
        message=req.message,
        priority=req.priority,
        details={
            "visibility": req.visibility,
            "department": user.get("department", ""),
            "posted_by": user["name"],
            "posted_by_id": user["id"]
        }
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return {"id": row.id, "title": row.title, "message": row.message, "priority": row.priority}


@router.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Announcement).where(models.Announcement.id == announcement_id, models.Announcement.college_id == user["college_id"]))
    row = result.scalars().first()
    if not row:
        raise HTTPException(status_code=404, detail="Announcement not found")
    await session.delete(row)
    await session.commit()
    return {"message": "Announcement deleted"}
