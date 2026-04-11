"""
AcadMix — B2B Multi-Tenant Academic SaaS Platform
Main FastAPI application entry point.
"""

from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent  # backend/
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
import redis as pyredis
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import AsyncSessionLocal
from app import models
from app.core.exceptions import DomainException
from app.core.security import hash_password

logger = logging.getLogger("acadmix.main")

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

DEFAULT_GRADE_SCALE = [
    {"min_pct": 90, "grade": "O", "points": 10},
    {"min_pct": 80, "grade": "A+", "points": 9},
    {"min_pct": 70, "grade": "A", "points": 8},
    {"min_pct": 60, "grade": "B+", "points": 7},
    {"min_pct": 50, "grade": "B", "points": 6},
    {"min_pct": 45, "grade": "C", "points": 5},
    {"min_pct": 40, "grade": "D", "points": 4},
    {"min_pct": 0, "grade": "F", "points": 0},
]

from app.core.config import settings

JWT_SECRET = settings.JWT_SECRET

cors_origins_env = settings.CORS_ORIGINS
if not cors_origins_env:
    raise ValueError("CORS_ORIGINS must be explicitly set (no wildcard allowed)")

origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
if "*" in origins:
    raise ValueError("CORS_ORIGINS cannot contain wildcard '*'. List origins explicitly.")
if os.getenv("ENVIRONMENT") == "production":
    for origin in origins:
        if not origin.startswith("https://"):
            raise ValueError(f"CORS origin '{origin}' must use HTTPS in production")


# ═══════════════════════════════════════════════════════════════════════════════
# SENTRY
# ═══════════════════════════════════════════════════════════════════════════════

def _scrub_pii(event, hint):
    """Aggressively strip PII from the event before it's sent to Sentry"""
    if "request" in event and "data" in event["request"]:
        data = event["request"]["data"]
        if isinstance(data, dict):
            for pii_key in ["email", "password", "name", "college_id"]:
                if pii_key in data:
                    data[pii_key] = "[FILTERED]"
    return event

sentry_dsn = settings.SENTRY_DSN
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        enable_tracing=True,
        traces_sample_rate=1.0,
        send_default_pii=False,
        before_send=_scrub_pii,
        integrations=[FastApiIntegration()],
    )


# ═══════════════════════════════════════════════════════════════════════════════
# STARTUP / SHUTDOWN LIFECYCLE
# ═══════════════════════════════════════════════════════════════════════════════

async def _seed_db():
    """PostgreSQL startup: schema is managed by Alembic migrations.
    Seed order matters:
      1. Upsert College (GNI) → get college.id UUID
      2. Upsert default Departments linked to college.id
      3. Upsert Admin user with college_id = college.id
    """
    async with AsyncSessionLocal() as session:
        admin_college_id_str = settings.ADMIN_COLLEGE_ID
        admin_pwd = settings.ADMIN_PASSWORD
        college_name = settings.COLLEGE_NAME

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
            logger.info("[startup] College '%s' seeded with id=%s", college_name, college.id)
        else:
            logger.info("[startup] College '%s' already exists (id=%s)", college_name, college.id)

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
                    models.Department.code == dept["code"],
                )
            )
            if not dept_r.scalars().first():
                session.add(models.Department(college_id=college.id, name=dept["name"], code=dept["code"]))
        await session.commit()
        logger.info("[startup] Default departments ensured for %s", college_name)

        # 3. Upsert Admin user with real college FK
        result = await session.execute(
            select(models.User).where(
                models.User.email == "admin@gni.edu"
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
            )
            try:
                session.add(admin)
                await session.flush()
                
                admin_profile = models.UserProfile(
                    user_id=admin.id,
                    college_id=college.id,
                    department="Administration",
                )
                session.add(admin_profile)
                await session.commit()
                logger.info("[startup] Admin user 'admin@gni.edu' seeded with college_id=%s", college.id)
            except IntegrityError:
                await session.rollback()
                logger.info("[startup] Admin 'admin@gni.edu' was seeded by another worker. Skipping.")
        else:
            if existing.college_id is None:
                existing.college_id = college.id
                await session.commit()
                logger.info("[startup] Fixed admin college_id: None → %s", college.id)
            else:
                logger.info("[startup] Admin 'admin@gni.edu' already exists. Skipping seed.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan handler (replaces deprecated @app.on_event)."""
    import asyncio
    max_retries = 5
    for attempt in range(1, max_retries + 1):
        try:
            await _seed_db()
            break
        except Exception as e:
            if attempt == max_retries:
                logger.critical("[startup] FATAL: Could not connect to database after %d attempts: %s", max_retries, e)
                raise
            wait = 2 ** attempt
            logger.warning("[startup] DB connection failed (attempt %d/%d), retrying in %ds... (%s)", attempt, max_retries, wait, e)
            await asyncio.sleep(wait)
    yield
    # Shutdown logic (if needed in the future) goes here


# ═══════════════════════════════════════════════════════════════════════════════
# APPLICATION FACTORY
# ═══════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="AcadMix API",
    description="Multi-Tenant Academic Management SaaS Platform",
    version="2.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
    max_age=3600,
)

# ─── Rate Limiter ─────────────────────────────────────────────────────────────
from app.core.limiter import limiter
app.state.limiter = limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── Domain Exception Handler ────────────────────────────────────────────────
@app.exception_handler(DomainException)
async def domain_exception_handler(request: Request, exc: DomainException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message, "details": exc.details},
    )

# ─── API Router ───────────────────────────────────────────────────────────────
from app.api.v1.router import api_router  # noqa: E402
app.include_router(api_router, prefix="/api")
