from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.crud.base import CRUDBase
from app.models.evaluation import ExamSchedule

class CRUDExamCell(CRUDBase[ExamSchedule]):
    async def get_published_schedules(self, db: AsyncSession, college_id: str) -> List[ExamSchedule]:
        stmt = select(ExamSchedule).where(
            ExamSchedule.college_id == college_id,
            ExamSchedule.is_published == True
        )
        res = await db.execute(stmt)
        return res.scalars().all()

examcell = CRUDExamCell(ExamSchedule)
