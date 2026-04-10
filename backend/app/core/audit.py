from sqlalchemy.ext.asyncio import AsyncSession
from app import models

async def log_audit(session: AsyncSession, user_id: str, resource: str, action: str, details: dict = None):
    log_entry = models.AuditLog(
        user_id=user_id,
        resource=resource,
        action=action,
        details=details or {}
    )
    session.add(log_entry)
