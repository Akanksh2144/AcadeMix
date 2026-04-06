from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Index, UniqueConstraint, Date
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
import uuid

from database import Base

class SoftDeleteMixin:
    is_deleted = Column(Boolean, nullable=False, server_default='false', index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)


def generate_uuid():
    return str(uuid.uuid4())

class College(Base, SoftDeleteMixin):
    __tablename__ = "colleges"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    name = Column(String, nullable=False)
    domain = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Department(Base, SoftDeleteMixin):
    __tablename__ = "departments"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)

class Section(Base, SoftDeleteMixin):
    __tablename__ = "sections"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)

class Role(Base, SoftDeleteMixin):
    __tablename__ = "roles"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    permissions = Column(JSONB, nullable=False, server_default='{}')

class Course(Base, SoftDeleteMixin):
    __tablename__ = "courses"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    semester = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    credits = Column(Integer, nullable=False)
    type = Column(String, nullable=False) # Theory/Lab

class User(Base, SoftDeleteMixin):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True)
    role = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    profile_data = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CourseEnrollment(Base, SoftDeleteMixin):
    __tablename__ = "course_enrollments"
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

class Quiz(Base, SoftDeleteMixin):
    __tablename__ = "quizzes"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    faculty_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="RESTRICT"), nullable=True)
    title = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    type = Column(String, nullable=False)
    status = Column(String, default="draft")
    total_marks = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Question(Base, SoftDeleteMixin):
    __tablename__ = "questions"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    quiz_id = Column(String, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String, nullable=False)
    marks = Column(Float, nullable=False)
    points = Column(Integer, nullable=False, default=1)
    content = Column(JSONB, nullable=False)

class Option(Base, SoftDeleteMixin):
    __tablename__ = "options"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    question_id = Column(String, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    text = Column(String, nullable=False)
    is_correct = Column(Boolean, nullable=False, default=False)

class QuizAttempt(Base, SoftDeleteMixin):
    __tablename__ = "quiz_attempts"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    quiz_id = Column(String, ForeignKey("quizzes.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(String, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    final_score = Column(Float, nullable=True)

    __table_args__ = (
        Index("ix_quiz_attempts_q_s_s", "quiz_id", "student_id", "status"),
    )

class QuizAnswer(Base, SoftDeleteMixin):
    __tablename__ = "quiz_answers"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    attempt_id = Column(String, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String, ForeignKey("questions.id", ondelete="RESTRICT"), nullable=False)
    selected_option_id = Column(String, ForeignKey("options.id", ondelete="RESTRICT"), nullable=True)
    code_submitted = Column(String, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    marks_awarded = Column(Float, nullable=True)

class ProctoringEvent(Base, SoftDeleteMixin):
    __tablename__ = "proctoring_events"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    attempt_id = Column(String, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    mediapipe_raw = Column(JSONB, nullable=True)

class ProctoringViolation(Base, SoftDeleteMixin):
    __tablename__ = "proctoring_violations"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    attempt_id = Column(String, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False)
    violation_type = Column(String, nullable=False)
    suspicion_score = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    evidence_url = Column(String, nullable=True)

class Appeal(Base, SoftDeleteMixin):
    __tablename__ = "appeals"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    violation_id = Column(String, ForeignKey("proctoring_violations.id", ondelete="RESTRICT"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    faculty_reviewed_by = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    status = Column(String, nullable=False, default="pending")
    reason = Column(String, nullable=False)
    appeal_date = Column(DateTime(timezone=True), server_default=func.now())

class MarkEntry(Base, SoftDeleteMixin):
    __tablename__ = "mark_entries"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    student_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    course_id = Column(String, nullable=False)  # subject_code, not FK (avoids missing-course errors)
    faculty_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    exam_type = Column(String, nullable=False)
    marks_obtained = Column(Float, nullable=False)
    max_marks = Column(Float, nullable=False)
    extra_data = Column(JSONB, nullable=True)  # stores assignment metadata, entries, status, etc.

class SemesterGrade(Base, SoftDeleteMixin):
    __tablename__ = "semester_grades"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    student_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    semester = Column(Integer, nullable=False)
    # NOTE: course_id is intentionally NOT a FK. The courses table is empty and not seeded.
    # Using a plain string to store subject codes (e.g. "22PC0DS17"). Do not re-add FK.
    course_id = Column(String, nullable=False)
    grade = Column(String, nullable=False)
    credits_earned = Column(Integer, nullable=False)

    __table_args__ = (
        Index("ix_sem_grades_s_s", "student_id", "semester"),
    )

class FacultyAssignment(Base, SoftDeleteMixin):
    __tablename__ = "faculty_assignments"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_code = Column(String, nullable=False)
    subject_name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    batch = Column(String, nullable=False)
    section = Column(String, nullable=False)
    semester = Column(Integer, nullable=False, default=1)
    # Phase 1 enhancements
    academic_year = Column(String, nullable=True, server_default="2024-25")  # e.g. "2024-25"
    credits = Column(Integer, nullable=True)
    hours_per_week = Column(Integer, nullable=True)
    is_lab = Column(Boolean, nullable=False, server_default='false')

    __table_args__ = (
        Index("ix_fac_assign_t_c", "teacher_id", "college_id"),
    )

class Announcement(Base, SoftDeleteMixin):
    __tablename__ = "announcements"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    priority = Column(String, nullable=False, default="info")
    details = Column(JSONB, nullable=True)  # stores visibility, department, posted_by
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Placement(Base, SoftDeleteMixin):
    __tablename__ = "placements"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    company = Column(String, nullable=False)
    role = Column(String, nullable=False)
    package = Column(String, nullable=True)
    date = Column(String, nullable=False)
    details = Column(JSONB, nullable=True)

class AuditLog(Base, SoftDeleteMixin):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    resource = Column(String, nullable=False)
    action = Column(String, nullable=False)
    details = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CodingChallenge(Base, SoftDeleteMixin):
    __tablename__ = "coding_challenges"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    difficulty = Column(String, nullable=False) # easy, medium, hard
    topics = Column(JSONB, nullable=False) # list of str
    language_support = Column(JSONB, nullable=False) # list of str ["python", "sql"]
    init_code = Column(JSONB, nullable=True) # mapping language -> startup script
    expected_output = Column(JSONB, nullable=True) # mapping language -> expected result
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ChallengeProgress(Base, SoftDeleteMixin):
    __tablename__ = "challenge_progress"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    challenge_id = Column(String, ForeignKey("coding_challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String, nullable=False) # "completed"
    language_used = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

# ─── Phase 1: Permission Layer ───────────────────────────────────────────────

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

class CIATemplate(Base, SoftDeleteMixin):
    """Defines what a CIA assessment consists of.
    Components JSONB supports 9 types: test, assignment, attendance,
    practical, seminar, mini_project, viva, case_study, group_discussion.
    Example:
      [{"type":"test","name":"Test 1","max_marks":10,"count":2,"best_of":2},
       {"type":"attendance","name":"Attendance","max_marks":5,
        "slabs":[{"min_pct":75,"max_pct":79,"marks":3},{"min_pct":80,"max_pct":89,"marks":4}]}]
    """
    __tablename__ = "cia_templates"
    id          = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id  = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String, nullable=False)        # e.g. "CSE Internal Assessment"
    description = Column(String, nullable=True)
    total_marks = Column(Integer, nullable=False)       # e.g. 25
    components  = Column(JSONB, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_cia_templates_college", "college_id"),
    )

class SubjectCIAConfig(Base, SoftDeleteMixin):
    """Assigns a CIATemplate to a specific subject/semester/year.
    The Nodal Officer (admin) sets is_consolidation_enabled to true
    to allow faculty to submit consolidated CIA marks for that subject.
    """
    __tablename__ = "subject_cia_configs"
    id                       = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id               = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    subject_code             = Column(String, nullable=False)
    subject_name             = Column(String, nullable=True)
    academic_year            = Column(String, nullable=False)   # e.g. "2024-25"
    semester                 = Column(Integer, nullable=False)
    template_id              = Column(String, ForeignKey("cia_templates.id", ondelete="RESTRICT"), nullable=False)
    is_consolidation_enabled = Column(Boolean, nullable=False, server_default='false')
    created_at               = Column(DateTime(timezone=True), server_default=func.now())
    updated_at               = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_cia_config_subject_year", "subject_code", "academic_year", "college_id"),
    )

# ─── Phase 2: Timetable System ───────────────────────────────────────────────

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

class AttendanceRecord(Base, SoftDeleteMixin):
    """One attendance record per student per period slot per date.
    status: present | absent | od | medical | late
    is_late_entry: True if marked > 3 hours after period end_time (needs HOD approval).
    The unique constraint prevents double-marking for the same slot+student+date.
    """
    __tablename__ = "attendance_records"
    id             = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id     = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    period_slot_id = Column(String, ForeignKey("period_slots.id", ondelete="RESTRICT"), nullable=False)
    date           = Column(Date, nullable=False)
    faculty_id     = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    student_id     = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    subject_code   = Column(String, nullable=False)
    status         = Column(String, nullable=False)      # present | absent | od | medical | late
    marked_at      = Column(DateTime(timezone=True), server_default=func.now())
    is_late_entry  = Column(Boolean, nullable=False, server_default='false')
    remarks        = Column(String, nullable=True)

    __table_args__ = (
        Index("ix_attendance_student_subject", "student_id", "subject_code", "date"),
        Index("ix_attendance_faculty_date", "faculty_id", "date"),
        UniqueConstraint("student_id", "period_slot_id", "date", name="uq_attendance_entry"),
    )

# ─── Phase 3: Leave Management ───────────────────────────────────────────────

class LeaveRequest(Base, SoftDeleteMixin):
    __tablename__ = "leave_requests"
    id              = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id      = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    applicant_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    applicant_role  = Column(String, nullable=False)      # faculty, student
    leave_type      = Column(String, nullable=False)      # CL, EL, ML, OD, medical
    from_date       = Column(DateTime(timezone=True), nullable=False)
    to_date         = Column(DateTime(timezone=True), nullable=False)
    reason          = Column(String, nullable=False)
    document_url    = Column(String, nullable=True)       # medical certificate, etc.
    status          = Column(String, nullable=False, server_default="pending")   # pending, approved, rejected
    reviewed_by     = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at     = Column(DateTime(timezone=True), nullable=True)
    review_remarks  = Column(String, nullable=True)
    affected_slots  = Column(JSONB, nullable=True)        # period_slot_ids auto-detected on approval
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_leave_applicant_status", "applicant_id", "status"),
        Index("ix_leave_college_status", "college_id", "status"),
    )
