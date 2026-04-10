from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Index, UniqueConstraint, Date, CheckConstraint, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func, text
import uuid
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

from app.models.core import SoftDeleteMixin

class AuditLog(Base, SoftDeleteMixin):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    resource = Column(String, nullable=False)
    action = Column(String, nullable=False)
    details = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RLSShadowLog(Base):
    """Logs RLS shadow-mode validation failures.

    Each row represents a single query result row that violated tenant isolation
    rules during a shadow-mode dry run. These records are used to identify logic
    bugs in the ORM-level filtering BEFORE real Postgres CREATE POLICY rules are
    enabled.

    NOT soft-deletable — these are security audit records that must never be
    silently hidden by the is_deleted filter.
    """
    __tablename__ = "rls_shadow_logs"
    id                  = Column(String, primary_key=True, index=True, default=generate_uuid)
    timestamp           = Column(DateTime(timezone=True), server_default=func.now())
    expected_college_id = Column(String, nullable=False)
    actual_college_id   = Column(String, nullable=True)
    table_name          = Column(String, nullable=False)
    row_id              = Column(String, nullable=True)
    user_id             = Column(String, nullable=True)
    user_role           = Column(String, nullable=True)
    query_text          = Column(String, nullable=True)  # first 500 chars of compiled SQL
    violation_type      = Column(String, nullable=False)  # cross_tenant_leak | missing_college_id | soft_delete_leak
    resolved            = Column(Boolean, nullable=False, server_default=text('false'))

    __table_args__ = (
        Index("ix_rls_shadow_resolved_ts", "resolved", "timestamp"),
        Index("ix_rls_shadow_violation_type", "violation_type"),
    )


