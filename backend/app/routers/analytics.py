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

@router.get("/analytics/student/{student_id}")
async def student_analytics(student_id: str, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if user["role"] == "student" and user["id"] != student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    attempts_r = await session.execute(
        select(models.QuizAttempt)
        .where(models.QuizAttempt.student_id == student_id, models.QuizAttempt.status == "submitted")
        .order_by(models.QuizAttempt.end_time.asc())
    )
    attempts = attempts_r.scalars().all()
    semesters_r = await session.execute(
        select(models.SemesterGrade)
        .where(models.SemesterGrade.student_id == student_id)
        .order_by(models.SemesterGrade.semester.asc())
    )
    sem_rows = semesters_r.scalars().all()
    total_quizzes = len(attempts)
    avg_score = round(sum(a.final_score or 0 for a in attempts) / total_quizzes, 1) if total_quizzes > 0 else 0
    best_score = max((a.final_score or 0 for a in attempts), default=0)
    quiz_trend = [{
        "date": a.end_time.isoformat() if a.end_time else "",
        "score": a.final_score or 0, "quiz": a.quiz_id
    } for a in attempts[-10:]]
    from collections import defaultdict
    sem_map = defaultdict(list)
    for row in sem_rows:
        sem_map[row.semester].append({"course_id": row.course_id, "grade": row.grade, "credits": row.credits_earned})
    semesters = [{"semester": sem, "subjects": subjs} for sem, subjs in sorted(sem_map.items())]
    return {
        "total_quizzes": total_quizzes, "avg_score": avg_score, "best_score": best_score,
        "latest_cgpa": 0, "quiz_trend": quiz_trend, "subject_averages": {},
        "semesters": semesters
    }


@router.get("/analytics/teacher/class-results")
async def class_results_analytics(user: dict = Depends(require_role("teacher", "hod", "exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    # Fetch faculty assignments from the dedicated table
    stmt = select(models.FacultyAssignment)
    if user["role"] == "teacher":
        stmt = stmt.where(models.FacultyAssignment.teacher_id == user["id"])
    result = await session.execute(stmt)
    assignments = result.scalars().all()

    assigned_classes = []
    class_details: dict = {}
    for a in assignments:
        class_key = f"{a.subject_code}_{a.batch}_{a.section}"
        if any(c.get("class_key") == class_key for c in assigned_classes):
            continue
        assigned_classes.append({
            "id": a.id, "class_key": class_key,
            "section": f"{a.department} {a.batch} {a.section}",
            "department": a.department, "subject": a.subject_name,
            "batch": str(a.batch), "totalStudents": 0
        })
        class_details[class_key] = {"totalStudents": 0, "department": a.department,
                                    "batch": str(a.batch), "section": str(a.section)}

    # Quiz results from QuizAttempt
    attempts_r = await session.execute(
        select(models.QuizAttempt).where(models.QuizAttempt.status == "submitted")
    )
    all_attempts = attempts_r.scalars().all()
    quiz_results: dict = {}
    for at in all_attempts:
        quiz_results.setdefault(at.quiz_id, {"completed": 0, "total_score": 0.0, "passed": 0})
        quiz_results[at.quiz_id]["completed"] += 1
        quiz_results[at.quiz_id]["total_score"] += at.final_score or 0
        if (at.final_score or 0) >= 40:
            quiz_results[at.quiz_id]["passed"] += 1

    final_quiz_results = {}
    for qid, stat in quiz_results.items():
        avg = round(stat["total_score"] / stat["completed"], 1) if stat["completed"] > 0 else 0
        final_quiz_results[qid] = [{
            "id": qid, "completed": stat["completed"], "avgScore": avg,
            "passRate": round((stat["passed"] / stat["completed"]) * 100) if stat["completed"] > 0 else 0,
            "topPerformers": []
        }]

    return {"assignedClasses": assigned_classes, "quizResults": final_quiz_results, "midMarks": {}}


@router.get("/analytics/teacher/quiz-results/{quiz_id}")
async def get_quiz_detailed_analytics(quiz_id: str, department: str = "", batch: str = "", section: str = "", user: dict = Depends(require_role("teacher", "hod", "exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.User).where(
        models.User.role == "student",
        models.User.college_id == user["college_id"]
    )
    result = await session.execute(stmt)
    students = result.scalars().all()
    attempts_r = await session.execute(
        select(models.QuizAttempt).where(models.QuizAttempt.quiz_id == quiz_id)
    )
    attempts_map = {a.student_id: a for a in attempts_r.scalars().all()}
    results = []
    for s in students:
        attempt = attempts_map.get(s.id)
        if attempt:
            pct = attempt.final_score or 0
            raw = attempt.status
            time_elapsed = 0
            if attempt.start_time and attempt.end_time:
                time_elapsed = max(0, int((attempt.end_time - attempt.start_time).total_seconds() / 60))
            results.append({
                "id": s.id, "name": s.name,
                "rollNo": (s.profile_data or {}).get("college_id", s.id),
                "scoreValue": pct, "score": f"{pct}%",
                "timeTaken": f"{time_elapsed} mins",
                "status": "In Progress" if raw == "in_progress" else ("Pass" if pct >= 40 else "Fail"),
                "raw_status": raw
            })
        else:
            results.append({
                "id": s.id, "name": s.name,
                "rollNo": (s.profile_data or {}).get("college_id", s.id),
                "scoreValue": -1, "score": "-", "timeTaken": "-",
                "status": "Not Attempted", "raw_status": "none"
            })
    results.sort(key=lambda x: str(x["rollNo"]))
    return results
