from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Index, UniqueConstraint, Date, CheckConstraint, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func, text
import uuid
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

from app.models.core import SoftDeleteMixin

class Course(Base, SoftDeleteMixin):
    __tablename__ = "courses"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    semester = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    credits = Column(Integer, nullable=False)
    type = Column(String, nullable=False) # Theory/Lab
    subject_code = Column(String, nullable=False, default="")
    regulation_year = Column(String, nullable=False, default="")
    hours_per_week = Column(Integer, nullable=False, default=0)


class CourseEnrollment(Base, SoftDeleteMixin):
    __tablename__ = "course_enrollments"
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    section = Column(String, nullable=True)
    batch = Column(String, nullable=True)


class Timetable(Base, SoftDeleteMixin):
    __tablename__ = "timetables"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    faculty_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    semester = Column(Integer, nullable=False)
    day = Column(String, nullable=False)
    time_slot = Column(String, nullable=False)
    room = Column(String, nullable=False)


class TimetableApproval(Base, SoftDeleteMixin):
    __tablename__ = "timetable_approvals"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    academic_year = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    is_approved = Column(Boolean, nullable=False, default=False)
    approved_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

# ─── Student Feedback Module ────────────────────────────────────


class PeriodSlot(Base, SoftDeleteMixin):
    """A single timetable slot: one period, one day, one batch+section.
    HOD creates these; attendance records reference them.
    slot_type: regular | lab | free | released | substitute | holiday
    'released' = faculty on approved leave; available in the free-period pool.
    'substitute' = re-assigned to another faculty after release.
    """
    __tablename__ = "period_slots"
    id            = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id    = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    batch         = Column(String, nullable=False)       # "2022-26"
    section       = Column(String, nullable=False)       # "A"
    semester      = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)
    day           = Column(String, nullable=False)       # "MON", "TUE", "WED", "THU", "FRI"
    period_no     = Column(Integer, nullable=False)      # 1-8
    start_time    = Column(String, nullable=False)       # "09:00"
    end_time      = Column(String, nullable=False)       # "09:50"
    subject_code  = Column(String, nullable=True)
    subject_name  = Column(String, nullable=True)
    faculty_id    = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    slot_type     = Column(String, nullable=False, server_default="regular")
    original_faculty_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # for substitute tracking

    __table_args__ = (
        Index("ix_period_slot_batch_day", "batch", "section", "day", "academic_year"),
        Index("ix_period_slot_faculty", "faculty_id", "day", "academic_year"),
        Index("ix_period_slot_college_dept", "college_id", "department_id"),
    )

# ─── Phase 2: Attendance System ──────────────────────────────────────────────


class AcademicCalendar(Base, SoftDeleteMixin):
    """Defines the start/end dates and events for a semester.
    Used as the reference for timetable validity and holiday detection.
    'events' JSONB: [{"date": "2024-12-25", "name": "Christmas", "type": "holiday"}]
    """
    __tablename__ = "academic_calendars"
    id            = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id    = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    academic_year = Column(String, nullable=False)       # "2024-25"
    semester      = Column(Integer, nullable=False)      # 1-8
    start_date    = Column(Date, nullable=False)
    end_date      = Column(Date, nullable=False)
    working_days  = Column(JSONB, nullable=True)         # ["MON","TUE","WED","THU","FRI"]
    events        = Column(JSONB, nullable=True)         # holidays, exam weeks
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_acad_cal_college_year", "college_id", "academic_year", "semester"),
    )


class CourseRegistration(Base, SoftDeleteMixin):
    __tablename__ = "course_registrations"
    id            = Column(String, primary_key=True, index=True, default=generate_uuid)
    student_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    college_id    = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    subject_code  = Column(String, nullable=False)
    semester      = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)
    is_arrear     = Column(Boolean, nullable=False, server_default=text('false'))
    status        = Column(String, nullable=False, server_default="registered")  # registered, approved, rejected
    registered_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at   = Column(DateTime(timezone=True), nullable=True)
    reviewed_by   = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    __table_args__ = (
        UniqueConstraint("student_id", "subject_code", "academic_year", name="uq_course_reg"),
        Index("ix_course_reg_student_semester", "student_id", "academic_year", "semester"),
        Index("ix_course_reg_college_status", "college_id", "status"),
    )

# ─── Phase 5: NAAC Institutional Data ──────────────────────────────────────


class RegistrationWindow(Base, SoftDeleteMixin):
    __tablename__ = "registration_windows"
    id            = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id    = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    semester      = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)
    open_at       = Column(DateTime(timezone=True), nullable=False)
    close_at      = Column(DateTime(timezone=True), nullable=False)
    is_active     = Column(Boolean, nullable=False, server_default=text('false'))     # Exam Cell toggles
    created_by    = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_reg_window_college_status", "college_id", "is_active"),
    )


class TeachingRecord(Base, SoftDeleteMixin):
    """One record per faculty per period slot per date.
    Supports two-phase entry:
      1. Teaching Plan (planned_topic) — editable up to T+14 days
      2. Class Record (actual_topic) — editable from T to T-3 days
    methodology is constrained to: Lecture, Demo, Lab, Discussion, Tutorial
    """
    __tablename__ = "teaching_records"
    id                        = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id                = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    faculty_id                = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    period_slot_id            = Column(String, ForeignKey("period_slots.id", ondelete="RESTRICT"), nullable=False)
    date                      = Column(Date, nullable=False)
    planned_topic             = Column(String, nullable=True)
    actual_topic              = Column(String, nullable=True)
    methodology               = Column(String, nullable=True)  # Lecture | Demo | Lab | Discussion | Tutorial
    remarks                   = Column(String, nullable=True)
    is_class_record_submitted = Column(Boolean, nullable=False, server_default=text('false'))
    created_at                = Column(DateTime(timezone=True), server_default=func.now())
    updated_at                = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("faculty_id", "period_slot_id", "date", name="uq_teaching_record"),
        Index("ix_teaching_record_faculty_date", "faculty_id", "date"),
    )

# ─── Phase 7: HOD Governance & Mentorship ────────────────────────────────────


class ClassInCharge(Base, SoftDeleteMixin):
    __tablename__ = "class_in_charges"
    id            = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id    = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    faculty_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    department    = Column(String, nullable=False)
    batch         = Column(String, nullable=False)
    section       = Column(String, nullable=False)
    semester      = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint("faculty_id", "department", "batch", "section", "semester", "academic_year", name="uq_class_in_charge"),
        Index("ix_cic_dept_batch_sec", "department", "batch", "section", "academic_year")
    )


class MentorAssignment(Base, SoftDeleteMixin):
    __tablename__ = "mentor_assignments"
    id            = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id    = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    faculty_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    academic_year = Column(String, nullable=False)
    is_active     = Column(Boolean, nullable=False, server_default='true')

    __table_args__ = (
        Index("ix_mentor_student_year_active", "student_id", "academic_year", unique=True, postgresql_where=(is_active == True)),
    )


class StudentProgression(Base, SoftDeleteMixin):
    """
    Stores NAAC-required progression data.
    progression_type must be one of: higher_studies, competitive_exam, co_curricular, employment
    - co_curricular dict shape: event (str), level (str), position (str), remarks (str), upload (str option)
    - employment dict shape: company (str), designation (str), package (str)
    - competitive_exam dict shape: exam (str), score (float), percentile (float)
    - higher_studies dict shape: transition (str), institution (str), program (str)
    """
    __tablename__ = "student_progressions"
    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    student_id       = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    academic_year    = Column(String, nullable=False)
    progression_type = Column(String, nullable=False)
    details          = Column(JSONB, nullable=False)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_progression_student_type", "student_id", "progression_type"),
    )


