from fastapi import APIRouter, Depends, HTTPException, Query, Request, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from database import get_db
from app.core.security import get_current_user
from app.core.security import require_role
from app import models
import app.schemas as server_schemas
from app.schemas import *
from app.services.student_service import StudentService

router = APIRouter()


@router.get("/student/my-mentor")
async def get_my_mentor(user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    """Resolves the student's active mentor from MentorAssignment."""
    service = StudentService(session)
    return await service.get_mentor_data(user["id"], user["college_id"])

@router.get("/students/search")
async def search_students(
    q: str = "", 
    department: Optional[str] = None, 
    college: Optional[str] = None, 
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_role("hod", "admin", "exam_cell", "teacher")), 
    session: AsyncSession = Depends(get_db)):
    stmt = select(models.User).outerjoin(models.UserProfile).where(
        models.User.role == "student",
        models.User.college_id == user["college_id"]
    )
    if q:
        stmt = stmt.where(
            models.User.name.ilike(f"%{q}%") |
            models.UserProfile.roll_number.ilike(f"%{q}%")
        )
    result = await session.execute(stmt.order_by(models.User.name).offset(offset).limit(limit))
    students = result.scalars().all()
    return [{"id": s.id, "name": s.name, "email": s.email, "role": s.role, **(s.profile_data or {})} for s in students]


@router.get("/students/{student_id}/profile")
async def student_profile(student_id: str, user: dict = Depends(require_role("hod", "admin", "exam_cell", "teacher")), session: AsyncSession = Depends(get_db)):
    student_r = await session.execute(select(models.User).where(
        models.User.id == student_id,
        models.User.college_id == user["college_id"]
    ))
    student = student_r.scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    semesters_r = await session.execute(
        select(models.SemesterGrade)
        .where(models.SemesterGrade.student_id == student_id)
        .order_by(models.SemesterGrade.semester.asc())
    )
    from collections import defaultdict
    sem_map = defaultdict(list)
    for row in semesters_r.scalars().all():
        sem_map[row.semester].append({"course_id": row.course_id, "grade": row.grade, "credits": row.credits_earned})
    semesters = [{"semester": sem, "subjects": subjs} for sem, subjs in sorted(sem_map.items())]
    attempts_r = await session.execute(
        select(models.QuizAttempt)
        .where(models.QuizAttempt.student_id == student_id, models.QuizAttempt.status == "submitted")
        .order_by(models.QuizAttempt.end_time.desc())
    )
    attempts = attempts_r.scalars().all()
    marks_r = await session.execute(
        select(models.MarkSubmissionEntry, models.MarkSubmission)
        .join(models.MarkSubmission, models.MarkSubmission.id == models.MarkSubmissionEntry.submission_id)
        .where(models.MarkSubmissionEntry.student_id == student_id)
    )
    marks_rows = marks_r.all()
    mid_marks = [{
        "course_id": sub.subject_code, "exam_type": sub.exam_type,
        "marks_obtained": entry.marks_obtained, "max_marks": sub.max_marks
    } for entry, sub in marks_rows]
    return {
        "student": {"id": student.id, "name": student.name, "email": student.email, **(student.profile_data or {})},
        "semesters": semesters,
        "quiz_attempts": [{"quiz_id": a.quiz_id, "score": a.final_score, "percentage": a.final_score,
                           "submitted_at": a.end_time.isoformat() if a.end_time else ""} for a in attempts[:10]],
        "mid_marks": mid_marks
    }


@router.get("/student/drives")
async def get_eligible_student_drives(user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    service = StudentService(session)
    return await service.get_eligible_drives(user)


@router.post("/student/drives/{drive_id}/apply")
async def apply_for_placement_drive(drive_id: str, user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    service = StudentService(session)
    application_id = await service.apply_for_drive(drive_id, user)
    return {"message": "Successfully applied to drive", "application_id": str(application_id)}


@router.delete("/student/drives/{drive_id}/withdraw")
async def withdraw_application(drive_id: str, user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    service = StudentService(session)
    await service.withdraw_from_drive(drive_id, user)
    return {"message": "Application withdrawn successfully"}


@router.get("/student/applications")
async def get_student_application_history(user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.PlacementApplication).where(models.PlacementApplication.student_id == user["id"])
    res = await session.execute(stmt)
    return res.scalars().all()


@router.get("/student/alumni-jobs")
async def browse_alumni_jobs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.AlumniJobPosting, models.User.name.label("alumni_name")).join(
        models.User, models.User.id == models.AlumniJobPosting.alumni_id
    ).where(
        models.AlumniJobPosting.college_id == user["college_id"],
        models.AlumniJobPosting.status == "active"
    )
    results = (await session.execute(stmt.order_by(models.AlumniJobPosting.created_at.desc()).offset(offset).limit(limit))).all()
    
    return [{"job": r[0], "posted_by": r[1]} for r in results]


@router.get("/student/alumni-mentors")
async def browse_available_mentors(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.User.id, models.User.name, models.User.profile_data).where(
        models.User.college_id == user["college_id"],
        models.User.role == "alumni",
        models.User.is_deleted == False
    )
    # Applying limits after Python-side filtering because mentoring preference is inside JSON
    # Alternatively limit the fetch bounds
    alumni = (await session.execute(stmt.order_by(models.User.name).offset(offset).limit(limit * 3))).all()
    # Filter JSON for mentoring opt-in
    mentors = []
    for a in alumni:
        pd = a.profile_data or {}
        prefs = pd.get("contact_preferences", {})
        # If they opted into mentoring
        if type(prefs) == dict and prefs.get("Mentoring Students", False):
             mentors.append({"id": a.id, "name": a.name, "expertise": pd.get("expertise_areas", [])})
             
    # Enforce precise limit
    return mentors[:limit]


@router.post("/student/alumni-mentorship/request")
async def request_mentorship(
    alumni_id: str = Body(..., embed=True),
    focus_area: str = Body(..., embed=True),
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db)
):
    m = models.AlumniMentorship(
        college_id=user["college_id"],
        student_id=user["id"],
        alumni_id=alumni_id,
        focus_area=focus_area
    )
    session.add(m)
    await session.commit()
    return {"message": "Mentorship requested"}


@router.get("/student/scholarships")
async def get_available_scholarships(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_role("student")), 
    session: AsyncSession = Depends(get_db)):
    """List scholarships available at the student's college."""
    res = await session.execute(
        select(models.Scholarship).where(
            models.Scholarship.college_id == user["college_id"],
            models.Scholarship.is_deleted == False
        ).order_by(models.Scholarship.created_at.desc()).offset(offset).limit(limit)
    )
    return res.scalars().all()


@router.post("/student/scholarships/apply")
async def apply_scholarship(req: ScholarshipApplyRequest, user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    # Check if already applied
    existing = await session.execute(
        select(models.ScholarshipApplication).where(
            models.ScholarshipApplication.student_id == user["id"],
            models.ScholarshipApplication.scholarship_id == req.scholarship_id
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Already applied for this scholarship")
    app_row = models.ScholarshipApplication(
        college_id=user["college_id"],
        student_id=user["id"],
        scholarship_id=req.scholarship_id,
        status="submitted"
    )
    session.add(app_row)
    await session.commit()
    return {"message": "Scholarship application submitted", "id": app_row.id}


@router.get("/student/scholarships/my-applications")
async def get_my_scholarship_apps(user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    res = await session.execute(
        select(models.ScholarshipApplication).where(
            models.ScholarshipApplication.student_id == user["id"]
        )
    )
    return res.scalars().all()


@router.get("/student/study-materials")
async def get_student_materials(subject_code: Optional[str] = None, user: dict = Depends(require_role("student")), session: AsyncSession = Depends(get_db)):
    query = select(models.StudyMaterial).where(
        models.StudyMaterial.college_id == user["college_id"],
        models.StudyMaterial.status == 'expert_approved'
    )
    if subject_code:
        query = query.where(models.StudyMaterial.subject_code == subject_code)
        
    res = await session.execute(query.order_by(models.StudyMaterial.created_at.desc()))
    return res.scalars().all()
