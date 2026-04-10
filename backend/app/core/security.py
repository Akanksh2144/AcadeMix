import os
import bcrypt
import jwt
import uuid
import redis
from datetime import datetime, timezone, timedelta
from typing import Optional, Any

from fastapi import Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database import get_db, tenant_context
from app import models

# ─── Configuration ────────────────────────────────────────────────────────────

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable must be set!")
JWT_ALGORITHM = "HS256"

redis_url = os.environ.get("REDIS_URL", "")
redis_client = redis.from_url(redis_url) if redis_url else None

class TokenBlacklistConfig:
    USE_BLACKLIST = os.getenv("USE_TOKEN_BLACKLIST", "false").lower() == "true"
    ACCESS_TOKEN_TTL_MINUTES = 1440  # 24 hours
    REFRESH_TOKEN_TTL_DAYS = 7
    BLACKLIST_CHECK_REDIS = True

# ─── Auth Helpers ─────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

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

# ─── Dependencies ─────────────────────────────────────────────────────────────

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
            # Prevent JSONB prototype pollution from overwriting core claims
            for k, v in user.profile_data.items():
                if k not in ["id", "role", "email", "name", "tenant_id", "college_id"]:
                    user_dict[k] = v
            
        if "tenant_id" not in user_dict:
            user_dict["tenant_id"] = user_dict.get("college_id", "")
        
        # Nodal officers without a college_id get None context
        tenant_context.set(user.college_id)
            
        session.info["college_id"] = user_dict.get("college_id", "")
        session.info["role"] = user.role
        session.info["user_id"] = user.id
        
        import json
        from sqlalchemy import text
        
        # Simulate Supabase PostgREST JWT parsing at the Kernel Level
        jwt_claims = json.dumps({
            "college_id": user_dict.get("college_id", ""),
            "role": user.role,
            "sub": user.id
        })
        
        # Strict transaction boundary for PgBouncer safety (is_local=true binds to transaction)
        # Note: If the FastAPI route performs DB ops, they must share this transaction, 
        # but realistically in PgBouncer pool modes, the connection executes this atomically.
        await session.execute(
            text("SELECT set_config('role', 'authenticated', true), set_config('request.jwt.claims', :jwt, true);"),
            {"jwt": jwt_claims}
        )

        return user_dict
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        print(f"JWT Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        print(f"Internal Server Error during token validation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error during token validation: {e}")

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
