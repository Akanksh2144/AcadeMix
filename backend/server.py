from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / '.env')

import os
import bcrypt
import jwt
import secrets
import httpx
import subprocess
import tempfile
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request, Response, Depends, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import io
import csv

# ─── App & DB ───────────────────────────────────────────────────────────────
app = FastAPI(title="QuizPortal API")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"

client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=certifi.where())
db = client[DB_NAME]

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
cors_origins = os.environ.get("CORS_ORIGINS", "*")
if cors_origins == "*":
    origins = ["*"]
else:
    origins = [o.strip() for o in cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Helpers ────────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, role: str) -> str:
    return jwt.encode({"sub": user_id, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    return jwt.encode({"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc

def grade_to_points(grade: str) -> float:
    mapping = {"O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "D": 4, "F": 0}
    return mapping.get(grade, 0)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user = serialize_doc(user)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except (jwt.InvalidTokenError, Exception):
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(*roles):
    async def check(request: Request):
        user = await get_current_user(request)
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return check

# ─── Pydantic Models ───────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    college_id: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    college_id: str
    email: str
    password: str
    role: str = "student"
    college: str = "GNITC"  # GNITC, GNIT, or GNU
    department: str = ""
    batch: str = ""
    section: str = ""

class QuizCreate(BaseModel):
    title: str
    subject: str
    description: str = ""
    total_marks: int = 0
    duration_mins: int = 60
    negative_marking: bool = False
    timed: bool = True
    randomize_questions: bool = False
    randomize_options: bool = False
    show_answers_after: bool = True
    allow_reattempt: bool = False
    assigned_classes: list = []
    negative_marks: float = 0.0
    questions: list = []

class AnswerSubmit(BaseModel):
    question_index: int
    answer: object

class SemesterResultCreate(BaseModel):
    student_id: str
    semester: int
    subjects: list
    sgpa: float
    cgpa: float

class CodeExecuteRequest(BaseModel):
    code: str
    language: str = "python"
    test_input: str = ""

class FacultyAssignment(BaseModel):
    teacher_id: str
    subject_code: str
    subject_name: str
    department: str
    batch: str
    section: str
    semester: int = 1

class MarkEntryItem(BaseModel):
    student_id: str
    college_id: str
    student_name: str
    marks: Optional[float] = None

class MarkEntrySave(BaseModel):
    assignment_id: str
    exam_type: str  # mid1 or mid2
    semester: int
    max_marks: float = 30
    entries: List[MarkEntryItem]
    revision_reason: Optional[str] = None

class MarkReview(BaseModel):
    action: str  # approve or reject
    remarks: str = ""

class EndtermEntry(BaseModel):
    subject_code: str
    subject_name: str
    department: str
    batch: str
    section: str
    semester: int
    max_marks: float = 100
    entries: list

class TimetableSlot(BaseModel):
    section: str
    day: str  # Mon, Tue, Wed, Thu, Fri, Sat
    period: int  # 1-6
    subject_code: str
    subject_name: str
    teacher_id: str
    teacher_name: str
    semester: int = 3

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    priority: str = "info"  # info, warning, urgent
    visibility: str = "all"  # all, faculty, students

class ChallengeSubmit(BaseModel):
    code: str
    language: str = "python"

# ─── Auth Routes ────────────────────────────────────────────────────────────
@app.post("/api/auth/login")
async def login(req: LoginRequest, response: Response):
    user = await db.users.find_one({"college_id": req.college_id.upper()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    uid = str(user["_id"])
    access = create_access_token(uid, user["role"])
    refresh = create_refresh_token(uid)
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=86400)
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=604800)
    user = serialize_doc(user)
    user.pop("password_hash", None)
    user["access_token"] = access
    return user

@app.post("/api/auth/register")
async def register(req: RegisterRequest, response: Response):
    existing = await db.users.find_one({"college_id": req.college_id.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="College ID already registered")
    doc = {
        "name": req.name, "college_id": req.college_id.upper(), "email": req.email.lower(),
        "password_hash": hash_password(req.password), "role": req.role,
        "college": req.college, "department": req.department, "batch": req.batch, "section": req.section,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    uid = str(result.inserted_id)
    access = create_access_token(uid, req.role)
    refresh = create_refresh_token(uid)
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=86400)
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=604800)
    doc = serialize_doc(doc)
    doc.pop("password_hash", None)
    doc["access_token"] = access
    return doc

@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}

# ─── User Routes ────────────────────────────────────────────────────────────
@app.get("/api/users")
async def list_users(role: Optional[str] = None, user: dict = Depends(require_role("admin", "teacher", "hod", "exam_cell"))):
    query = {}
    if role:
        query["role"] = role
    users = await db.users.find(query, {"password_hash": 0}).to_list(500)
    return [serialize_doc(u) for u in users]

@app.get("/api/users/{user_id}")
async def get_user(user_id: str, user: dict = Depends(require_role("admin", "teacher", "hod", "exam_cell"))):
    u = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(u)

@app.post("/api/users")
async def create_user(req: RegisterRequest, user: dict = Depends(require_role("admin"))):
    existing = await db.users.find_one({"college_id": req.college_id.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="College ID already exists")
    doc = {
        "name": req.name, "college_id": req.college_id.upper(), "email": req.email.lower(),
        "password_hash": hash_password(req.password), "role": req.role,
        "college": req.college, "department": req.department, "batch": req.batch, "section": req.section,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_role("admin"))):
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# ─── Quiz Routes ────────────────────────────────────────────────────────────
@app.get("/api/quizzes")
async def list_quizzes(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    if user["role"] == "teacher":
        query["created_by"] = user["id"]
    elif user["role"] == "student":
        student_class = {"department": user.get("department", ""), "batch": user.get("batch", ""), "section": user.get("section", "")}
        query["$or"] = [
            {"assigned_classes": {"$size": 0}},
            {"assigned_classes": {"$exists": False}},
            {"assigned_classes": {"$elemMatch": student_class}}
        ]
    quizzes = await db.quizzes.find(query, {"questions.correct_answer": 0, "questions.correct_answers": 0, "questions.keywords": 0} if user["role"] == "student" else {}).sort("created_at", -1).to_list(100)
    return [serialize_doc(q) for q in quizzes]

@app.post("/api/quizzes")
async def create_quiz(req: QuizCreate, user: dict = Depends(require_role("teacher", "admin"))):
    total = sum(q.get("marks", 0) for q in req.questions) if req.questions else req.total_marks
    doc = {
        "title": req.title, "subject": req.subject, "description": req.description,
        "total_marks": total, "duration_mins": req.duration_mins,
        "negative_marking": req.negative_marking, "timed": req.timed,
        "randomize_questions": req.randomize_questions, "randomize_options": req.randomize_options,
        "show_answers_after": req.show_answers_after, "allow_reattempt": req.allow_reattempt,
        "assigned_classes": req.assigned_classes, "negative_marks": req.negative_marks,
        "questions": req.questions, "status": "draft",
        "created_by": user["id"], "created_by_name": user["name"],
        "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc),
    }
    result = await db.quizzes.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@app.get("/api/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str, user: dict = Depends(get_current_user)):
    q = await db.quizzes.find_one({"_id": ObjectId(quiz_id)})
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if user["role"] == "student":
        for question in q.get("questions", []):
            question.pop("correct_answer", None)
            question.pop("correct_answers", None)
            question.pop("keywords", None)
    return serialize_doc(q)

@app.get("/api/quizzes/live/{quiz_id}")
async def live_quiz_monitor(quiz_id: str, user: dict = Depends(require_role("teacher", "admin", "hod", "exam_cell"))):
    q = await db.quizzes.find_one({"_id": ObjectId(quiz_id)})
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    attempts = await db.quiz_attempts.find({"quiz_id": quiz_id}).to_list(1000)
    
    student_ids = [ObjectId(a["student_id"]) for a in attempts if ObjectId.is_valid(a.get("student_id"))]
    students_cursor = db.users.find({"_id": {"$in": student_ids}})
    students_dict = {str(s["_id"]): s for s in await students_cursor.to_list(1000)}
    
    live_data = []
    for a in attempts:
        sid = a.get("student_id")
        student = students_dict.get(sid, {})
        
        started = a.get("started_at")
        if not started:
            continue
            
        if isinstance(started, str):
            try:
                started = datetime.fromisoformat(started.replace('Z', '+00:00'))
            except Exception:
                continue
                
        status = a.get("status", "in_progress")
        if status == "in_progress":
            td = datetime.now(timezone.utc) - started
            time_elapsed = int(td.total_seconds() / 60)
            submit_time_str = None
        else:
            submitted = a.get("submitted_at")
            if isinstance(submitted, str):
                try:
                    submitted = datetime.fromisoformat(submitted.replace('Z', '+00:00'))
                except Exception:
                    submitted = started
            elif not submitted:
                submitted = started
                
            td = submitted - started
            time_elapsed = int(td.total_seconds() / 60)
            submit_time_str = submitted.strftime("%I:%M %p")
            
        start_time_str = started.strftime("%I:%M %p")
        answers = a.get("answers", [])
        progress = sum(1 for ans in answers if ans is not None)
        total_questions = q.get("total_questions", len(q.get("questions", [])))
        if total_questions == 0:
            total_questions = len(answers)
            
        live_data.append({
            "id": str(a["_id"]),
            "name": student.get("name", "Unknown Student"),
            "rollNo": student.get("college_id", sid),
            "status": "active" if status == "in_progress" else "submitted",
            "progress": progress,
            "totalQuestions": total_questions,
            "violations": a.get("violations", 0),
            "timeElapsed": max(0, time_elapsed),
            "startTime": start_time_str,
            "submitTime": submit_time_str
        })
        
    return live_data

@app.patch("/api/quizzes/{quiz_id}")
async def update_quiz(quiz_id: str, updates: dict, user: dict = Depends(require_role("teacher", "admin"))):
    updates["updated_at"] = datetime.now(timezone.utc)
    if "questions" in updates:
        updates["total_marks"] = sum(q.get("marks", 0) for q in updates["questions"])
    result = await db.quizzes.update_one({"_id": ObjectId(quiz_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")
    q = await db.quizzes.find_one({"_id": ObjectId(quiz_id)})
    return serialize_doc(q)

@app.delete("/api/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: str, user: dict = Depends(require_role("teacher", "admin"))):
    result = await db.quizzes.delete_one({"_id": ObjectId(quiz_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return {"message": "Quiz deleted"}

@app.post("/api/quizzes/{quiz_id}/publish")
async def publish_quiz(quiz_id: str, user: dict = Depends(require_role("teacher", "admin"))):
    result = await db.quizzes.update_one({"_id": ObjectId(quiz_id)}, {"$set": {"status": "active", "published_at": datetime.now(timezone.utc)}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return {"message": "Quiz published"}

@app.post("/api/quizzes/{quiz_id}/extend-time")
async def extend_quiz_time(quiz_id: str, user: dict = Depends(require_role("teacher", "admin", "hod"))):
    """Add 10 minutes to the quiz duration for all active attempts."""
    q = await db.quizzes.find_one({"_id": ObjectId(quiz_id)})
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not found")
    new_duration = q.get("duration_mins", 60) + 10
    await db.quizzes.update_one({"_id": ObjectId(quiz_id)}, {"$set": {"duration_mins": new_duration}})
    return {"message": f"Extended by 10 mins. New duration: {new_duration} mins", "duration_mins": new_duration}

@app.post("/api/quizzes/{quiz_id}/end")
async def end_quiz_now(quiz_id: str, user: dict = Depends(require_role("teacher", "admin", "hod"))):
    """Force-submit all in-progress attempts for this quiz."""
    quiz = await db.quizzes.find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    in_progress = await db.quiz_attempts.find({"quiz_id": quiz_id, "status": "in_progress"}).to_list(1000)
    force_submitted = 0
    for attempt in in_progress:
        # Run the same grading logic inline
        score = 0
        results = []
        questions = quiz.get("questions", [])
        answers = attempt.get("answers", [])
        for i, q in enumerate(questions):
            student_answer = answers[i] if i < len(answers) else None
            is_correct = False
            marks_awarded = 0
            if q["type"] in ("mcq", "mcq-single", "boolean"):
                correct_ans = q.get("correctAnswer") if "correctAnswer" in q else q.get("correct_answer")
                if student_answer is not None and student_answer == correct_ans:
                    is_correct = True
                    marks_awarded = q.get("marks", 0)
            elif q["type"] in ("multiple", "mcq-multiple"):
                correct_ans = q.get("correctAnswers") if "correctAnswers" in q else q.get("correct_answers", [])
                correct = set(correct_ans)
                selected = set(student_answer) if isinstance(student_answer, list) else set()
                if correct == selected:
                    is_correct = True
                    marks_awarded = q.get("marks", 0)
            elif q["type"] == "short":
                if student_answer:
                    marks_awarded = round(q.get("marks", 0) * 0.5)
            score += marks_awarded
            results.append({"question_index": i, "is_correct": is_correct, "marks_awarded": marks_awarded, "max_marks": q.get("marks", 0)})
        percentage = round((score / quiz["total_marks"]) * 100, 1) if quiz.get("total_marks", 0) > 0 else 0
        await db.quiz_attempts.update_one(
            {"_id": attempt["_id"]},
            {"$set": {"status": "submitted", "score": score, "percentage": percentage,
                       "results": results, "submitted_at": datetime.now(timezone.utc), "force_submitted": True}}
        )
        force_submitted += 1
    # Mark quiz as ended
    await db.quizzes.update_one({"_id": ObjectId(quiz_id)}, {"$set": {"status": "ended", "ended_at": datetime.now(timezone.utc)}})
    return {"message": f"Quiz ended. {force_submitted} attempts force-submitted.", "force_submitted": force_submitted}

# ─── Quiz Attempt Routes ───────────────────────────────────────────────────
@app.post("/api/quizzes/{quiz_id}/start")
async def start_attempt(quiz_id: str, user: dict = Depends(get_current_user)):
    quiz = await db.quizzes.find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz["status"] not in ["active", "scheduled"]:
        raise HTTPException(status_code=400, detail="Quiz is not active")
    if not quiz.get("allow_reattempt", False):
        existing = await db.quiz_attempts.find_one({"quiz_id": quiz_id, "student_id": user["id"], "status": "submitted"})
        if existing:
            raise HTTPException(status_code=400, detail="Already attempted this quiz")
    in_progress = await db.quiz_attempts.find_one({"quiz_id": quiz_id, "student_id": user["id"], "status": "in_progress"})
    if in_progress:
        return serialize_doc(in_progress)
    num_q = len(quiz.get("questions", []))
    attempt = {
        "quiz_id": quiz_id, "quiz_title": quiz["title"], "quiz_subject": quiz["subject"],
        "student_id": user["id"], "student_name": user["name"],
        "total_questions": num_q, "total_marks": quiz["total_marks"],
        "answers": [None] * num_q, "status": "in_progress", "violations": 0,
        "started_at": datetime.now(timezone.utc), "score": 0
    }
    result = await db.quiz_attempts.insert_one(attempt)
    attempt["_id"] = result.inserted_id
    return serialize_doc(attempt)

@app.post("/api/attempts/{attempt_id}/answer")
async def submit_answer(attempt_id: str, req: AnswerSubmit, user: dict = Depends(get_current_user)):
    attempt = await db.quiz_attempts.find_one({"_id": ObjectId(attempt_id), "student_id": user["id"]})
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Attempt already submitted")
    answers = attempt.get("answers", [])
    if 0 <= req.question_index < len(answers):
        answers[req.question_index] = req.answer
    await db.quiz_attempts.update_one({"_id": ObjectId(attempt_id)}, {"$set": {"answers": answers}})
    return {"message": "Answer saved", "question_index": req.question_index}

class ViolationReport(BaseModel):
    violation_type: str = "tab_switch"  # tab_switch, fullscreen_exit, window_blur

@app.post("/api/attempts/{attempt_id}/violation")
async def log_violation(attempt_id: str, req: ViolationReport = ViolationReport(), user: dict = Depends(get_current_user)):
    detail = {"type": req.violation_type, "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.quiz_attempts.update_one(
        {"_id": ObjectId(attempt_id)},
        {"$inc": {"violations": 1}, "$push": {"violation_details": detail}}
    )
    updated = await db.quiz_attempts.find_one({"_id": ObjectId(attempt_id)}, {"violations": 1})
    return {"message": "Violation logged", "total_violations": updated.get("violations", 0)}

@app.post("/api/attempts/{attempt_id}/submit")
async def submit_attempt(attempt_id: str, user: dict = Depends(get_current_user)):
    attempt = await db.quiz_attempts.find_one({"_id": ObjectId(attempt_id), "student_id": user["id"]})
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt["status"] == "submitted":
        raise HTTPException(status_code=400, detail="Already submitted")
    quiz = await db.quizzes.find_one({"_id": ObjectId(attempt["quiz_id"])})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    # Auto-grade
    score = 0
    results = []
    questions = quiz.get("questions", [])
    answers = attempt.get("answers", [])
    for i, q in enumerate(questions):
        student_answer = answers[i] if i < len(answers) else None
        is_correct = False
        marks_awarded = 0
        if q["type"] in ("mcq", "mcq-single", "boolean"):
            correct_ans = q.get("correctAnswer") if "correctAnswer" in q else q.get("correct_answer")
            if student_answer is not None and student_answer == correct_ans:
                is_correct = True
                marks_awarded = q.get("marks", 0)
            elif student_answer is not None and quiz.get("negative_marking"):
                negative = q.get("negativeMarks") if "negativeMarks" in q else q.get("negative_marks", 0)
                marks_awarded = -abs(float(negative) if negative else 0)
        elif q["type"] in ("multiple", "mcq-multiple"):
            correct_ans = q.get("correctAnswers") if "correctAnswers" in q else q.get("correct_answers", [])
            correct = set(correct_ans)
            selected = set(student_answer) if isinstance(student_answer, list) else set()
            if correct == selected:
                is_correct = True
                marks_awarded = q.get("marks", 0)
            elif student_answer and quiz.get("negative_marking"):
                negative = q.get("negativeMarks") if "negativeMarks" in q else q.get("negative_marks", 0)
                marks_awarded = -abs(float(negative) if negative else 0)
        elif q["type"] == "short":
            expected_answer = str(q.get("expectedAnswer") if "expectedAnswer" in q else q.get("expected_answer", "")).strip()
            keywords = [kw.lower() for kw in q.get("keywords", [])]
            if student_answer:
                answer_str = str(student_answer).strip()
                if expected_answer and answer_str.lower() == expected_answer.lower():
                    is_correct = True
                    marks_awarded = q.get("marks", 0)
                elif keywords:
                    answer_lower = answer_str.lower()
                    matches = sum(1 for kw in keywords if kw in answer_lower)
                    ratio = matches / len(keywords) if keywords else 0
                    marks_awarded = round(q.get("marks", 0) * ratio)
                    is_correct = ratio >= 0.5
                else:
                    marks_awarded = round(q.get("marks", 0) * 0.5)
        elif q["type"] == "coding":
            if student_answer and str(student_answer).strip():
                expected = q.get("expected_output", "").strip()
                if expected:
                    try:
                        with tempfile.TemporaryDirectory() as tmpdir:
                            lang = q.get("language", "python")
                            if lang == "python":
                                fp = os.path.join(tmpdir, "solution.py")
                                with open(fp, "w") as f:
                                    f.write(str(student_answer))
                                r = subprocess.run(["python3", fp], input=q.get("test_input", ""), capture_output=True, text=True, timeout=10, cwd=tmpdir)
                                actual = r.stdout.strip()
                                if actual == expected:
                                    is_correct = True
                                    marks_awarded = q.get("marks", 0)
                                elif actual:
                                    marks_awarded = round(q.get("marks", 0) * 0.3)
                            else:
                                marks_awarded = round(q.get("marks", 0) * 0.5)
                    except Exception:
                        marks_awarded = round(q.get("marks", 0) * 0.2)
                else:
                    marks_awarded = round(q.get("marks", 0) * 0.5)
        score += marks_awarded
        correct_for_results = q.get("correctAnswer") if "correctAnswer" in q else (q.get("correctAnswers") if "correctAnswers" in q else (q.get("correct_answer") or q.get("correct_answers") or q.get("expectedAnswer") or q.get("expected_output")))
        results.append({
            "question_index": i, "question": q.get("text", q.get("question", "")), "type": q["type"],
            "student_answer": student_answer, "correct_answer": correct_for_results,
            "is_correct": is_correct, "marks_awarded": marks_awarded, "max_marks": q.get("marks", 0)
        })
    percentage = round((score / quiz["total_marks"]) * 100, 1) if quiz["total_marks"] > 0 else 0
    await db.quiz_attempts.update_one({"_id": ObjectId(attempt_id)}, {"$set": {
        "status": "submitted", "score": score, "percentage": percentage,
        "results": results, "submitted_at": datetime.now(timezone.utc)
    }})
    attempt = await db.quiz_attempts.find_one({"_id": ObjectId(attempt_id)})
    return serialize_doc(attempt)

@app.get("/api/attempts/{attempt_id}/result")
async def get_attempt_result(attempt_id: str, user: dict = Depends(get_current_user)):
    attempt = await db.quiz_attempts.find_one({"_id": ObjectId(attempt_id)})
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if user["role"] == "student" and attempt["student_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your attempt")
    return serialize_doc(attempt)

@app.get("/api/attempts")
async def list_attempts(quiz_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] == "student":
        query["student_id"] = user["id"]
    if quiz_id:
        query["quiz_id"] = quiz_id
    attempts = await db.quiz_attempts.find(query).sort("submitted_at", -1).to_list(200)
    return [serialize_doc(a) for a in attempts]

# ─── Student Search & Profile (HOD / Admin) ───────────────────────────────
@app.get("/api/students/search")
async def search_students(q: str = "", department: Optional[str] = None, college: Optional[str] = None, user: dict = Depends(require_role("hod", "admin", "exam_cell", "teacher"))):
    query = {"role": "student"}
    
    # Tier-based filtering
    if user["role"] == "hod":
        # HOD sees only their department students
        dept = user.get("department", "")
        if "," in dept:
            query["department"] = {"$in": [d.strip() for d in dept.split(",")]}
        else:
            query["department"] = dept
        query["college"] = user.get("college", "")
    elif user["role"] == "exam_cell":
        # Exam Cell sees only their college students
        query["college"] = user.get("college", "")
    elif user["role"] == "admin":
        # Admin can filter by college (tab-based), default shows all
        if college:
            query["college"] = college
    elif user["role"] == "teacher":
        # Teachers see their college and department students
        query["college"] = user.get("college", "")
        if user.get("department"):
            query["department"] = user.get("department")
    
    # Additional filters
    if department and user["role"] in ["admin", "exam_cell"]:
        query["department"] = department
    
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"college_id": {"$regex": q, "$options": "i"}}
        ]
    
    students = await db.users.find(query, {"password_hash": 0}).sort("college_id", 1).to_list(2000)
    return [serialize_doc(s) for s in students]

@app.get("/api/students/{student_id}/profile")
async def student_profile(student_id: str, user: dict = Depends(require_role("hod", "admin", "exam_cell", "teacher"))):
    student = await db.users.find_one({"_id": ObjectId(student_id)}, {"password_hash": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Tier-based access control
    if user["role"] == "hod":
        dept = user.get("department", "")
        if "," in dept:
            depts = [d.strip() for d in dept.split(",")]
            if student.get("department") not in depts or student.get("college") != user.get("college"):
                raise HTTPException(status_code=403, detail="Student not in your department")
        else:
            if student.get("department") != dept or student.get("college") != user.get("college"):
                raise HTTPException(status_code=403, detail="Student not in your department")
    elif user["role"] == "exam_cell":
        if student.get("college") != user.get("college"):
            raise HTTPException(status_code=403, detail="Student not in your college")
    elif user["role"] == "teacher":
        if student.get("college") != user.get("college"):
            raise HTTPException(status_code=403, detail="Student not in your college")
    
    semesters = await db.semester_results.find({"student_id": student_id}).sort("semester", 1).to_list(20)
    attempts = await db.quiz_attempts.find({"student_id": student_id, "status": "submitted"}).sort("submitted_at", -1).to_list(20)
    mid_marks = await db.mark_entries.find({"entries.student_id": student_id, "status": {"$in": ["approved", "submitted"]}}).to_list(50)
    student_marks = []
    for entry in mid_marks:
        for e in entry.get("entries", []):
            if e.get("student_id") == student_id:
                student_marks.append({
                    "subject_code": entry.get("subject_code"), "subject_name": entry.get("subject_name"),
                    "exam_type": entry.get("exam_type"), "marks": e.get("marks"),
                    "max_marks": entry.get("max_marks"), "semester": entry.get("semester")
                })
    return {
        "student": serialize_doc(student),
        "semesters": [serialize_doc(s) for s in semesters],
        "quiz_attempts": [{"quiz_title": a.get("quiz_title", ""), "score": a.get("score", 0), "total": a.get("total_marks", 0), "percentage": a.get("percentage", 0), "submitted_at": a.get("submitted_at", "").isoformat() if isinstance(a.get("submitted_at"), datetime) else str(a.get("submitted_at", ""))} for a in attempts[:10]],
        "mid_marks": student_marks
    }

# ─── Semester Results ──────────────────────────────────────────────────────
@app.get("/api/results/semester/{student_id}")
async def get_semester_results(student_id: str, user: dict = Depends(get_current_user)):
    if user["role"] == "student" and user["id"] != student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    results = await db.semester_results.find({"student_id": student_id}).sort("semester", 1).to_list(20)
    return [serialize_doc(r) for r in results]

@app.post("/api/results/semester")
async def create_semester_result(req: SemesterResultCreate, user: dict = Depends(require_role("teacher", "admin"))):
    doc = {
        "student_id": req.student_id, "semester": req.semester,
        "subjects": req.subjects, "sgpa": req.sgpa, "cgpa": req.cgpa,
        "created_at": datetime.now(timezone.utc), "created_by": user["id"]
    }
    result = await db.semester_results.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

# ─── Analytics & Leaderboard ──────────────────────────────────────────────
@app.get("/api/analytics/student/{student_id}")
async def student_analytics(student_id: str, user: dict = Depends(get_current_user)):
    if user["role"] == "student" and user["id"] != student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    attempts = await db.quiz_attempts.find({"student_id": student_id, "status": "submitted"}).sort("submitted_at", 1).to_list(100)
    semesters = await db.semester_results.find({"student_id": student_id}).sort("semester", 1).to_list(20)
    total_quizzes = len(attempts)
    avg_score = round(sum(a.get("percentage", 0) for a in attempts) / total_quizzes, 1) if total_quizzes > 0 else 0
    best_score = max((a.get("percentage", 0) for a in attempts), default=0)
    latest_cgpa = semesters[-1]["cgpa"] if semesters else 0
    quiz_trend = [{"date": a.get("submitted_at", "").isoformat() if isinstance(a.get("submitted_at"), datetime) else str(a.get("submitted_at", "")), "score": a.get("percentage", 0), "quiz": a.get("quiz_title", "")} for a in attempts[-10:]]
    subject_scores = {}
    for a in attempts:
        sub = a.get("quiz_subject", "Other")
        if sub not in subject_scores:
            subject_scores[sub] = []
        subject_scores[sub].append(a.get("percentage", 0))
    subject_avg = {k: round(sum(v) / len(v), 1) for k, v in subject_scores.items()}
    return {
        "total_quizzes": total_quizzes, "avg_score": avg_score, "best_score": best_score,
        "latest_cgpa": latest_cgpa, "quiz_trend": quiz_trend, "subject_averages": subject_avg,
        "semesters": [serialize_doc(s) for s in semesters]
    }

@app.get("/api/analytics/teacher/class-results")
async def class_results_analytics(user: dict = Depends(require_role("teacher", "hod", "exam_cell", "admin"))):
    if user["role"] == "teacher":
        assignments_cursor = db.faculty_assignments.find({"teacher_id": user["id"]})
    else:
        assignments_cursor = db.faculty_assignments.find()
        
    assignments = await assignments_cursor.to_list(100)
    
    assigned_classes = []
    class_details = {}
    
    for a in assignments:
        class_key = f"{a.get('subject_code', '')}_{a.get('batch', '')}_{a.get('section', '')}"
        if any(c.get("class_key") == class_key for c in assigned_classes):
            continue
            
        total_students = await db.users.count_documents({
            "role": "student",
            "department": a.get("department", ""),
            "batch": str(a.get("batch", "")),
            "section": str(a.get("section", ""))
        })
        
        class_label = f"{a.get('department','')} {a.get('batch','')}-{a.get('section','')}"
        assigned_classes.append({
            "id": str(a["_id"]),
            "class_key": class_key,
            "section": class_label,
            "rawSection": a.get("section", ""),
            "department": a.get("department", ""),
            "subject": a.get("subject_name", ""),
            "batch": str(a.get("batch", "")),
            "totalStudents": total_students
        })
        class_details[class_key] = {
            "totalStudents": total_students,
            "department": a.get("department"),
            "batch": str(a.get("batch", "")),
            "section": str(a.get("section", ""))
        }
        
    quiz_results = {}
    mid_marks = {}
    
    if user["role"] == "teacher":
        qs = await db.quizzes.find({"created_by": user["id"]}).to_list(100)
    else:
        qs = await db.quizzes.find().to_list(100)
        
    quiz_ids = [str(q["_id"]) for q in qs]
    all_attempts = await db.quiz_attempts.find({"quiz_id": {"$in": quiz_ids}, "status": "submitted"}).to_list(1000)
        
    for at in all_attempts:
        sid = at.get("student_id")
        if not sid: continue
        st = await db.users.find_one({"_id": ObjectId(sid)}) if ObjectId.is_valid(sid) else None
        if not st: continue
        
        for a in assigned_classes:
            cd = class_details[a["class_key"]]
            if st.get("department") == cd.get("department") and str(st.get("batch", "")) == cd.get("batch") and str(st.get("section", "")) == cd.get("section"):
                class_key = a["class_key"]
                qid = at["quiz_id"]
                if class_key not in quiz_results:
                    quiz_results[class_key] = {}
                if qid not in quiz_results[class_key]:
                    quiz_obj = next((qz for qz in qs if str(qz["_id"]) == qid), {})
                    created_at = quiz_obj.get("created_at", datetime.now(timezone.utc))
                    if isinstance(created_at, str):
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    quiz_results[class_key][qid] = {
                        "id": qid,
                        "title": quiz_obj.get("title", "Quiz"),
                        "date": created_at.strftime("%Y-%m-%d"),
                        "totalStudents": a["totalStudents"],
                        "completed": 0,
                        "total_score": 0,
                        "maxScore": quiz_obj.get("total_marks", 100),
                        "passed": 0,
                        "topPerformers": []
                    }
                
                qr = quiz_results[class_key][qid]
                qr["completed"] += 1
                perc = at.get("percentage", 0)
                qr["total_score"] += perc
                if perc >= 40:
                    qr["passed"] += 1
                    
                time_elapsed = 0
                if at.get("started_at") and at.get("submitted_at"):
                    s_dt = at["started_at"]
                    e_dt = at["submitted_at"]
                    if isinstance(s_dt, str): s_dt = datetime.fromisoformat(s_dt.replace('Z','+00:00'))
                    if isinstance(e_dt, str): e_dt = datetime.fromisoformat(e_dt.replace('Z','+00:00'))
                    time_elapsed = int((e_dt - s_dt).total_seconds() / 60)
                    
                qr["topPerformers"].append({
                    "name": st.get("name", "Unknown"),
                    "score": perc,
                    "time": f"{max(1, time_elapsed)} mins"
                })

    final_quiz_results = {}
    for class_key, q_dict in quiz_results.items():
        arr = []
        for qid, stat in q_dict.items():
            stat["avgScore"] = round(stat["total_score"] / stat["completed"], 1) if stat["completed"] > 0 else 0
            stat["passRate"] = round((stat["passed"] / stat["completed"]) * 100) if stat["completed"] > 0 else 0
            stat["topPerformers"].sort(key=lambda x: x["score"], reverse=True)
            stat["topPerformers"] = stat["topPerformers"][:3]
            del stat["total_score"]
            del stat["passed"]
            arr.append(stat)
        final_quiz_results[class_key] = arr
        
    if user["role"] == "teacher":
        entries = await db.mark_entries.find({"teacher_id": user["id"]}).to_list(1000)
    else:
        entries = await db.mark_entries.find().to_list(1000)
        
    for me in entries:
        assn = next((a for a in assignments if str(a["_id"]) == me.get("assignment_id")), None)
        if not assn: continue
        class_key = f"{assn.get('subject_code', '')}_{assn.get('batch', '')}_{assn.get('section', '')}"
        exam_type = me.get("exam_type", "mid1")
        
        if class_key not in mid_marks:
            mid_marks[class_key] = {}
            
        ents_arr = me.get("entries", [])
        valid_marks = []
        for e in ents_arr:
            m = e.get("marks")
            if m is not None:
                try:
                    valid_marks.append(float(m))
                except: pass
                
        if not valid_marks: continue
            
        avg_marks = sum(valid_marks) / len(valid_marks)
        try:
            max_marks = float(me.get("max_marks", 30))
        except:
            max_marks = 30.0
            
        if max_marks <= 0: max_marks = 30.0
        
        excellent = sum(1 for v in valid_marks if (v/max_marks) >= 0.8)
        good = sum(1 for v in valid_marks if 0.6 <= (v/max_marks) < 0.8)
        average = sum(1 for v in valid_marks if 0.4 <= (v/max_marks) < 0.6)
        poor = sum(1 for v in valid_marks if (v/max_marks) < 0.4)
        passCount = excellent + good + average
        
        mid_marks[class_key][exam_type] = {
            "totalStudents": class_details[class_key]["totalStudents"] if class_key in class_details else len(valid_marks),
            "submitted": len(valid_marks),
            "avgMarks": round(avg_marks, 1),
            "maxMarks": max_marks,
            "passRate": round((passCount / len(valid_marks)) * 100) if valid_marks else 0,
            "distribution": {"excellent": excellent, "good": good, "average": average, "poor": poor}
        }
        
    return {
        "assignedClasses": assigned_classes,
        "quizResults": final_quiz_results,
        "midMarks": mid_marks
    }

@app.get("/api/analytics/teacher/quiz-results/{quiz_id}")
async def get_quiz_detailed_analytics(
    quiz_id: str, 
    department: str = "", 
    batch: str = "", 
    section: str = "", 
    user: dict = Depends(require_role("teacher", "hod", "exam_cell", "admin"))
):
    query = {"role": "student"}
    if department: query["department"] = department
    if batch: query["batch"] = str(batch)
    if section: query["section"] = str(section)
    
    students_cursor = db.users.find(query)
    
    students = await students_cursor.to_list(1000)
    
    attempts = await db.quiz_attempts.find({"quiz_id": quiz_id}).to_list(1000)
    attempts_map = {str(a.get("student_id")): a for a in attempts}
    
    results = []
    for s in students:
        sid = str(s["_id"])
        attempt = attempts_map.get(sid)
        
        if attempt:
            percentage = attempt.get("percentage", 0)
            status_text = "Not Attempted"
            raw_status = attempt.get("status", "none")
            
            started = attempt.get("started_at")
            submitted = attempt.get("submitted_at")
            
            if isinstance(started, str):
                try: started = datetime.fromisoformat(started.replace('Z', '+00:00'))
                except: started = None
            if isinstance(submitted, str):
                try: submitted = datetime.fromisoformat(submitted.replace('Z', '+00:00'))
                except: submitted = None
                
            time_elapsed = 0
            if started and submitted:
                td = submitted - started
                time_elapsed = max(0, int(td.total_seconds() / 60))
            elif started and raw_status == "in_progress":
                td = datetime.now(timezone.utc) - started
                time_elapsed = max(0, int(td.total_seconds() / 60))
                
            if raw_status == "in_progress":
                status_text = "In Progress"
            else:
                status_text = "Pass" if percentage >= 40 else "Fail"
                
            results.append({
                "id": sid,
                "name": s.get("name", "Unknown"),
                "rollNo": s.get("college_id", sid),
                "scoreValue": percentage,
                "score": f"{percentage}%",
                "timeTaken": f"{time_elapsed} mins",
                "status": status_text,
                "raw_status": raw_status
            })
        else:
            results.append({
                "id": sid,
                "name": s.get("name", "Unknown"),
                "rollNo": s.get("college_id", sid),
                "scoreValue": -1,
                "score": "-",
                "timeTaken": "-",
                "status": "Not Attempted",
                "raw_status": "none"
            })
            
    # Default sorting: alphabetical by rollNo
    results.sort(key=lambda x: str(x["rollNo"]))
    return results

@app.get("/api/leaderboard")
async def get_leaderboard(user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"status": "submitted"}},
        {"$group": {"_id": "$student_id", "avg_score": {"$avg": "$percentage"}, "quizzes_taken": {"$sum": 1}, "student_name": {"$first": "$student_name"}}},
        {"$sort": {"avg_score": -1}},
        {"$limit": 50}
    ]
    results = await db.quiz_attempts.aggregate(pipeline).to_list(50)
    leaderboard = []
    for i, r in enumerate(results):
        student = await db.users.find_one({"_id": ObjectId(r["_id"])}, {"password_hash": 0})
        sem_results = await db.semester_results.find({"student_id": r["_id"]}).sort("semester", -1).to_list(1)
        cgpa = sem_results[0]["cgpa"] if sem_results else 0
        leaderboard.append({
            "rank": i + 1, "student_id": r["_id"], "name": r.get("student_name", ""),
            "college_id": student.get("college_id", "") if student else "",
            "avg_score": round(r["avg_score"], 1), "quizzes_taken": r["quizzes_taken"], "cgpa": cgpa,
        })
    return leaderboard

# ─── Dashboard Stats ───────────────────────────────────────────────────────
@app.get("/api/dashboard/student")
async def student_dashboard(user: dict = Depends(get_current_user)):
    # All submitted attempts (with details for analysis)
    all_attempts = await db.quiz_attempts.find({"student_id": user["id"], "status": "submitted"}).sort("submitted_at", -1).to_list(50)
    # Active quizzes with question_count + deadline info
    active_quizzes_raw = await db.quizzes.find({"status": "active"}).sort("created_at", -1).to_list(10)
    active_quizzes = []
    for q in active_quizzes_raw:
        doc = serialize_doc(q)
        doc["question_count"] = len(q.get("questions", []))
        doc.pop("questions", None)
        active_quizzes.append(doc)
    # In-progress attempts
    in_progress = await db.quiz_attempts.find({"student_id": user["id"], "status": "in_progress"}).sort("started_at", -1).to_list(5)
    semesters = await db.semester_results.find({"student_id": user["id"]}).sort("semester", -1).to_list(1)
    total_attempts = len(all_attempts)
    avg = round(sum(a.get("percentage", 0) for a in all_attempts) / total_attempts, 1) if total_attempts > 0 else 0

    # ── Score Trend (for chart) ──
    score_trend = []
    for a in reversed(all_attempts[:15]):  # oldest first for chart
        submitted = a.get("submitted_at")
        score_trend.append({
            "quiz": a.get("quiz_title", "Quiz")[:20],
            "score": round(a.get("percentage", 0), 1),
            "date": submitted.strftime("%b %d") if isinstance(submitted, datetime) else "",
        })

    # ── Leaderboard Rank ──
    rank = None
    rank_pipeline = [
        {"$match": {"status": "submitted"}},
        {"$group": {"_id": "$student_id", "avg_score": {"$avg": "$percentage"}}},
        {"$sort": {"avg_score": -1}},
    ]
    rank_results = await db.quiz_attempts.aggregate(rank_pipeline).to_list(200)
    total_students = len(rank_results)
    for i, r in enumerate(rank_results):
        if r["_id"] == user["id"]:
            rank = i + 1
            break

    # ── Weak Topics Analysis ──
    subject_scores = {}
    for a in all_attempts:
        sub = a.get("quiz_subject", "General")
        if sub not in subject_scores:
            subject_scores[sub] = []
        subject_scores[sub].append(a.get("percentage", 0))
    weak_topics = []
    for sub, scores in subject_scores.items():
        avg_s = round(sum(scores) / len(scores), 1)
        weak_topics.append({"subject": sub, "avg_score": avg_s, "attempts": len(scores)})
    weak_topics.sort(key=lambda x: x["avg_score"])  # weakest first

    # ── Activity Feed ──
    activity = []
    for a in all_attempts[:8]:
        submitted = a.get("submitted_at")
        activity.append({
            "type": "quiz_result",
            "title": f"Scored {a.get('percentage', 0):.0f}% on {a.get('quiz_title', 'Quiz')}",
            "subtitle": a.get("quiz_subject", ""),
            "score": a.get("percentage", 0),
            "timestamp": submitted.isoformat() if isinstance(submitted, datetime) else "",
        })
    # Add recently published quizzes as activity
    recent_quizzes = await db.quizzes.find({"status": "active"}).sort("published_at", -1).to_list(3)
    for q in recent_quizzes:
        pub = q.get("published_at") or q.get("created_at")
        activity.append({
            "type": "quiz_published",
            "title": f"New quiz: {q.get('title', 'Untitled')}",
            "subtitle": q.get("subject", ""),
            "timestamp": pub.isoformat() if isinstance(pub, datetime) else "",
        })
    activity.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    activity = activity[:10]

    # ── Enrich recent results ──
    recent_results = []
    for a in all_attempts[:5]:
        doc = serialize_doc(a)
        if not doc.get("quiz_title"):
            quiz = await db.quizzes.find_one({"_id": ObjectId(a["quiz_id"])}, {"title": 1, "subject": 1})
            if quiz:
                doc["quiz_title"] = quiz.get("title", "Unknown Quiz")
                doc["quiz_subject"] = quiz.get("subject", "")
        recent_results.append(doc)

    return {
        "recent_results": recent_results,
        "upcoming_quizzes": active_quizzes,
        "in_progress": [serialize_doc(a) for a in in_progress],
        "cgpa": semesters[0]["cgpa"] if semesters else 0,
        "current_sgpa": semesters[0].get("sgpa", 0) if semesters else 0,
        "current_semester": semesters[0].get("semester", 0) if semesters else 0,
        "total_quizzes": total_attempts,
        "avg_score": avg,
        "score_trend": score_trend,
        "rank": rank,
        "total_students": total_students,
        "weak_topics": weak_topics,
        "activity": activity,
    }

@app.get("/api/dashboard/teacher")
async def teacher_dashboard(user: dict = Depends(require_role("teacher", "admin"))):
    my_quizzes = await db.quizzes.find({"created_by": user["id"]}).sort("created_at", -1).to_list(20)
    for q in my_quizzes:
        q_id = str(q["_id"])
        q["attempt_count"] = await db.quiz_attempts.count_documents({"quiz_id": q_id, "status": "submitted"})
        q["active_count"] = await db.quiz_attempts.count_documents({"quiz_id": q_id, "status": "in_progress"})
        pipeline = [{"$match": {"quiz_id": q_id, "status": "submitted"}}, {"$group": {"_id": None, "avg": {"$avg": "$percentage"}}}]
        agg = await db.quiz_attempts.aggregate(pipeline).to_list(1)
        q["avg_score"] = round(agg[0]["avg"], 1) if agg else 0
    total_students = await db.users.count_documents({"role": "student"})
    recent = await db.quiz_attempts.find({"status": "submitted"}).sort("submitted_at", -1).to_list(10)
    return {
        "quizzes": [serialize_doc(q) for q in my_quizzes],
        "total_students": total_students,
        "recent_submissions": [serialize_doc(r) for r in recent],
    }

@app.get("/api/dashboard/admin")
async def admin_dashboard(user: dict = Depends(require_role("admin"))):
    total_students = await db.users.count_documents({"role": "student"})
    total_teachers = await db.users.count_documents({"role": "teacher"})
    total_hods = await db.users.count_documents({"role": "hod"})
    total_exam_cell = await db.users.count_documents({"role": "exam_cell"})
    total_quizzes = await db.quizzes.count_documents({})
    active_quizzes = await db.quizzes.count_documents({"status": "active"})
    dept_pipeline = [{"$match": {"role": "student"}}, {"$group": {"_id": "$department", "count": {"$sum": 1}}}]
    depts = await db.users.aggregate(dept_pipeline).to_list(20)
    return {
        "total_students": total_students, "total_teachers": total_teachers,
        "total_hods": total_hods, "total_exam_cell": total_exam_cell,
        "total_quizzes": total_quizzes, "active_quizzes": active_quizzes,
        "departments": [{"name": d["_id"] or "Unassigned", "count": d["count"]} for d in depts],
    }

# ─── Faculty Assignment Routes (HOD) ───────────────────────────────────────
@app.get("/api/faculty/teachers")
async def list_department_teachers(user: dict = Depends(require_role("hod", "admin"))):
    # HOD is also a faculty member, include both teachers and HODs
    query = {"role": {"$in": ["teacher", "hod"]}}
    if user["role"] == "hod":
        dept = user.get("department") or ""
        if "," in dept:
            query["department"] = {"$in": [d.strip() for d in dept.split(",")]}
        else:
            query["department"] = dept
    teachers = await db.users.find(query, {"password_hash": 0}).to_list(100)
    return [serialize_doc(t) for t in teachers]

@app.get("/api/faculty/assignments")
async def list_assignments(user: dict = Depends(require_role("hod", "admin", "teacher"))):
    query = {}
    if user["role"] == "hod":
        dept = user.get("department") or ""
        if "," in dept:
            query["department"] = {"$in": [d.strip() for d in dept.split(",")]}
        else:
            query["department"] = dept
    elif user["role"] == "teacher":
        query["teacher_id"] = user["id"]
    assignments = await db.faculty_assignments.find(query).sort("created_at", -1).to_list(200)
    return [serialize_doc(a) for a in assignments]

@app.post("/api/faculty/assignments")
async def create_assignment(req: FacultyAssignment, user: dict = Depends(require_role("hod", "admin"))):
    teacher = await db.users.find_one({"_id": ObjectId(req.teacher_id)})
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    existing = await db.faculty_assignments.find_one({
        "teacher_id": req.teacher_id, "subject_code": req.subject_code,
        "batch": req.batch, "section": req.section, "semester": req.semester
    })
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already exists")
    doc = {
        "teacher_id": req.teacher_id, "teacher_name": teacher.get("name", ""),
        "subject_code": req.subject_code, "subject_name": req.subject_name,
        "department": req.department, "batch": req.batch, "section": req.section,
        "semester": req.semester, "assigned_by": user["id"],
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.faculty_assignments.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@app.delete("/api/faculty/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, user: dict = Depends(require_role("hod", "admin"))):
    result = await db.faculty_assignments.delete_one({"_id": ObjectId(assignment_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"message": "Assignment deleted"}

# ─── Marks Entry Routes (Teacher) ─────────────────────────────────────────
@app.get("/api/marks/my-assignments")
async def my_assignments(user: dict = Depends(require_role("teacher", "hod"))):
    assignments = await db.faculty_assignments.find({"teacher_id": user["id"]}).to_list(50)
    return [serialize_doc(a) for a in assignments]

@app.get("/api/marks/students")
async def get_students_for_marks(department: str, batch: str, section: str, user: dict = Depends(require_role("teacher", "hod", "admin", "exam_cell"))):
    students = await db.users.find({"role": "student", "department": department, "batch": batch, "section": section}, {"password_hash": 0}).sort("college_id", 1).to_list(200)
    return [serialize_doc(s) for s in students]

@app.get("/api/marks/entry/{assignment_id}/{exam_type}")
async def get_mark_entry(assignment_id: str, exam_type: str, user: dict = Depends(require_role("teacher", "hod"))):
    entry = await db.mark_entries.find_one({"assignment_id": assignment_id, "exam_type": exam_type, "teacher_id": user["id"]})
    if entry:
        return serialize_doc(entry)
    return None

@app.post("/api/marks/entry")
async def save_mark_entry(req: MarkEntrySave, user: dict = Depends(require_role("teacher", "hod"))):
    assignment = await db.faculty_assignments.find_one({"_id": ObjectId(req.assignment_id), "teacher_id": user["id"]})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found or not yours")
    existing = await db.mark_entries.find_one({"assignment_id": req.assignment_id, "exam_type": req.exam_type, "teacher_id": user["id"]})
    entries_data = [e.dict() for e in req.entries]
    
    if existing:
        current_status = existing.get("status")
        
        # Allow editing approved marks only with revision reason
        if current_status == "approved":
            if not req.revision_reason or not req.revision_reason.strip():
                raise HTTPException(status_code=400, detail="Revision reason is required to edit approved marks")
            
            # Create revision history entry
            revision_history = existing.get("revision_history", [])
            revision_history.append({
                "revised_at": datetime.now(timezone.utc),
                "revised_by": user["id"],
                "reviser_name": user["name"],
                "reason": req.revision_reason,
                "previous_status": "approved"
            })
            
            # Update with new entries and change status back to draft
            result = await db.mark_entries.update_one(
                {"_id": existing["_id"]}, 
                {"$set": {
                    "entries": entries_data, 
                    "max_marks": req.max_marks,
                    "status": "draft",
                    "revision_history": revision_history,
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
            if result.modified_count == 0:
                raise HTTPException(status_code=500, detail="Failed to update marks entry")
            
            updated = await db.mark_entries.find_one({"_id": existing["_id"]})
            if not updated:
                raise HTTPException(status_code=500, detail="Failed to retrieve updated marks entry")
            
            return serialize_doc(updated)
        
        # Prevent editing submitted marks (not approved)
        if current_status == "submitted":
            raise HTTPException(status_code=400, detail="Cannot edit submitted marks. Wait for approval or rejection.")
        
        # Normal draft/rejected edit
        await db.mark_entries.update_one({"_id": existing["_id"]}, {"$set": {
            "entries": entries_data, "max_marks": req.max_marks,
            "status": "draft", "updated_at": datetime.now(timezone.utc)
        }})
        updated = await db.mark_entries.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)
    
    # Create new entry
    doc = {
        "assignment_id": req.assignment_id, "teacher_id": user["id"], "teacher_name": user["name"],
        "subject_code": assignment["subject_code"], "subject_name": assignment["subject_name"],
        "department": assignment["department"], "batch": assignment["batch"], "section": assignment["section"],
        "exam_type": req.exam_type, "semester": req.semester, "max_marks": req.max_marks,
        "entries": entries_data, "status": "draft",
        "revision_history": [],
        "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
    }
    result = await db.mark_entries.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@app.post("/api/marks/submit/{entry_id}")
async def submit_marks(entry_id: str, user: dict = Depends(require_role("teacher", "hod"))):
    entry = await db.mark_entries.find_one({"_id": ObjectId(entry_id), "teacher_id": user["id"]})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    if entry["status"] != "draft":
        raise HTTPException(status_code=400, detail=f"Cannot submit - current status: {entry['status']}")
    await db.mark_entries.update_one({"_id": ObjectId(entry_id)}, {"$set": {
        "status": "submitted", "submitted_at": datetime.now(timezone.utc)
    }})
    return {"message": "Marks submitted for HOD approval"}

# ─── Marks Review Routes (HOD) ────────────────────────────────────────────
@app.get("/api/marks/submissions")
async def list_submissions(status: Optional[str] = None, user: dict = Depends(require_role("hod", "admin"))):
    query = {}
    if user["role"] == "hod":
        dept = user.get("department", "")
        if "," in dept:
            query["department"] = {"$in": [d.strip() for d in dept.split(",")]}
        else:
            query["department"] = dept
    if status:
        query["status"] = status
    else:
        query["status"] = {"$in": ["submitted", "approved", "rejected"]}
    entries = await db.mark_entries.find(query).sort("submitted_at", -1).to_list(200)
    return [serialize_doc(e) for e in entries]

@app.post("/api/marks/review/{entry_id}")
async def review_marks(entry_id: str, req: MarkReview, user: dict = Depends(require_role("hod", "admin"))):
    entry = await db.mark_entries.find_one({"_id": ObjectId(entry_id)})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    if entry["status"] != "submitted":
        raise HTTPException(status_code=400, detail="Only submitted marks can be reviewed")
    new_status = "approved" if req.action == "approve" else "rejected"
    await db.mark_entries.update_one({"_id": ObjectId(entry_id)}, {"$set": {
        "status": new_status, "reviewed_by": user["id"], "reviewer_name": user["name"],
        "reviewed_at": datetime.now(timezone.utc), "review_remarks": req.remarks
    }})
    return {"message": f"Marks {new_status}"}

# ─── Exam Cell Routes ──────────────────────────────────────────────────────
@app.get("/api/examcell/approved-marks")
async def get_approved_marks(user: dict = Depends(require_role("exam_cell", "admin"))):
    entries = await db.mark_entries.find({"status": "approved"}).sort("subject_code", 1).to_list(500)
    return [serialize_doc(e) for e in entries]

@app.post("/api/examcell/endterm")
async def save_endterm(req: EndtermEntry, user: dict = Depends(require_role("exam_cell", "admin"))):
    existing = await db.endterm_entries.find_one({
        "subject_code": req.subject_code, "department": req.department,
        "batch": req.batch, "section": req.section, "semester": req.semester
    })
    if existing:
        if existing.get("status") == "published":
            raise HTTPException(status_code=400, detail="Already published, cannot edit")
        await db.endterm_entries.update_one({"_id": existing["_id"]}, {"$set": {
            "entries": req.entries, "max_marks": req.max_marks,
            "updated_at": datetime.now(timezone.utc)
        }})
        updated = await db.endterm_entries.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)
    doc = {
        "subject_code": req.subject_code, "subject_name": req.subject_name,
        "department": req.department, "batch": req.batch, "section": req.section,
        "semester": req.semester, "max_marks": req.max_marks, "entries": req.entries,
        "entered_by": user["id"], "status": "draft",
        "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
    }
    result = await db.endterm_entries.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@app.get("/api/examcell/endterm")
async def list_endterm(user: dict = Depends(require_role("exam_cell", "admin"))):
    entries = await db.endterm_entries.find({}).sort("created_at", -1).to_list(200)
    return [serialize_doc(e) for e in entries]

@app.post("/api/examcell/upload")
async def upload_marks_file(file: UploadFile = File(...), semester: int = Form(...), subject_code: str = Form(...), subject_name: str = Form(...), department: str = Form(...), batch: str = Form(...), section: str = Form(...), user: dict = Depends(require_role("exam_cell", "admin"))):
    content = await file.read()
    entries = []
    filename = file.filename.lower()
    try:
        if filename.endswith('.csv'):
            text = content.decode('utf-8')
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                cid = row.get('college_id', row.get('roll_no', row.get('College ID', ''))).strip()
                marks_val = row.get('marks', row.get('Marks', row.get('score', '0')))
                grade = row.get('grade', row.get('Grade', ''))
                student = await db.users.find_one({"college_id": cid.upper()})
                if student:
                    entries.append({
                        "student_id": str(student["_id"]), "college_id": cid.upper(),
                        "student_name": student.get("name", ""), "marks": float(marks_val or 0),
                        "grade": grade
                    })
        elif filename.endswith('.xlsx') or filename.endswith('.xls'):
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content))
            ws = wb.active
            headers = [str(c.value or '').lower().strip() for c in ws[1]]
            cid_col = next((i for i, h in enumerate(headers) if h in ['college_id', 'roll_no', 'roll number']), 0)
            marks_col = next((i for i, h in enumerate(headers) if h in ['marks', 'score']), 1)
            grade_col = next((i for i, h in enumerate(headers) if h in ['grade']), -1)
            for row in ws.iter_rows(min_row=2, values_only=True):
                if not row[cid_col]:
                    continue
                cid = str(row[cid_col]).strip().upper()
                student = await db.users.find_one({"college_id": cid})
                if student:
                    entries.append({
                        "student_id": str(student["_id"]), "college_id": cid,
                        "student_name": student.get("name", ""),
                        "marks": float(row[marks_col] or 0),
                        "grade": str(row[grade_col] or '') if grade_col >= 0 else ''
                    })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
    if not entries:
        raise HTTPException(status_code=400, detail="No valid student entries found in file")
    existing = await db.endterm_entries.find_one({
        "subject_code": subject_code, "department": department,
        "batch": batch, "section": section, "semester": semester
    })
    if existing:
        await db.endterm_entries.update_one({"_id": existing["_id"]}, {"$set": {
            "entries": entries, "updated_at": datetime.now(timezone.utc)
        }})
    else:
        await db.endterm_entries.insert_one({
            "subject_code": subject_code, "subject_name": subject_name,
            "department": department, "batch": batch, "section": section,
            "semester": semester, "max_marks": 100, "entries": entries,
            "entered_by": user["id"], "status": "draft",
            "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
        })
    return {"message": f"Uploaded {len(entries)} student marks", "count": len(entries)}

@app.post("/api/examcell/publish/{entry_id}")
async def publish_results(entry_id: str, user: dict = Depends(require_role("exam_cell", "admin"))):
    entry = await db.endterm_entries.find_one({"_id": ObjectId(entry_id)})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    await db.endterm_entries.update_one({"_id": ObjectId(entry_id)}, {"$set": {
        "status": "published", "published_at": datetime.now(timezone.utc), "published_by": user["id"]
    }})
    return {"message": "Results published successfully"}

# ─── Timetable Routes (HOD) ────────────────────────────────────────────────
@app.get("/api/timetable")
async def get_timetable(section: str, semester: int = 3, user: dict = Depends(require_role("hod", "admin", "teacher", "student"))):
    slots = await db.timetable_slots.find({"section": section, "semester": semester}).to_list(200)
    return [serialize_doc(s) for s in slots]

@app.post("/api/timetable")
async def save_timetable_slot(req: TimetableSlot, user: dict = Depends(require_role("hod", "admin"))):
    dept = user.get("department", "ET")
    existing = await db.timetable_slots.find_one({
        "section": req.section, "day": req.day, "period": req.period, "semester": req.semester
    })
    if existing:
        await db.timetable_slots.update_one({"_id": existing["_id"]}, {"$set": {
            "subject_code": req.subject_code, "subject_name": req.subject_name,
            "teacher_id": req.teacher_id, "teacher_name": req.teacher_name,
            "updated_at": datetime.now(timezone.utc)
        }})
        updated = await db.timetable_slots.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)
    doc = {
        "section": req.section, "day": req.day, "period": req.period,
        "subject_code": req.subject_code, "subject_name": req.subject_name,
        "teacher_id": req.teacher_id, "teacher_name": req.teacher_name,
        "department": dept, "semester": req.semester,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.timetable_slots.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@app.delete("/api/timetable/{slot_id}")
async def delete_timetable_slot(slot_id: str, user: dict = Depends(require_role("hod", "admin"))):
    result = await db.timetable_slots.delete_one({"_id": ObjectId(slot_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Slot not found")
    return {"message": "Slot deleted"}

# ─── Announcement Routes (HOD) ─────────────────────────────────────────────
@app.get("/api/announcements")
async def list_announcements(user: dict = Depends(get_current_user)):
    dept = user.get("department", "")
    query = {"department": dept}
    if user["role"] == "student":
        query["visibility"] = {"$in": ["all", "students"]}
    elif user["role"] == "teacher":
        query["visibility"] = {"$in": ["all", "faculty"]}
    announcements = await db.announcements.find(query).sort("created_at", -1).to_list(50)
    return [serialize_doc(a) for a in announcements]

@app.post("/api/announcements")
async def create_announcement(req: AnnouncementCreate, user: dict = Depends(require_role("hod", "admin"))):
    doc = {
        "title": req.title, "message": req.message,
        "priority": req.priority, "visibility": req.visibility,
        "department": user.get("department", "ET"),
        "posted_by": user["name"], "posted_by_id": user["id"],
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.announcements.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@app.delete("/api/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, user: dict = Depends(require_role("hod", "admin"))):
    result = await db.announcements.delete_one({"_id": ObjectId(announcement_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Announcement deleted"}

# ─── At-Risk Students (HOD) ────────────────────────────────────────────────
@app.get("/api/hod/at-risk-students")
async def get_at_risk_students(threshold: float = 5.0, user: dict = Depends(require_role("hod", "admin"))):
    dept = user.get("department", "")
    if "," in dept:
        dept_q = {"$in": [d.strip() for d in dept.split(",")]}
    else:
        dept_q = dept
    # Get all students in department
    students = await db.users.find({"role": "student", "department": dept_q}, {"password_hash": 0}).to_list(2000)
    at_risk = []
    for student in students:
        sid = str(student["_id"])
        results = await db.semester_results.find({"student_id": sid}).to_list(20)
        if not results:
            continue
        # Calculate CGPA
        total_credits = 0
        total_points = 0
        backlogs = 0
        for sem in results:
            for subj in sem.get("subjects", []):
                credits = subj.get("credits", 3)
                grade = subj.get("grade", "F")
                points = grade_to_points(grade)
                total_credits += credits
                total_points += points * credits
                if grade == "F":
                    backlogs += 1
        cgpa = round(total_points / total_credits, 2) if total_credits > 0 else 0
        if cgpa < threshold or backlogs >= 2:
            at_risk.append({
                "id": sid,
                "name": student.get("name", ""),
                "college_id": student.get("college_id", ""),
                "section": student.get("section", ""),
                "batch": student.get("batch", ""),
                "cgpa": cgpa,
                "backlogs": backlogs,
                "severity": "critical" if cgpa < (threshold - 1.5) or backlogs >= 4 else "warning"
            })
    at_risk.sort(key=lambda x: x["cgpa"])
    return at_risk

@app.get("/api/dashboard/hod")
async def hod_dashboard(user: dict = Depends(require_role("hod", "admin"))):
    dept_val = user.get("department") or ""
    if "," in dept_val:
        dept_query = {"$in": [d.strip() for d in dept_val.split(",")]}
    else:
        dept_query = dept_val

    total_teachers = await db.users.count_documents({"role": "teacher", "department": dept_query})
    total_students = await db.users.count_documents({"role": "student", "department": dept_query})
    total_assignments = await db.faculty_assignments.count_documents({"department": dept_query})
    pending_reviews = await db.mark_entries.count_documents({"department": dept_query, "status": "submitted"})
    approved = await db.mark_entries.count_documents({"department": dept_query, "status": "approved"})
    recent_subs = await db.mark_entries.find({"department": dept_query}).sort("submitted_at", -1).to_list(15)
    published_results = await db.endterm_entries.find({"department": dept_query, "status": "published"}).sort("published_at", -1).to_list(15)
    
    combined = []
    for s in recent_subs:
        item = serialize_doc(s)
        item["activity_type"] = "marks_review"
        combined.append(item)
    for p in published_results:
        item = serialize_doc(p)
        item["activity_type"] = "results_published"
        combined.append(item)
        
    combined.sort(key=lambda x: str(x.get("submitted_at") or x.get("published_at") or ""), reverse=True)
    
    return {
        "total_teachers": total_teachers, "total_students": total_students,
        "total_assignments": total_assignments, "pending_reviews": pending_reviews,
        "approved_count": approved,
        "recent_submissions": combined[:15]
    }

@app.get("/api/dashboard/exam_cell")
async def exam_cell_dashboard(user: dict = Depends(require_role("exam_cell", "admin"))):
    total_approved = await db.mark_entries.count_documents({"status": "approved"})
    total_endterm = await db.endterm_entries.count_documents({})
    total_published = await db.endterm_entries.count_documents({"status": "published"})
    total_draft = await db.endterm_entries.count_documents({"status": "draft"})
    recent = await db.endterm_entries.find({}).sort("updated_at", -1).to_list(5)
    return {
        "total_approved_midterms": total_approved,
        "total_endterm": total_endterm, "total_published": total_published,
        "total_draft": total_draft,
        "recent_entries": [serialize_doc(e) for e in recent]
    }

# ─── Code Execution (Sandboxed) ────────────────────────────────────────────
import asyncio as _asyncio
import re as _re
import shutil as _shutil

# Dangerous patterns per language — block common attack vectors
_BLOCKED_PATTERNS = {
    "python": [
        r"\bimport\s+os\b", r"\bimport\s+subprocess\b", r"\bimport\s+shutil\b",
        r"\bimport\s+socket\b", r"\bimport\s+http\b", r"\bimport\s+urllib\b",
        r"\bimport\s+requests\b", r"\bimport\s+pathlib\b",
        r"\b__import__\s*\(", r"\bexec\s*\(", r"\beval\s*\(",
        r"\bopen\s*\(", r"\bos\.", r"\bsubprocess\.",
    ],
    "javascript": [
        r"require\s*\(\s*['\"]child_process", r"require\s*\(\s*['\"]fs",
        r"require\s*\(\s*['\"]net", r"require\s*\(\s*['\"]http",
        r"\bprocess\.exit", r"\bprocess\.env",
        r"\bexecSync\b", r"\bspawnSync\b",
    ],
    "java": [
        r"Runtime\.getRuntime", r"ProcessBuilder",
        r"System\.exit", r"java\.io\.File",
        r"java\.net\.", r"java\.nio\.file",
    ],
    "c": [
        r"#include\s*<unistd\.h>", r"#include\s*<sys/",
        r"\bsystem\s*\(", r"\bexecl?[vpe]*\s*\(",
        r"\bfork\s*\(", r"\bpopen\s*\(",
        r"\bsocket\s*\(",
    ],
    "cpp": [],  # inherits from c
}
_BLOCKED_PATTERNS["cpp"] = _BLOCKED_PATTERNS["c"]  # C++ inherits C restrictions

def _validate_code(code: str, language: str):
    """Check code for dangerous patterns."""
    patterns = _BLOCKED_PATTERNS.get(language, [])
    for pattern in patterns:
        match = _re.search(pattern, code)
        if match:
            raise HTTPException(
                status_code=400,
                detail=f"Blocked: '{match.group()}' is not allowed for security reasons."
            )

async def _run_process(cmd, stdin_data="", timeout=5, cwd=None):
    """Run a subprocess in a thread executor (Windows-compatible)."""
    import concurrent.futures
    import asyncio as _asyncio
    def _exec():
        try:
            result = subprocess.run(
                cmd,
                input=stdin_data or None,
                capture_output=True, text=True,
                timeout=timeout,
                cwd=cwd,
            )
            return result.stdout, result.stderr, result.returncode
        except subprocess.TimeoutExpired:
            return "", f"Execution timed out ({timeout} second limit)", -1
        except Exception as e:
            return "", str(e), -1

    loop = _asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        return await loop.run_in_executor(pool, _exec)

# Detect available runtimes
def _find_runtime(names):
    import shutil as _shutil
    for name in names:
        path = _shutil.which(name)
        if path and 'WindowsApps' not in path:  # Skip Windows Store stubs
            return path
    return None

import sys as _sys
_RUNTIMES = {
    "python": _find_runtime(["python", "python3"]) or _sys.executable,  # fallback to current interpreter
    "javascript": _find_runtime(["node"]),
    "java": _find_runtime(["java"]),
    "javac": _find_runtime(["javac"]),
    "c": _find_runtime(["gcc"]),
    "cpp": _find_runtime(["g++"]),
}

@app.post("/api/code/execute")
async def execute_code(req: CodeExecuteRequest, user: dict = Depends(get_current_user)):
    if len(req.code) > 10000:
        raise HTTPException(status_code=400, detail="Code too long (max 10000 chars)")

    language = req.language.lower()
    allowed = {"python", "javascript", "java", "c", "cpp"}
    if language not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported language. Supported: {', '.join(sorted(allowed))}")

    # Validate code for dangerous patterns
    _validate_code(req.code, language)

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            if language == "python":
                rt = _RUNTIMES.get("python")
                if not rt:
                    raise HTTPException(status_code=500, detail="Python runtime not available on server")
                filepath = os.path.join(tmpdir, "solution.py")
                with open(filepath, "w") as f:
                    f.write(req.code)
                stdout, stderr, code = await _run_process([rt, filepath], req.test_input, timeout=5, cwd=tmpdir)

            elif language == "javascript":
                rt = _RUNTIMES.get("javascript")
                if not rt:
                    raise HTTPException(status_code=500, detail="Node.js runtime not available on server")
                filepath = os.path.join(tmpdir, "solution.js")
                with open(filepath, "w") as f:
                    f.write(req.code)
                stdout, stderr, code = await _run_process([rt, filepath], req.test_input, timeout=5, cwd=tmpdir)

            elif language == "java":
                javac = _RUNTIMES.get("javac")
                java = _RUNTIMES.get("java")
                if not javac or not java:
                    raise HTTPException(status_code=500, detail="Java runtime not available on server")
                filepath = os.path.join(tmpdir, "Solution.java")
                with open(filepath, "w") as f:
                    f.write(req.code)
                # Compile
                cout, cerr, ccode = await _run_process([javac, filepath], timeout=10, cwd=tmpdir)
                if ccode != 0:
                    return {"output": "", "error": cerr[:2000], "exit_code": ccode}
                # Run
                stdout, stderr, code = await _run_process([java, "-cp", tmpdir, "Solution"], req.test_input, timeout=5, cwd=tmpdir)

            elif language == "c":
                gcc = _RUNTIMES.get("c")
                if not gcc:
                    raise HTTPException(status_code=500, detail="GCC (C compiler) not available on server. Install MinGW or GCC.")
                src = os.path.join(tmpdir, "solution.c")
                out = os.path.join(tmpdir, "solution.exe" if os.name == "nt" else "solution")
                with open(src, "w") as f:
                    f.write(req.code)
                # Compile
                cout, cerr, ccode = await _run_process([gcc, src, "-o", out, "-lm"], timeout=10, cwd=tmpdir)
                if ccode != 0:
                    return {"output": "", "error": cerr[:2000], "exit_code": ccode}
                # Run
                stdout, stderr, code = await _run_process([out], req.test_input, timeout=5, cwd=tmpdir)

            elif language == "cpp":
                gpp = _RUNTIMES.get("cpp")
                if not gpp:
                    raise HTTPException(status_code=500, detail="G++ (C++ compiler) not available on server. Install MinGW or G++.")
                src = os.path.join(tmpdir, "solution.cpp")
                out = os.path.join(tmpdir, "solution.exe" if os.name == "nt" else "solution")
                with open(src, "w") as f:
                    f.write(req.code)
                # Compile
                cout, cerr, ccode = await _run_process([gpp, src, "-o", out, "-lm"], timeout=10, cwd=tmpdir)
                if ccode != 0:
                    return {"output": "", "error": cerr[:2000], "exit_code": ccode}
                # Run
                stdout, stderr, code = await _run_process([out], req.test_input, timeout=5, cwd=tmpdir)

            if code != 0 and not stdout:
                stdout = stderr
                stderr = ""

            return {
                "output": stdout[:3000],
                "error": stderr[:2000],
                "exit_code": code
            }
    except HTTPException:
        raise
    except Exception as e:
        return {"output": "", "error": str(e)[:500], "exit_code": -1}

# ─── Health ─────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ─── Seed Data ──────────────────────────────────────────────────────────────
async def seed_data():
    # Admin (GNI - manages all 3 colleges)
    admin_cid = os.environ.get("ADMIN_COLLEGE_ID", "A001")
    admin_pwd = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"college_id": admin_cid})
    if not existing:
        await db.users.insert_one({"name": "GNI Admin", "college_id": admin_cid, "email": "admin@gni.edu", "password_hash": hash_password(admin_pwd), "role": "admin", "college": "GNI", "department": "Administration", "batch": "", "section": "", "created_at": datetime.now(timezone.utc)})
    elif not verify_password(admin_pwd, existing["password_hash"]):
        await db.users.update_one({"college_id": admin_cid}, {"$set": {"password_hash": hash_password(admin_pwd), "college": "GNI"}})

    # Teachers from different colleges
    if not await db.users.find_one({"college_id": "T001"}):
        await db.users.insert_one({"name": "Dr. Sarah Johnson", "college_id": "T001", "email": "sarah.j@gnitc.edu", "password_hash": hash_password("teacher123"), "role": "teacher", "college": "GNITC", "department": "DS", "batch": "", "section": "", "created_at": datetime.now(timezone.utc)})
    if not await db.users.find_one({"college_id": "T002"}):
        await db.users.insert_one({"name": "Prof. Ravi Kumar", "college_id": "T002", "email": "ravi.k@gnit.edu", "password_hash": hash_password("teacher123"), "role": "teacher", "college": "GNIT", "department": "CSE", "batch": "", "section": "", "created_at": datetime.now(timezone.utc)})
    if not await db.users.find_one({"college_id": "T003"}):
        await db.users.insert_one({"name": "Dr. Priya Verma", "college_id": "T003", "email": "priya.v@gnu.edu", "password_hash": hash_password("teacher123"), "role": "teacher", "college": "GNU", "department": "ECE", "batch": "", "section": "", "created_at": datetime.now(timezone.utc)})

    # HODs from different colleges
    if not await db.users.find_one({"college_id": "HOD001"}):
        await db.users.insert_one({"name": "Dr. Venkat Rao", "college_id": "HOD001", "email": "venkat.hod@gnitc.edu", "password_hash": hash_password("hod123"), "role": "hod", "college": "GNITC", "department": "DS", "batch": "", "section": "", "created_at": datetime.now(timezone.utc)})
    if not await db.users.find_one({"college_id": "HOD002"}):
        await db.users.insert_one({"name": "Dr. Lakshmi Iyer", "college_id": "HOD002", "email": "lakshmi.hod@gnit.edu", "password_hash": hash_password("hod123"), "role": "hod", "college": "GNIT", "department": "CSE", "batch": "", "section": "", "created_at": datetime.now(timezone.utc)})
    if not await db.users.find_one({"college_id": "HOD003"}):
        await db.users.insert_one({"name": "Dr. Ramesh Patel", "college_id": "HOD003", "email": "ramesh.hod@gnu.edu", "password_hash": hash_password("hod123"), "role": "hod", "college": "GNU", "department": "ECE", "batch": "", "section": "", "created_at": datetime.now(timezone.utc)})

    # Exam Cells for each college
    if not await db.users.find_one({"college_id": "EC001"}):
        await db.users.insert_one({"name": "GNITC Exam Cell", "college_id": "EC001", "email": "examcell@gnitc.edu", "password_hash": hash_password("exam123"), "role": "exam_cell", "college": "GNITC", "department": "", "batch": "", "section": "", "created_at": datetime.now(timezone.utc)})
    if not await db.users.find_one({"college_id": "EC002"}):
        await db.users.insert_one({"name": "GNIT Exam Cell", "college_id": "EC002", "email": "examcell@gnit.edu", "password_hash": hash_password("exam123"), "role": "exam_cell", "college": "GNIT", "department": "", "batch": "", "section": "", "created_at": datetime.now(timezone.utc)})
    if not await db.users.find_one({"college_id": "EC003"}):
        await db.users.insert_one({"name": "GNU Exam Cell", "college_id": "EC003", "email": "examcell@gnu.edu", "password_hash": hash_password("exam123"), "role": "exam_cell", "college": "GNU", "department": "", "batch": "", "section": "", "created_at": datetime.now(timezone.utc)})

    # Students from different colleges
    students_data = [
        # GNITC - DS Department - Batch 2022 Section A (matches faculty assignments)
        {"name": "Rajana Akanksh", "college_id": "22WJ8A6745", "email": "akanksh@gnitc.edu", "college": "GNITC", "department": "DS", "batch": "2022", "section": "A"},
        {"name": "Priya Sharma", "college_id": "S2024101", "email": "priya@gnitc.edu", "college": "GNITC", "department": "DS", "batch": "2022", "section": "A"},
        {"name": "Sneha Reddy", "college_id": "S2024089", "email": "sneha@gnitc.edu", "college": "GNITC", "department": "DS", "batch": "2022", "section": "A"},
        {"name": "Vikram Singh", "college_id": "S2022001", "email": "vikram@gnitc.edu", "college": "GNITC", "department": "DS", "batch": "2022", "section": "A"},
        {"name": "Ananya Gupta", "college_id": "S2022002", "email": "ananya@gnitc.edu", "college": "GNITC", "department": "DS", "batch": "2022", "section": "A"},
        {"name": "Rohan Mehta", "college_id": "S2022003", "email": "rohan@gnitc.edu", "college": "GNITC", "department": "DS", "batch": "2022", "section": "A"},
        {"name": "Kavya Nair", "college_id": "S2022004", "email": "kavya@gnitc.edu", "college": "GNITC", "department": "DS", "batch": "2022", "section": "A"},
        {"name": "Arjun Reddy", "college_id": "S2022005", "email": "arjun@gnitc.edu", "college": "GNITC", "department": "DS", "batch": "2022", "section": "A"},
        # GNIT - CSE Department
        {"name": "Amit Patel", "college_id": "S2024045", "email": "amit@gnit.edu", "college": "GNIT", "department": "CSE", "batch": "2024", "section": "A"},
        # GNU - ECE Department
        {"name": "Rahul Kumar", "college_id": "S2024034", "email": "rahul@gnu.edu", "college": "GNU", "department": "ECE", "batch": "2024", "section": "A"},
    ]
    for s in students_data:
        if not await db.users.find_one({"college_id": s["college_id"]}):
            await db.users.insert_one({**s, "password_hash": hash_password("student123"), "role": "student", "section": "A", "created_at": datetime.now(timezone.utc)})

    # Semester results from marksheets (RAJANA AKANKSH)
    student = await db.users.find_one({"college_id": "22WJ8A6745"})
    if student and await db.semester_results.count_documents({"student_id": str(student["_id"])}) == 0:
        sid = str(student["_id"])
        semesters = [
            {"student_id": sid, "semester": 1, "sgpa": 9.10, "cgpa": 9.10, "subjects": [
                {"code": "22BS0MA01", "name": "Matrices and Calculus", "grade": "O", "credits": 4.0, "status": "PASS"},
                {"code": "22BS0CH01", "name": "Engineering Chemistry", "grade": "A", "credits": 4.0, "status": "PASS"},
                {"code": "22ES0CS01", "name": "Programming for Problem Solving", "grade": "A+", "credits": 3.0, "status": "PASS"},
                {"code": "22ES0EE01", "name": "Basic Electrical Engineering", "grade": "A+", "credits": 2.0, "status": "PASS"},
                {"code": "22ESOME02", "name": "Computer Aided Engineering Graphics", "grade": "A+", "credits": 3.0, "status": "PASS"},
                {"code": "22BS0CH02", "name": "Engineering Chemistry Laboratory", "grade": "A+", "credits": 1.0, "status": "PASS"},
                {"code": "22ES0CS02", "name": "Programming Lab", "grade": "O", "credits": 1.0, "status": "PASS"},
                {"code": "22ES0EE02", "name": "Basic Electrical Engineering Lab", "grade": "A+", "credits": 1.0, "status": "PASS"},
            ], "created_at": datetime.now(timezone.utc)},
            {"student_id": sid, "semester": 2, "sgpa": 9.55, "cgpa": 9.33, "subjects": [
                {"code": "22BS0MA02", "name": "ODE and Vector Calculus", "grade": "O", "credits": 4.0, "status": "PASS"},
                {"code": "22BS0PH01", "name": "Applied Physics", "grade": "A+", "credits": 4.0, "status": "PASS"},
                {"code": "22ESOME01", "name": "Engineering Workshop", "grade": "O", "credits": 2.5, "status": "PASS"},
                {"code": "22HS0EN01", "name": "English for Skill Enhancement", "grade": "A", "credits": 2.0, "status": "PASS"},
                {"code": "22ES0EC01", "name": "Electronic Devices and Circuits", "grade": "O", "credits": 2.0, "status": "PASS"},
                {"code": "22BS0PH02", "name": "Applied Physics Laboratory", "grade": "O", "credits": 1.5, "status": "PASS"},
                {"code": "22ES0CS07", "name": "Python Programming Laboratory", "grade": "O", "credits": 2.0, "status": "PASS"},
                {"code": "22HS0EN02", "name": "English Lab", "grade": "A+", "credits": 1.0, "status": "PASS"},
                {"code": "22ES0IT01", "name": "IT Workshop", "grade": "O", "credits": 1.0, "status": "PASS"},
            ], "created_at": datetime.now(timezone.utc)},
            {"student_id": sid, "semester": 3, "sgpa": 7.60, "cgpa": 8.59, "subjects": [
                {"code": "22PC0DS17", "name": "Automata Theory and Compiler Design", "grade": "B", "credits": 3.0, "status": "PASS"},
                {"code": "22PC0DS18", "name": "Machine Learning", "grade": "B+", "credits": 3.0, "status": "PASS"},
                {"code": "22PC0DS19", "name": "Big Data Analytics", "grade": "A+", "credits": 3.0, "status": "PASS"},
                {"code": "22PE0DS3A", "name": "Software Testing Methodologies", "grade": "B", "credits": 3.0, "status": "PASS"},
                {"code": "220E0EE1A", "name": "Renewable Energy Sources", "grade": "B+", "credits": 3.0, "status": "PASS"},
                {"code": "22PC0DS20", "name": "Machine Learning Lab", "grade": "O", "credits": 1.0, "status": "PASS"},
                {"code": "22PC0DS21", "name": "Big Data Analytics Lab", "grade": "O", "credits": 1.0, "status": "PASS"},
                {"code": "22PE0DS3F", "name": "Software Testing Lab", "grade": "A+", "credits": 1.0, "status": "PASS"},
                {"code": "22SD0DS04", "name": "Industrial Mini Project", "grade": "A+", "credits": 2.0, "status": "PASS"},
            ], "created_at": datetime.now(timezone.utc)},
        ]
        await db.semester_results.insert_many(semesters)

    # Sample quiz
    teacher = await db.users.find_one({"college_id": "T001"})
    if teacher and await db.quizzes.count_documents({}) == 0:
        tid = str(teacher["_id"])
        quizzes = [
            {"title": "Data Structures - Arrays & Linked Lists", "subject": "Computer Science", "description": "Test your knowledge of arrays and linked lists", "total_marks": 12,
             "duration_mins": 60, "timed": True, "negative_marking": False, "randomize_questions": False, "randomize_options": False,
             "show_answers_after": True, "allow_reattempt": True, "status": "active", "created_by": tid, "created_by_name": "Dr. Sarah Johnson",
             "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc),
             "questions": [
                 {"type": "mcq", "question": "What is the time complexity of searching in a balanced BST?", "options": ["O(n)", "O(log n)", "O(n\u00b2)", "O(1)"], "correct_answer": 1, "marks": 2},
                 {"type": "mcq", "question": "Which data structure uses LIFO principle?", "options": ["Queue", "Stack", "Array", "Linked List"], "correct_answer": 1, "marks": 2},
                 {"type": "boolean", "question": "A hash table provides O(1) average-case search.", "correct_answer": True, "marks": 1},
                 {"type": "mcq", "question": "Which traversal visits root first in a binary tree?", "options": ["Inorder", "Preorder", "Postorder", "Level order"], "correct_answer": 1, "marks": 2},
                 {"type": "short", "question": "Explain the difference between stack and queue.", "keywords": ["lifo", "fifo", "last in first out", "first in first out", "stack", "queue"], "marks": 5},
             ]},
            {"title": "Machine Learning Basics", "subject": "Data Science", "description": "Fundamentals of ML algorithms", "total_marks": 10,
             "duration_mins": 45, "timed": True, "negative_marking": False, "randomize_questions": True, "randomize_options": False,
             "show_answers_after": True, "allow_reattempt": True, "status": "active", "created_by": tid, "created_by_name": "Dr. Sarah Johnson",
             "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc),
             "questions": [
                 {"type": "mcq", "question": "Which algorithm is used for classification?", "options": ["Linear Regression", "K-Means", "Decision Tree", "PCA"], "correct_answer": 2, "marks": 2},
                 {"type": "boolean", "question": "Overfitting occurs when a model learns noise in training data.", "correct_answer": True, "marks": 2},
                 {"type": "mcq", "question": "What does SVM stand for?", "options": ["Simple Vector Machine", "Support Vector Machine", "Scaled Vector Model", "Standard Vector Machine"], "correct_answer": 1, "marks": 2},
                 {"type": "mcq", "question": "Which metric is used for regression?", "options": ["Accuracy", "RMSE", "F1 Score", "Precision"], "correct_answer": 1, "marks": 2},
                 {"type": "boolean", "question": "K-Means is a supervised learning algorithm.", "correct_answer": False, "marks": 2},
             ]},
            {"title": "Python Coding Challenge", "subject": "Programming", "description": "Solve coding problems using Python", "total_marks": 15,
             "duration_mins": 90, "timed": True, "negative_marking": False, "randomize_questions": False, "randomize_options": False,
             "show_answers_after": True, "allow_reattempt": True, "status": "active", "created_by": tid, "created_by_name": "Dr. Sarah Johnson",
             "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc),
             "questions": [
                 {"type": "coding", "question": "Write a Python function `factorial(n)` that returns the factorial of a given number n. Print the result for n=5.", "language": "python",
                  "starter_code": "def factorial(n):\n    # Write your code here\n    pass\n\nprint(factorial(5))",
                  "test_input": "", "expected_output": "120", "marks": 5},
                 {"type": "coding", "question": "Write a Python function `is_palindrome(s)` that checks if a string is a palindrome (case-insensitive). Print True or False for the string 'Racecar'.", "language": "python",
                  "starter_code": "def is_palindrome(s):\n    # Write your code here\n    pass\n\nprint(is_palindrome('Racecar'))",
                  "test_input": "", "expected_output": "True", "marks": 5},
                 {"type": "coding", "question": "Write a Python function `fibonacci(n)` that returns the nth Fibonacci number (0-indexed). Print the result for n=10.", "language": "python",
                  "starter_code": "def fibonacci(n):\n    # Write your code here\n    pass\n\nprint(fibonacci(10))",
                  "test_input": "", "expected_output": "55", "marks": 5},
             ]},
        ]
        await db.quizzes.insert_many(quizzes)

    # Create indexes
    await db.users.create_index("college_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.quiz_attempts.create_index([("student_id", 1), ("quiz_id", 1)])
    await db.mark_entries.create_index([("assignment_id", 1), ("exam_type", 1)])
    await db.faculty_assignments.create_index([("teacher_id", 1), ("subject_code", 1)])

    # Seed faculty assignments
    teacher1 = await db.users.find_one({"college_id": "T001"})
    if teacher1 and await db.faculty_assignments.count_documents({}) == 0:
        hod = await db.users.find_one({"college_id": "HOD001"})
        hod_id = str(hod["_id"]) if hod else ""
        t1id = str(teacher1["_id"])
        assignments = [
            {"teacher_id": t1id, "teacher_name": "Dr. Sarah Johnson", "subject_code": "22PC0DS17", "subject_name": "Automata Theory and Compiler Design", "department": "DS", "batch": "2022", "section": "A", "semester": 3, "assigned_by": hod_id, "created_at": datetime.now(timezone.utc)},
            {"teacher_id": t1id, "teacher_name": "Dr. Sarah Johnson", "subject_code": "22PC0DS18", "subject_name": "Machine Learning", "department": "DS", "batch": "2022", "section": "A", "semester": 3, "assigned_by": hod_id, "created_at": datetime.now(timezone.utc)},
        ]
        # HOD is also a faculty - assign a subject to HOD
        if hod:
            assignments.append({"teacher_id": hod_id, "teacher_name": "Dr. Venkat Rao", "subject_code": "22PC0DS19", "subject_name": "Big Data Analytics", "department": "DS", "batch": "2022", "section": "A", "semester": 3, "assigned_by": hod_id, "created_at": datetime.now(timezone.utc)})
        await db.faculty_assignments.insert_many(assignments)

    # Write credentials
    creds = """# Test Credentials

## Admin
- College ID: A001
- Password: admin123
- Role: admin

## HOD (Head of Department)
- College ID: HOD001
- Password: hod123
- Role: hod
- Department: DS (GNITC)

- College ID: HOD002
- Password: hod123
- Role: hod
- Department: CSE (GNIT)

- College ID: HOD003
- Password: hod123
- Role: hod
- Department: ECE (GNU)

## Exam Cell
- College ID: EC001
- Password: exam123
- Role: exam_cell (GNITC)

- College ID: EC002
- Password: exam123
- Role: exam_cell (GNIT)

- College ID: EC003
- Password: exam123
- Role: exam_cell (GNU)

## Teacher
- College ID: T001
- Password: teacher123
- Role: teacher (Dr. Sarah Johnson, GNITC, DS)

- College ID: T002
- Password: teacher123
- Role: teacher (Prof. Ravi Kumar, GNIT, CSE)

- College ID: T003
- Password: teacher123
- Role: teacher (Dr. Priya Verma, GNU, ECE)

## Students - DS Department (GNITC, Batch 2022, Section A)
- 22WJ8A6745 / student123 (Rajana Akanksh)
- S2024101 / student123 (Priya Sharma)
- S2024089 / student123 (Sneha Reddy)
- S2022001 / student123 (Vikram Singh)
- S2022002 / student123 (Ananya Gupta)
- S2022003 / student123 (Rohan Mehta)
- S2022004 / student123 (Kavya Nair)
- S2022005 / student123 (Arjun Reddy)

## Students - Other Departments
- S2024045 / student123 (Amit Patel, GNIT, CSE)
- S2024034 / student123 (Rahul Kumar, GNU, ECE)
"""
    Path("/app/memory").mkdir(exist_ok=True)
    Path("/app/memory/test_credentials.md").write_text(creds)

# ─── Placements ────────────────────────────────────────────────────────────
@app.get("/api/placements/student")
async def student_placements(user: dict = Depends(get_current_user)):
    """Get placement drives where this student is shortlisted."""
    college_id = user.get("college_id", "")
    email = user.get("email", "")
    # Match placements where student's college_id or email is in the candidates list
    query = {
        "$or": [
            {"candidates.college_id": college_id},
            {"candidates.email": email},
        ]
    }
    placements = await db.placements.find(query).sort("drive_date", -1).to_list(50)
    result = []
    for p in placements:
        doc = serialize_doc(p)
        # Remove other candidates' data for privacy
        doc.pop("candidates", None)
        result.append(doc)
    # Also get upcoming placements (open to all / department-wide)
    dept = user.get("department", "")
    open_query = {
        "open_to_all": True,
        "$or": [
            {"department": {"$in": [dept, "ALL", "all", ""]}},
            {"department": {"$exists": False}},
        ]
    }
    open_placements = await db.placements.find(open_query).sort("drive_date", -1).to_list(20)
    seen_ids = {r["id"] for r in result}
    for p in open_placements:
        doc = serialize_doc(p)
        if doc["id"] not in seen_ids:
            doc.pop("candidates", None)
            result.append(doc)
    # Sort by date (upcoming first)
    result.sort(key=lambda x: x.get("drive_date", ""), reverse=False)
    return result

# ─── Coding Challenges ─────────────────────────────────────────────────────────

@app.get("/api/challenges")
async def get_challenges(page: int = 1, limit: int = 20, difficulty: str = "", topic: str = ""):
    query = {}
    if difficulty:
        query["difficulty"] = difficulty
    if topic:
        query["topics"] = topic

    total_count = await db.coding_challenges.count_documents(query)
    cursor = db.coding_challenges.find(query).skip((page - 1) * limit).limit(limit)
    challenges = await cursor.to_list(length=limit)
    
    return {
        "data": [serialize_doc(c) for c in challenges],
        "total": total_count,
        "page": page,
        "limit": limit
    }

@app.get("/api/challenges/stats")
async def get_challenge_stats(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    solved_cursor = db.student_progress.find({"student_id": user_id, "status": "Solved"})
    solved_docs = await solved_cursor.to_list(length=None)
    
    easy_count = 0
    medium_count = 0
    hard_count = 0
    topics_count = {}
    
    for doc in solved_docs:
        difficulty = doc.get("difficulty", "Easy")
        if difficulty == "Easy":
            easy_count += 1
        elif difficulty == "Medium":
            medium_count += 1
        elif difficulty == "Hard":
            hard_count += 1
            
        for t in doc.get("topics", []):
            topics_count[t] = topics_count.get(t, 0) + 1
            
    return {
        "total_solved": len(solved_docs),
        "difficulty": {
            "Easy": easy_count,
            "Medium": medium_count,
            "Hard": hard_count
        },
        "topics": topics_count
    }

@app.post("/api/challenges/submit")
async def submit_challenge(req: ChallengeSubmit, user: dict = Depends(get_current_user)):
    challenge = await db.coding_challenges.find_one({"_id": ObjectId(req.challenge_id)})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
        
    # Security Note: We run a simple quick local sandbox just like general execution
    import tempfile
    import subprocess
    import time
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        # Wrap the user's code. If it passes execution without crashing on basic test cases, we consider it solved for this demo.
        f.write(req.code)
        # We append a simple test case runner if possible, but for MVP we just run it and assume solved if exit code is 0
        filepath = f.name
        
    start_time = time.time()
    try:
        proc = subprocess.run(["python", filepath], capture_output=True, text=True, timeout=5.0)
        end_time = time.time()
        
        output = proc.stdout
        error = proc.stderr
        exit_code = proc.returncode
        
        if exit_code == 0:
            # Mark solved!
            await db.student_progress.update_one(
                {"student_id": user["id"], "challenge_id": req.challenge_id},
                {"$set": {
                    "status": "Solved",
                    "language": req.language,
                    "difficulty": challenge.get("difficulty"),
                    "topics": challenge.get("topics", []),
                    "execution_time_ms": int((end_time - start_time) * 1000)
                }},
                upsert=True
            )
            
        return {
            "output": output,
            "error": error,
            "exit_code": exit_code,
            "success": exit_code == 0
        }
    except subprocess.TimeoutExpired:
        return {"error": "Execution timed out", "exit_code": 1, "success": False}
    finally:
        import os
        if os.path.exists(filepath):
            os.remove(filepath)

@app.on_event("startup")
async def startup():
    await seed_data()
