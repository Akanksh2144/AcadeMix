from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.crud.base import CRUDBase
from app.models.core import Department, User, UserProfile

class CRUDHOD(CRUDBase[Department]):
    async def get_department_faculty(self, db: AsyncSession, department_id: str) -> List[User]:
        stmt = select(User).join(UserProfile, User.id == UserProfile.user_id).where(
            UserProfile.department == department_id,
            User.role == "faculty"
        )
        res = await db.execute(stmt)
        return res.scalars().all()

hod = CRUDHOD(Department)
