from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Index, UniqueConstraint, Date, CheckConstraint, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, text
import uuid
from database import Base

def generate_uuid():
    return str(uuid.uuid4())


class SoftDeleteMixin:
    is_deleted = Column(Boolean, nullable=False, server_default=text('false'), index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)


class College(Base, SoftDeleteMixin):
    """
    settings JSONB shape:
    {
      "grade_scale": [
        {"min_pct": 90, "grade": "O", "points": 10},
        {"min_pct": 80, "grade": "A+", "points": 9},
        ...
        {"min_pct": 0, "grade": "F", "points": 0}
      ]
    }
    """
    __tablename__ = "colleges"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    name = Column(String, nullable=False)
    domain = Column(String, nullable=True)
    settings = Column(JSONB, nullable=False, server_default='{}')
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Department(Base, SoftDeleteMixin):
    __tablename__ = "departments"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    hod_user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class Section(Base, SoftDeleteMixin):
    __tablename__ = "sections"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    intake = Column(Integer, nullable=True)


class Role(Base, SoftDeleteMixin):
    __tablename__ = "roles"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    permissions = Column(JSONB, nullable=False, server_default='{}')


class User(Base, SoftDeleteMixin):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    profile = relationship("UserProfile", back_populates="user", lazy="joined", uselist=False)

    @property
    def profile_data(self):
        if self.profile:
            return {
                "department": self.profile.department,
                "section": self.profile.section,
                "batch": self.profile.batch,
                "current_semester": self.profile.current_semester,
                "phone": self.profile.phone,
                "blood_group": self.profile.blood_group,
                "telemetry_strikes": self.profile.telemetry_strikes,
                "acad_tokens": self.profile.acad_tokens,
                "college_id": self.profile.college_id,
                "roll_number": self.profile.roll_number,
                "force_password_change": self.profile.force_password_change,
            }
        return {}

class UserProfile(Base, SoftDeleteMixin):
    __tablename__ = "user_profiles"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    roll_number = Column(String, nullable=True, index=True)
    
    department = Column(String, nullable=True)
    section = Column(String, nullable=True)
    batch = Column(String, nullable=True)
    current_semester = Column(Integer, nullable=True)
    
    force_password_change = Column(Boolean, nullable=False, server_default=text('false'))
    
    phone = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    
    telemetry_strikes = Column(Integer, nullable=False, server_default=text('0'))
    acad_tokens = Column(Float, nullable=False, server_default=text('0.0'))

    user = relationship("User", back_populates="profile")

class UserPermission(Base, SoftDeleteMixin):
    """Admin-configurable permission flags per user. Separate from role.
    The `flags` JSONB column stores boolean/value gates set by admin:
      e.g. { "can_create_timetable": true, "is_subject_expert": false, ... }
    """
    __tablename__ = "user_permissions"
    id         = Column(String, primary_key=True, index=True, default=generate_uuid)
    user_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    flags      = Column(JSONB, nullable=False, server_default='{}')
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_user_permissions_user_college", "user_id", "college_id"),
    )

# ─── Phase 1: CIA Template Engine ────────────────────────────────────────────


class ParentStudentLink(Base, SoftDeleteMixin):
    """Many-to-many parent–student link with relationship metadata."""
    __tablename__ = "parent_student_links"
    id           = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id   = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id   = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship = Column(String, nullable=False)  # father/mother/guardian
    is_primary   = Column(Boolean, nullable=False, server_default=text('false'))
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("parent_id", "student_id", name="uq_parent_student"),
    )


