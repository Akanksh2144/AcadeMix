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
import certifi
import io
import csv

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, delete, update
from sqlalchemy.orm import selectinload
from database import get_db
import models
# tenant.py archived to backend/legacy/ — functions inlined or removed below

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

import redis as pyredis
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ─── App & DB ───────────────────────────────────────────────────────────────
app = FastAPI(title="QuizPortal API")

sentry_dsn = os.environ.get("SENTRY_DSN", "")

def _scrub_pii(event, hint):
    """Aggressively strip PII from the event before it's sent to Sentry"""
    if 'request' in event and 'data' in event['request']:
        data = event['request']['data']
        if isinstance(data, dict):
            for pii_key in ['email', 'password', 'name', 'college_id']:
                if pii_key in data:
                    data[pii_key] = '[FILTERED]'
    return event

if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        enable_tracing=True,
        traces_sample_rate=1.0,
        send_default_pii=False,
        before_send=_scrub_pii,
        integrations=[FastApiIntegration()],
    )

# MongoDB Removed - Using SQLAlchemy PostgreSQL via Supabase
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
code_runner_url = os.environ.get("CODE_RUNNER_URL", "http://localhost:8080")
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

redis_url = os.environ.get("REDIS_URL", "")
redis_client = pyredis.from_url(redis_url) if redis_url else None
if redis_url:
    limiter = Limiter(key_func=get_remote_address, storage_uri=redis_url)
else:
    limiter = Limiter(key_func=get_remote_address)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── Helpers ────────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, role: str, tenant_id: str = "", permissions: dict = None) -> str:
    perms = permissions or {}
    return jwt.encode({"sub": user_id, "role": role, "tenant_id": tenant_id, "permissions": perms, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}, JWT_SECRET, algorithm=JWT_ALGORITHM)

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

async def get_current_user(request: Request, session: AsyncSession = Depends(get_db)) -> dict:
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
        
        result = await session.execute(select(models.User).where(models.User.id == payload["sub"]))
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        user_dict = {
            "id": user.id,
            "role": user.role,
            "email": user.email,
            "name": user.name,
            "tenant_id": user.college_id,
            "college_id": user.college_id,
            "permissions": payload.get("permissions", {})
        }
        if user.profile_data:
            user_dict.update(user.profile_data)
            
        # tenant_id is always set from college_id via the SQLAlchemy user row — fallback to empty string
        if "tenant_id" not in user_dict:
            user_dict["tenant_id"] = user_dict.get("college_id", "")
        return user_dict
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except (jwt.InvalidTokenError, Exception):
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(*roles):
    async def check(request: Request, session: AsyncSession = Depends(get_db)):
        user = await get_current_user(request, session)
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return check

def require_permission(module: str, action: str):
    async def check(request: Request, session: AsyncSession = Depends(get_db)):
        user = await get_current_user(request, session)
        if user["role"] in ["super_admin", "admin"]:
            return user
        
        perms = user.get("permissions", {})
        module_perms = perms.get(module, [])
        if action not in module_perms:
            raise HTTPException(status_code=403, detail=f"Insufficient permissions: requires {module}.{action}")
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

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    college_id: Optional[str] = None # roll number / faculty ID
    department: Optional[str] = None
    batch: Optional[str] = None
    section: Optional[str] = None
    password: Optional[str] = None

class DepartmentCreate(BaseModel):
    name: str
    code: str

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None

class SectionCreate(BaseModel):
    department_id: str
    name: str

class SectionUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[str] = None

class RoleCreate(BaseModel):
    name: str
    permissions: dict = {}

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    permissions: Optional[dict] = None

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

class ViolationReport(BaseModel):
    violation_type: str = "tab_switch"  # tab_switch, fullscreen_exit, window_blur

# ─── Auth Routes ────────────────────────────────────────────────────────────
@app.post("/api/auth/login")
async def login(req: LoginRequest, response: Response, request: Request, session: AsyncSession = Depends(get_db)):
    key = f"login_failures:{req.college_id.upper()}"
    if redis_client:
        failures = redis_client.get(key)
        if failures and int(failures) >= 5:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 5 minutes.")

    # Find user by college_id stored in profile_data or by email
    query_str = req.college_id.strip()
    result = await session.execute(
        select(models.User).where(
            (models.User.profile_data["college_id"].astext == query_str.upper()) |
            (models.User.email.ilike(query_str))
        )
    )
    user = result.scalars().first()

    def _handle_failure():
        if redis_client:
            redis_client.incr(key)
            redis_client.expire(key, 300)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user:
        _handle_failure()
        
    if not verify_password(req.password, user.password_hash):
        _handle_failure()

    if redis_client:
        redis_client.delete(key)

    perms = {}
    if user.role not in ["student", "super_admin", "admin"]:
        role_result = await session.execute(select(models.Role).where(models.Role.name == user.role, models.Role.college_id == user.college_id))
        r = role_result.scalars().first()
        if r:
            perms = r.permissions

    tid = user.college_id or ""
    access = create_access_token(user.id, user.role, tid, perms)
    refresh = create_refresh_token(user.id)
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=86400)
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=604800)

    user_out = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "college_id": user.college_id,
        "tenant_id": user.college_id,
        "access_token": access,
    }
    if user.profile_data:
        user_out.update({k: v for k, v in user.profile_data.items() if k != "password_hash"})
    return user_out

@app.post("/api/auth/register")
async def register(req: RegisterRequest, response: Response):
    raise HTTPException(status_code=403, detail="Self-registration is disabled. Please contact your college administrator.")

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
async def list_users(role: Optional[str] = None, user: dict = Depends(require_role("admin", "teacher", "hod", "exam_cell")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.User).where(models.User.college_id == user["college_id"])
    if role:
        stmt = stmt.where(models.User.role == role)
    result = await session.execute(stmt)
    users = result.scalars().all()
    return [{
        "id": u.id, "name": u.name, "email": u.email, "role": u.role,
        "college_id": u.college_id, **(u.profile_data or {})
    } for u in users]

@app.get("/api/users/{user_id}")
async def get_user(user_id: str, user: dict = Depends(require_role("admin", "teacher", "hod", "exam_cell")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.User).where(models.User.id == user_id))
    u = result.scalars().first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "college_id": u.college_id, **(u.profile_data or {})}

@app.post("/api/users")
async def create_user(req: RegisterRequest, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    # Check duplicate college_id inside profile_data
    result = await session.execute(
        select(models.User).where(
            models.User.profile_data["college_id"].astext == req.college_id.upper()
        )
    )
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="College ID already exists")
    new_user = models.User(
        name=req.name,
        email=req.email.lower(),
        password_hash=hash_password(req.password),
        role=req.role,
        college_id=user["college_id"],
        profile_data={
            "college_id": req.college_id.upper(),
            "college": req.college,
            "department": req.department,
            "batch": req.batch,
            "section": req.section,
        }
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return {"id": new_user.id, "name": new_user.name, "email": new_user.email, "role": new_user.role, **(new_user.profile_data or {})}

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.User).where(models.User.id == user_id))
    u = result.scalars().first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    await session.delete(u)
    await session.commit()
    return {"message": "User deleted"}

@app.put("/api/users/{user_id}")
async def update_user(user_id: str, req: UserUpdate, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.User).where(models.User.id == user_id))
    u = result.scalars().first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
        
    if req.name is not None:
        u.name = req.name
    if req.email is not None:
        u.email = req.email.lower()
    if req.role is not None:
        u.role = req.role
    if req.password is not None and req.password.strip():
        u.password_hash = hash_password(req.password)
        
    profile = dict(u.profile_data or {})
    if req.college_id is not None:
        profile["college_id"] = req.college_id.upper()
    if req.department is not None:
        profile["department"] = req.department
    if req.batch is not None:
        profile["batch"] = req.batch
    if req.section is not None:
        profile["section"] = req.section
        
    u.profile_data = profile
    await session.commit()
    await session.refresh(u)
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "college_id": u.college_id, **(u.profile_data or {})}

@app.get("/api/departments")
async def list_departments(user: dict = Depends(require_role("admin", "teacher", "hod", "exam_cell")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.Department).where(models.Department.college_id == user["college_id"])
    result = await session.execute(stmt)
    return result.scalars().all()

@app.post("/api/departments")
async def create_department(req: DepartmentCreate, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    new_dept = models.Department(
        college_id=user["college_id"],
        name=req.name,
        code=req.code.upper()
    )
    session.add(new_dept)
    await session.commit()
    await session.refresh(new_dept)
    return new_dept

@app.put("/api/departments/{dept_id}")
async def update_department(dept_id: str, req: DepartmentUpdate, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Department).where(models.Department.id == dept_id))
    dept = result.scalars().first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    if req.name is not None:
        dept.name = req.name
    if req.code is not None:
        dept.code = req.code.upper()
    await session.commit()
    await session.refresh(dept)
    return dept

@app.delete("/api/departments/{dept_id}")
async def delete_department(dept_id: str, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Department).where(models.Department.id == dept_id))
    dept = result.scalars().first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    await session.delete(dept)
    await session.commit()
    return {"message": "Department deleted"}

@app.get("/api/sections")
async def list_sections(user: dict = Depends(require_role("admin", "teacher", "hod", "exam_cell", "student")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.Section).where(models.Section.college_id == user["college_id"])
    result = await session.execute(stmt)
    return result.scalars().all()

@app.post("/api/sections")
async def create_section(req: SectionCreate, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    # Verify department belongs to college
    dept_res = await session.execute(select(models.Department).where(models.Department.id == req.department_id, models.Department.college_id == user["college_id"]))
    if not dept_res.scalars().first():
        raise HTTPException(status_code=400, detail="Invalid department")
    new_sec = models.Section(college_id=user["college_id"], department_id=req.department_id, name=req.name.upper())
    session.add(new_sec)
    await session.commit()
    await session.refresh(new_sec)
    return new_sec

@app.put("/api/sections/{sec_id}")
async def update_section(sec_id: str, req: SectionUpdate, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Section).where(models.Section.id == sec_id, models.Section.college_id == user["college_id"]))
    sec = result.scalars().first()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")
    if req.name is not None:
        sec.name = req.name.upper()
    if req.department_id is not None:
        sec.department_id = req.department_id
    await session.commit()
    await session.refresh(sec)
    return sec

@app.delete("/api/sections/{sec_id}")
async def delete_section(sec_id: str, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Section).where(models.Section.id == sec_id, models.Section.college_id == user["college_id"]))
    sec = result.scalars().first()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")
    await session.delete(sec)
    await session.commit()
    return {"message": "Section deleted"}

@app.get("/api/roles")
async def list_roles(user: dict = Depends(require_role("admin", "teacher", "hod")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.Role).where(models.Role.college_id == user["college_id"])
    result = await session.execute(stmt)
    return result.scalars().all()

@app.post("/api/roles")
async def create_role(req: RoleCreate, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    new_role = models.Role(college_id=user["college_id"], name=req.name, permissions=req.permissions)
    session.add(new_role)
    await session.commit()
    await session.refresh(new_role)
    return new_role

@app.put("/api/roles/{role_id}")
async def update_role(role_id: str, req: RoleUpdate, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Role).where(models.Role.id == role_id, models.Role.college_id == user["college_id"]))
    role = result.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if req.name is not None:
        role.name = req.name
    if req.permissions is not None:
        role.permissions = req.permissions
    await session.commit()
    await session.refresh(role)
    return role

@app.delete("/api/roles/{role_id}")
async def delete_role(role_id: str, user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Role).where(models.Role.id == role_id, models.Role.college_id == user["college_id"]))
    role = result.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    await session.delete(role)
    await session.commit()
    return {"message": "Role deleted"}

# ─── Quiz Routes ────────────────────────────────────────────────────────────
@app.get("/api/quizzes")
async def list_quizzes(status: Optional[str] = None, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    stmt = select(models.Quiz).where(models.Quiz.college_id == user["college_id"])
    if status:
        stmt = stmt.where(models.Quiz.type == status)
    if user["role"] == "teacher":
        stmt = stmt.where(models.Quiz.faculty_id == user["id"])
    result = await session.execute(stmt.order_by(models.Quiz.created_at.desc()))
    quizzes = result.scalars().all()
    out = []
    for q in quizzes:
        # Fetch questions
        qr = await session.execute(select(models.Question).where(models.Question.quiz_id == q.id))
        questions = qr.scalars().all()
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

@app.post("/api/quizzes")
async def create_quiz(req: QuizCreate, user: dict = Depends(require_role("teacher", "admin")), session: AsyncSession = Depends(get_db)):
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

    await session.commit()
    await session.refresh(new_quiz)
    return {"id": new_quiz.id, "title": new_quiz.title, "subject": new_quiz.type, "duration_mins": new_quiz.duration_minutes}

@app.get("/api/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id))
    q = result.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not found")
    qr = await session.execute(select(models.Question).where(models.Question.quiz_id == q.id))
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

@app.get("/api/quizzes/live/{quiz_id}")
async def live_quiz_monitor(quiz_id: str, user: dict = Depends(require_role("teacher", "admin", "hod", "exam_cell")), session: AsyncSession = Depends(get_db)):
    quiz_r = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id))
    q = quiz_r.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not found")
    attempts_r = await session.execute(
        select(models.QuizAttempt).where(models.QuizAttempt.quiz_id == quiz_id)
    )
    attempts = attempts_r.scalars().all()
    student_ids = [a.student_id for a in attempts]
    students_r = await session.execute(
        select(models.User).where(models.User.id.in_(student_ids))
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
        answers = a.answers or []
        progress = sum(1 for ans in answers if ans is not None)
        live_data.append({
            "id": a.id,
            "name": student.name if student else "Unknown",
            "rollNo": (student.profile_data or {}).get("college_id", a.student_id) if student else a.student_id,
            "status": "active" if a.status == "in_progress" else "submitted",
            "progress": progress, "totalQuestions": len(answers),
            "violations": 0, "timeElapsed": max(0, time_elapsed),
            "startTime": a.start_time.strftime("%I:%M %p"),
            "submitTime": submit_time_str
        })
    return live_data

@app.patch("/api/quizzes/{quiz_id}")
async def update_quiz(quiz_id: str, updates: dict, user: dict = Depends(require_role("teacher", "admin")), session: AsyncSession = Depends(get_db)):
    result_r = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id))
    q = result_r.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if "title" in updates: q.title = updates["title"]
    if "subject" in updates: q.subject = updates["subject"]
    if "status" in updates: q.status = updates["status"]
    if "duration_mins" in updates: q.duration_mins = updates["duration_mins"]
    if "total_marks" in updates: q.total_marks = updates["total_marks"]
    if "questions" in updates:
        q.questions = updates["questions"]
        q.total_marks = sum(qu.get("marks", 0) for qu in updates["questions"])
    await session.commit()
    return {"id": q.id, "title": q.title, "status": q.status, "subject": q.subject}

@app.delete("/api/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: str, user: dict = Depends(require_role("teacher", "admin")), session: AsyncSession = Depends(get_db)):
    result_r = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id))
    quiz = result_r.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    await session.delete(quiz)
    await session.commit()
    return {"message": "Quiz deleted"}

@app.post("/api/quizzes/{quiz_id}/publish")
async def publish_quiz(quiz_id: str, user: dict = Depends(require_role("teacher", "admin")), session: AsyncSession = Depends(get_db)):
    result_r = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id))
    quiz = result_r.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    quiz.status = "active"
    await session.commit()
    return {"message": "Quiz published"}

@app.post("/api/quizzes/{quiz_id}/extend-time")
async def extend_quiz_time(quiz_id: str, body: dict = {}, user: dict = Depends(require_role("teacher", "admin", "hod")), session: AsyncSession = Depends(get_db)):
    mins = int(body.get("mins", 10)) if body else 10
    if mins < 1 or mins > 300:
        raise HTTPException(status_code=400, detail="Minutes must be between 1 and 300")
    result_r = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id))
    quiz = result_r.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    quiz.duration_mins = (quiz.duration_mins or 60) + mins
    await session.commit()
    return {"message": f"Extended by {mins} mins. New duration: {quiz.duration_mins} mins", "duration_mins": quiz.duration_mins}

@app.post("/api/quizzes/{quiz_id}/end")
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

@app.post("/api/quizzes/{quiz_id}/start")
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

@app.post("/api/attempts/{attempt_id}/answer")
@limiter.limit("120/minute")
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

    # Save answer as a QuizAnswer row
    existing_ans = await session.execute(
        select(models.QuizAnswer).where(
            models.QuizAnswer.attempt_id == attempt_id,
            models.QuizAnswer.question_id == str(req.question_index)  # using index as key
        )
    )
    ans_row = existing_ans.scalars().first()
    if ans_row:
        ans_row.code_submitted = str(req.answer) if req.answer is not None else None
    else:
        ans_row = models.QuizAnswer(
            attempt_id=attempt_id,
            question_id=str(req.question_index),
            code_submitted=str(req.answer) if req.answer is not None else None,
        )
        session.add(ans_row)
    # Track first interaction time
    if not attempt.start_time:
        attempt.start_time = datetime.now(timezone.utc)
    await session.commit()
    return {"message": "Answer saved", "question_index": req.question_index}

@app.post("/api/attempts/{attempt_id}/violation")
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
    await session.commit()
    # Count total violations for this attempt
    count_r = await session.execute(
        select(models.ProctoringViolation).where(models.ProctoringViolation.attempt_id == attempt_id)
    )
    total = len(count_r.scalars().all())
    return {"message": "Violation logged", "total_violations": total}

@app.post("/api/attempts/{attempt_id}/submit")
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

    questions_r = await session.execute(select(models.Question).where(models.Question.quiz_id == quiz.id))
    questions = questions_r.scalars().all()

    answers_r = await session.execute(select(models.QuizAnswer).where(models.QuizAnswer.attempt_id == attempt_id))
    answers_map = {a.question_id: a for a in answers_r.scalars().all()}

    score = 0.0
    results = []
    total_marks = sum(q.marks for q in questions)

    for i, q in enumerate(questions):
        content = q.content or {}
        student_answer = None
        ans_row = answers_map.get(str(i))
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

@app.get("/api/attempts/{attempt_id}/result")
async def get_attempt_result(attempt_id: str, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.QuizAttempt).where(models.QuizAttempt.id == attempt_id))
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

@app.get("/api/attempts")
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

# ─── Student Search & Profile (HOD / Admin) ───────────────────────────────
@app.get("/api/students/search")
async def search_students(q: str = "", department: Optional[str] = None, college: Optional[str] = None, user: dict = Depends(require_role("hod", "admin", "exam_cell", "teacher")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.User).where(models.User.role == "student")
    if q:
        stmt = stmt.where(
            models.User.name.ilike(f"%{q}%") |
            models.User.profile_data["college_id"].astext.ilike(f"%{q}%")
        )
    result = await session.execute(stmt.order_by(models.User.name))
    students = result.scalars().all()
    return [{"id": s.id, "name": s.name, "email": s.email, "role": s.role, **(s.profile_data or {})} for s in students[:200]]

@app.get("/api/students/{student_id}/profile")
async def student_profile(student_id: str, user: dict = Depends(require_role("hod", "admin", "exam_cell", "teacher")), session: AsyncSession = Depends(get_db)):
    student_r = await session.execute(select(models.User).where(models.User.id == student_id))
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
        select(models.MarkEntry).where(
            models.MarkEntry.student_id == student_id,
            models.MarkEntry.exam_type != "__assignment__"
        )
    )
    marks_rows = marks_r.scalars().all()
    mid_marks = [{
        "course_id": r.course_id, "exam_type": r.exam_type,
        "marks_obtained": r.marks_obtained, "max_marks": r.max_marks
    } for r in marks_rows]
    return {
        "student": {"id": student.id, "name": student.name, "email": student.email, **(student.profile_data or {})},
        "semesters": semesters,
        "quiz_attempts": [{"quiz_id": a.quiz_id, "score": a.final_score, "percentage": a.final_score,
                           "submitted_at": a.end_time.isoformat() if a.end_time else ""} for a in attempts[:10]],
        "mid_marks": mid_marks
    }

# ─── Semester Results ────────────────────────────────────────────────────────────
@app.get("/api/results/semester/{student_id}")
async def get_semester_results(student_id: str, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if user["role"] == "student" and user["id"] != student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await session.execute(
        select(models.SemesterGrade)
        .where(models.SemesterGrade.student_id == student_id)
        .order_by(models.SemesterGrade.semester.asc())
    )
    rows = result.scalars().all()
    from collections import defaultdict
    sem_map = defaultdict(list)
    for row in rows:
        sem_map[row.semester].append({"course_id": row.course_id, "grade": row.grade, "credits": row.credits_earned})
    return [
        {"student_id": student_id, "semester": sem, "subjects": subjects}
        for sem, subjects in sorted(sem_map.items())
    ]

@app.post("/api/results/semester")
async def create_semester_result(req: SemesterResultCreate, user: dict = Depends(require_role("teacher", "admin")), session: AsyncSession = Depends(get_db)):
    for subj in req.subjects:
        row = models.SemesterGrade(
            student_id=req.student_id,
            semester=req.semester,
            course_id=subj.get("code", subj.get("name", "UNKNOWN")),
            grade=subj.get("grade", "O"),
            credits_earned=int(subj.get("credits", 3)),
        )
        session.add(row)
    await session.commit()
    return {"message": "Semester result saved", "semester": req.semester, "student_id": req.student_id}

# ─── Analytics & Leaderboard ──────────────────────────────────────────────
@app.get("/api/analytics/student/{student_id}")
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

@app.get("/api/analytics/teacher/class-results")
async def class_results_analytics(user: dict = Depends(require_role("teacher", "hod", "exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    # Fetch assignment records (stored as MarkEntry with exam_type='__assignment__')
    stmt = select(models.MarkEntry).where(models.MarkEntry.exam_type == "__assignment__")
    if user["role"] == "teacher":
        stmt = stmt.where(models.MarkEntry.faculty_id == user["id"])
    result = await session.execute(stmt)
    assignments = result.scalars().all()

    assigned_classes = []
    class_details: dict = {}
    for a in assignments:
        meta = a.marks or {}
        class_key = f"{meta.get('subject_code', '')}_{meta.get('batch', '')}_{meta.get('section', '')}"
        if any(c.get("class_key") == class_key for c in assigned_classes):
            continue
        assigned_classes.append({
            "id": a.id, "class_key": class_key,
            "section": f"{meta.get('department','')} {meta.get('batch','')} {meta.get('section','')}",
            "department": meta.get("department", ""), "subject": meta.get("subject_name", ""),
            "batch": str(meta.get("batch", "")), "totalStudents": 0
        })
        class_details[class_key] = {"totalStudents": 0, "department": meta.get("department"),
                                    "batch": str(meta.get("batch", "")), "section": str(meta.get("section", ""))}

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

@app.get("/api/analytics/teacher/quiz-results/{quiz_id}")
async def get_quiz_detailed_analytics(quiz_id: str, department: str = "", batch: str = "", section: str = "", user: dict = Depends(require_role("teacher", "hod", "exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.User).where(models.User.role == "student")
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

@app.get("/api/leaderboard")
async def get_leaderboard(user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    attempts_r = await session.execute(
        select(models.QuizAttempt.student_id, models.QuizAttempt.final_score)
        .where(models.QuizAttempt.status == "submitted")
    )
    student_scores: dict = {}
    for sid, score in attempts_r.all():
        student_scores.setdefault(sid, []).append(score or 0)
    ranked = sorted(
        student_scores.items(),
        key=lambda x: sum(x[1]) / len(x[1]) if x[1] else 0,
        reverse=True
    )[:50]
    leaderboard = []
    for i, (sid, scores) in enumerate(ranked):
        student_r = await session.execute(select(models.User).where(models.User.id == sid))
        student = student_r.scalars().first()
        avg = round(sum(scores) / len(scores), 1) if scores else 0
        leaderboard.append({
            "rank": i + 1, "student_id": sid,
            "name": student.name if student else "",
            "college_id": (student.profile_data or {}).get("college_id", "") if student else "",
            "avg_score": avg, "quizzes_taken": len(scores), "cgpa": 0,
        })
    return leaderboard


# ─── Dashboard Stats ───────────────────────────────────────────────────────
@app.get("/api/dashboard/student")
async def student_dashboard(user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    # All submitted attempts
    attempts_r = await session.execute(
        select(models.QuizAttempt)
        .where(models.QuizAttempt.student_id == user["id"], models.QuizAttempt.status == "submitted")
        .order_by(models.QuizAttempt.end_time.desc())
    )
    all_attempts = attempts_r.scalars().all()

    # Active quizzes (Quiz model uses 'type' for subject, 'duration_minutes'; no status/total_marks columns)
    quizzes_r = await session.execute(
        select(models.Quiz).order_by(models.Quiz.created_at.desc())
    )
    active_quizzes_raw = quizzes_r.scalars().all()
    attempted_ids = {a.quiz_id for a in all_attempts}
    active_quizzes = [{
        "id": q.id, "title": q.title, "subject": q.type,
        "duration_mins": q.duration_minutes, "total_marks": 0,
        "already_attempted": q.id in attempted_ids
    } for q in active_quizzes_raw[:10]]

    # In-progress attempts
    prog_r = await session.execute(
        select(models.QuizAttempt)
        .where(models.QuizAttempt.student_id == user["id"], models.QuizAttempt.status == "in_progress")
    )
    in_progress = [{"id": a.id, "quiz_id": a.quiz_id, "status": a.status} for a in prog_r.scalars().all()]

    # Semester data
    sem_r = await session.execute(
        select(models.SemesterGrade)
        .where(models.SemesterGrade.student_id == user["id"])
        .order_by(models.SemesterGrade.semester.desc())
    )
    sem_rows = sem_r.scalars().all()
    latest_sem = sem_rows[0].semester if sem_rows else 0

    total_attempts = len(all_attempts)
    avg = round(sum(a.final_score or 0 for a in all_attempts) / total_attempts, 1) if total_attempts > 0 else 0

    score_trend = [{
        "quiz": f"Quiz {i+1}",
        "score": round(a.final_score or 0, 1),
        "date": a.end_time.strftime("%b %d") if a.end_time else ""
    } for i, a in enumerate(reversed(all_attempts[:15]))]

    # Leaderboard rank via subquery
    all_students_r = await session.execute(
        select(models.QuizAttempt.student_id, models.QuizAttempt.final_score)
        .where(models.QuizAttempt.status == "submitted")
    )
    student_scores: dict = {}
    for row in all_students_r.all():
        sid, sc = row[0], row[1] or 0
        student_scores.setdefault(sid, []).append(sc)
    ranked = sorted(student_scores.items(), key=lambda x: sum(x[1]) / len(x[1]) if x[1] else 0, reverse=True)
    rank = next((i + 1 for i, (sid, _) in enumerate(ranked) if sid == user["id"]), None)
    total_students = len(ranked)

    recent_results = [{
        "id": a.id, "quiz_id": a.quiz_id,
        "final_score": a.final_score,
        "submitted_at": a.end_time.isoformat() if a.end_time else ""
    } for a in all_attempts[:5]]

    activity = [{
        "type": "quiz_result",
        "title": f"Scored {a.final_score or 0:.0f}% on quiz",
        "score": a.final_score or 0,
        "timestamp": a.end_time.isoformat() if a.end_time else ""
    } for a in all_attempts[:10]]

    return {
        "recent_results": recent_results,
        "upcoming_quizzes": active_quizzes,
        "in_progress": in_progress,
        "cgpa": 0, "current_sgpa": 0, "current_semester": latest_sem,
        "total_quizzes": total_attempts, "avg_score": avg,
        "score_trend": score_trend, "rank": rank,
        "total_students": total_students, "weak_topics": [], "activity": activity,
    }

@app.get("/api/dashboard/teacher")
async def teacher_dashboard(user: dict = Depends(require_role("teacher", "admin")), session: AsyncSession = Depends(get_db)):
    quizzes_r = await session.execute(
        select(models.Quiz)
        .where(models.Quiz.faculty_id == user["id"])
        .order_by(models.Quiz.created_at.desc())
    )
    my_quizzes = quizzes_r.scalars().all()
    quiz_list = []
    for q in my_quizzes:
        cnt_r = await session.execute(
            select(models.QuizAttempt)
            .where(models.QuizAttempt.quiz_id == q.id, models.QuizAttempt.status == "submitted")
        )
        attempts = cnt_r.scalars().all()
        avg_score = round(sum(a.final_score or 0 for a in attempts) / len(attempts), 1) if attempts else 0
        quiz_list.append({
            "id": q.id, "title": q.title, "subject": q.type, "status": "active",
            "attempt_count": len(attempts), "avg_score": avg_score
        })
    students_r = await session.execute(select(models.User).where(models.User.role == "student"))
    total_students = len(students_r.scalars().all())
    recent_r = await session.execute(
        select(models.QuizAttempt)
        .where(models.QuizAttempt.status == "submitted")
        .order_by(models.QuizAttempt.end_time.desc())
    )
    recent = recent_r.scalars().all()[:10]
    return {
        "quizzes": quiz_list, "total_students": total_students,
        "recent_submissions": [{"id": r.id, "quiz_id": r.quiz_id, "student_id": r.student_id,
                                "final_score": r.final_score, "submitted_at": r.end_time.isoformat() if r.end_time else ""} for r in recent]
    }

@app.get("/api/dashboard/admin")
async def admin_dashboard(user: dict = Depends(require_role("admin")), session: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    counts_r = await session.execute(
        select(models.User.role, func.count(models.User.id)).group_by(models.User.role)
    )
    role_counts = {role: cnt for role, cnt in counts_r.all()}
    quizzes_r = await session.execute(select(func.count(models.Quiz.id)))
    total_quizzes = quizzes_r.scalar() or 0
    active_r = await session.execute(select(func.count(models.Quiz.id)).where(models.Quiz.status == "active"))
    active_quizzes = active_r.scalar() or 0
    return {
        "total_students": role_counts.get("student", 0),
        "total_teachers": role_counts.get("teacher", 0),
        "total_hods": role_counts.get("hod", 0),
        "total_exam_cell": role_counts.get("exam_cell", 0),
        "total_quizzes": total_quizzes, "active_quizzes": active_quizzes,
        "departments": [],
    }

# ─── Faculty Assignment Routes (HOD) ───────────────────────────────────────
@app.get("/api/faculty/teachers")
async def list_department_teachers(user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.User).where(
        models.User.college_id == user["college_id"],
        models.User.role.in_(["teacher", "hod"])
    )
    result = await session.execute(stmt)
    teachers = result.scalars().all()
    return [{"id": t.id, "name": t.name, "email": t.email, "role": t.role, **(t.profile_data or {})} for t in teachers]

@app.get("/api/faculty/assignments")
async def list_assignments(user: dict = Depends(require_role("hod", "admin", "teacher")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.FacultyAssignment)
    if user["role"] == "teacher":
        stmt = stmt.where(models.FacultyAssignment.teacher_id == user["id"])
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [{"id": r.id, "course_id": r.subject_code, "teacher_id": r.teacher_id, "subject_code": r.subject_code, "subject_name": r.subject_name, "department": r.department, "batch": r.batch, "section": r.section, "semester": r.semester} for r in rows]

@app.post("/api/faculty/assignments")
async def create_assignment(req: FacultyAssignment, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    teacher_r = await session.execute(select(models.User).where(models.User.id == req.teacher_id))
    teacher = teacher_r.scalars().first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    row = models.FacultyAssignment(
        teacher_id=req.teacher_id,
        subject_code=req.subject_code,
        subject_name=req.subject_name,
        department=req.department,
        batch=req.batch,
        section=req.section,
        semester=req.semester
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return {"id": row.id, "teacher_id": req.teacher_id, "subject_code": req.subject_code,
            "subject_name": req.subject_name, "department": req.department}

@app.delete("/api/faculty/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.FacultyAssignment).where(models.FacultyAssignment.id == assignment_id))
    row = result.scalars().first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await session.delete(row)
    await session.commit()
    return {"message": "Assignment deleted"}

# ─── Marks Entry Routes (Teacher) ─────────────────────────────────────────
@app.get("/api/marks/my-assignments")
async def my_assignments(user: dict = Depends(require_role("teacher", "hod")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(models.FacultyAssignment).where(models.FacultyAssignment.teacher_id == user["id"])
    )
    rows = result.scalars().all()
    return [{"id": r.id, "course_id": r.subject_code, "subject_code": r.subject_code, "subject_name": r.subject_name, "department": r.department, "batch": r.batch, "section": r.section, "semester": r.semester} for r in rows]

@app.get("/api/marks/students")
async def get_students_for_marks(department: str, batch: str, section: str, user: dict = Depends(require_role("teacher", "hod", "admin", "exam_cell")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(models.User).where(
            models.User.college_id == user["college_id"],
            models.User.role == "student",
            models.User.profile_data["department"].astext == department,
            models.User.profile_data["batch"].astext == batch,
            models.User.profile_data["section"].astext == section,
        )
    )
    students = result.scalars().all()
    return [{"id": s.id, "name": s.name, "email": s.email, **(s.profile_data or {})} for s in students]

@app.get("/api/marks/entry/{assignment_id}/{exam_type}")
async def get_mark_entry(assignment_id: str, exam_type: str, user: dict = Depends(require_role("teacher", "hod")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(models.MarkEntry).where(
            models.MarkEntry.id == assignment_id,
            models.MarkEntry.exam_type == exam_type,
            models.MarkEntry.faculty_id == user["id"],
        )
    )
    entry = result.scalars().first()
    if not entry:
        return None
    return {"id": entry.id, "course_id": entry.course_id, "exam_type": entry.exam_type,
            "max_marks": entry.max_marks, "status": (entry.extra_data or {}).get("status", "draft"),
            "entries": (entry.extra_data or {}).get("entries", [])}

@app.post("/api/marks/entry")
async def save_mark_entry(req: MarkEntrySave, user: dict = Depends(require_role("teacher", "hod")), session: AsyncSession = Depends(get_db)):
    entries_data = [e.dict() for e in req.entries]
    assign_r = await session.execute(
        select(models.MarkEntry).where(
            models.MarkEntry.id == req.assignment_id,
            models.MarkEntry.exam_type == "__assignment__"
        )
    )
    assignment = assign_r.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    existing_r = await session.execute(
        select(models.MarkEntry).where(
            models.MarkEntry.course_id == assignment.course_id,
            models.MarkEntry.exam_type == req.exam_type,
            models.MarkEntry.faculty_id == user["id"],
        )
    )
    existing = existing_r.scalars().first()
    if existing:
        current_status = (existing.extra_data or {}).get("status", "draft")
        if current_status == "approved":
            if not req.revision_reason or not req.revision_reason.strip():
                raise HTTPException(status_code=400, detail="Revision reason is required to edit approved marks")
        if current_status == "submitted":
            raise HTTPException(status_code=400, detail="Cannot edit submitted marks. Wait for approval or rejection.")
        existing.extra_data = {**(existing.extra_data or {}), "entries": entries_data,
                          "status": "draft", "max_marks": req.max_marks}
        existing.max_marks = req.max_marks
        await session.commit()
        return {"id": existing.id, "status": "draft", "entries": entries_data}
    row = models.MarkEntry(
        student_id=user["id"],
        course_id=assignment.course_id,
        faculty_id=user["id"],
        exam_type=req.exam_type,
        marks_obtained=0,
        max_marks=req.max_marks,
        extra_data={
            "assignment_id": req.assignment_id, "entries": entries_data,
            "status": "draft", "semester": req.semester, "max_marks": req.max_marks,
            **(assignment.extra_data or {})
        }
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return {"id": row.id, "status": "draft", "entries": entries_data}

@app.post("/api/marks/submit/{entry_id}")
async def submit_marks(entry_id: str, user: dict = Depends(require_role("teacher", "hod")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(models.MarkEntry).where(
            models.MarkEntry.id == entry_id,
            models.MarkEntry.faculty_id == user["id"]
        )
    )
    entry = result.scalars().first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    current_status = (entry.extra_data or {}).get("status", "draft")
    if current_status != "draft":
        raise HTTPException(status_code=400, detail=f"Cannot submit - current status: {current_status}")
    entry.extra_data = {**(entry.extra_data or {}), "status": "submitted",
                   "submitted_at": datetime.now(timezone.utc).isoformat()}
    await session.commit()
    return {"message": "Marks submitted for HOD approval"}

@app.get("/api/marks/submissions")
async def list_submissions(status: Optional[str] = None, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.MarkEntry).where(models.MarkEntry.exam_type != "__assignment__")
    result = await session.execute(stmt)
    all_rows = result.scalars().all()
    out = []
    for r in all_rows:
        row_status = (r.extra_data or {}).get("status", "draft")
        filter_statuses = [status] if status else ["submitted", "approved", "rejected"]
        if row_status in filter_statuses:
            out.append({"id": r.id, "course_id": r.course_id, "exam_type": r.exam_type,
                        "status": row_status, "max_marks": r.max_marks, **(r.extra_data or {})})
    return out

@app.post("/api/marks/review/{entry_id}")
async def review_marks(entry_id: str, req: MarkReview, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.MarkEntry).where(models.MarkEntry.id == entry_id))
    entry = result.scalars().first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    current_status = (entry.extra_data or {}).get("status", "draft")
    if current_status != "submitted":
        raise HTTPException(status_code=400, detail="Only submitted marks can be reviewed")
    new_status = "approved" if req.action == "approve" else "rejected"
    entry.extra_data = {**(entry.extra_data or {}), "status": new_status,
                   "reviewed_by": user["id"], "reviewer_name": user["name"],
                   "reviewed_at": datetime.now(timezone.utc).isoformat(), "review_remarks": req.remarks}
    await session.commit()
    return {"message": f"Marks {new_status}"}


# ─── Exam Cell Routes ──────────────────────────────────────────────────────
@app.get("/api/examcell/approved-marks")
async def get_approved_marks(user: dict = Depends(require_role("exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.MarkEntry).where(models.MarkEntry.exam_type != "__assignment__"))
    all_rows = result.scalars().all()
    return [{
        "id": r.id, "course_id": r.course_id, "exam_type": r.exam_type,
        "max_marks": r.max_marks, **(r.extra_data or {})
    } for r in all_rows if (r.extra_data or {}).get("status") == "approved"]

@app.post("/api/examcell/endterm")
async def save_endterm(req: EndtermEntry, user: dict = Depends(require_role("exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    # Store endterm as SemesterGrade rows
    for entry in req.entries:
        sid = entry.get("student_id", "")
        if not sid:
            continue
        row = models.SemesterGrade(
            student_id=sid,
            course_id=req.subject_code,
            semester=req.semester,
            grade=entry.get("grade", "O"),
            credits_earned=int(entry.get("credits", 3)),
        )
        session.add(row)
    await session.commit()
    return {"message": f"Endterm saved for {req.subject_code}"}

@app.get("/api/examcell/endterm")
async def list_endterm(user: dict = Depends(require_role("exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(models.SemesterGrade).order_by(models.SemesterGrade.semester.desc())
    )
    rows = result.scalars().all()
    from collections import defaultdict
    grouped: dict = defaultdict(list)
    for r in rows:
        grouped[(r.course_id, r.semester)].append({
            "student_id": r.student_id, "grade": r.grade, "credits": r.credits_earned
        })
    return [
        {"course_id": cid, "semester": sem, "entries": entries}
        for (cid, sem), entries in grouped.items()
    ]

@app.post("/api/examcell/upload")
async def upload_marks_file(file: UploadFile = File(...), semester: int = Form(...), subject_code: str = Form(...), subject_name: str = Form(...), department: str = Form(...), batch: str = Form(...), section: str = Form(...), user: dict = Depends(require_role("exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    content = await file.read()
    entries = []
    filename = file.filename.lower()
    try:
        if filename.endswith('.csv'):
            text = content.decode('utf-8')
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                cid = row.get('college_id', row.get('roll_no', row.get('College ID', ''))).strip().upper()
                marks_val = float(row.get('marks', row.get('Marks', row.get('score', '0'))) or 0)
                grade = row.get('grade', row.get('Grade', 'O'))
                entries.append({"college_id": cid, "marks": marks_val, "grade": grade})
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
                entries.append({
                    "college_id": str(row[cid_col]).strip().upper(),
                    "marks": float(row[marks_col] or 0),
                    "grade": str(row[grade_col] or 'O') if grade_col >= 0 else 'O'
                })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
    if not entries:
        raise HTTPException(status_code=400, detail="No valid entries found in file")
    # Look up student IDs and create SemesterGrade rows
    saved = 0
    for entry in entries:
        student_r = await session.execute(
            select(models.User).where(
                models.User.profile_data["college_id"].astext == entry["college_id"]
            )
        )
        student = student_r.scalars().first()
        if student:
            row = models.SemesterGrade(
                student_id=student.id,
                course_id=subject_code,
                semester=semester,
                grade=entry["grade"],
                credits_earned=3,
            )
            session.add(row)
            saved += 1
    await session.commit()
    return {"message": f"Uploaded {saved} student marks", "count": saved}

@app.post("/api/examcell/publish/{entry_id}")
async def publish_results(entry_id: str, user: dict = Depends(require_role("exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    # In the new schema, SemesterGrade rows are the source of truth; publishing = confirmation
    return {"message": "Results published successfully"}

# ─── Timetable Routes (HOD) ───────────────────────────────────────────────────────────
@app.get("/api/timetable")
async def get_timetable(section: str, semester: int = 3, user: dict = Depends(require_role("hod", "admin", "teacher", "student")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(models.Timetable).where(
            models.Timetable.college_id == user["college_id"],
            models.Timetable.semester == semester,
        )
    )
    slots = result.scalars().all()
    return [{
        "id": s.id, "day": s.day, "time_slot": s.time_slot, "room": s.room,
        "semester": s.semester, "course_id": s.course_id, "faculty_id": s.faculty_id,
        "department_id": s.department_id
    } for s in slots]

@app.post("/api/timetable")
async def save_timetable_slot(req: TimetableSlot, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    existing_r = await session.execute(
        select(models.Timetable).where(
            models.Timetable.college_id == user["college_id"],
            models.Timetable.day == req.day,
            models.Timetable.time_slot == str(req.period),
            models.Timetable.semester == req.semester,
        )
    )
    existing = existing_r.scalars().first()
    if existing:
        existing.course_id = req.subject_code
        existing.faculty_id = req.teacher_id
        existing.room = ""
        await session.commit()
        return {"id": existing.id, "day": existing.day, "time_slot": existing.time_slot, "course_id": existing.course_id}
    slot = models.Timetable(
        college_id=user["college_id"],
        department_id=user.get("department", "ET"),
        course_id=req.subject_code,
        faculty_id=req.teacher_id,
        semester=req.semester,
        day=req.day,
        time_slot=str(req.period),
        room="",
    )
    session.add(slot)
    await session.commit()
    await session.refresh(slot)
    return {"id": slot.id, "day": slot.day, "time_slot": slot.time_slot, "course_id": slot.course_id}

@app.delete("/api/timetable/{slot_id}")
async def delete_timetable_slot(slot_id: str, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Timetable).where(models.Timetable.id == slot_id))
    slot = result.scalars().first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    await session.delete(slot)
    await session.commit()
    return {"message": "Slot deleted"}

# ─── Announcement Routes ─────────────────────────────────────────────────────
@app.get("/api/announcements")
async def list_announcements(user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    dept = user.get("department", "")
    role = user["role"]
    stmt = select(models.Announcement).where(
        models.Announcement.college_id == user["college_id"]
    ).order_by(models.Announcement.created_at.desc()).limit(50)
    result = await session.execute(stmt)
    rows = result.scalars().all()
    out = []
    for a in rows:
        details = a.details or {}
        vis = details.get("visibility", "all")
        a_dept = details.get("department", "")
        if a_dept and a_dept != dept:
            continue
        if role == "student" and vis not in ("all", "students"):
            continue
        if role == "teacher" and vis not in ("all", "faculty"):
            continue
        out.append({
            "id": a.id, "title": a.title, "message": a.message,
            "priority": a.priority, "visibility": vis,
            "department": a_dept,
            "posted_by": details.get("posted_by", ""),
            "created_at": a.created_at.isoformat() if a.created_at else ""
        })
    return out

@app.post("/api/announcements")
async def create_announcement(req: AnnouncementCreate, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    row = models.Announcement(
        college_id=user["college_id"],
        title=req.title,
        message=req.message,
        priority=req.priority,
        details={
            "visibility": req.visibility,
            "department": user.get("department", ""),
            "posted_by": user["name"],
            "posted_by_id": user["id"]
        }
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return {"id": row.id, "title": row.title, "message": row.message, "priority": row.priority}

@app.delete("/api/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Announcement).where(models.Announcement.id == announcement_id))
    row = result.scalars().first()
    if not row:
        raise HTTPException(status_code=404, detail="Announcement not found")
    await session.delete(row)
    await session.commit()
    return {"message": "Announcement deleted"}

# ─── At-Risk Students (HOD) ────────────────────────────────────────────────
@app.get("/api/hod/at-risk-students")
async def get_at_risk_students(threshold: float = 5.0, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    students_r = await session.execute(
        select(models.User).where(
            models.User.college_id == user["college_id"],
            models.User.role == "student"
        )
    )
    students = students_r.scalars().all()
    at_risk = []
    for student in students:
        grades_r = await session.execute(
            select(models.SemesterGrade).where(models.SemesterGrade.student_id == student.id)
        )
        grades = grades_r.scalars().all()
        if not grades:
            continue
        total_credits = sum(g.credits_earned for g in grades)
        total_points = sum(grade_to_points(g.grade) * g.credits_earned for g in grades)
        backlogs = sum(1 for g in grades if g.grade == "F")
        cgpa = round(total_points / total_credits, 2) if total_credits > 0 else 0
        if cgpa < threshold or backlogs >= 2:
            at_risk.append({
                "id": student.id, "name": student.name,
                "college_id": (student.profile_data or {}).get("college_id", ""),
                "section": (student.profile_data or {}).get("section", ""),
                "batch": (student.profile_data or {}).get("batch", ""),
                "cgpa": cgpa, "backlogs": backlogs,
                "severity": "critical" if cgpa < (threshold - 1.5) or backlogs >= 4 else "warning"
            })
    at_risk.sort(key=lambda x: x["cgpa"])
    return at_risk

@app.get("/api/dashboard/hod")
async def hod_dashboard(user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    teachers_r = await session.execute(
        select(func.count(models.User.id)).where(
            models.User.college_id == user["college_id"], models.User.role == "teacher"
        )
    )
    students_r = await session.execute(
        select(func.count(models.User.id)).where(
            models.User.college_id == user["college_id"], models.User.role == "student"
        )
    )
    assignments_r = await session.execute(
        select(func.count(models.MarkEntry.id)).where(models.MarkEntry.exam_type == "__assignment__")
    )
    # Pending/approved from JSONB status field
    mark_entries_r = await session.execute(
        select(models.MarkEntry).where(models.MarkEntry.exam_type != "__assignment__")
    )
    all_entries = mark_entries_r.scalars().all()
    pending = sum(1 for e in all_entries if (e.extra_data or {}).get("status") == "submitted")
    approved = sum(1 for e in all_entries if (e.extra_data or {}).get("status") == "approved")
    recent = [{
        "id": e.id, "course_id": e.course_id, "exam_type": e.exam_type,
        "status": (e.extra_data or {}).get("status", "draft"), "activity_type": "marks_review"
    } for e in all_entries[-15:]]
    return {
        "total_teachers": teachers_r.scalar() or 0,
        "total_students": students_r.scalar() or 0,
        "total_assignments": assignments_r.scalar() or 0,
        "pending_reviews": pending, "approved_count": approved,
        "recent_submissions": recent
    }

@app.get("/api/dashboard/exam_cell")
async def exam_cell_dashboard(user: dict = Depends(require_role("exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    mark_entries_r = await session.execute(
        select(models.MarkEntry).where(models.MarkEntry.exam_type != "__assignment__")
    )
    all_entries = mark_entries_r.scalars().all()
    approved = sum(1 for e in all_entries if (e.extra_data or {}).get("status") == "approved")
    sem_r = await session.execute(select(models.SemesterGrade))
    all_grades = sem_r.scalars().all()
    return {
        "total_approved_midterms": approved,
        "total_endterm": len(all_grades),
        "total_published": len(all_grades),
        "total_draft": 0,
        "recent_entries": []
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

@app.post("/api/code/execute")
async def execute_code(req: CodeExecuteRequest, user: dict = Depends(get_current_user)):
    if len(req.code) > 10000:
        raise HTTPException(status_code=400, detail="Code too long (max 10000 chars)")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{code_runner_url}/run",
                json={"language": req.language, "code": req.code, "test_input": req.test_input},
                timeout=15.0
            )
            if resp.status_code == 400:
                raise HTTPException(status_code=400, detail=resp.json().get("detail", "Error"))
            if resp.status_code != 200:
                return {"output": "", "error": "Code runner service unavailable", "exit_code": -1}
            return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        return {"output": "", "error": str(e)[:500], "exit_code": -1}

# ─── Health ─────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/api/test-sentry")
async def test_sentry():
    """Intentional crash to verify Sentry connection and PII scrubbing."""
    division_by_zero = 1 / 0
    return {"message": "If you see this, Sentry didn't catch the intentional crash!"}

# NOTE: seed_data() is superseded by the @app.on_event('startup') handler above
# which seeds the admin user via PostgreSQL. This stub is kept for compatibility.
async def seed_data():
    pass


_placements_store: list = []  # legacy compat — routes now use DB exclusively

@app.get("/api/placements/student")
async def student_placements(user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    college_id = user.get("college_id", "")
    dept = user.get("department", "")
    email = user.get("email", "")
    stmt = select(models.Placement).where(models.Placement.college_id == college_id)
    result = await session.execute(stmt)
    rows = result.scalars().all()
    out = []
    for p in rows:
        details = p.details or {}
        candidates = details.get("candidates", [])
        is_shortlisted = any(c.get("college_id") == college_id or c.get("email") == email for c in candidates)
        open_dept = details.get("department", "ALL")
        is_open = details.get("open_to_all") and open_dept in (dept, "ALL", "all", "")
        if is_shortlisted or is_open:
            out.append({"id": p.id, "company": p.company, "role": p.role, "package": p.package, "date": p.date, **{k: v for k, v in details.items() if k != "candidates"}})
    out.sort(key=lambda x: x.get("drive_date", ""))
    return out

@app.post("/api/placements")
async def create_placement(req: dict, user: dict = Depends(require_role("admin", "hod")), session: AsyncSession = Depends(get_db)):
    row = models.Placement(
        college_id=user["college_id"],
        company=req.get("company", ""),
        role=req.get("role", ""),
        package=req.get("package", ""),
        date=req.get("date", ""),
        details={k: v for k, v in req.items() if k not in ("company", "role", "package", "date")}
    )
    row.details = {**(row.details or {}), "created_by": user["id"]}
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return {"id": row.id, "company": row.company, "role": row.role, "date": row.date}

@app.get("/api/placements")
async def list_placements(user: dict = Depends(require_role("admin", "hod", "teacher")), session: AsyncSession = Depends(get_db)):
    stmt = select(models.Placement).where(models.Placement.college_id == user["college_id"])
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [{"id": p.id, "company": p.company, "role": p.role, "package": p.package, "date": p.date, **(p.details or {})} for p in rows]

# ─── Coding Challenges ─────────────────────────────────────────────────────────
# NOTE: Coding challenges are stored in-memory. A PostgreSQL table can be added later.
_challenges_store: list = []
_student_progress_store: list = []

@app.get("/api/challenges")
async def get_challenges(page: int = 1, limit: int = 20, difficulty: str = "", topic: str = ""):
    filtered = _challenges_store
    if difficulty:
        filtered = [c for c in filtered if c.get("difficulty") == difficulty]
    if topic:
        filtered = [c for c in filtered if topic in c.get("topics", [])]
    start = (page - 1) * limit
    return {
        "data": filtered[start:start + limit],
        "total": len(filtered),
        "page": page,
        "limit": limit
    }

@app.get("/api/challenges/stats")
async def get_challenge_stats(user: dict = Depends(get_current_user)):
    solved = [p for p in _student_progress_store if p.get("student_id") == user["id"] and p.get("status") == "Solved"]
    topics_count: dict = {}
    easy = medium = hard = 0
    for doc in solved:
        d = doc.get("difficulty", "Easy")
        if d == "Easy": easy += 1
        elif d == "Medium": medium += 1
        elif d == "Hard": hard += 1
        for t in doc.get("topics", []):
            topics_count[t] = topics_count.get(t, 0) + 1
    return {"total_solved": len(solved), "difficulty": {"Easy": easy, "Medium": medium, "Hard": hard}, "topics": topics_count}

@app.post("/api/challenges/submit")
async def submit_challenge(req: ChallengeSubmit, user: dict = Depends(get_current_user)):
    challenge = next((c for c in _challenges_store if c.get("id") == getattr(req, "challenge_id", None)), None)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    import time
    start_time = time.time()
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{code_runner_url}/run",
                json={"language": req.language, "code": req.code, "test_input": ""},
                timeout=12.0
            )
        end_time = time.time()
        if resp.status_code == 200:
            result = resp.json()
            exit_code = result.get("exit_code", -1)
            if exit_code == 0:
                # Upsert progress in memory
                prog = next((p for p in _student_progress_store if p.get("student_id") == user["id"] and p.get("challenge_id") == req.challenge_id), None)
                if prog:
                    prog["status"] = "Solved"
                else:
                    _student_progress_store.append({
                        "student_id": user["id"], "challenge_id": req.challenge_id,
                        "status": "Solved", "language": req.language,
                        "difficulty": challenge.get("difficulty"),
                        "topics": challenge.get("topics", []),
                        "execution_time_ms": int((end_time - start_time) * 1000)
                    })
            return {"output": result.get("output", ""), "error": result.get("error", ""),
                    "exit_code": exit_code, "success": exit_code == 0}
        return {"error": "Code runner service error", "exit_code": -1, "success": False}
    except httpx.TimeoutException:
        return {"error": "Execution timed out", "exit_code": 1, "success": False}
    except Exception as e:
        return {"error": str(e), "exit_code": -1, "success": False}

@app.on_event("startup")
async def startup():
    """PostgreSQL startup: schema is managed by Alembic migrations.
    Seed an admin user if none exists."""
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        admin_college_id = os.environ.get("ADMIN_COLLEGE_ID", "A001")
        admin_pwd = os.environ.get("ADMIN_PASSWORD", "admin123")
        result = await session.execute(
            select(models.User).where(
                models.User.profile_data["college_id"].astext == admin_college_id
            )
        )
        existing = result.scalars().first()
        if not existing:
            admin = models.User(
                name="GNI Admin",
                email="admin@gni.edu",
                password_hash=hash_password(admin_pwd),
                role="admin",
                college_id=None,
                profile_data={"college_id": admin_college_id, "college": "ALL", "department": "Administration"},
            )
            session.add(admin)
            await session.commit()
            print(f"[startup] Admin user '{admin_college_id}' seeded.")
        else:
            print(f"[startup] Admin '{admin_college_id}' already exists. Skipping seed.")



