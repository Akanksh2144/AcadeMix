from typing import Any, Dict, Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.crud.base import CRUDBase
from app.models import User
from app.core.security import hash_password

class CRUDUser(CRUDBase[User]):
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalars().first()

    async def get_multi_by_college(self, db: AsyncSession, *, college_id: str, role: Optional[str] = None, skip: int = 0, limit: int = 100):
        stmt = select(User).where(User.college_id == college_id)
        if role:
            stmt = stmt.where(User.role == role)
        result = await db.execute(stmt.offset(skip).limit(limit))
        return result.scalars().all()

user = CRUDUser(User)
