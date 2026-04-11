from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, desc
from app import models

class StudentRepository:
    """Repository handling data access patterns for the Student domain."""
    
    @staticmethod
    async def get_active_mentor_assignment(db: AsyncSession, student_id: str, college_id: str) -> Optional[models.MentorAssignment]:
        stmt = select(models.MentorAssignment).where(
            models.MentorAssignment.student_id == student_id,
            models.MentorAssignment.is_active == True,
            models.MentorAssignment.college_id == college_id
        )
        res = await db.execute(stmt)
        return res.scalars().first()

    @staticmethod
    async def search_students(db: AsyncSession, college_id: str, query: str = "", offset: int = 0, limit: int = 50) -> List[models.User]:
        stmt = select(models.User).outerjoin(models.UserProfile).where(
            models.User.role == "student",
            models.User.college_id == college_id
        )
        if query:
            stmt = stmt.where(
                models.User.name.ilike(f"%{query}%") |
                models.UserProfile.roll_number.ilike(f"%{query}%")
            )
        res = await db.execute(stmt.order_by(models.User.name).offset(offset).limit(limit))
        return list(res.scalars().all())

    @staticmethod
    async def get_student_profile(db: AsyncSession, student_id: str, college_id: str) -> Optional[models.User]:
        res = await db.execute(select(models.User).where(
            models.User.id == student_id,
            models.User.college_id == college_id
        ))
        return res.scalars().first()

    @staticmethod
    async def get_upcoming_placement_drives(db: AsyncSession, college_id: str) -> List[models.PlacementDrive]:
        stmt = select(models.PlacementDrive).where(
            models.PlacementDrive.college_id == college_id,
            models.PlacementDrive.status.in_(["upcoming", "ongoing"])
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_drive_by_id(db: AsyncSession, drive_id: str, college_id: str) -> Optional[models.PlacementDrive]:
        res = await db.execute(select(models.PlacementDrive).where(
            models.PlacementDrive.id == drive_id,
            models.PlacementDrive.college_id == college_id
        ))
        return res.scalars().first()

    @staticmethod
    async def get_placement_application(db: AsyncSession, drive_id: str, student_id: str) -> Optional[models.PlacementApplication]:
        res = await db.execute(select(models.PlacementApplication).where(
            models.PlacementApplication.drive_id == drive_id,
            models.PlacementApplication.student_id == student_id
        ))
        return res.scalars().first()

    @staticmethod
    async def get_student_quiz_attempt(db: AsyncSession, quiz_id: str, student_id: str) -> Optional[models.QuizAttempt]:
        res = await db.execute(select(models.QuizAttempt).where(
            models.QuizAttempt.quiz_id == quiz_id,
            models.QuizAttempt.student_id == student_id,
            models.QuizAttempt.status == "submitted"
        ))
        return res.scalars().first()
