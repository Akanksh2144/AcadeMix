from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.student_repo import StudentRepository
from app.core.exceptions import BusinessLogicError, ResourceNotFoundError
from app import models

class StudentService:
    """Service handling business rules and orchestration for the Student domain."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = StudentRepository()

    async def get_mentor_data(self, student_id: str, college_id: str) -> Dict[str, Any]:
        assignment = await self.repo.get_active_mentor_assignment(self.db, student_id, college_id)
        if not assignment:
            return {"mentor": None}
            
        faculty = await self.db.get(models.User, assignment.faculty_id)
        if not faculty:
            return {"mentor": None}
            
        return {
            "mentor": {
                "id": faculty.id,
                "name": faculty.name,
                "email": faculty.email,
                "department": faculty.department
            },
            "assigned_at": str(assignment.created_at)
        }

    async def get_eligible_drives(self, student: Dict[str, Any]) -> List[models.PlacementDrive]:
        drives = await self.repo.get_upcoming_placement_drives(self.db, student["college_id"])
        
        pd = student.get("profile_data") or {}
        student_cgpa = float(pd.get("cgpa", 0))
        student_backlogs = int(pd.get("active_backlogs", 0))
        student_dept = pd.get("department", "")
        
        eligible = []
        for d in drives:
            crit = d.eligibility_criteria or {}
            if crit:
                if float(crit.get("min_cgpa", 0)) > student_cgpa:
                    continue
                if "max_backlogs" in crit and int(crit.get("max_backlogs", 99)) < student_backlogs:
                    continue
                if "allowed_departments" in crit and crit["allowed_departments"]:
                    if student_dept not in crit["allowed_departments"]:
                        continue
            eligible.append(d)
        return eligible

    async def apply_for_drive(self, drive_id: str, student: Dict[str, Any]) -> str:
        drive = await self.repo.get_drive_by_id(self.db, drive_id, student["college_id"])
        if not drive:
            raise ResourceNotFoundError("PlacementDrive", drive_id)
            
        pd = student.get("profile_data") or {}
        student_cgpa = float(pd.get("cgpa", 0))
        student_backlogs = int(pd.get("active_backlogs", 0))
        student_dept = pd.get("department", "")
        
        crit = drive.eligibility_criteria or {}
        if crit:
            if float(crit.get("min_cgpa", 0)) > student_cgpa:
                raise BusinessLogicError("Ineligible: CGPA below requirement")
            if "max_backlogs" in crit and int(crit.get("max_backlogs", 99)) < student_backlogs:
                raise BusinessLogicError("Ineligible: Exceeds active backlog limits")
            if "allowed_departments" in crit and crit["allowed_departments"]:
                if student_dept not in crit["allowed_departments"]:
                    raise BusinessLogicError("Ineligible: Department not permitted")
                    
        if drive.linked_quiz_id:
            attempt = await self.repo.get_student_quiz_attempt(self.db, drive.linked_quiz_id, student["id"])
            if not attempt:
                raise BusinessLogicError("Pre-screening test not completed or not passed.")
            if drive.quiz_threshold and float(attempt.final_score or 0) < drive.quiz_threshold:
                raise BusinessLogicError("Pre-screening test not completed or not passed.")

        existing = await self.repo.get_placement_application(self.db, drive_id, student["id"])
        if existing:
            raise BusinessLogicError("Already applied")

        appl = models.PlacementApplication(
            college_id=student["college_id"],
            student_id=student["id"],
            drive_id=drive_id,
            status="registered"
        )
        self.db.add(appl)
        await self.db.commit()
        return str(appl.id)

    async def withdraw_from_drive(self, drive_id: str, student: Dict[str, Any]) -> None:
        appl = await self.repo.get_placement_application(self.db, drive_id, student["id"])
        if not appl:
            raise ResourceNotFoundError("PlacementApplication", drive_id)
            
        if appl.status != "registered":
            raise BusinessLogicError("Already shortlisted — contact T&P Officer")
            
        await self.db.delete(appl)
        await self.db.commit()
