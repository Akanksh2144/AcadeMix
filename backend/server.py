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
# bson removed — MongoDB is archived
from fastapi import FastAPI, HTTPException, Request, Response, Depends, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
# certifi removed — was for MongoDB TLS
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
code_runner_url = os.environ.get("CODE_RUNNER_URL", "https://acadmix-code-runner.fly.dev")
cors_origins_env = os.environ.get("CORS_ORIGINS", "")
if not cors_origins_env:
    raise ValueError("CORS_ORIGINS must be explicitly set (no wildcard allowed)")

origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]

if "*" in origins:
    raise ValueError("CORS_ORIGINS cannot contain wildcard '*'. List origins explicitly.")

if os.getenv("ENVIRONMENT") == "production":
    for origin in origins:
        if not origin.startswith("https://"):
            raise ValueError(f"CORS origin '{origin}' must use HTTPS in production")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=3600,
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

import uuid

class TokenBlacklistConfig:
    USE_BLACKLIST = os.getenv("USE_TOKEN_BLACKLIST", "false").lower() == "true"
    ACCESS_TOKEN_TTL_MINUTES = 15
    REFRESH_TOKEN_TTL_DAYS = 7
    BLACKLIST_CHECK_REDIS = True

def create_access_token(user_id: str, role: str, tenant_id: str = "", permissions: dict = None) -> str:
    perms = permissions or {}
    return jwt.encode({
        "sub": user_id, 
        "role": role, 
        "tenant_id": tenant_id, 
        "permissions": perms, 
        "exp": datetime.now(timezone.utc) + timedelta(minutes=TokenBlacklistConfig.ACCESS_TOKEN_TTL_MINUTES), 
        "type": "access",
        "jti": str(uuid.uuid4())
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    return jwt.encode({
        "sub": user_id, 
        "exp": datetime.now(timezone.utc) + timedelta(days=TokenBlacklistConfig.REFRESH_TOKEN_TTL_DAYS), 
        "type": "refresh",
        "jti": str(uuid.uuid4())
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)

# serialize_doc removed — was MongoDB-specific dead code

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
            
        if TokenBlacklistConfig.USE_BLACKLIST and redis_client:
            jti = payload.get("jti")
            if jti and redis_client.exists(f"revoked_access:{jti}"):
                raise HTTPException(status_code=401, detail="Token revoked")
        
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
        
        import database
        database.tenant_context.set(user.college_id)
            
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
            role = user.get("role")
            if module == "quizzes" and role in ["teacher"]: return user
            if module == "marks" and role in ["teacher", "exam_cell", "hod"]: return user
            if module == "placements" and role in ["hod", "admin"]: return user
            raise HTTPException(status_code=403, detail=f"Insufficient permissions: requires {module}.{action}")
        return user
    return check

# ─── Pydantic Models ───────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    college_id: str
    password: str

class RegisterRequest(BaseModel):
    name: str = Field(..., max_length=150)
    college_id: str = Field(..., max_length=50)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field("student", max_length=30)
    college: str = Field("GNITC", max_length=50)
    department: str = Field("", max_length=100)
    batch: str = Field("", max_length=20)
    section: str = Field("", max_length=20)

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
    name: str = Field(..., max_length=150)
    code: str = Field(..., max_length=20)

class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    code: Optional[str] = Field(None, max_length=20)

class SectionCreate(BaseModel):
    department_id: str
    name: str = Field(..., max_length=50)

class SectionUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    department_id: Optional[str] = None

class RoleCreate(BaseModel):
    name: str = Field(..., max_length=50)
    permissions: dict = {}

class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    permissions: Optional[dict] = None

class QuizCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    subject: str = Field(..., min_length=2, max_length=200)
    description: str = Field("", max_length=2000)
    total_marks: float = Field(0.0, ge=0.0, le=1000.0)
    duration_mins: int = Field(60, ge=1, le=480)
    negative_marking: bool = False
    timed: bool = True
    randomize_questions: bool = False
    randomize_options: bool = False
    show_answers_after: bool = True
    allow_reattempt: bool = False
    assigned_classes: list = []
    negative_marks: float = Field(0.0, ge=0.0, le=10.0)
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
    code: str = Field(..., max_length=15000)
    language: str = Field("python", max_length=50)
    test_input: str = Field("", max_length=5000)

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
    max_marks: float = Field(30, gt=0, le=200)
    entries: List[MarkEntryItem] = Field(..., max_items=5000)
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
    challenge_id: str
    code: str
    language: str = "python"

class ViolationReport(BaseModel):
    violation_type: str = "tab_switch"  # tab_switch, fullscreen_exit, window_blur

async def log_audit(session: AsyncSession, user_id: str, resource: str, action: str, details: dict = None):
    log_entry = models.AuditLog(
        user_id=user_id,
        resource=resource,
        action=action,
        details=details or {}
    )
    session.add(log_entry)

# ─── Auth Routes ────────────────────────────────────────────────────────────
@app.post("/api/auth/login")
async def login(req: LoginRequest, response: Response, request: Request, session: AsyncSession = Depends(get_db)):
    college_id_normalized = req.college_id.strip().upper()
    key = f"login_failures:{college_id_normalized}"
    if redis_client:
        failures = redis_client.get(key)
        if failures and int(failures) >= 5:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 5 minutes.")

    # Find user by college_id stored in profile_data or by email
    result = await session.execute(
        select(models.User).where(
            (models.User.profile_data["college_id"].astext == college_id_normalized) |
            (models.User.email.ilike(college_id_normalized))
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
async def logout(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        try:
            payload = jwt.decode(refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            jti = payload.get("jti")
            if redis_client and jti:
                redis_client.setex(f"revoked_refresh:{jti}", 604800, "revoked")
        except jwt.InvalidTokenError:
            pass
            
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}

@app.post("/api/auth/refresh")
async def refresh_access_token(request: Request, response: Response):
    from database import AsyncSessionLocal
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
        
    try:
        payload = jwt.decode(refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
            
        jti = payload.get("jti")
        if redis_client and redis_client.exists(f"revoked_refresh:{jti}"):
            raise HTTPException(status_code=401, detail="Refresh token revoked")
            
        user_id = payload["sub"]
        
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(models.User).where(models.User.id == user_id))
            user = result.scalars().first()
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
                
        new_access = create_access_token(user_id, user.role, user.college_id)
        response.set_cookie("access_token", new_access, httponly=True, secure=False, samesite="lax", max_age=900)
        
        return {"access_token": new_access, "expires_in": 900}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
# ─── User Routes ────────────────────────────────────────────────────────────
@app.get("/api/users")
async def list_users(
    role: Optional[str] = None, 
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_role("admin", "teacher", "hod", "exam_cell")), 
    session: AsyncSession = Depends(get_db)):
    stmt = select(models.User).where(models.User.college_id == user["college_id"])
    if role:
        stmt = stmt.where(models.User.role == role)
    result = await session.execute(stmt.offset(offset).limit(limit))
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

@app.get("/api/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id))
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

@app.patch("/api/quizzes/{quiz_id}")
async def update_quiz(quiz_id: str, updates: dict, user: dict = Depends(require_role("teacher", "admin")), session: AsyncSession = Depends(get_db)):
    result_r = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id))
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

@app.delete("/api/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: str, user: dict = Depends(require_permission("quizzes", "delete")), session: AsyncSession = Depends(get_db)):
    result_r = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id))
    quiz = result_r.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    await log_audit(session, user["id"], "quiz", "delete", {"quiz_id": quiz.id, "title": quiz.title})
    await session.delete(quiz)
    await session.commit()
    return {"message": "Quiz deleted"}

@app.post("/api/quizzes/{quiz_id}/publish")
async def publish_quiz(quiz_id: str, user: dict = Depends(require_permission("quizzes", "publish")), session: AsyncSession = Depends(get_db)):
    result_r = await session.execute(select(models.Quiz).where(models.Quiz.id == quiz_id))
    quiz = result_r.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    quiz.status = "active"
    await log_audit(session, user["id"], "quiz", "publish", {"quiz_id": quiz.id, "title": quiz.title})
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
    quiz.duration_minutes = (quiz.duration_minutes or 60) + mins
    await session.commit()
    return {"message": f"Extended by {mins} mins. New duration: {quiz.duration_minutes} mins", "duration_mins": quiz.duration_minutes}

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
    await log_audit(session, user["id"], "proctoring_violation", "create", {"attempt_id": attempt_id, "type": req.violation_type})
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
async def search_students(
    q: str = "", 
    department: Optional[str] = None, 
    college: Optional[str] = None, 
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_role("hod", "admin", "exam_cell", "teacher")), 
    session: AsyncSession = Depends(get_db)):
    stmt = select(models.User).where(models.User.role == "student")
    if q:
        stmt = stmt.where(
            models.User.name.ilike(f"%{q}%") |
            models.User.profile_data["college_id"].astext.ilike(f"%{q}%")
        )
    result = await session.execute(stmt.order_by(models.User.name).offset(offset).limit(limit))
    students = result.scalars().all()
    return [{"id": s.id, "name": s.name, "email": s.email, "role": s.role, **(s.profile_data or {})} for s in students]

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
            models.MarkEntry.student_id == student_id
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
async def get_leaderboard(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user), 
    session: AsyncSession = Depends(get_db)):
    from sqlalchemy import func, desc
    stmt = (
        select(
            models.QuizAttempt.student_id,
            func.avg(models.QuizAttempt.final_score).label("avg_score"),
            func.count(models.QuizAttempt.id).label("quizzes_taken"),
            models.User.name,
            models.User.profile_data
        )
        .join(models.User, models.User.id == models.QuizAttempt.student_id)
        .where(models.QuizAttempt.status == "submitted")
        .group_by(models.QuizAttempt.student_id, models.User.id)
        .order_by(desc("avg_score"))
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    rows = result.all()
    
    leaderboard = []
    for i, row in enumerate(rows):
        leaderboard.append({
            "rank": offset + i + 1, 
            "student_id": row.student_id,
            "name": row.name,
            "college_id": (row.profile_data or {}).get("college_id", ""),
            "avg_score": round(row.avg_score, 1) if row.avg_score else 0, 
            "quizzes_taken": row.quizzes_taken, 
            "cgpa": 0,
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
    
    if my_quizzes:
        quiz_ids = [q.id for q in my_quizzes]
        from sqlalchemy import func
        stats_r = await session.execute(
            select(
                models.QuizAttempt.quiz_id,
                func.count(models.QuizAttempt.id).label("attempt_count"),
                func.avg(models.QuizAttempt.final_score).label("avg_score")
            )
            .where(models.QuizAttempt.quiz_id.in_(quiz_ids), models.QuizAttempt.status == "submitted")
            .group_by(models.QuizAttempt.quiz_id)
        )
        stats_map = {row.quiz_id: row for row in stats_r.all()}
        for q in my_quizzes:
            s = stats_map.get(q.id)
            quiz_list.append({
                "id": q.id, "title": q.title, "subject": q.type, "status": "active",
                "attempt_count": s.attempt_count if s else 0,
                "avg_score": round(s.avg_score, 1) if s and s.avg_score else 0
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
    stmt = select(models.FacultyAssignment).where(models.FacultyAssignment.college_id == user["college_id"])
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
        college_id=user["college_id"],
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
async def save_mark_entry(req: MarkEntrySave, user: dict = Depends(require_permission("marks", "edit")), session: AsyncSession = Depends(get_db)):
    entries_data = [e.dict() for e in req.entries]
    assign_r = await session.execute(
        select(models.FacultyAssignment).where(
            models.FacultyAssignment.id == req.assignment_id
        )
    )
    assignment = assign_r.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    existing_r = await session.execute(
        select(models.MarkEntry).where(
            models.MarkEntry.course_id == assignment.subject_code,
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
        await log_audit(session, user["id"], "mark_entry", "update", {"entry_id": existing.id, "course_id": existing.course_id})
        await session.commit()
        return {"id": existing.id, "status": "draft", "entries": entries_data}
    row = models.MarkEntry(
        student_id=user["id"],
        course_id=assignment.subject_code,
        faculty_id=user["id"],
        exam_type=req.exam_type,
        marks_obtained=0,
        max_marks=req.max_marks,
        extra_data={
            "assignment_id": req.assignment_id, "entries": entries_data,
            "status": "draft", "semester": req.semester, "max_marks": req.max_marks,
            "subject_name": assignment.subject_name, "department": assignment.department,
            "batch": assignment.batch, "section": assignment.section
        }
    )
    session.add(row)
    await log_audit(session, user["id"], "mark_entry", "create", {"exam_type": req.exam_type, "course_id": assignment.subject_code})
    await session.commit()
    await session.refresh(row)
    return {"id": row.id, "status": "draft", "entries": entries_data}

@app.post("/api/marks/submit/{entry_id}")
async def submit_marks(entry_id: str, user: dict = Depends(require_role("teacher", "hod")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(models.MarkEntry).where(
            models.MarkEntry.id == entry_id,
            models.MarkEntry.faculty_id == user["id"]
        ).with_for_update()
    )
    entry = result.scalars().first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    current_status = (entry.extra_data or {}).get("status", "draft")
    if current_status != "draft":
        raise HTTPException(status_code=400, detail=f"Cannot submit - current status: {current_status}")
    entry.extra_data = {**(entry.extra_data or {}), "status": "submitted",
                   "submitted_at": datetime.now(timezone.utc).isoformat()}
    await log_audit(session, user["id"], "mark_entry", "submit", {"entry_id": entry_id, "course_id": entry.course_id})
    await session.commit()
    return {"message": "Marks submitted for HOD approval"}

@app.get("/api/marks/submissions")
async def list_submissions(status: Optional[str] = None, user: dict = Depends(require_role("hod", "admin")), session: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    stmt = select(models.MarkEntry)
    
    if status:
        stmt = stmt.where(func.jsonb_extract_path_text(models.MarkEntry.extra_data, 'status') == status)
    else:
        stmt = stmt.where(func.jsonb_extract_path_text(models.MarkEntry.extra_data, 'status').in_(['submitted', 'approved', 'rejected']))
        
    result = await session.execute(stmt)
    submissions = result.scalars().all()
    
    return [{
        "id": r.id, 
        "course_id": r.course_id, 
        "exam_type": r.exam_type,
        "max_marks": r.max_marks,
        "status": (r.extra_data or {}).get("status", "draft"), 
        **(r.extra_data or {})
    } for r in submissions]

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
    result = await session.execute(select(models.MarkEntry))
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
    # 1. Check for duplicate batch submission
    existing = await session.execute(
        select(models.MarkEntry).where(
            models.MarkEntry.course_id == subject_code,
            models.MarkEntry.exam_type == "endterm_csv",
            models.MarkEntry.extra_data["section"].astext == section,
            models.MarkEntry.extra_data["batch"].astext == batch
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="CSV for this subject and section already uploaded")

    content = await file.read()
    entries = []
    filename = file.filename.lower()
    try:
        if filename.endswith('.csv'):
            text = content.decode('utf-8')
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                cid = row.get('college_id', row.get('roll_no', row.get('College ID', ''))).strip().upper()
                if cid:
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
                cid_val = str(row[cid_col] or '').strip().upper()
                if not cid_val:
                    continue
                entries.append({
                    "college_id": cid_val,
                    "marks": float(row[marks_col] or 0),
                    "grade": str(row[grade_col] or 'O') if grade_col >= 0 else 'O'
                })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
    if not entries:
        raise HTTPException(status_code=400, detail="No valid entries found in file")
        
    # 2. Strict Validation against College Constraints
    validated_entries = []
    for entry in entries:
        student_r = await session.execute(
            select(models.User).where(models.User.profile_data["college_id"].astext == entry["college_id"])
        )
        student = student_r.scalars().first()
        if not student:
            raise HTTPException(status_code=400, detail=f"Student ID {entry['college_id']} not found in database.")
        if student.college_id != user["college_id"] and user["role"] != "super_admin":
            raise HTTPException(status_code=403, detail=f"Student ID {entry['college_id']} belongs to a different college tenant.")
            
        validated_entries.append({
            "student_id": student.id,
            "college_id": entry["college_id"],
            "marks": entry["marks"],
            "grade": entry["grade"]
        })

    # 3. Queue for HOD Approval instead of Silent Mutation
    mark_entry = models.MarkEntry(
        student_id=user["id"], 
        course_id=subject_code,
        faculty_id=user["id"],
        exam_type="endterm_csv",
        marks_obtained=0,
        max_marks=100,
        extra_data={
            "subject_name": subject_name,
            "department": department,
            "batch": batch,
            "section": section,
            "semester": semester,
            "filename": filename,
            "status": "pending_hod_approval",
            "entries": validated_entries
        }
    )
    session.add(mark_entry)
    
    await log_audit(session, user["id"], "exam_cell_csv_upload", "create", {"subject": subject_code, "entries": len(validated_entries)})
    await session.commit()
    
    return {"message": f"Successfully uploaded {len(validated_entries)} entries. Pending HOD approval.", "entry_id": mark_entry.id}

@app.post("/api/examcell/publish/{entry_id}")
async def publish_results(entry_id: str, user: dict = Depends(require_role("exam_cell", "admin")), session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(models.MarkEntry)
        .where(models.MarkEntry.id == entry_id)
        .with_for_update()
    )
    entry = result.scalars().first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
        
    current_status = (entry.extra_data or {}).get("status", "draft")
    if current_status != "approved":
        raise HTTPException(status_code=400, detail=f"Only approved marks can be published (current: {current_status})")
        
    entries = (entry.extra_data or {}).get("entries", [])
    if not entries:
        raise HTTPException(status_code=400, detail="No student marks found in entry")
        
    metadata = entry.extra_data or {}
    subject_code = entry.course_id
    semester = int(metadata.get("semester", 1))
    max_marks = float(metadata.get("max_marks", 100))
    
    semester_grades = []
    for student_entry in entries:
        student_id = student_entry.get("student_id")
        marks = float(student_entry.get("marks", 0.0))
        pct = (marks / max_marks) * 100 if max_marks > 0 else 0
        
        # Calculate grade from percentage dynamically
        if pct >= 90: grade = "O"
        elif pct >= 80: grade = "A+"
        elif pct >= 70: grade = "A"
        elif pct >= 60: grade = "B+"
        elif pct >= 50: grade = "B"
        elif pct >= 45: grade = "C"
        elif pct >= 40: grade = "D"
        else: grade = "F"
        
        if not student_id:
            continue
            
        existing = await session.execute(
            select(models.SemesterGrade).where(
                models.SemesterGrade.student_id == student_id,
                models.SemesterGrade.semester == semester,
                models.SemesterGrade.course_id == subject_code
            )
        )
        if existing.scalars().first():
            continue
            
        semester_grades.append(models.SemesterGrade(
            student_id=student_id,
            semester=semester,
            course_id=subject_code,
            grade=grade,
            credits_earned=3
        ))
        
    if semester_grades:
        session.add_all(semester_grades)

    entry.extra_data = {
        **(entry.extra_data or {}),
        "status": "published",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "published_by": user["id"]
    }
    
    await log_audit(session, user["id"], "mark_entry", "publish", {
        "entry_id": entry_id, "course_id": subject_code, 
        "student_count": len(semester_grades)
    })
    await session.commit()
    
    return {
        "message": f"Published {len(semester_grades)} student grades",
        "entry_id": entry_id,
        "published_count": len(semester_grades)
    }

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
    # 1. Validate against FacultyAssignment (Explicit DB Link resolving point 5)
    assignment_r = await session.execute(
        select(models.FacultyAssignment).where(
            models.FacultyAssignment.teacher_id == req.teacher_id,
            models.FacultyAssignment.subject_code == req.subject_code,
            models.FacultyAssignment.college_id == user["college_id"]
        )
    )
    assignment = assignment_r.scalars().first()
    if not assignment:
        raise HTTPException(status_code=400, detail="Invalid timetable slot: Teacher is not assigned to this subject code.")

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
        department_id="", 
        course_id=req.subject_code,
        faculty_id=req.teacher_id,
        semester=req.semester,
        day=req.day,
        time_slot=str(req.period),
        room="",
    )
    # Look up real department UUID based on the assignment, fundamentally decoupling it from User session state.
    dept_r = await session.execute(
        select(models.Department).where(
            models.Department.college_id == user["college_id"],
            or_(models.Department.code == assignment.department, models.Department.name == assignment.department)
        )
    )
    dept = dept_r.scalars().first()
    if dept:
        slot.department_id = dept.id
    else:
        raise HTTPException(status_code=400, detail=f"Department '{assignment.department}' not found. Create it first.")

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
async def get_at_risk_students(
    cgpa_threshold: float = 5.0, 
    backlog_threshold: int = 2,
    user: dict = Depends(require_role("hod", "admin")), 
    session: AsyncSession = Depends(get_db)
):
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
        
        if cgpa < cgpa_threshold or backlogs >= backlog_threshold:
            if cgpa < (cgpa_threshold - 1.5) or backlogs >= (backlog_threshold + 2):
                severity = "critical"
            else:
                severity = "warning"
                
            at_risk.append({
                "id": student.id, 
                "name": student.name,
                "college_id": (student.profile_data or {}).get("college_id", ""),
                "section": (student.profile_data or {}).get("section", ""),
                "batch": (student.profile_data or {}).get("batch", ""),
                "cgpa": cgpa,
                "cgpa_threshold": cgpa_threshold,
                "backlogs": backlogs,
                "backlog_threshold": backlog_threshold,
                "severity": severity
            })
            
    at_risk.sort(key=lambda x: (x["severity"] != "critical", x["cgpa"]))
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
        select(func.count(models.FacultyAssignment.id))
    )
    # Pending/approved from JSONB status field
    mark_entries_r = await session.execute(
        select(models.MarkEntry)
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
        select(models.MarkEntry)
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
import ast as _ast

_BLOCKED_PATTERNS = {
    "python": [
        # File system
        r"\bimport\s+os\b", r"\bimport\s+subprocess\b", r"\bimport\s+shutil\b", r"\bimport\s+pathlib\b",
        r"\bopen\s*\(", r"\bos\.", r"\bsubprocess\.", r"\bshutil\.", r"\bpathlib\.",
        # Network
        r"\bimport\s+socket\b", r"\bimport\s+http\b", r"\bimport\s+urllib\b", r"\bimport\s+requests\b",
        r"\bsocket\.", r"\burllib\.", r"\brequests\.",
        # Code execution
        r"\b__import__\s*\(", r"\bexec\s*\(", r"\beval\s*\(", r"\bcompile\s*\(", 
        # Introspection/reflection
        r"\bglobals\s*\(", r"\blocals\s*\(", r"\bgetattr\s*\(", r"\bhasattr\s*\(",
        r"\btype\s*\(", r"\bvars\s*\(", r"\bdir\s*\(", r"\binspect\.",
        # Module introspection
        r"\b__dict__\b", r"\b__code__\b", r"\b__class__\b", r"\b__bases__\b",
    ],
    "javascript": [
        r"require\s*\(\s*['\"]child_process", r"require\s*\(\s*['\"]fs",
        r"require\s*\(\s*['\"]net", r"require\s*\(\s*['\"]http",
        r"\bprocess\.exit", r"\bprocess\.env",
        r"\bexecSync\b", r"\bspawnSync\b",
        r"\beval\s*\(", r"\bFunction\s*\(",
    ],
    "java": [
        r"Runtime\.getRuntime", r"ProcessBuilder", r"System\.exit", 
        r"java\.io\.File", r"java\.net\.", r"java\.nio\.file",
    ],
    "c": [
        r"#include\s*<unistd\.h>", r"#include\s*<sys/",
        r"\bsystem\s*\(", r"\bexecl?[vpe]*\s*\(", r"\bfork\s*\(", 
        r"\bpopen\s*\(", r"\bsocket\s*\(",
    ],
}
_BLOCKED_PATTERNS["cpp"] = _BLOCKED_PATTERNS["c"]

def _validate_code_ast(code: str, language: str):
    if language.lower() != "python": return
    try:
        tree = _ast.parse(code)
    except SyntaxError as e:
        raise HTTPException(status_code=400, detail=f"Syntax error: {e}")
        
    BLOCKED_IMPORTS = {"os", "subprocess", "shutil", "socket", "http", "urllib", "requests", "pathlib", "inspect", "__builtin__"}
    BLOCKED_CALLS = {"__import__", "exec", "eval", "compile", "globals", "locals", "getattr", "hasattr", "type", "vars", "dir", "open"}
    
    class CodeValidator(_ast.NodeVisitor):
        def __init__(self):
            self.violations = []
        def visit_Import(self, node):
            for alias in node.names:
                if alias.name.split(".")[0] in BLOCKED_IMPORTS:
                    self.violations.append(f"Blocked import: {alias.name}")
            self.generic_visit(node)
        def visit_ImportFrom(self, node):
            if node.module and node.module.split(".")[0] in BLOCKED_IMPORTS:
                self.violations.append(f"Blocked import: {node.module}")
            self.generic_visit(node)
        def visit_Call(self, node):
            func_name = getattr(node.func, "id", getattr(node.func, "attr", None))
            if func_name in BLOCKED_CALLS:
                self.violations.append(f"Blocked call: {func_name}()")
            self.generic_visit(node)
        def visit_Attribute(self, node):
            obj_name = getattr(node.value, "id", None)
            if obj_name in BLOCKED_IMPORTS:
                self.violations.append(f"Blocked access: {obj_name}.{node.attr}")
            if node.attr.startswith("__") and node.attr.endswith("__"):
                self.violations.append(f"Blocked dunder: {node.attr}")
            self.generic_visit(node)
            
    validator = CodeValidator()
    validator.visit(tree)
    if validator.violations:
        raise HTTPException(status_code=400, detail=f"Code blocked: {'; '.join(validator.violations[:3])}")

def _validate_code(code: str, language: str):
    patterns = _BLOCKED_PATTERNS.get(language, [])
    for pattern in patterns:
        match = _re.search(pattern, code)
        if match:
            raise HTTPException(status_code=400, detail=f"Blocked: '{match.group()}' is not allowed.")
    _validate_code_ast(code, language)

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

import tenacity

TIMEOUT_CONFIG = {
    "python": 15.0,
    "javascript": 15.0,
    "c": 65.0,
    "cpp": 65.0,
    "java": 50.0,
    "sql": 15.0,
}

@app.post("/api/code/execute")
@limiter.limit("30/minute")
async def execute_code(request: Request, req: CodeExecuteRequest, user: dict = Depends(get_current_user)):
    lang_timeout = TIMEOUT_CONFIG.get(req.language.lower(), 65.0)

    @tenacity.retry(
        stop=tenacity.stop_after_attempt(3),
        wait=tenacity.wait_exponential(multiplier=1, min=1, max=10),
        retry=tenacity.retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
        reraise=True
    )
    async def _do_request():
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{code_runner_url}/run",
                json={"language": req.language, "code": req.code, "test_input": req.test_input},
                timeout=lang_timeout
            )
            if resp.status_code == 400:
                raise HTTPException(status_code=400, detail=resp.json().get("detail", "Error"))
            if resp.status_code in [502, 503, 504]:
                raise httpx.RequestError("Code runner gateway timeout")
            if resp.status_code != 200:
                return {"output": "", "error": "Code runner service unavailable", "exit_code": -1}
            return resp.json()

    try:
        return await _do_request()
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
@app.get("/api/challenges")
async def get_challenges(page: int = 1, limit: int = 20, difficulty: str = "", topic: str = "", session: AsyncSession = Depends(get_db)):
    stmt = select(models.CodingChallenge)
    if difficulty:
        stmt = stmt.where(models.CodingChallenge.difficulty == difficulty)
    
    result = await session.execute(stmt)
    all_challenges = result.scalars().all()
    if topic:
        all_challenges = [c for c in all_challenges if topic in (c.topics or [])]
        
    start = (page - 1) * limit
    page_data = all_challenges[start : start + limit]
    
    return {
        "data": [{"id": c.id, "title": c.title, "description": c.description, "difficulty": c.difficulty, "topics": c.topics, "language_support": c.language_support} for c in page_data],
        "total": len(all_challenges),
        "page": page,
        "limit": limit
    }

@app.get("/api/challenges/stats")
async def get_challenge_stats(user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    stmt = select(models.CodingChallenge).join(
        models.ChallengeProgress,
        models.CodingChallenge.id == models.ChallengeProgress.challenge_id
    ).where(
        models.ChallengeProgress.student_id == user["id"],
        models.ChallengeProgress.status == "completed"
    )
    cr = await session.execute(stmt)
    solved_challenges = cr.scalars().all()
    
    easy = medium = hard = 0
    topics_count = {}
    
    for c in solved_challenges:
        d = getattr(c, "difficulty", "easy").lower()
        if d == "easy": easy += 1
        elif d == "medium": medium += 1
        elif d == "hard": hard += 1
        for t in (c.topics or []):
            topics_count[t] = topics_count.get(t, 0) + 1
            
    return {"total_solved": len(solved_challenges), "difficulty": {"Easy": easy, "Medium": medium, "Hard": hard}, "topics": topics_count}

@app.post("/api/challenges/submit")
@limiter.limit("30/minute")
async def submit_challenge(request: Request, req: ChallengeSubmit, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    cr = await session.execute(select(models.CodingChallenge).where(models.CodingChallenge.id == req.challenge_id))
    challenge = cr.scalars().first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
        
    init_sql_script = ""
    # Inject the SQL datasets for DataLemur style tests
    if req.language.lower() == "sql" and challenge.init_code:
        init_sql_script = challenge.init_code.get("sql", "")
        
    lang_timeout = TIMEOUT_CONFIG.get(req.language.lower(), 60.0)

    @tenacity.retry(
        stop=tenacity.stop_after_attempt(3),
        wait=tenacity.wait_exponential(multiplier=1, min=1, max=10),
        retry=tenacity.retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
        reraise=True
    )
    async def _do_request():
        async with httpx.AsyncClient() as client:
            return await client.post(
                f"{code_runner_url}/run",
                json={"language": req.language, "code": req.code, "test_input": init_sql_script},
                timeout=lang_timeout
            )

    try:
        resp = await _do_request()
        
        if resp.status_code == 200:
            result = resp.json()
            exit_code = result.get("exit_code", -1)
            
            is_success = (exit_code == 0)
            
            if is_success:
                pr = await session.execute(select(models.ChallengeProgress).where(models.ChallengeProgress.student_id == user["id"], models.ChallengeProgress.challenge_id == req.challenge_id))
                prog = pr.scalars().first()
                if not prog:
                    prog = models.ChallengeProgress(student_id=user["id"], challenge_id=req.challenge_id, status="completed", language_used=req.language)
                    session.add(prog)
                else:
                    prog.status = "completed"
                await session.commit()
                
            return {"output": result.get("output", ""), "error": result.get("error", ""),
                    "exit_code": exit_code, "success": is_success}
        return {"error": "Code runner service error", "exit_code": -1, "success": False}
    except Exception as e:
        return {"error": str(e), "exit_code": -1, "success": False}

@app.on_event("startup")
async def startup():
    import asyncio
    max_retries = 5
    for attempt in range(1, max_retries + 1):
        try:
            await _seed_db()
            return
        except Exception as e:
            if attempt == max_retries:
                print(f"[startup] FATAL: Could not connect to database after {max_retries} attempts: {e}")
                raise
            wait = 2 ** attempt  # 2s, 4s, 8s, 16s
            print(f"[startup] DB connection failed (attempt {attempt}/{max_retries}), retrying in {wait}s... ({e})")
            await asyncio.sleep(wait)

async def _seed_db():
    """PostgreSQL startup: schema is managed by Alembic migrations.
    Seed order matters:
      1. Upsert College (GNI) → get college.id UUID
      2. Upsert default Departments linked to college.id
      3. Upsert Admin user with college_id = college.id
    """
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        admin_college_id_str = os.environ.get("ADMIN_COLLEGE_ID", "A001")
        admin_pwd = os.environ.get("ADMIN_PASSWORD", "admin123")
        college_name = os.environ.get("COLLEGE_NAME", "Guru Nanak Institutions Technical Campus")

        # 1. Upsert College
        college_r = await session.execute(
            select(models.College).where(models.College.name == college_name)
        )
        college = college_r.scalars().first()
        if not college:
            college = models.College(name=college_name, domain="gnitc.ac.in")
            session.add(college)
            await session.commit()
            await session.refresh(college)
            print(f"[startup] College '{college_name}' seeded with id={college.id}")
        else:
            print(f"[startup] College '{college_name}' already exists (id={college.id})")

        # 2. Upsert default Departments
        default_depts = [
            {"name": "Electronics & Telematics", "code": "ET"},
            {"name": "Computer Science & Engineering", "code": "CSE"},
            {"name": "Electrical & Electronics Engineering", "code": "EEE"},
            {"name": "Mechanical Engineering", "code": "ME"},
            {"name": "Civil Engineering", "code": "CE"},
            {"name": "Information Technology", "code": "IT"},
        ]
        for dept in default_depts:
            dept_r = await session.execute(
                select(models.Department).where(
                    models.Department.college_id == college.id,
                    models.Department.code == dept["code"]
                )
            )
            if not dept_r.scalars().first():
                session.add(models.Department(college_id=college.id, name=dept["name"], code=dept["code"]))
        await session.commit()
        print(f"[startup] Default departments ensured for {college_name}")

        # 3. Upsert Admin user with real college FK
        result = await session.execute(
            select(models.User).where(
                models.User.profile_data["college_id"].astext == admin_college_id_str
            )
        )
        existing = result.scalars().first()
        if not existing:
            admin = models.User(
                name="GNI Admin",
                email="admin@gni.edu",
                password_hash=hash_password(admin_pwd),
                role="admin",
                college_id=college.id,
                profile_data={"college_id": admin_college_id_str, "college": college_name, "department": "Administration"},
            )
            session.add(admin)
            await session.commit()
            print(f"[startup] Admin user '{admin_college_id_str}' seeded with college_id={college.id}")
        else:
            # Fix existing admin if college_id is None
            if existing.college_id is None:
                existing.college_id = college.id
                await session.commit()
                print(f"[startup] Fixed admin college_id: None → {college.id}")
            else:
                print(f"[startup] Admin '{admin_college_id_str}' already exists. Skipping seed.")



