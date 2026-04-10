from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, update
from pydantic import BaseModel

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    CRUD object with default methods to Create, Read, Update, Delete (CRUD).
    """

    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(self, db: AsyncSession, id: Any) -> Optional[ModelType]:
        result = await db.execute(select(self.model).filter(self.model.id == id))
        return result.scalars().first()

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        result = await db.execute(select(self.model).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType | Dict[str, Any]) -> ModelType:
        obj_in_data = obj_in.model_dump() if isinstance(obj_in, BaseModel) else obj_in
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        await db.flush()  # Allows returning ID before full transaction commit if mapped
        return db_obj

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        obj_data = {
            col.name: getattr(db_obj, col.name) for col in db_obj.__table__.columns
        }
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
            
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
                
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def delete(self, db: AsyncSession, *, id: Any) -> Optional[ModelType]:
        stmt = delete(self.model).where(self.model.id == id).returning(self.model)
        result = await db.execute(stmt)
        await db.flush()
        return result.scalars().first()

    async def delete_soft(self, db: AsyncSession, *, db_obj: ModelType) -> ModelType:
        """Soft delete by setting is_deleted=True if the model supports it."""
        if hasattr(db_obj, "is_deleted"):
            setattr(db_obj, "is_deleted", True)
            db.add(db_obj)
            await db.flush()
        return db_obj
