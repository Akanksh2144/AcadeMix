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


@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user), 
    session: AsyncSession = Depends(get_db)):
    from sqlalchemy import func, desc
    stmt = (
        select(
            models.QuizAttempt.student_id,
            func.avg(models.QuizAttempt.final_score).label("avg_score"),
            func.count(models.QuizAttempt.id).label("quizzes_taken"),
            models.User.name,
            models.User.profile_data
        )
        .join(models.User, models.User.id == models.QuizAttempt.student_id)
        .where(models.QuizAttempt.status == "submitted", models.User.college_id == user["college_id"])
        .group_by(models.QuizAttempt.student_id, models.User.id)
        .order_by(desc("avg_score"))
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    rows = result.all()
    
    leaderboard = []
    for i, row in enumerate(rows):
        leaderboard.append({
            "rank": offset + i + 1, 
            "student_id": row.student_id,
            "name": row.name,
            "college_id": (row.profile_data or {}).get("college_id", ""),
            "avg_score": round(row.avg_score, 1) if row.avg_score else 0, 
            "quizzes_taken": row.quizzes_taken, 
            "cgpa": 0,
        })
    return leaderboard
