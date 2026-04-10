"""
Auth Router — thin HTTP layer delegating to AuthService.
"""

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.core.security import get_current_user
from app.services.auth_service import AuthService

router = APIRouter()


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


@router.post("/login")
async def login(req: LoginRequest, response: Response, session: AsyncSession = Depends(get_db)):
    svc = AuthService(session)
    result = await svc.login(req.college_id, req.password)

    response.set_cookie("access_token", result["access_token"], httponly=True, secure=True, samesite="none", max_age=86400)
    response.set_cookie("refresh_token", result["refresh_token"], httponly=True, secure=True, samesite="none", max_age=604800)
    return result


@router.post("/register")
async def register(req: RegisterRequest):
    from app.core.exceptions import BusinessLogicError
    raise BusinessLogicError("Self-registration is disabled. Please contact your college administrator.")


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    svc = AuthService(session)
    return await svc.get_current_user_profile(user)


@router.post("/logout")
async def logout(request: Request, response: Response, session: AsyncSession = Depends(get_db)):
    svc = AuthService(session)
    svc.logout(request.cookies.get("refresh_token"))
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}


@router.post("/refresh")
async def refresh_access_token(request: Request, response: Response, session: AsyncSession = Depends(get_db)):
    svc = AuthService(session)
    result = await svc.refresh(request.cookies.get("refresh_token"))
    response.set_cookie("access_token", result["access_token"], httponly=True, secure=True, samesite="none", max_age=900)
    return result
