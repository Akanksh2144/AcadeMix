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


@router.post("/admin/experts/assign")
async def assign_expert(req: ExpertAssignRequest, user: dict = Depends(require_role("admin", "super_admin")), session: AsyncSession = Depends(get_db)):
    assignment = models.ExpertAssignment(
        college_id=user["college_id"],
        expert_user_id=req.expert_user_id,
        subject_code=req.subject_code,
        department_id=req.department_id,
        academic_year=req.academic_year,
        assigned_by=user["id"]
    )
    session.add(assignment)
    try:
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail="Assignment failed (already assigned?)")
    return {"message": "Expert assigned successfully", "id": assignment.id}


@router.get("/expert/my-assignments")
async def get_my_assignments(user: dict = Depends(require_role("expert")), session: AsyncSession = Depends(get_db)):
    res = await session.execute(
        select(models.ExpertAssignment)
        .where(models.ExpertAssignment.expert_user_id == user["id"], models.ExpertAssignment.is_active == True)
    )
    return res.scalars().all()


@router.get("/expert/dashboard")
async def get_expert_dashboard(user: dict = Depends(require_role("expert")), session: AsyncSession = Depends(get_db)):
    user_id = user["id"]
    college_id = user["college_id"]
    
    # Active assignments count
    assignments_res = await session.execute(
        select(func.count(models.ExpertAssignment.id))
        .where(models.ExpertAssignment.expert_user_id == user_id, models.ExpertAssignment.is_active == True)
    )
    active_assignments = assignments_res.scalar()

    # Get subjects assigned to this expert to filter pending reviews
    subs_res = await session.execute(
        select(models.ExpertAssignment.subject_code)
        .where(models.ExpertAssignment.expert_user_id == user_id, models.ExpertAssignment.is_active == True)
    )
    assigned_subjects = [s for s in subs_res.scalars().all()]
    
    pending_papers = 0
    pending_materials = 0
    if assigned_subjects:
        # Question papers pending review
        pq_res = await session.execute(
            select(func.count(models.QuestionPaperSubmission.id))
            .where(
                models.QuestionPaperSubmission.college_id == college_id,
                models.QuestionPaperSubmission.subject_code.in_(assigned_subjects),
                models.QuestionPaperSubmission.status.in_(["submitted", "under_review"])
            )
        )
        pending_papers = pq_res.scalar()

        # Study materials pending review
        pm_res = await session.execute(
            select(func.count(models.StudyMaterial.id))
            .where(
                models.StudyMaterial.college_id == college_id,
                models.StudyMaterial.subject_code.in_(assigned_subjects),
                models.StudyMaterial.status == "submitted"
            )
        )
        pending_materials = pm_res.scalar()

    # Completed teaching evaluations
    te_res = await session.execute(
        select(func.count(models.TeachingEvaluation.id))
        .where(models.TeachingEvaluation.expert_id == user_id)
    )
    completed_evals = te_res.scalar()

    return {
        "active_assignments": active_assignments,
        "pending_question_papers": pending_papers,
        "pending_materials": pending_materials,
        "completed_evaluations": completed_evals
    }


@router.put("/expert/question-papers/{paper_id}/review")
async def review_question_paper(paper_id: str, req: QuestionPaperReview, user: dict = Depends(require_role("expert")), session: AsyncSession = Depends(get_db)):
    paper = (await session.execute(select(models.QuestionPaperSubmission).where(models.QuestionPaperSubmission.id == paper_id))).scalars().first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    paper.status = req.status
    paper.expert_comments = req.comments
    paper.expert_id = user["id"]
    paper.expert_reviewed_at = func.now()
    if req.status == "revision_requested":
        paper.revision_count += 1
        
    await session.commit()
    return {"message": "Review submitted successfully"}


@router.get("/expert/question-papers")
async def get_expert_question_papers(user: dict = Depends(require_role("expert")), session: AsyncSession = Depends(get_db)):
    user_id = user["id"]
    college_id = user["college_id"]
    
    subs_res = await session.execute(
        select(models.ExpertAssignment.subject_code)
        .where(models.ExpertAssignment.expert_user_id == user_id, models.ExpertAssignment.is_active == True)
    )
    assigned_subjects = [s for s in subs_res.scalars().all()]
    if not assigned_subjects:
        return []
        
    res = await session.execute(
        select(models.QuestionPaperSubmission)
        .where(models.QuestionPaperSubmission.college_id == college_id, models.QuestionPaperSubmission.subject_code.in_(assigned_subjects))
    )
    
    # Fetch faculty names for display
    papers = res.scalars().all()
    faculty_ids = list(set([p.faculty_id for p in papers]))
    fac_res = await session.execute(select(models.User.id, models.User.name).where(models.User.id.in_(faculty_ids)))
    fac_map = {r[0]: r[1] for r in fac_res.fetchall()}
    
    results = []
    for p in papers:
        pd = {c.name: getattr(p, c.name) for c in p.__table__.columns}
        pd["faculty_name"] = fac_map.get(str(p.faculty_id), str(p.faculty_id))
        results.append(pd)
    return results


@router.post("/expert/evaluations")
async def submit_teaching_evaluation(req: TeachingEvalRequest, user: dict = Depends(require_role("expert")), session: AsyncSession = Depends(get_db)):
    import datetime
    eval_model = models.TeachingEvaluation(
        college_id=user["college_id"],
        expert_id=user["id"],
        faculty_id=req.faculty_id,
        subject_code=req.subject_code,
        academic_year=req.academic_year,
        content_coverage_rating=req.content_coverage_rating,
        methodology_rating=req.methodology_rating,
        engagement_rating=req.engagement_rating,
        assessment_quality_rating=req.assessment_quality_rating,
        overall_rating=req.overall_rating,
        comments=req.comments,
        evaluation_date=datetime.datetime.strptime(req.evaluation_date, "%Y-%m-%d").date()
    )
    session.add(eval_model)
    await session.commit()
    return {"message": "Evaluation submitted successfully"}


@router.get("/expert/study-materials")
async def get_expert_study_materials(user: dict = Depends(require_role("expert")), session: AsyncSession = Depends(get_db)):
    user_id = user["id"]
    college_id = user["college_id"]
    
    subs_res = await session.execute(
        select(models.ExpertAssignment.subject_code)
        .where(models.ExpertAssignment.expert_user_id == user_id, models.ExpertAssignment.is_active == True)
    )
    assigned_subjects = [s for s in subs_res.scalars().all()]
    if not assigned_subjects:
        return []
        
    res = await session.execute(
        select(models.StudyMaterial)
        .where(models.StudyMaterial.college_id == college_id, models.StudyMaterial.subject_code.in_(assigned_subjects))
    )
    materials = res.scalars().all()
    
    faculty_ids = list(set([p.faculty_id for p in materials]))
    fac_res = await session.execute(select(models.User.id, models.User.name).where(models.User.id.in_(faculty_ids)))
    fac_map = {r[0]: r[1] for r in fac_res.fetchall()}
    
    results = []
    for p in materials:
        pd = {c.name: getattr(p, c.name) for c in p.__table__.columns}
        pd["faculty_name"] = fac_map.get(str(p.faculty_id), str(p.faculty_id))
        results.append(pd)
    return results


@router.put("/expert/study-materials/{mat_id}/review")
async def review_study_material(mat_id: str, req: QuestionPaperReview, user: dict = Depends(require_role("expert")), session: AsyncSession = Depends(get_db)):
    mat = (await session.execute(select(models.StudyMaterial).where(models.StudyMaterial.id == mat_id))).scalars().first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    
    mat.status = req.status
    mat.expert_comments = req.comments
    mat.expert_id = user["id"]
    mat.expert_reviewed_at = func.now()
        
    await session.commit()
    return {"message": "Material review submitted successfully"}


@router.get("/admin/experts")
async def get_admin_experts(user: dict = Depends(require_role("admin", "super_admin")), session: AsyncSession = Depends(get_db)):
    res = await session.execute(
        select(models.User.id, models.User.name, models.User.email, models.User.profile_data)
        .where(models.User.college_id == user["college_id"], models.User.role == "expert")
    )
    return [{"id": r[0], "name": r[1], "email": r[2], "profile": r[3]} for r in res.fetchall()]
