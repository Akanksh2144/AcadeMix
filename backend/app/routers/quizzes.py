from app.core.config import limiter
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from database import get_db
from app.core.security import get_current_user
from app.core.security import require_role
from app.core.deps import require_permission
from app import models
import app.schemas as server_schemas
from app.schemas import *

router = APIRouter()

@router.get("/quizzes")
async def list_quizzes(status: Optional[str] = None, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    stmt = select(models.Quiz).where(models.Quiz.college_id == user["college_id"])
    if status:
        stmt = stmt.where(models.Quiz.type == status)
    if user["role"] == "teacher":
        stmt = stmt.where(models.Quiz.faculty_id == user["id"])
    result = await session.execute(stmt.order_by(models.Quiz.created_at.desc()))
    quizzes = result.scalars().all()
    quiz_ids = [q.id for q in quizzes]
    
    questions_map = {qid: [] for qid in quiz_ids}
    if quiz_ids:
        qr = await session.execute(select(models.Question).where(models.Question.quiz_id.in_(quiz_ids)))
        all_questions = qr.scalars().all()
        for qq in all_questions:
            questions_map[qq.quiz_id].append(qq)
            
    out = []
    for q in quizzes:
        questions = questions_map[q.id]
        q_list = []
        for question in questions:
            qd = {"id": question.id, "type": question.type, "marks": question.marks, **(question.content or {})}
            if user["role"] == "student":
                qd.pop("correct_answer", None)
                qd.pop("correct_answers", None)
                qd.pop("keywords", None)
            q_list.append(qd)
        out.append({
            "id": q.id, "title": q.title, "subject": q.type,
            "duration_mins": q.duration_minutes, "created_at": q.created_at.isoformat() if q.created_at else None,
            "faculty_id": q.faculty_id, "college_id": q.college_id,
            "questions": q_list,
        })
    return out


@router.post("/quizzes")
async def create_quiz(req: QuizCreate, user: dict = Depends(require_permission("quizzes", "create")), session: AsyncSession = Depends(get_db)):
    new_quiz = models.Quiz(
        college_id=user["college_id"],
        faculty_id=user["id"],
        title=req.title,
        duration_minutes=req.duration_mins,
        type=req.subject,
    )
    session.add(new_quiz)
    await session.flush()  # get generated ID before adding questions

    for q in req.questions:
        question = models.Question(
            quiz_id=new_quiz.id,
            type=q.get("type", "mcq"),
            marks=q.get("marks", 1),
            points=q.get("points", 1),
            content=q,  # store full question dict as JSONB
        )
        session.add(question)

    await log_audit(session, user["id"], "quiz", "create", {"title": req.title})
    await session.commit()
    await session.refresh(new_quiz)
    return {"id": new_quiz.id, "title": new_quiz.title, "subject": new_quiz.type, "duration_mins": new_quiz.duration_minutes}


@router.get("/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id, models.Quiz.college_id == user["college_id"]))
    q = result.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not found")
    qr = await session.execute(select(models.Question).where(models.Question.quiz_id == q.id).order_by(models.Question.id))
    questions = qr.scalars().all()
    q_list = []
    for question in questions:
        qd = {"id": question.id, "type": question.type, "marks": question.marks, **(question.content or {})}
        if user["role"] == "student":
            qd.pop("correct_answer", None)
            qd.pop("correct_answers", None)
            qd.pop("keywords", None)
        q_list.append(qd)
    return {
        "id": q.id, "title": q.title, "subject": q.type,
        "duration_mins": q.duration_minutes, "college_id": q.college_id,
        "faculty_id": q.faculty_id, "questions": q_list,
        "created_at": q.created_at.isoformat() if q.created_at else None,
    }


@router.get("/quizzes/live/{quiz_id}")
async def live_quiz_monitor(quiz_id: str, user: dict = Depends(require_role("teacher", "admin", "hod", "exam_cell")), session: AsyncSession = Depends(get_db)):
    quiz_r = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id, models.Quiz.college_id == user["college_id"]))
    q = quiz_r.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not found")
    attempts_r = await session.execute(
        select(models.QuizAttempt).where(models.QuizAttempt.quiz_id == quiz_id)
    )
    attempts = attempts_r.scalars().all()
    student_ids = [a.student_id for a in attempts]
    
    # Pre-fetch answers for efficiency
    answers_by_attempt = {}
    if attempts:
        ans_r = await session.execute(select(models.QuizAnswer).where(models.QuizAnswer.attempt_id.in_([a.id for a in attempts])))
        for ans in ans_r.scalars().all():
            answers_by_attempt.setdefault(ans.attempt_id, []).append(ans)
            
    # Pre-fetch total questions
    q_questions_r = await session.execute(select(models.Question).where(models.Question.quiz_id == quiz_id))
    total_questions = len(q_questions_r.scalars().all())

    students_r = await session.execute(
        select(models.User).where(
            models.User.id.in_(student_ids),
            models.User.college_id == user["college_id"]
        )
    )
    students_dict = {s.id: s for s in students_r.scalars().all()}
    live_data = []
    for a in attempts:
        if not a.start_time:
            continue
        student = students_dict.get(a.student_id)
        if a.status == "in_progress":
            td = datetime.now(timezone.utc) - a.start_time.replace(tzinfo=timezone.utc)
            time_elapsed = int(td.total_seconds() / 60)
            submit_time_str = None
        else:
            end = a.end_time or a.start_time
            td = end.replace(tzinfo=timezone.utc) - a.start_time.replace(tzinfo=timezone.utc)
            time_elapsed = int(td.total_seconds() / 60)
            submit_time_str = end.strftime("%I:%M %p")
            
        answers = answers_by_attempt.get(a.id, [])
        progress = len(answers)
        
        live_data.append({
            "id": a.id,
            "name": student.name if student else "Unknown",
            "rollNo": (student.profile_data or {}).get("college_id", a.student_id) if student else a.student_id,
            "status": "active" if a.status == "in_progress" else "submitted",
            "progress": progress, "totalQuestions": total_questions,
            "violations": 0, "timeElapsed": max(0, time_elapsed),
            "startTime": a.start_time.strftime("%I:%M %p"),
            "submitTime": submit_time_str
        })
    return live_data


@router.patch("/quizzes/{quiz_id}")
async def update_quiz(quiz_id: str, updates: dict, user: dict = Depends(require_role("teacher", "admin")), session: AsyncSession = Depends(get_db)):
    result_r = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id, models.Quiz.college_id == user["college_id"]))
    q = result_r.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if "title" in updates: q.title = updates["title"]
    if "subject" in updates: q.type = updates["subject"]
    if "status" in updates: q.status = updates["status"]
    if "duration_mins" in updates: q.duration_minutes = updates["duration_mins"]
    if "total_marks" in updates: q.total_marks = updates["total_marks"]
    if "questions" in updates:
        q.questions = updates["questions"]
        q.total_marks = sum(qu.get("marks", 0) for qu in updates["questions"])
    await session.commit()
    return {"id": q.id, "title": q.title, "status": q.status, "subject": q.type}


@router.delete("/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: str, user: dict = Depends(require_permission("quizzes", "delete")), session: AsyncSession = Depends(get_db)):
    result_r = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id, models.Quiz.college_id == user["college_id"]))
    quiz = result_r.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    await log_audit(session, user["id"], "quiz", "delete", {"quiz_id": quiz.id, "title": quiz.title})
    await session.delete(quiz)
    await session.commit()
    return {"message": "Quiz deleted"}


@router.post("/quizzes/{quiz_id}/publish")
async def publish_quiz(quiz_id: str, user: dict = Depends(require_permission("quizzes", "publish")), session: AsyncSession = Depends(get_db)):
    result_r = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id, models.Quiz.college_id == user["college_id"]))
    quiz = result_r.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    quiz.status = "active"
    await log_audit(session, user["id"], "quiz", "publish", {"quiz_id": quiz.id, "title": quiz.title})
    await session.commit()
    return {"message": "Quiz published"}


@router.post("/quizzes/{quiz_id}/extend-time")
async def extend_quiz_time(quiz_id: str, body: dict = {}, user: dict = Depends(require_role("teacher", "admin", "hod")), session: AsyncSession = Depends(get_db)):
    mins = int(body.get("mins", 10)) if body else 10
    if mins < 1 or mins > 300:
        raise HTTPException(status_code=400, detail="Minutes must be between 1 and 300")
    result_r = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id))
    quiz = result_r.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    quiz.duration_minutes = (quiz.duration_minutes or 60) + mins
    await session.commit()
    return {"message": f"Extended by {mins} mins. New duration: {quiz.duration_minutes} mins", "duration_mins": quiz.duration_minutes}


@router.post("/quizzes/{quiz_id}/end")
async def end_quiz_now(quiz_id: str, user: dict = Depends(require_role("teacher", "admin", "hod")), session: AsyncSession = Depends(get_db)):
    quiz_r = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id))
    quiz = quiz_r.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    # Force-submit all in-progress attempts
    atts_r = await session.execute(
        select(models.QuizAttempt).where(
            models.QuizAttempt.quiz_id == quiz_id,
            models.QuizAttempt.status == "in_progress"
        )
    )
    force_submitted = 0
    for attempt in atts_r.scalars().all():
        attempt.status = "submitted"
        attempt.end_time = datetime.now(timezone.utc)
        attempt.final_score = 0
        force_submitted += 1
    quiz.status = "ended"
    await session.commit()
    return {"message": f"Quiz ended. {force_submitted} attempts force-submitted.", "force_submitted": force_submitted}


@router.post("/quizzes/{quiz_id}/start")
@limiter.limit("5/minute")
async def start_attempt(quiz_id: str, request: Request, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id))
    quiz = result.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Check for existing submitted attempt (no reattempt)
    existing_r = await session.execute(
        select(models.QuizAttempt).where(
            models.QuizAttempt.quiz_id == quiz_id,
            models.QuizAttempt.student_id == user["id"],
            models.QuizAttempt.status == "submitted"
        )
    )
    if existing_r.scalars().first():
        raise HTTPException(status_code=400, detail="Already attempted this quiz")

    # Return existing in-progress attempt
    prog_r = await session.execute(
        select(models.QuizAttempt).where(
            models.QuizAttempt.quiz_id == quiz_id,
            models.QuizAttempt.student_id == user["id"],
            models.QuizAttempt.status == "in_progress"
        )
    )
    in_progress = prog_r.scalars().first()
    if in_progress:
        return {"id": in_progress.id, "quiz_id": in_progress.quiz_id, "student_id": in_progress.student_id,
                "status": in_progress.status, "start_time": in_progress.start_time.isoformat() if in_progress.start_time else None}

    attempt = models.QuizAttempt(
        quiz_id=quiz_id,
        student_id=user["id"],
        status="in_progress",
        start_time=datetime.now(timezone.utc),
        final_score=0,
    )
    session.add(attempt)
    await session.commit()
    await session.refresh(attempt)
    return {"id": attempt.id, "quiz_id": attempt.quiz_id, "student_id": attempt.student_id,
            "status": attempt.status, "start_time": attempt.start_time.isoformat()}

@router.post("/quizzes/attempts/{attempt_id}/telemetry/violation")
async def log_telemetry_violation(attempt_id: str, payload: dict = {}, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(models.QuizAttempt).where(
            models.QuizAttempt.id == attempt_id, 
            models.QuizAttempt.student_id == user["id"],
            models.QuizAttempt.status == "in_progress"
        )
    )
    attempt = result.scalars().first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Active attempt not found")
    
    # Increment per-quiz cheat strike
    attempt.telemetry_strikes = (attempt.telemetry_strikes or 0) + 1
    await session.commit()
    
    return {"message": "Violation logged securely", "strikes": attempt.telemetry_strikes}
