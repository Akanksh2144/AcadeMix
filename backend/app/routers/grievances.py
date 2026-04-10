from fastapi import APIRouter, Depends, HTTPException, Query, Body
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


@router.post("/grievances")
async def submit_grievance(
    req: dict = Body(...),
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Any authenticated user can submit a grievance."""
    grievance = models.Grievance(
        college_id=user["college_id"],
        submitted_by=user["id"],
        submitted_by_role=user["role"],
        category=req["category"],
        subject=req["subject"],
        description=req["description"]
    )
    session.add(grievance)
    await session.commit()
    return {"message": "Grievance submitted"}


@router.get("/grievances/my")
async def my_grievances(
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(
        select(models.Grievance).where(
            models.Grievance.submitted_by == user["id"],
            models.Grievance.is_deleted == False
        ).order_by(models.Grievance.created_at.desc())
    )
    return result.scalars().all()


@router.post("/student/feedback")
async def submit_feedback(req: FeedbackCreate, user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    # Duplicate check via unique index will catch, but give a nicer error
    existing = await session.execute(
        select(models.CourseFeedback).where(
            models.CourseFeedback.student_id == user["id"],
            models.CourseFeedback.subject_code == req.subject_code,
            models.CourseFeedback.academic_year == req.academic_year
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Feedback already submitted for this subject")
    row = models.CourseFeedback(
        college_id=user["college_id"],
        student_id=user["id"],
        faculty_id=req.faculty_id,
        subject_code=req.subject_code,
        academic_year=req.academic_year,
        semester=req.semester,
        content_rating=req.content_rating,
        teaching_rating=req.teaching_rating,
        engagement_rating=req.engagement_rating,
        assessment_rating=req.assessment_rating,
        overall_rating=req.overall_rating,
        comments=req.comments
    )
    session.add(row)
    await session.commit()
    return {"message": "Feedback submitted successfully"}


@router.get("/student/feedback/history")
async def get_my_feedback(user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    res = await session.execute(
        select(models.CourseFeedback.subject_code, models.CourseFeedback.academic_year, models.CourseFeedback.overall_rating, models.CourseFeedback.submitted_at)
        .where(models.CourseFeedback.student_id == user["id"])
        .order_by(models.CourseFeedback.submitted_at.desc())
    )
    return [{"subject_code": r[0], "academic_year": r[1], "overall_rating": r[2], "submitted_at": r[3]} for r in res.fetchall()]


@router.get("/faculty/feedback-summary")
async def get_faculty_feedback_summary(user: dict = Depends(require_role("teacher", "hod")), session: AsyncSession = Depends(get_db)):
    """Faculty sees aggregated (anonymous) feedback — averages only, no student IDs."""
    res = await session.execute(
        select(
            models.CourseFeedback.subject_code,
            models.CourseFeedback.academic_year,
            func.count(models.CourseFeedback.id).label("response_count"),
            func.avg(models.CourseFeedback.content_rating).label("avg_content"),
            func.avg(models.CourseFeedback.teaching_rating).label("avg_teaching"),
            func.avg(models.CourseFeedback.engagement_rating).label("avg_engagement"),
            func.avg(models.CourseFeedback.assessment_rating).label("avg_assessment"),
            func.avg(models.CourseFeedback.overall_rating).label("avg_overall"),
        ).where(
            models.CourseFeedback.faculty_id == user["id"]
        ).group_by(
            models.CourseFeedback.subject_code, models.CourseFeedback.academic_year
        )
    )
    return [
        {
            "subject_code": r.subject_code, "academic_year": r.academic_year,
            "response_count": r.response_count,
            "avg_content": round(float(r.avg_content or 0), 2),
            "avg_teaching": round(float(r.avg_teaching or 0), 2),
            "avg_engagement": round(float(r.avg_engagement or 0), 2),
            "avg_assessment": round(float(r.avg_assessment or 0), 2),
            "avg_overall": round(float(r.avg_overall or 0), 2),
        }
        for r in res.fetchall()
    ]


@router.get("/admin/feedback/detailed")
async def get_admin_feedback(faculty_id: Optional[str] = None, user: dict = Depends(require_role("admin", "principal", "hod")), session: AsyncSession = Depends(get_db)):
    """Admin sees identified feedback with student IDs for audit."""
    q = select(models.CourseFeedback).where(models.CourseFeedback.college_id == user["college_id"])
    if faculty_id:
        q = q.where(models.CourseFeedback.faculty_id == faculty_id)
    res = await session.execute(q.order_by(models.CourseFeedback.submitted_at.desc()))
    return res.scalars().all()
