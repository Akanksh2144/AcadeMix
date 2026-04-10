"""
Faculty Router — thin HTTP layer delegating to FacultyService.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.core.security import get_current_user, require_role
from app.schemas.users import FacultyProfileUpdate
from app.schemas.academic import FacultyAssignment
from app.schemas.administrative import ActivityPermissionCreate, OutOfCampusCreate, FreePeriodRequestCreate
from app.schemas.evaluation import FacultyQuestionPaper, FacultyStudyMaterial
from app.services.faculty_service import FacultyService

router = APIRouter()


def get_faculty_service(session: AsyncSession = Depends(get_db)):
    return FacultyService(session)


@router.get("/faculty/profile")
async def get_faculty_profile(
    user: dict = Depends(require_role("teacher", "faculty", "hod")),
    svc: FacultyService = Depends(get_faculty_service)
):
    return await svc.get_profile(user["id"])


@router.put("/faculty/profile")
async def update_faculty_profile(
    req: FacultyProfileUpdate,
    user: dict = Depends(require_role("teacher", "faculty", "hod")),
    svc: FacultyService = Depends(get_faculty_service)
):
    await svc.update_profile(user["id"], req.model_dump(exclude_unset=True))
    return {"message": "Profile updated successfully"}


@router.get("/faculty/teachers")
async def list_department_teachers(
    user: dict = Depends(require_role("hod", "admin")),
    svc: FacultyService = Depends(get_faculty_service)
):
    return await svc.list_department_teachers(user["college_id"])


@router.get("/faculty/assignments")
async def list_assignments(
    user: dict = Depends(require_role("hod", "admin", "teacher")),
    svc: FacultyService = Depends(get_faculty_service)
):
    return await svc.list_assignments(user["college_id"], user["role"], user["id"])


@router.post("/faculty/assignments")
async def create_assignment(
    req: FacultyAssignment,
    user: dict = Depends(require_role("hod", "admin")),
    svc: FacultyService = Depends(get_faculty_service)
):
    assignment_id = await svc.create_assignment(user["college_id"], req.model_dump())
    return {
        "id": assignment_id, "teacher_id": req.teacher_id, "subject_code": req.subject_code,
        "subject_name": req.subject_name, "department": req.department
    }


@router.delete("/faculty/assignments/{assignment_id}")
async def delete_assignment(
    assignment_id: str,
    user: dict = Depends(require_role("hod", "admin")),
    svc: FacultyService = Depends(get_faculty_service)
):
    await svc.delete_assignment(user["college_id"], assignment_id)
    return {"message": "Assignment deleted"}


@router.get("/faculty/students/{student_id}/progression")
async def get_student_progression(
    student_id: str,
    user: dict = Depends(get_current_user),
    svc: FacultyService = Depends(get_faculty_service)
):
    return await svc.get_student_progression(user, student_id)


@router.post("/faculty/activities")
async def request_activity_permission(
    req: ActivityPermissionCreate,
    user: dict = Depends(require_role("teacher", "hod")),
    svc: FacultyService = Depends(get_faculty_service)
):
    await svc.submit_activity_request(user["college_id"], user["id"], req.model_dump())
    return {"message": "Activity permission requested."}


@router.post("/faculty/out-of-campus")
async def request_out_of_campus(
    req: OutOfCampusCreate,
    user: dict = Depends(require_role("teacher", "hod")),
    svc: FacultyService = Depends(get_faculty_service)
):
    await svc.submit_out_of_campus(user["college_id"], user["id"], req.model_dump())
    return {"message": "Out of campus permission requested."}


@router.post("/faculty/free-periods")
async def request_free_period(
    req: FreePeriodRequestCreate,
    user: dict = Depends(require_role("teacher", "hod")),
    svc: FacultyService = Depends(get_faculty_service)
):
    await svc.submit_free_period(user["college_id"], user["id"], req.model_dump())
    return {"message": "Free period requested."}


@router.get("/faculty/my-tasks")
async def get_my_tasks(
    user: dict = Depends(require_role("teacher", "hod")),
    svc: FacultyService = Depends(get_faculty_service)
):
    return await svc.get_my_tasks(user["id"])


@router.get("/faculty/my-evaluations")
async def get_faculty_evaluations(
    user: dict = Depends(require_role("teacher", "hod", "expert")),
    svc: FacultyService = Depends(get_faculty_service)
):
    return await svc.get_my_evaluations(user["college_id"], user["id"])


@router.post("/faculty/question-papers")
async def faculty_submit_qp(
    req: FacultyQuestionPaper,
    user: dict = Depends(require_role("teacher", "hod")),
    svc: FacultyService = Depends(get_faculty_service)
):
    qp_id = await svc.submit_question_paper(user["college_id"], user["id"], req.model_dump())
    return {"message": "Question paper submitted successfully", "id": qp_id}


@router.get("/faculty/question-papers")
async def faculty_get_qps(
    user: dict = Depends(require_role("teacher", "hod")),
    svc: FacultyService = Depends(get_faculty_service)
):
    return await svc.list_question_papers(user["college_id"], user["id"])


@router.post("/faculty/study-materials")
async def faculty_submit_mat(
    req: FacultyStudyMaterial,
    user: dict = Depends(require_role("teacher", "hod")),
    svc: FacultyService = Depends(get_faculty_service)
):
    sm_id = await svc.submit_study_material(user["college_id"], user["id"], req.model_dump())
    return {"message": "Study material submitted successfully", "id": sm_id}


@router.get("/faculty/study-materials")
async def faculty_get_mats(
    user: dict = Depends(require_role("teacher", "hod")),
    svc: FacultyService = Depends(get_faculty_service)
):
    return await svc.list_study_materials(user["college_id"], user["id"])
