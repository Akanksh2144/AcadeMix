from app.core.limiter import limiter
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


@router.post("/attempts/{attempt_id}/answer")
@limiter.limit("60/minute")
async def submit_answer(attempt_id: str, req: AnswerSubmit, request: Request, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(models.QuizAttempt).where(
            models.QuizAttempt.id == attempt_id,
            models.QuizAttempt.student_id == user["id"]
        )
    )
    attempt = result.scalars().first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Attempt already submitted")

    # Map index to actual Question UUID
    qr = await session.execute(
        select(models.Question.id)
        .where(models.Question.quiz_id == attempt.quiz_id)
        .order_by(models.Question.id)
    )
    q_ids = qr.scalars().all()
    if req.question_index < 0 or req.question_index >= len(q_ids):
        raise HTTPException(status_code=400, detail="Invalid question index")
    actual_question_id = q_ids[req.question_index]

    # Save answer as a QuizAnswer row
    existing_ans = await session.execute(
        select(models.QuizAnswer).where(
            models.QuizAnswer.attempt_id == attempt_id,
            models.QuizAnswer.question_id == actual_question_id
        )
    )
    ans_row = existing_ans.scalars().first()
    if ans_row:
        ans_row.code_submitted = str(req.answer) if req.answer is not None else None
    else:
        ans_row = models.QuizAnswer(
            attempt_id=attempt_id,
            question_id=actual_question_id,
            code_submitted=str(req.answer) if req.answer is not None else None,
        )
        session.add(ans_row)
    # Track first interaction time
    if not attempt.start_time:
        attempt.start_time = datetime.now(timezone.utc)
    await session.commit()
    return {"message": "Answer saved", "question_index": req.question_index}


@router.post("/attempts/{attempt_id}/violation")
async def log_violation(attempt_id: str, req: ViolationReport = ViolationReport(), user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.QuizAttempt).where(models.QuizAttempt.id == attempt_id))
    attempt = result.scalars().first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    violation = models.ProctoringViolation(
        attempt_id=attempt_id,
        violation_type=req.violation_type,
        suspicion_score=1.0,
    )
    session.add(violation)
    await log_audit(session, user["id"], "proctoring_violation", "create", {"attempt_id": attempt_id, "type": req.violation_type})
    await session.commit()
    # Count total violations for this attempt
    count_r = await session.execute(
        select(models.ProctoringViolation).where(models.ProctoringViolation.attempt_id == attempt_id)
    )
    total = len(count_r.scalars().all())
    
    return {"message": "Violation logged", "total_violations": total}


@router.post("/attempts/{attempt_id}/submit")
@limiter.limit("3/minute")
async def submit_attempt(attempt_id: str, request: Request, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(models.QuizAttempt).where(
            models.QuizAttempt.id == attempt_id,
            models.QuizAttempt.student_id == user["id"]
        )
    )
    attempt = result.scalars().first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status == "submitted":
        raise HTTPException(status_code=400, detail="Already submitted")

    quiz_r = await session.execute(select(models.Quiz).where(models.Quiz.id == attempt.quiz_id))
    quiz = quiz_r.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions_r = await session.execute(select(models.Question).where(models.Question.quiz_id == quiz.id).order_by(models.Question.id))
    questions = questions_r.scalars().all()

    answers_r = await session.execute(select(models.QuizAnswer).where(models.QuizAnswer.attempt_id == attempt_id))
    answers_map = {a.question_id: a for a in answers_r.scalars().all()}

    score = 0.0
    results = []
    total_marks = sum(q.marks for q in questions)

    for i, q in enumerate(questions):
        content = q.content or {}
        student_answer = None
        ans_row = answers_map.get(q.id)
        if ans_row:
            student_answer = ans_row.code_submitted

        is_correct = False
        marks_awarded = 0.0
        q_type = q.type

        if q_type in ("mcq", "mcq-single", "boolean"):
            correct_ans = content.get("correctAnswer") or content.get("correct_answer")
            if student_answer is not None and student_answer == str(correct_ans):
                is_correct = True
                marks_awarded = q.marks
        elif q_type in ("multiple", "mcq-multiple"):
            import json
            correct_set = set(content.get("correctAnswers") or content.get("correct_answers", []))
            try:
                sel = json.loads(student_answer) if student_answer else []
            except Exception:
                sel = []
            if correct_set == set(sel):
                is_correct = True
                marks_awarded = q.marks
        elif q_type == "short":
            expected = str(content.get("expectedAnswer") or content.get("expected_answer", "")).strip()
            if student_answer and expected and student_answer.strip().lower() == expected.lower():
                is_correct = True
                marks_awarded = q.marks
            elif student_answer:
                marks_awarded = round(q.marks * 0.5)
        elif q_type == "coding":
            if student_answer and str(student_answer).strip():
                marks_awarded = round(q.marks * 0.5)

        score += marks_awarded

        # Update the answer row with grading
        if ans_row:
            ans_row.is_correct = is_correct
            ans_row.marks_awarded = marks_awarded

        results.append({
            "question_index": i, "type": q_type,
            "student_answer": student_answer, "is_correct": is_correct,
            "marks_awarded": marks_awarded, "max_marks": q.marks
        })

    percentage = round((score / total_marks) * 100, 1) if total_marks > 0 else 0
    attempt.status = "submitted"
    attempt.final_score = percentage
    attempt.end_time = datetime.now(timezone.utc)
    await session.commit()

    return {
        "id": attempt.id, "quiz_id": attempt.quiz_id, "student_id": attempt.student_id,
        "status": attempt.status, "final_score": attempt.final_score,
        "percentage": percentage, "results": results,
        "submitted_at": attempt.end_time.isoformat()
    }


@router.get("/attempts/{attempt_id}/result")
async def get_attempt_result(attempt_id: str, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(models.QuizAttempt).join(models.Quiz, models.Quiz.id == models.QuizAttempt.quiz_id)
        .where(models.QuizAttempt.id == attempt_id, models.Quiz.college_id == user["college_id"])
    )
    attempt = result.scalars().first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if user["role"] == "student" and attempt.student_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not your attempt")
    return {
        "id": attempt.id, "quiz_id": attempt.quiz_id, "student_id": attempt.student_id,
        "status": attempt.status, "final_score": attempt.final_score,
        "start_time": attempt.start_time.isoformat() if attempt.start_time else None,
        "end_time": attempt.end_time.isoformat() if attempt.end_time else None,
    }


@router.get("/attempts")
async def list_attempts(quiz_id: Optional[str] = None, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    stmt = select(models.QuizAttempt).where(models.QuizAttempt.status == "submitted")
    if user["role"] == "student":
        stmt = stmt.where(models.QuizAttempt.student_id == user["id"])
    if quiz_id:
        stmt = stmt.where(models.QuizAttempt.quiz_id == quiz_id)
    result = await session.execute(stmt.order_by(models.QuizAttempt.end_time.desc()))
    attempts = result.scalars().all()
    return [{
        "id": a.id, "quiz_id": a.quiz_id, "student_id": a.student_id,
        "status": a.status, "final_score": a.final_score,
        "submitted_at": a.end_time.isoformat() if a.end_time else None
    } for a in attempts]
