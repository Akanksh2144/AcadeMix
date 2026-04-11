import os
import logging
import contextvars
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import event, text

load_dotenv()

logger = logging.getLogger("acadmix.rls")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

from sqlalchemy.pool import NullPool

# ═══════════════════════════════════════════════════════════════════════════════
# TENANT ENGINE — used by all FastAPI request handlers.
# The after_begin hook downgrades from 'postgres' to 'authenticated' and sets
# Postgres GUC variables so that future CREATE POLICY rules can reference them.
# ═══════════════════════════════════════════════════════════════════════════════

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=20,
    max_overflow=30,
    pool_timeout=10,
    pool_recycle=600,
    connect_args={
        "statement_cache_size": 0,
        "timeout": 10,
        "command_timeout": 30,
        "server_settings": {"jit": "off"},
    },
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN ENGINE — used by Alembic migrations, seed scripts, shadow-mode log
# writes, and any bulk system operation that must bypass RLS.
# This engine has NO event listeners — it stays as the 'postgres' superuser
# with BYPASSRLS for the entire session lifetime.
# ═══════════════════════════════════════════════════════════════════════════════

admin_engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    poolclass=NullPool,
    connect_args={
        "statement_cache_size": 0,
        "timeout": 10,
        "command_timeout": 60,  # longer timeout for bulk/migration operations
        "server_settings": {"jit": "off"},
    },
)

AdminSessionLocal = async_sessionmaker(
    bind=admin_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

tenant_context = contextvars.ContextVar("tenant_context", default=None)

# ═══════════════════════════════════════════════════════════════════════════════
# TENANT GUC HOOK — fires on every new transaction in the tenant engine.
# Sets Postgres session variables for RLS policy evaluation.
# ═══════════════════════════════════════════════════════════════════════════════


# Legacy Python-Level GUC listener was removed. 
# Tenant isolation is now completely delegated to the PostgreSQL Kernel via Supabase JWTs.


# ═══════════════════════════════════════════════════════════════════════════════
# ORM-LEVEL FILTERING — soft-delete + tenant isolation via with_loader_criteria.
# This is the application-level safety net BEFORE Postgres RLS is enabled.
# ═══════════════════════════════════════════════════════════════════════════════


@event.listens_for(AsyncSession.sync_session_class, "do_orm_execute")
def receive_do_orm_execute(orm_execute_state):
    college_id = tenant_context.get()

    if orm_execute_state.is_select and not orm_execute_state.is_relationship_load:
        from sqlalchemy.orm import with_loader_criteria

        # Soft delete criteria (applies globally)
        orm_execute_state.statement = orm_execute_state.statement.options(
            with_loader_criteria(
                Base,
                lambda cls: cls.is_deleted == False
                if hasattr(cls, "is_deleted")
                else True,
                include_aliases=True,
            )
        )

        # Tenant isolation criteria
        # User is now tenant-filtered (previously exempt — caused cross-tenant leaks).
        # College and CodingChallenge remain exempt: they are lookup/global tables.
        # Nodal officers have college_id=None → college_id is falsy → this block
        # is skipped entirely; nodal routes do explicit jurisdiction-based filtering.
        if college_id and college_id != "super_admin":
            orm_execute_state.statement = orm_execute_state.statement.options(
                with_loader_criteria(
                    Base,
                    lambda cls, cid=college_id: cls.college_id == cid
                    if hasattr(cls, "college_id")
                    and cls.__name__ not in ["CodingChallenge", "College"]
                    else True,
                    include_aliases=True,
                )
            )


# ═══════════════════════════════════════════════════════════════════════════════
# SHADOW MODE — silently validates RLS correctness on live queries.
#
# When RLS_SHADOW_MODE is "log" or "log_and_warn", every ORM SELECT result is
# checked: does each returned row's college_id match the requesting tenant?
# Mismatches are written to the rls_shadow_logs table via the ADMIN engine
# (so the write itself isn't subject to RLS).
#
# Values: "off" (default), "log", "log_and_warn"
# ═══════════════════════════════════════════════════════════════════════════════

RLS_SHADOW_MODE = os.getenv("RLS_SHADOW_MODE", "log")

# Circuit breaker: stop logging after this many unresolved violations to
# prevent runaway table growth in production.
_SHADOW_CIRCUIT_BREAKER_LIMIT = int(os.getenv("RLS_SHADOW_CIRCUIT_LIMIT", "1000"))
_shadow_violation_count = 0  # in-memory counter, reset on process restart
_shadow_circuit_open = False

# Rate limiter: max violations logged per query to avoid N*M explosion
_SHADOW_MAX_PER_QUERY = 10


async def _log_rls_violations(violations: list[dict]):
    """Write shadow-mode violations to the audit table using the admin engine.

    Uses a dedicated admin session so the write is never blocked by RLS.
    Respects the circuit breaker — once the limit is hit, silently stops logging.
    """
    global _shadow_violation_count, _shadow_circuit_open

    if _shadow_circuit_open:
        return

    async with AdminSessionLocal() as admin_session:
        try:
            from models import RLSShadowLog

            for v in violations[:_SHADOW_MAX_PER_QUERY]:
                admin_session.add(RLSShadowLog(**v))
                _shadow_violation_count += 1

            await admin_session.commit()

            if _shadow_violation_count >= _SHADOW_CIRCUIT_BREAKER_LIMIT:
                _shadow_circuit_open = True
                logger.error(
                    "RLS shadow-mode circuit breaker OPEN — %d violations logged, "
                    "stopping further writes. Investigate rls_shadow_logs table.",
                    _shadow_violation_count,
                )
        except Exception:
            logger.exception("Failed to write RLS shadow-mode violation")
            await admin_session.rollback()


async def shadow_check_results(results, session):
    """Validate a list of ORM result rows against the current tenant context.

    Call this after fetching rows from a tenant session. It inspects each row
    for college_id mismatches and soft-delete leaks, then asynchronously logs
    any violations.

    Args:
        results: iterable of ORM model instances (must have __table__)
        session: the AsyncSession that produced these results (for context)
    """
    if RLS_SHADOW_MODE == "off":
        return

    expected_cid = session.info.get("college_id")
    user_id = session.info.get("user_id", "")
    user_role = session.info.get("role", "")

    if not expected_cid:
        return  # no tenant context set — nothing to validate

    # Tables exempt from tenant isolation (same list as the ORM filter)
    EXEMPT_TABLES = {"users", "colleges", "coding_challenges"}

    violations = []

    for row in results:
        if not hasattr(row, "__table__"):
            continue

        table_name = row.__table__.name

        if table_name in EXEMPT_TABLES:
            continue

        # Check 1: Tenant isolation — does college_id match?
        if hasattr(row, "college_id") and row.college_id is not None:
            if str(row.college_id) != str(expected_cid):
                violations.append(
                    {
                        "expected_college_id": expected_cid,
                        "actual_college_id": str(row.college_id),
                        "table_name": table_name,
                        "row_id": getattr(row, "id", None),
                        "user_id": user_id,
                        "user_role": user_role,
                        "violation_type": "cross_tenant_leak",
                    }
                )

        # Check 2: Missing college_id on a table that should have it
        if (
            "college_id" in row.__table__.columns
            and table_name not in EXEMPT_TABLES
            and getattr(row, "college_id", None) is None
        ):
            violations.append(
                {
                    "expected_college_id": expected_cid,
                    "actual_college_id": None,
                    "table_name": table_name,
                    "row_id": getattr(row, "id", None),
                    "user_id": user_id,
                    "user_role": user_role,
                    "violation_type": "missing_college_id",
                }
            )

        # Check 3: Soft-delete leak — is_deleted rows sneaking through
        if hasattr(row, "is_deleted") and row.is_deleted:
            violations.append(
                {
                    "expected_college_id": expected_cid,
                    "actual_college_id": getattr(row, "college_id", None),
                    "table_name": table_name,
                    "row_id": getattr(row, "id", None),
                    "user_id": user_id,
                    "user_role": user_role,
                    "violation_type": "soft_delete_leak",
                }
            )

    if violations:
        if RLS_SHADOW_MODE == "log_and_warn":
            logger.warning(
                "RLS shadow-mode: %d violation(s) detected in query results",
                len(violations),
            )

        await _log_rls_violations(violations)


# ═══════════════════════════════════════════════════════════════════════════════
# SESSION FACTORIES — dependency injectors for FastAPI and standalone scripts.
# ═══════════════════════════════════════════════════════════════════════════════


async def get_db():
    """FastAPI dependency — yields a tenant-scoped session.

    Uses the Unit of Work pattern: the entire HTTP request runs inside
    a single transaction.  On success the transaction auto-commits;
    on any unhandled exception it auto-rolls-back.  Existing
    ``await session.commit()`` calls within service methods become
    safe no-ops inside the managed transaction scope.
    """
    async with AsyncSessionLocal() as session:
        async with session.begin():
            yield session


async def get_admin_db():
    """FastAPI dependency — yields an admin session that bypasses all RLS.

    Use ONLY for system-level operations: user management seed endpoints,
    cross-tenant analytics, migration helpers, etc.
    """
    async with AdminSessionLocal() as session:
        session.info["_admin_bypass"] = True
        async with session.begin():
            yield session


@asynccontextmanager
async def admin_session_ctx():
    """Async context manager for admin sessions outside of FastAPI DI.

    Usage in seed scripts / management commands:

        async with admin_session_ctx() as session:
            session.add(SomeModel(...))
            await session.commit()
    """
    async with AdminSessionLocal() as session:
        session.info["_admin_bypass"] = True
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
