from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from database import get_db
from app.core.security import get_current_user
from app.core.security import require_role
from app.core.deps import require_permission
from app.services.marks_service import MarksService
import app.schemas as server_schemas
from app.schemas import *
from app import models

router = APIRouter()

def get_marks_service(session: AsyncSession = Depends(get_db)):
    return MarksService(session)

@router.get("/marks/students")
async def get_students_for_marks(
    department: str, 
    batch: str, 
    section: str, 
    user: dict = Depends(require_role("teacher", "hod", "admin", "exam_cell")), 
    svc: MarksService = Depends(get_marks_service)
):
    return await svc.get_students_for_assignment(department, batch, section, user["college_id"])

@router.get("/marks/entry/{assignment_id}/{exam_type}")
async def get_mark_entry(
    assignment_id: str, 
    exam_type: str, 
    component_id: Optional[str] = None, 
    user: dict = Depends(require_role("teacher", "hod")), 
    svc: MarksService = Depends(get_marks_service)
):
    return await svc.get_entry(assignment_id, exam_type, component_id, user)

@router.post("/marks/entry")
async def save_mark_entry(
    req: server_schemas.MarkEntrySave, 
    user: dict = Depends(require_permission("marks", "edit")), 
    svc: MarksService = Depends(get_marks_service)
):
    return await svc.save_entry(req, user)

@router.put("/marks/entry/{entry_id}/submit")
async def submit_marks(
    entry_id: str, 
    user: dict = Depends(require_role("teacher", "hod")), 
    svc: MarksService = Depends(get_marks_service)
):
    return await svc.submit_entry(entry_id, user)

@router.put("/hod/marks/entry/{entry_id}/review")
async def review_marks(
    entry_id: str, 
    req: server_schemas.MarkReview, 
    user: dict = Depends(require_role("hod", "admin")), 
    svc: MarksService = Depends(get_marks_service)
):
    return await svc.review_entry(entry_id, req, user)

@router.get("/examcell/marks/approved")
async def get_approved_marks(
    user: dict = Depends(require_role("exam_cell", "admin")), 
    svc: MarksService = Depends(get_marks_service)
):
    return await svc.get_approved_marks(user["college_id"])

@router.post("/marks/entry/upload")
async def upload_marks_file(
    file: UploadFile = File(...), 
    semester: int = Form(...), 
    subject_code: str = Form(...), 
    exam_type: str = Form(...), 
    max_marks: float = Form(...),
    user: dict = Depends(require_role("teacher", "hod")), 
    svc: MarksService = Depends(get_marks_service)
):
    return await svc.upload_marks(file, semester, subject_code, exam_type, user, max_marks)

@router.get("/student/cia-marks")
async def get_student_cia_marks(
    semester: Optional[int] = None,
    academic_year: Optional[str] = None,
    user: dict = Depends(require_role("student")),
    svc: MarksService = Depends(get_marks_service)
):
    return await svc.get_student_cia(user["id"], user["college_id"], semester, academic_year)

@router.get("/parent/children/{student_id}/cia-marks")
async def parent_child_cia_marks(
    student_id: str,
    user: dict = Depends(require_role("parent")),
    svc: MarksService = Depends(get_marks_service)
):
    # Explicit parent link verification
    link_r = await svc.session.execute(
        select(models.ParentStudentLink).where(
            models.ParentStudentLink.parent_id == user["id"],
            models.ParentStudentLink.student_id == student_id,
            models.ParentStudentLink.college_id == user["college_id"]
        )
    )
    if not link_r.scalars().first():
        raise HTTPException(status_code=403, detail="Unverified parent-student relationship")
    return await svc.get_student_cia(student_id, user["college_id"])

@router.get("/hod/cia/status")
async def get_cia_status(
    department: Optional[str] = None,
    academic_year: Optional[str] = None,
    user: dict = Depends(require_role("hod", "admin")),
    svc: MarksService = Depends(get_marks_service)
):
    dept_id = department or user.get("profile_data", {}).get("department_id")
    return await svc.get_status_report(user, dept_id, academic_year)
