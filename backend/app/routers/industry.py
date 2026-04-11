from fastapi import APIRouter, Depends, HTTPException, Query, Request
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


@router.get("/industry/mous")
async def get_industry_mous(
    user: dict = Depends(require_role("industry", "tpo", "tp_officer", "admin")),
    session: AsyncSession = Depends(get_db)
):
    if user["role"] == "industry":
        company = await get_industry_user_company(user, session)
        stmt = select(models.MOU).where(models.MOU.company_id == company.id, models.MOU.is_deleted == False).order_by(models.MOU.created_at.desc())
    else:
        stmt = select(models.MOU).where(models.MOU.college_id == user["college_id"], models.MOU.is_deleted == False).order_by(models.MOU.created_at.desc())
    
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("/industry/mous")
async def create_industry_mou(
    req: MOUCreate,
    user: dict = Depends(require_role("industry", "admin")),
    session: AsyncSession = Depends(get_db)
):
    if user["role"] == "industry":
        company = await get_industry_user_company(user, session)
        company_id = company.id
    else:
        raise HTTPException(status_code=400, detail="Admin MOU creation logic via /api/admin/mous")
        
    import datetime
    new_mou = models.MOU(
        college_id=user["college_id"],
        company_id=company_id,
        purpose=req.purpose,
        signed_date=datetime.date.fromisoformat(req.signed_date),
        valid_until=datetime.date.fromisoformat(req.valid_until),
        document_url=req.document_url,
        status=req.status,
        benefits=req.benefits
    )
    session.add(new_mou)
    await session.commit()
    return {"id": new_mou.id, "message": "MOU registered"}


@router.post("/industry/curriculum-feedback")
async def create_curriculum_feedback(
    req: CurriculumFeedbackCreate,
    user: dict = Depends(require_role("industry")),
    session: AsyncSession = Depends(get_db)
):
    company = await get_industry_user_company(user, session)
    if not (1 <= req.overall_rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    cf = models.CurriculumFeedback(
        college_id=user["college_id"],
        submitted_by=user["id"],
        department_id=req.department_id,
        academic_year=req.academic_year,
        feedback_items=req.feedback_items,
        overall_rating=req.overall_rating
    )
    session.add(cf)
    await session.commit()
    return {"message": "Feedback submitted successfully"}


@router.post("/industry/employer-feedback")
async def create_employer_feedback(
    req: EmployerFeedbackCreate,
    user: dict = Depends(require_role("industry")),
    session: AsyncSession = Depends(get_db)
):
    company = await get_industry_user_company(user, session)
    ef = models.EmployerFeedback(
        college_id=user["college_id"],
        company_id=company.id,
        student_id=req.student_id,
        submitted_by=user["id"],
        performance_rating=req.performance_rating,
        technical_skills_rating=req.technical_skills_rating,
        soft_skills_rating=req.soft_skills_rating,
        overall_feedback=req.overall_feedback,
        feedback_period=req.feedback_period
    )
    session.add(ef)
    await session.commit()
    return {"message": "Employer feedback for NAAC 2.6 submitted"}


@router.get("/industry/projects")
async def get_industry_projects(
    user: dict = Depends(require_role("industry", "student", "admin", "teacher")),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.IndustryProject).where(
        models.IndustryProject.college_id == user["college_id"],
        models.IndustryProject.is_deleted == False
    ).order_by(models.IndustryProject.created_at.desc())
    
    if user["role"] == "industry":
        company = await get_industry_user_company(user, session)
        stmt = stmt.where(models.IndustryProject.company_id == company.id)
    
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("/industry/projects")
async def create_industry_project(
    req: IndustryProjectCreate,
    user: dict = Depends(require_role("industry")),
    session: AsyncSession = Depends(get_db)
):
    company = await get_industry_user_company(user, session)
    new_proj = models.IndustryProject(
        college_id=user["college_id"],
        company_id=company.id,
        proposed_by=user["id"],
        title=req.title,
        description=req.description,
        domain=req.domain,
        max_students=req.max_students,
        stipend_if_any=req.stipend_if_any,
        duration_weeks=req.duration_weeks
    )
    session.add(new_proj)
    await session.commit()
    return {"id": new_proj.id, "message": "Project proposed"}


@router.post("/industry/drives")
async def request_placement_drive(
    req: DriveRequestCreate,
    user: dict = Depends(require_role("industry")),
    session: AsyncSession = Depends(get_db)
):
    company = await get_industry_user_company(user, session)
    new_drive = models.PlacementDrive(
        college_id=user["college_id"],
        company_id=company.id,
        status="requested", # Requires TPO confirmation
        drive_type=req.drive_type,
        type="placement",
        job_description=req.job_description,
        bond_period=req.bond_period,
        work_location=req.work_location,
        stipend=req.stipend
    )
    session.add(new_drive)
    await session.commit()
    return {"id": new_drive.id, "message": "Placement drive requested"}


@router.get("/industry/dashboard")
async def get_industry_dashboard(
    user: dict = Depends(require_role("industry")),
    session: AsyncSession = Depends(get_db)
):
    company = await get_industry_user_company(user, session)
    cid = company.id
    
    # Active MOUs
    mous_count = (await session.execute(
        select(func.count(models.MOU.id)).where(models.MOU.company_id == cid, models.MOU.status == "active", models.MOU.is_deleted == False)
    )).scalar() or 0
    
    # Open Drives
    drives_count = (await session.execute(
        select(func.count(models.PlacementDrive.id)).where(models.PlacementDrive.company_id == cid, models.PlacementDrive.is_deleted == False)
    )).scalar() or 0
    
    # Active Projects
    projects_count = (await session.execute(
        select(func.count(models.IndustryProject.id)).where(models.IndustryProject.company_id == cid, models.IndustryProject.is_deleted == False)
    )).scalar() or 0

    return {
        "active_mous": mous_count,
        "drives_requested": drives_count,
        "active_projects": projects_count
    }


@router.post("/industry/training-programs")
async def create_training_program(
    req: TrainingProgramCreate,
    user: dict = Depends(require_role("industry")),
    session: AsyncSession = Depends(get_db)
):
    import datetime
    company = await get_industry_user_company(user, session)
    new_event = models.AlumniEvent(
        college_id=user["college_id"],
        created_by=user["id"],
        source_type="industry",
        source_id=company.id,
        title=req.title,
        description=req.description,
        event_type=req.event_type,
        date=datetime.datetime.fromisoformat(req.date.replace("Z", "+00:00")),
        venue=req.venue,
        max_capacity=req.max_capacity,
        status="published"
    )
    session.add(new_event)
    await session.commit()
    return {"id": new_event.id, "message": "Training program scheduled successfully"}
