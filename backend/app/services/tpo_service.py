from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any
from app.models.alumni_industry import Company, PlacementDrive, PlacementApplication
from app.models.evaluation import SemesterGrade

class TPOService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_companies(self, college_id: str) -> List[dict]:
        result = await self.db.execute(select(Company).filter_by(college_id=college_id))
        companies = result.scalars().all()
        return [{"id": c.id, "name": c.name, "sector": c.sector, "website": c.website} for c in companies]

    async def get_drives(self, college_id: str) -> List[dict]:
        stmt = select(PlacementDrive, Company).join(Company, PlacementDrive.company_id == Company.id).filter(PlacementDrive.college_id == college_id)
        result = await self.db.execute(stmt)
        drives = []
        for drive, comp in result.all():
             drives.append({
                 "id": drive.id, "company_name": comp.name, "role": drive.job_description,
                 "status": drive.status, "eligibility": drive.eligibility_criteria, "stipend": drive.stipend
             })
        return drives

    async def _calculate_student_cgpa(self, student_id: str) -> float:
        # DATA ISOLATION: Fetch immutable academic truth from Evaluation Domain
        grades_stmt = select(SemesterGrade.grade).filter_by(student_id=student_id)
        grades = (await self.db.execute(grades_stmt)).scalars().all()
        
        if not grades:
             return 0.0
             
        grade_map = {"O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "U": 0, "F": 0}
        total_points = sum(grade_map.get(g, 0) for g in grades)
        return round(total_points / len(grades), 2)

    async def apply_to_drive(self, college_id: str, student_id: str, drive_id: str) -> dict:
        drive = await self.db.get(PlacementDrive, drive_id)
        if not drive or drive.college_id != college_id:
             return {"success": False, "error": "Drive not found"}
             
        # ENFORCE RBAC & DOMAIN ISOLATION
        min_cgpa = (drive.eligibility_criteria or {}).get("min_cgpa", 0.0)
        actual_cgpa = await self._calculate_student_cgpa(student_id)
        
        if actual_cgpa < min_cgpa:
             return {"success": False, "error": f"Requires {min_cgpa} CGPA, but verified academic record shows {actual_cgpa} CGPA"}
             
        # Check if already applied
        existing = await self.db.execute(select(PlacementApplication).filter_by(student_id=student_id, drive_id=drive_id))
        if existing.scalar_one_or_none():
             return {"success": False, "error": "Already applied"}
             
        application = PlacementApplication(college_id=college_id, student_id=student_id, drive_id=drive_id)
        self.db.add(application)
        await self.db.commit()
        return {"success": True, "message": "Application submitted successfully"}

    async def get_stats(self, college_id: str) -> dict:
        return {"total_placed": 0, "active_drives": 0, "companies_visited": 0}

    async def get_applicants(self, college_id: str, drive_id: str) -> list:
        from app.models.core import User
        from app.models.evaluation import QuizAttempt
        from sqlalchemy import func
        
        stmt = (
            select(
                PlacementApplication.id,
                PlacementApplication.status,
                PlacementApplication.created_at,
                User.id.label("student_id"),
                User.name.label("student_name"),
                User.email,
                func.sum(QuizAttempt.telemetry_strikes).label("total_strikes")
            )
            .join(User, User.id == PlacementApplication.student_id)
            .outerjoin(QuizAttempt, User.id == QuizAttempt.student_id)
            .where(PlacementApplication.drive_id == drive_id, PlacementApplication.college_id == college_id)
            .group_by(PlacementApplication.id, User.id)
        )
        result = await self.db.execute(stmt)
        data = []
        for row in result.all():
            data.append({
                "id": row.id,
                "student_id": row.student_id,
                "student_name": row.student_name,
                "email": row.email,
                "status": row.status,
                "applied_at": row.created_at.isoformat() if row.created_at else None,
                "telemetry_strikes": row.total_strikes or 0
            })
        return data

    async def shortlist_bulk(self, college_id: str, drive_id: str, student_ids: list):
        pass

    async def log_result(self, college_id: str, drive_id: str, data: dict):
        pass

    async def select_candidate(self, college_id: str, drive_id: str, data: dict):
        pass

