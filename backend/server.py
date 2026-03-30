from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / '.env')

import os
import bcrypt
import jwt
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request, Response, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

# ─── App & DB ───────────────────────────────────────────────────────────────
app = FastAPI(title="QuizPortal API")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"

client = AsyncIOMotorClient(MONGO_URL)
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
        "department": req.department, "batch": req.batch, "section": req.section,
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
async def list_users(role: Optional[str] = None, user: dict = Depends(require_role("admin", "teacher"))):
    query = {}
    if role:
        query["role"] = role
    users = await db.users.find(query, {"password_hash": 0}).to_list(500)
    return [serialize_doc(u) for u in users]

@app.get("/api/users/{user_id}")
async def get_user(user_id: str, user: dict = Depends(require_role("admin", "teacher"))):
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
        "department": req.department, "batch": req.batch, "section": req.section,
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

@app.post("/api/attempts/{attempt_id}/violation")
async def log_violation(attempt_id: str, user: dict = Depends(get_current_user)):
    await db.quiz_attempts.update_one({"_id": ObjectId(attempt_id)}, {"$inc": {"violations": 1}})
    return {"message": "Violation logged"}

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
        if q["type"] == "mcq":
            if student_answer is not None and student_answer == q.get("correct_answer"):
                is_correct = True
                marks_awarded = q.get("marks", 0)
            elif student_answer is not None and quiz.get("negative_marking"):
                marks_awarded = -1
        elif q["type"] == "boolean":
            if student_answer is not None and student_answer == q.get("correct_answer"):
                is_correct = True
                marks_awarded = q.get("marks", 0)
        elif q["type"] == "multiple":
            correct = set(q.get("correct_answers", []))
            selected = set(student_answer) if isinstance(student_answer, list) else set()
            if correct == selected:
                is_correct = True
                marks_awarded = q.get("marks", 0)
        elif q["type"] == "short":
            keywords = [kw.lower() for kw in q.get("keywords", [])]
            if student_answer and keywords:
                answer_lower = str(student_answer).lower()
                matches = sum(1 for kw in keywords if kw in answer_lower)
                ratio = matches / len(keywords) if keywords else 0
                marks_awarded = round(q.get("marks", 0) * ratio)
                is_correct = ratio >= 0.5
            elif student_answer:
                marks_awarded = round(q.get("marks", 0) * 0.5)
        score += marks_awarded
        results.append({
            "question_index": i, "question": q.get("question", ""), "type": q["type"],
            "student_answer": student_answer, "correct_answer": q.get("correct_answer") or q.get("correct_answers"),
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
    attempts = await db.quiz_attempts.find({"student_id": user["id"], "status": "submitted"}).sort("submitted_at", -1).to_list(10)
    active_quizzes = await db.quizzes.find({"status": "active"}, {"questions": 0}).sort("created_at", -1).to_list(10)
    semesters = await db.semester_results.find({"student_id": user["id"]}).sort("semester", -1).to_list(1)
    total_attempts = await db.quiz_attempts.count_documents({"student_id": user["id"], "status": "submitted"})
    avg = 0
    if attempts:
        avg = round(sum(a.get("percentage", 0) for a in attempts[:total_attempts]) / total_attempts, 1) if total_attempts > 0 else 0
    return {
        "recent_results": [serialize_doc(a) for a in attempts[:5]],
        "upcoming_quizzes": [serialize_doc(q) for q in active_quizzes],
        "cgpa": semesters[0]["cgpa"] if semesters else 0,
        "total_quizzes": total_attempts,
        "avg_score": avg,
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
    total_quizzes = await db.quizzes.count_documents({})
    active_quizzes = await db.quizzes.count_documents({"status": "active"})
    dept_pipeline = [{"$match": {"role": "student"}}, {"$group": {"_id": "$department", "count": {"$sum": 1}}}]
    depts = await db.users.aggregate(dept_pipeline).to_list(20)
    return {
        "total_students": total_students, "total_teachers": total_teachers,
        "total_quizzes": total_quizzes, "active_quizzes": active_quizzes,
        "departments": [{"name": d["_id"] or "Unassigned", "count": d["count"]} for d in depts],
    }

# ─── Health ─────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ─── Seed Data ──────────────────────────────────────────────────────────────
async def seed_data():
    # Admin
    admin_cid = os.environ.get("ADMIN_COLLEGE_ID", "A001")
    admin_pwd = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"college_id": admin_cid})
    if not existing:
        await db.users.insert_one({"name": "Admin", "college_id": admin_cid, "email": "admin@quizportal.edu", "password_hash": hash_password(admin_pwd), "role": "admin", "department": "Administration", "batch": "", "section": "", "created_at": datetime.now(timezone.utc)})
    elif not verify_password(admin_pwd, existing["password_hash"]):
        await db.users.update_one({"college_id": admin_cid}, {"$set": {"password_hash": hash_password(admin_pwd)}})

    # Teacher
    if not await db.users.find_one({"college_id": "T001"}):
        await db.users.insert_one({"name": "Dr. Sarah Johnson", "college_id": "T001", "email": "sarah.j@quizportal.edu", "password_hash": hash_password("teacher123"), "role": "teacher", "department": "DS", "batch": "", "section": "", "created_at": datetime.now(timezone.utc)})

    # Students from marksheets
    students_data = [
        {"name": "Rajana Akanksh", "college_id": "22WJ8A6745", "email": "akanksh@quizportal.edu", "department": "DS", "batch": "2022"},
        {"name": "Priya Sharma", "college_id": "S2024101", "email": "priya@quizportal.edu", "department": "DS", "batch": "2024"},
        {"name": "Amit Patel", "college_id": "S2024045", "email": "amit@quizportal.edu", "department": "ECE", "batch": "2024"},
        {"name": "Sneha Reddy", "college_id": "S2024089", "email": "sneha@quizportal.edu", "department": "DS", "batch": "2024"},
        {"name": "Rahul Kumar", "college_id": "S2024034", "email": "rahul@quizportal.edu", "department": "MECH", "batch": "2024"},
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
                 {"type": "mcq", "question": "What is the time complexity of searching in a balanced BST?", "options": ["O(n)", "O(log n)", "O(n²)", "O(1)"], "correct_answer": 1, "marks": 2},
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
        ]
        await db.quizzes.insert_many(quizzes)

    # Create indexes
    await db.users.create_index("college_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.quiz_attempts.create_index([("student_id", 1), ("quiz_id", 1)])

    # Write credentials
    creds = f"""# Test Credentials\n\n## Admin\n- College ID: A001\n- Password: admin123\n- Role: admin\n\n## Teacher\n- College ID: T001\n- Password: teacher123\n- Role: teacher\n\n## Student (from marksheet)\n- College ID: 22WJ8A6745\n- Password: student123\n- Role: student\n\n## Other Students\n- S2024101 / student123 (Priya Sharma)\n- S2024045 / student123 (Amit Patel)\n- S2024089 / student123 (Sneha Reddy)\n- S2024034 / student123 (Rahul Kumar)\n\n## Auth Endpoints\n- POST /api/auth/login\n- POST /api/auth/register\n- GET /api/auth/me\n- POST /api/auth/logout\n"""
    Path("/app/memory").mkdir(exist_ok=True)
    Path("/app/memory/test_credentials.md").write_text(creds)

@app.on_event("startup")
async def startup():
    await seed_data()
