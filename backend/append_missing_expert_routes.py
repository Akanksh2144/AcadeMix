additional_routes = """

class FacultyQuestionPaper(BaseModel):
    subject_code: str
    academic_year: str
    semester: int
    exam_type: str
    paper_url: str

@app.post("/api/faculty/question-papers")
async def faculty_submit_qp(req: FacultyQuestionPaper, request: Request, session: AsyncSession = Depends(get_db)):
    user_id = await get_current_user(request)
    college_id = await get_user_college(user_id, session)
    
    qp = models.QuestionPaperSubmission(
        college_id=college_id,
        faculty_id=user_id,
        subject_code=req.subject_code,
        academic_year=req.academic_year,
        semester=req.semester,
        exam_type=req.exam_type,
        paper_url=req.paper_url,
        status="submitted"
    )
    session.add(qp)
    await session.commit()
    return {"message": "Question paper submitted successfully", "id": qp.id}

@app.get("/api/faculty/question-papers")
async def faculty_get_qps(request: Request, session: AsyncSession = Depends(get_db)):
    user_id = await get_current_user(request)
    college_id = await get_user_college(user_id, session)
    
    res = await session.execute(
        select(models.QuestionPaperSubmission)
        .where(models.QuestionPaperSubmission.college_id == college_id, models.QuestionPaperSubmission.faculty_id == user_id)
        .order_by(models.QuestionPaperSubmission.created_at.desc())
    )
    return res.scalars().all()

class FacultyStudyMaterial(BaseModel):
    subject_code: str
    title: str
    description: Optional[str] = None
    material_url: str
    material_type: str

@app.post("/api/faculty/study-materials")
async def faculty_submit_mat(req: FacultyStudyMaterial, request: Request, session: AsyncSession = Depends(get_db)):
    user_id = await get_current_user(request)
    college_id = await get_user_college(user_id, session)
    
    sm = models.StudyMaterial(
        college_id=college_id,
        faculty_id=user_id,
        subject_code=req.subject_code,
        title=req.title,
        description=req.description,
        material_url=req.material_url,
        material_type=req.material_type,
        status="submitted"
    )
    session.add(sm)
    await session.commit()
    return {"message": "Study material submitted successfully", "id": sm.id}

@app.get("/api/faculty/study-materials")
async def faculty_get_mats(request: Request, session: AsyncSession = Depends(get_db)):
    user_id = await get_current_user(request)
    college_id = await get_user_college(user_id, session)
    
    res = await session.execute(
        select(models.StudyMaterial)
        .where(models.StudyMaterial.college_id == college_id, models.StudyMaterial.faculty_id == user_id)
        .order_by(models.StudyMaterial.created_at.desc())
    )
    return res.scalars().all()

@app.get("/api/admin/experts")
async def get_admin_experts(request: Request, session: AsyncSession = Depends(get_db)):
    user_id = await get_current_user(request)
    college_id = await get_user_college(user_id, session)
    u = (await session.execute(select(models.User).where(models.User.id == user_id))).scalars().first()
    if u.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Must be admin")
    
    res = await session.execute(
        select(models.User.id, models.User.name, models.User.email, models.User.profile_data)
        .where(models.User.college_id == college_id, models.User.role == "expert")
    )
    return [{"id": r[0], "name": r[1], "email": r[2], "profile": r[3]} for r in res.fetchall()]
"""

import sys
file_path = r"C:\AcadMix\backend\server.py"

with open(file_path, "a", encoding="utf-8") as f:
    f.write(additional_routes)
print("Appended missing routes")
