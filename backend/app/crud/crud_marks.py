from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.crud.base import CRUDBase
from app.models.evaluation import MarkSubmission, MarkSubmissionEntry

class CRUDMarks(CRUDBase[MarkSubmission]):
    async def get_submissions_by_faculty(self, db: AsyncSession, faculty_id: str, exam_type: Optional[str] = None) -> List[MarkSubmission]:
        stmt = select(MarkSubmission).where(MarkSubmission.faculty_id == faculty_id)
        if exam_type:
            stmt = stmt.where(MarkSubmission.exam_type == exam_type)
        res = await db.execute(stmt)
        return res.scalars().all()

    async def get_entries_by_submission(self, db: AsyncSession, submission_id: str) -> List[MarkSubmissionEntry]:
        res = await db.execute(select(MarkSubmissionEntry).where(MarkSubmissionEntry.submission_id == submission_id))
        return res.scalars().all()

marks = CRUDMarks(MarkSubmission)
