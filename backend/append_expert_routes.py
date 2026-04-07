expert_routes = """

# ==============================================================================
# EXPERT SUBJECT MODULE ROUTES
# ==============================================================================

class ExpertAssignRequest(BaseModel):
    expert_user_id: str
    subject_code: str
    academic_year: str
    department_id: Optional[str] = None

@app.post("/api/admin/experts/assign")
async def assign_expert(req: ExpertAssignRequest, request: Request, session: AsyncSession = Depends(get_db)):
    user_id = await get_current_user(request)
    college_id = await get_user_college(user_id, session)
    # Check if user is admin
    u = (await session.execute(select(models.User).where(models.User.id == user_id))).scalars().first()
    if u.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Must be admin to assign experts")
    
    assignment = models.ExpertAssignment(
        college_id=college_id,
        expert_user_id=req.expert_user_id,
        subject_code=req.subject_code,
        department_id=req.department_id,
        academic_year=req.academic_year,
        assigned_by=user_id
    )
    session.add(assignment)
    try:
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail="Assignment failed (already assigned?)")
    return {"message": "Expert assigned successfully", "id": assignment.id}

@app.get("/api/expert/my-assignments")
async def get_my_assignments(request: Request, session: AsyncSession = Depends(get_db)):
    user_id = await get_current_user(request)
    res = await session.execute(
        select(models.ExpertAssignment)
        .where(models.ExpertAssignment.expert_user_id == user_id, models.ExpertAssignment.is_active == True)
    )
    return res.scalars().all()

@app.get("/api/expert/dashboard")
async def get_expert_dashboard(request: Request, session: AsyncSession = Depends(get_db)):
    user_id = await get_current_user(request)
    college_id = await get_user_college(user_id, session)
    
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

class QuestionPaperReview(BaseModel):
    status: str
    comments: Optional[str] = None

@app.put("/api/expert/question-papers/{paper_id}/review")
async def review_question_paper(paper_id: str, req: QuestionPaperReview, request: Request, session: AsyncSession = Depends(get_db)):
    user_id = await get_current_user(request)
    paper = (await session.execute(select(models.QuestionPaperSubmission).where(models.QuestionPaperSubmission.id == paper_id))).scalars().first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    paper.status = req.status
    paper.expert_comments = req.comments
    paper.expert_id = user_id
    paper.expert_reviewed_at = func.now()
    if req.status == "revision_requested":
        paper.revision_count += 1
        
    await session.commit()
    return {"message": "Review submitted successfully"}

@app.get("/api/expert/question-papers")
async def get_expert_question_papers(request: Request, session: AsyncSession = Depends(get_db)):
    user_id = await get_current_user(request)
    college_id = await get_user_college(user_id, session)
    
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

class TeachingEvalRequest(BaseModel):
    faculty_id: str
    subject_code: str
    academic_year: str
    content_coverage_rating: int
    methodology_rating: int
    engagement_rating: int
    assessment_quality_rating: int
    overall_rating: int
    comments: Optional[str] = None
    evaluation_date: str

@app.post("/api/expert/evaluations")
async def submit_teaching_evaluation(req: TeachingEvalRequest, request: Request, session: AsyncSession = Depends(get_db)):
    user_id = await get_current_user(request)
    college_id = await get_user_college(user_id, session)
    
    import datetime
    eval_model = models.TeachingEvaluation(
        college_id=college_id,
        expert_id=user_id,
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

@app.get("/api/expert/study-materials")
async def get_expert_study_materials(request: Request, session: AsyncSession = Depends(get_db)):
    user_id = await get_current_user(request)
    college_id = await get_user_college(user_id, session)
    
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

@app.put("/api/expert/study-materials/{mat_id}/review")
async def review_study_material(mat_id: str, req: QuestionPaperReview, request: Request, session: AsyncSession = Depends(get_db)):
    user_id = await get_current_user(request)
    mat = (await session.execute(select(models.StudyMaterial).where(models.StudyMaterial.id == mat_id))).scalars().first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    
    mat.status = req.status
    mat.expert_comments = req.comments
    mat.expert_id = user_id
    mat.expert_reviewed_at = func.now()
        
    await session.commit()
    return {"message": "Material review submitted successfully"}

@app.get("/api/faculty/my-evaluations")
async def get_faculty_evaluations(request: Request, session: AsyncSession = Depends(get_db)):
    user_id = await get_current_user(request)
    college_id = await get_user_college(user_id, session)
    
    res = await session.execute(
        select(models.TeachingEvaluation)
        .where(models.TeachingEvaluation.college_id == college_id, models.TeachingEvaluation.faculty_id == user_id)
        .order_by(models.TeachingEvaluation.evaluation_date.desc())
    )
    return res.scalars().all()

@app.get("/api/student/study-materials")
async def get_student_materials(subject_code: Optional[str] = None, request: Request = None, session: AsyncSession = Depends(get_db)):
    user_id = await get_current_user(request)
    college_id = await get_user_college(user_id, session)
    
    query = select(models.StudyMaterial).where(
        models.StudyMaterial.college_id == college_id,
        models.StudyMaterial.status == 'expert_approved'
    )
    if subject_code:
        query = query.where(models.StudyMaterial.subject_code == subject_code)
        
    res = await session.execute(query.order_by(models.StudyMaterial.created_at.desc()))
    return res.scalars().all()

"""

import sys
file_path = r"C:\AcadMix\backend\server.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if "EXPERT SUBJECT MODULE" not in content:
    with open(file_path, "a", encoding="utf-8") as f:
        f.write(expert_routes)
    print("Appended expert_routes to server.py")
else:
    print("Routes already exist")
