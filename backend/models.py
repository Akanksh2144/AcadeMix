from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Index, UniqueConstraint, Date, CheckConstraint, Text
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
    academic_year = Column(String, nullable=True)  # dynamically resolved via AcademicCalendar
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

class Company(Base, SoftDeleteMixin):
    __tablename__ = "companies"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    sector = Column(String, nullable=True)
    hr_contacts = Column(JSONB, nullable=True)
    website = Column(String, nullable=True)
    bond_typical = Column(String, nullable=True)

class PlacementDrive(Base, SoftDeleteMixin):
    __tablename__ = "placement_drives"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String, nullable=False, default="upcoming")
    drive_type = Column(String, nullable=False)
    type = Column(String, nullable=False, default="placement")
    job_description = Column(String, nullable=True)
    bond_period = Column(String, nullable=True)
    work_location = Column(String, nullable=True)
    stipend = Column(Float, nullable=True)
    duration_weeks = Column(Integer, nullable=True)
    is_mandatory = Column(Boolean, nullable=True)
    eligibility_criteria = Column(JSONB, nullable=True)
    linked_quiz_id = Column(String, ForeignKey("quizzes.id", ondelete="SET NULL"), nullable=True)
    quiz_threshold = Column(Float, nullable=True)

class PlacementApplication(Base, SoftDeleteMixin):
    __tablename__ = "placement_applications"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    drive_id = Column(String, ForeignKey("placement_drives.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String, nullable=False, default="registered")
    round_results = Column(JSONB, nullable=True)
    offer_details = Column(JSONB, nullable=True)
    registered_at = Column(DateTime(timezone=True), server_default=func.now())

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
    template_id              = Column(String, ForeignKey("cia_templates.id"), nullable=False)
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
    source         = Column(String, nullable=False, server_default="faculty_manual") # faculty_manual, system_leave, late_entry

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
    status          = Column(String, nullable=False, server_default="pending")   # pending, approved, rejected, cancellation_requested, cancelled, partially_cancelled
    reviewed_by     = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at     = Column(DateTime(timezone=True), nullable=True)
    review_remarks  = Column(String, nullable=True)
    affected_slots  = Column(JSONB, nullable=True)        # period_slot_ids auto-detected on approval
    cancellation_meta = Column(JSONB, nullable=True)      # Stores {"cancel_from": "...", "cancel_to": "..."} for partial cancellations
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_leave_applicant_status", "applicant_id", "status"),
        Index("ix_leave_college_status", "college_id", "status"),
    )

# ─── Phase 4: Course Registration System ───────────────────────────────────

class RegistrationWindow(Base, SoftDeleteMixin):
    __tablename__ = "registration_windows"
    id            = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id    = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    semester      = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)
    open_at       = Column(DateTime(timezone=True), nullable=False)
    close_at      = Column(DateTime(timezone=True), nullable=False)
    is_active     = Column(Boolean, nullable=False, server_default='false')     # Exam Cell toggles
    created_by    = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_reg_window_college_status", "college_id", "is_active"),
    )

class CourseRegistration(Base, SoftDeleteMixin):
    __tablename__ = "course_registrations"
    id            = Column(String, primary_key=True, index=True, default=generate_uuid)
    student_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    college_id    = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    subject_code  = Column(String, nullable=False)
    semester      = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)
    is_arrear     = Column(Boolean, nullable=False, server_default='false')
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

class ExamSchedule(Base, SoftDeleteMixin):
    __tablename__ = "exam_schedules"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    batch = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)
    subject_code = Column(String, nullable=False)
    subject_name = Column(String, nullable=False)
    exam_date = Column(Date, nullable=False)
    session = Column(String, nullable=False) # Handled by check constraint below
    exam_time = Column(String, nullable=False)
    is_published = Column(Boolean, nullable=False, server_default='false')
    document_url = Column(String, nullable=True)
    created_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        CheckConstraint("session IN ('FN', 'AN')", name="ck_exam_session"),
        Index("ix_exam_sched_college_dept_batch", "college_id", "department_id", "batch"),
    )

class InstitutionProfile(Base, SoftDeleteMixin):
    __tablename__ = "institution_profiles"
    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, unique=True)
    recognitions     = Column(JSONB)   # NBA, NAAC grade, AICTE approval number + date
    infrastructure   = Column(JSONB)   # classrooms, labs, area, equipment lists
    library          = Column(JSONB)   # volumes, journals, e-resources, digital library
    mous             = Column(JSONB)   # [{company, signed_date, purpose, validity}]
    extension_activities = Column(JSONB)
    research_publications = Column(JSONB)
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())
    updated_by       = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


# ─── Phase 6: Daily Teaching Work (DHTE spec 7.1, 7.3, 7.4) ────────────────

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
    is_class_record_submitted = Column(Boolean, nullable=False, server_default='false')
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

class FeeTemplate(Base, SoftDeleteMixin):
    __tablename__ = "fee_templates"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_type = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    academic_year = Column(String, nullable=False)
    semester = Column(Integer, nullable=True)
    description = Column(String, nullable=True)

class FeePayment(Base, SoftDeleteMixin):
    __tablename__ = "fee_payments"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_template_id = Column(String, ForeignKey("fee_templates.id", ondelete="NO ACTION"), nullable=False)
    amount_paid = Column(Float, nullable=False)
    status = Column(String, nullable=False)
    transaction_date = Column(DateTime(timezone=True), nullable=True)
    transaction_reference = Column(String, nullable=True)

class ActivityPermission(Base, SoftDeleteMixin):
    __tablename__ = "activity_permissions"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    
    activity_type = Column(String, nullable=False) # Enum: remedial, career_counselling, study_visit, seminar, sports, cultural, ncc, nss
    phase = Column(String, nullable=False, server_default='permission') # Enum: permission, post_event
    
    event_title = Column(String, nullable=False)
    event_date = Column(Date, nullable=False)
    event_details = Column(JSONB, nullable=True)
    
    hod_permission_decision = Column(String, nullable=True) # pending, approved, rejected
    hod_permission_notes = Column(String, nullable=True)
    hod_permission_decided_at = Column(DateTime(timezone=True), nullable=True)
    
    hod_report_decision = Column(String, nullable=True) # pending, accepted, rejected, revision_needed
    hod_report_notes = Column(String, nullable=True)
    hod_report_decided_at = Column(DateTime(timezone=True), nullable=True)
    
    principal_noted_at = Column(DateTime(timezone=True), nullable=True)
    principal_notes = Column(String, nullable=True)
    
    nodal_acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    nodal_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TaskAssignment(Base, SoftDeleteMixin):
    __tablename__ = "task_assignments"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    assigner_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assignee_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    deadline = Column(Date, nullable=False)
    priority = Column(String, nullable=False, server_default='medium')
    status = Column(String, nullable=False, server_default='pending')

class DepartmentMeeting(Base, SoftDeleteMixin):
    __tablename__ = "department_meetings"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    organizer_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    date = Column(DateTime(timezone=True), nullable=False)
    agenda = Column(String, nullable=False)
    minutes = Column(String, nullable=True)
    attendance_record = Column(JSONB, nullable=True)

class OutOfCampusPermission(Base, SoftDeleteMixin):
    __tablename__ = "out_of_campus_permissions"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    destination = Column(String, nullable=False)
    purpose = Column(String, nullable=False)
    departure_time = Column(DateTime(timezone=True), nullable=False)
    return_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, nullable=False, server_default='pending')
    approved_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

class FreePeriodRequest(Base, SoftDeleteMixin):
    __tablename__ = "free_period_requests"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    period_slot_id = Column(String, ForeignKey("period_slots.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    reason = Column(String, nullable=False)
    status = Column(String, nullable=False, server_default='pending')
    processed_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)



class Scholarship(Base, SoftDeleteMixin):
    __tablename__ = "scholarships"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    academic_year = Column(String, nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # Government, Private, Merit
    eligibility_criteria = Column(JSONB, nullable=False, server_default='{}')

class ScholarshipApplication(Base, SoftDeleteMixin):
    __tablename__ = "scholarship_applications"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scholarship_id = Column(String, ForeignKey("scholarships.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, nullable=False, default="submitted") # submitted, approved, rejected
    applied_at = Column(DateTime(timezone=True), server_default=func.now())

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

# ─── Alumni Module ──────────────────────────────────────────────

class AlumniJobPosting(Base, SoftDeleteMixin):
    """Job/internship referrals posted by alumni, moderated by TPO."""
    __tablename__ = "alumni_job_postings"
    id              = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id      = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    alumni_id       = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company         = Column(String, nullable=False)
    role            = Column(String, nullable=False)
    ctc_range       = Column(String, nullable=True)      # e.g. "6-10 LPA"
    location        = Column(String, nullable=True)
    eligibility     = Column(String, nullable=True)
    deadline        = Column(Date, nullable=True)
    contact_email   = Column(String, nullable=True)
    referral_note   = Column(String, nullable=True)
    status          = Column(String, nullable=False, server_default='pending_approval')  # pending_approval/active/expired/rejected
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

class AlumniMentorship(Base, SoftDeleteMixin):
    """Alumni-to-student career/industry mentorship (separate from faculty mentors)."""
    __tablename__ = "alumni_mentorships"
    id              = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id      = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    alumni_id       = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id      = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status          = Column(String, nullable=False, server_default='requested')  # requested/active/completed/declined
    focus_area      = Column(String, nullable=True)      # career/technical/higher_studies
    session_notes   = Column(JSONB, nullable=True, server_default='[]')
    requested_at    = Column(DateTime(timezone=True), server_default=func.now())

class AlumniEvent(Base, SoftDeleteMixin):
    """Alumni events: reunions, meetups, workshops, networking."""
    __tablename__ = "alumni_events"
    id                    = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id            = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by            = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    source_type           = Column(String, nullable=False, server_default='alumni')  # alumni/industry/college
    source_id             = Column(String, nullable=True) # polymorphic id depending on source_type
    title                 = Column(String, nullable=False)
    description           = Column(String, nullable=True)
    event_type            = Column(String, nullable=False)  # reunion/meetup/workshop/networking/fundraiser
    date                  = Column(DateTime(timezone=True), nullable=False)
    venue                 = Column(String, nullable=True)
    max_capacity          = Column(Integer, nullable=True)
    registration_deadline = Column(Date, nullable=True)
    status                = Column(String, nullable=False, server_default='published')  # draft/published/closed/completed
    created_at            = Column(DateTime(timezone=True), server_default=func.now())

class AlumniEventRegistration(Base, SoftDeleteMixin):
    """RSVP and attendance tracking for alumni events."""
    __tablename__ = "alumni_event_registrations"
    id            = Column(String, primary_key=True, index=True, default=generate_uuid)
    event_id      = Column(String, ForeignKey("alumni_events.id", ondelete="CASCADE"), nullable=False, index=True)
    alumni_id     = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rsvp_status   = Column(String, nullable=False, server_default='attending')  # attending/maybe/not_attending
    attended      = Column(Boolean, nullable=False, server_default='false')
    registered_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("event_id", "alumni_id", name="uq_event_alumni"),
    )

class AlumniGuestLecture(Base, SoftDeleteMixin):
    """Guest lecture by alumni, retired faculty, or industry — polymorphic via source_type."""
    __tablename__ = "alumni_guest_lectures"
    id              = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id      = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    lecturer_id     = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type     = Column(String, nullable=False, server_default='alumni')  # alumni/retired_faculty/industry
    department_id   = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    date            = Column(Date, nullable=False)
    topic           = Column(String, nullable=False)
    status          = Column(String, nullable=False, server_default='invited')  # invited/confirmed/completed/cancelled
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

class AlumniContribution(Base, SoftDeleteMixin):
    """Alumni donations and contributions — required for NAAC metrics."""
    __tablename__ = "alumni_contributions"
    id                = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id        = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    alumni_id         = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    contribution_type = Column(String, nullable=False)  # scholarship/infrastructure/equipment/other
    amount            = Column(Float, nullable=False)
    purpose           = Column(String, nullable=True)
    date              = Column(Date, nullable=False)
    receipt_number    = Column(String, nullable=True)
    is_anonymous      = Column(Boolean, nullable=False, server_default='false')
    acknowledgment_url = Column(String, nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())

class AlumniAchievement(Base, SoftDeleteMixin):
    """Career milestones, awards, patents. is_featured=True for Distinguished Alumni."""
    __tablename__ = "alumni_achievements"
    id          = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id  = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    alumni_id   = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type        = Column(String, nullable=False)  # promotion/award/publication/patent/startup/distinguished_alumni
    title       = Column(String, nullable=False)
    description = Column(String, nullable=True)
    date        = Column(Date, nullable=True)
    proof_url   = Column(String, nullable=True)
    is_featured = Column(Boolean, nullable=False, server_default='false')
    is_verified = Column(Boolean, nullable=False, server_default='false')
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

class AlumniFeedback(Base, SoftDeleteMixin):
    """College feedback from alumni — separate from outgoing Announcements."""
    __tablename__ = "alumni_feedback"
    id            = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id    = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    alumni_id     = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)  # nullable for anonymous
    category      = Column(String, nullable=False)  # academics/faculty/facilities/placement/infrastructure/alumni_services/other
    rating        = Column(Integer, nullable=True)   # 1-5
    feedback_text = Column(String, nullable=False)
    is_anonymous  = Column(Boolean, nullable=False, server_default='false')
    status        = Column(String, nullable=False, server_default='new')  # new/acknowledged/resolved
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

# ─── Parents Module ─────────────────────────────────────────────

class ParentStudentLink(Base, SoftDeleteMixin):
    """Many-to-many parent–student link with relationship metadata."""
    __tablename__ = "parent_student_links"
    id           = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id   = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id   = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship = Column(String, nullable=False)  # father/mother/guardian
    is_primary   = Column(Boolean, nullable=False, server_default='false')
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("parent_id", "student_id", name="uq_parent_student"),
    )

class Grievance(Base, SoftDeleteMixin):
    """Cross-role grievance system — parents, students, faculty can all submit."""
    __tablename__ = "grievances"
    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    submitted_by     = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    submitted_by_role = Column(String, nullable=False)
    category         = Column(String, nullable=False)  # academic/administrative/infrastructure/other
    subject          = Column(String, nullable=False)
    description      = Column(String, nullable=False)
    status           = Column(String, nullable=False, server_default='open')  # open/in_review/resolved/closed
    assigned_to      = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_notes = Column(String, nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

# ==============================================================================
# INDUSTRY MODULE MODELS
# ==============================================================================

class MOU(Base, SoftDeleteMixin):
    __tablename__ = "mous"
    id                    = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id            = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id            = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    purpose               = Column(String, nullable=False)
    signed_date           = Column(Date, nullable=False)
    valid_until           = Column(Date, nullable=False)
    document_url          = Column(String, nullable=True)
    status                = Column(String, nullable=False, server_default='active')  # active/expired/renewed
    benefits              = Column(JSONB, nullable=True)
    created_at            = Column(DateTime(timezone=True), server_default=func.now())

class CurriculumFeedback(Base, SoftDeleteMixin):
    __tablename__ = "curriculum_feedback"
    id                    = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id            = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    submitted_by          = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    department_id         = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=True)
    academic_year         = Column(String, nullable=False)
    feedback_items        = Column(JSONB, nullable=False)
    overall_rating        = Column(Integer, nullable=False)
    status                = Column(String, nullable=False, server_default='submitted')  # submitted/reviewed/actioned
    created_at            = Column(DateTime(timezone=True), server_default=func.now())

class IndustryProject(Base, SoftDeleteMixin):
    __tablename__ = "industry_projects"
    id                    = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id            = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id            = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    proposed_by           = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title                 = Column(String, nullable=False)
    description           = Column(String, nullable=False)
    domain                = Column(String, nullable=True)
    max_students          = Column(Integer, nullable=False, default=1)
    stipend_if_any        = Column(Float, nullable=True)
    duration_weeks        = Column(Integer, nullable=True)
    status                = Column(String, nullable=False, server_default='proposed')  # proposed/approved/ongoing/completed
    faculty_supervisor_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at            = Column(DateTime(timezone=True), server_default=func.now())

class IndustryProjectApplication(Base, SoftDeleteMixin):
    __tablename__ = "industry_project_applications"
    id                    = Column(String, primary_key=True, index=True, default=generate_uuid)
    project_id            = Column(String, ForeignKey("industry_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id            = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    college_id            = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    status                = Column(String, nullable=False, server_default='applied')  # applied/shortlisted/approved/rejected
    applied_at            = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("project_id", "student_id", name="uq_project_student_application"),
    )

class EmployerFeedback(Base, SoftDeleteMixin):
    __tablename__ = "employer_feedback"
    id                    = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id            = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id            = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id            = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    submitted_by          = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    performance_rating    = Column(Integer, nullable=False) # 1-5
    technical_skills_rating = Column(Integer, nullable=False) # 1-5
    soft_skills_rating    = Column(Integer, nullable=False) # 1-5
    overall_feedback      = Column(String, nullable=False)
    feedback_period       = Column(String, nullable=False) # 3_months, 6_months, 1_year
    created_at            = Column(DateTime(timezone=True), server_default=func.now())

# ─── Retired Faculty Module ─────────────────────────────────────

class RetiredFacultyAdvisory(Base, SoftDeleteMixin):
    """Advisory/committee appointments for retired faculty."""
    __tablename__ = "retired_faculty_advisory"
    id                  = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id          = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    retired_faculty_id  = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_type           = Column(String, nullable=False)  # research_advisor/board_of_studies/curriculum_committee/iqac_member
    scope_description   = Column(String, nullable=True)
    start_date          = Column(Date, nullable=False)
    end_date            = Column(Date, nullable=True)
    appointed_by        = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active           = Column(Boolean, nullable=False, server_default='true')
    created_at          = Column(DateTime(timezone=True), server_default=func.now())

class RetiredFacultyResearch(Base, SoftDeleteMixin):
    """Ongoing/completed research projects by retired faculty — feeds NAAC Criterion 3.3."""
    __tablename__ = "retired_faculty_research"
    id                  = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id          = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    retired_faculty_id  = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title               = Column(String, nullable=False)
    funding_agency      = Column(String, nullable=True)
    co_investigators    = Column(JSONB, nullable=True, server_default='[]')
    start_date          = Column(Date, nullable=False)
    end_date            = Column(Date, nullable=True)
    status              = Column(String, nullable=False, server_default='ongoing')  # ongoing/completed/submitted
    grant_amount        = Column(Float, nullable=True)
    publication_urls    = Column(JSONB, nullable=True, server_default='[]')
    created_at          = Column(DateTime(timezone=True), server_default=func.now())

class ConsultancyEngagement(Base, SoftDeleteMixin):
    """Industry/institutional consultancy by retired faculty — feeds NAAC Criterion 3.5."""
    __tablename__ = "consultancy_engagements"
    id                  = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id          = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    retired_faculty_id  = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    client_organization = Column(String, nullable=False)
    topic               = Column(String, nullable=False)
    start_date          = Column(Date, nullable=False)
    end_date            = Column(Date, nullable=True)
    is_paid             = Column(Boolean, nullable=False, server_default='false')
    fee_amount          = Column(Float, nullable=True)
    description         = Column(String, nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())


# ─── Expert Subject Module ──────────────────────────────────────

class ExpertAssignment(Base, SoftDeleteMixin):
    """Assigns an external subject matter expert to a college subject."""
    __tablename__ = "expert_assignments"
    id              = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id      = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    expert_user_id  = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_code    = Column(String, nullable=False)
    department_id   = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=True)
    academic_year   = Column(String, nullable=False)
    assigned_by     = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active       = Column(Boolean, nullable=False, server_default='true')
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("expert_user_id", "college_id", "subject_code", "academic_year", name="uq_expert_assignment"),
    )

class QuestionPaperSubmission(Base, SoftDeleteMixin):
    """Faculty uploads question papers for expert review/approval."""
    __tablename__ = "question_paper_submissions"
    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_code     = Column(String, nullable=False)
    faculty_id       = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    academic_year    = Column(String, nullable=False)
    semester         = Column(Integer, nullable=False)
    exam_type        = Column(String, nullable=False)  # mid1, mid2, endterm, model
    paper_url        = Column(String, nullable=False)
    status           = Column(String, nullable=False, server_default='submitted')  # draft, submitted, under_review, approved, revision_requested
    expert_id        = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    expert_comments  = Column(String, nullable=True)
    expert_reviewed_at = Column(DateTime(timezone=True), nullable=True)
    revision_count   = Column(Integer, nullable=False, default=0)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

class TeachingEvaluation(Base, SoftDeleteMixin):
    """Expert evaluations of faculty teaching quality across multiple parameters."""
    __tablename__ = "teaching_evaluations"
    id                        = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id                = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    expert_id                 = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    faculty_id                = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_code              = Column(String, nullable=False)
    academic_year             = Column(String, nullable=False)
    content_coverage_rating   = Column(Integer, nullable=False) # 1-5
    methodology_rating        = Column(Integer, nullable=False) # 1-5
    engagement_rating         = Column(Integer, nullable=False) # 1-5
    assessment_quality_rating = Column(Integer, nullable=False) # 1-5
    overall_rating            = Column(Integer, nullable=False) # 1-5
    comments                  = Column(String, nullable=True)
    evaluation_date           = Column(Date, nullable=False)
    created_at                = Column(DateTime(timezone=True), server_default=func.now())

class StudyMaterial(Base, SoftDeleteMixin):
    """Study materials uploaded by faculty, quality verified by experts."""
    __tablename__ = "study_materials"
    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id       = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_code     = Column(String, nullable=False)
    academic_year    = Column(String, nullable=False)
    material_type    = Column(String, nullable=False) # notes, presentation, lab_manual, reference
    title            = Column(String, nullable=False)
    file_url         = Column(String, nullable=False)
    status           = Column(String, nullable=False, server_default='submitted') # draft, submitted, expert_approved, revision_requested
    expert_id        = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    expert_comments  = Column(String, nullable=True)
    expert_reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

class NodalOfficerJurisdiction(Base):
    __tablename__ = "nodal_officer_jurisdictions"
    id = Column(String, primary_key=True, default=generate_uuid)
    nodal_officer_id = Column(String, ForeignKey("users.id"))
    college_id = Column(String, ForeignKey("colleges.id"))
    assigned_by = Column(String, ForeignKey("users.id"))
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

class DHCircular(Base, SoftDeleteMixin):
    __tablename__ = "dh_circulars"
    id = Column(String, primary_key=True, default=generate_uuid)
    issued_by = Column(String, ForeignKey("users.id"))
    title = Column(String)
    content = Column(Text)
    document_url = Column(String)
    issued_date = Column(DateTime(timezone=True), server_default=func.now())
    deadline = Column(DateTime(timezone=True), nullable=True)
    target_colleges = Column(JSONB) # list of college_ids or "all"
    is_mandatory = Column(Boolean, default=True)

class CircularAcknowledgment(Base):
    __tablename__ = "circular_acknowledgments"
    id = Column(String, primary_key=True, default=generate_uuid)
    circular_id = Column(String, ForeignKey("dh_circulars.id"))
    college_id = Column(String, ForeignKey("colleges.id"))
    acknowledged_by = Column(String, ForeignKey("users.id"))
    acknowledged_at = Column(DateTime(timezone=True), server_default=func.now())

class DHSubmissionRequirement(Base, SoftDeleteMixin):
    __tablename__ = "dh_submission_requirements"
    id = Column(String, primary_key=True, default=generate_uuid)
    nodal_officer_id = Column(String, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text)
    data_type = Column(String) # enrollment, faculty, placement, fees, other
    deadline = Column(DateTime(timezone=True))
    target_colleges = Column(JSONB)

class DHSubmissionRecord(Base):
    __tablename__ = "dh_submission_records"
    id = Column(String, primary_key=True, default=generate_uuid)
    requirement_id = Column(String, ForeignKey("dh_submission_requirements.id"))
    college_id = Column(String, ForeignKey("colleges.id"))
    submitted_by = Column(String, ForeignKey("users.id"))
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    submission_url = Column(String)
    status = Column(String) # pending, submitted, accepted, rejected
    rejection_reason = Column(String, nullable=True)

class InspectionRecord(Base):
    __tablename__ = "inspection_records"
    id = Column(String, primary_key=True, default=generate_uuid)
    nodal_officer_id = Column(String, ForeignKey("users.id"))
    college_id = Column(String, ForeignKey("colleges.id"))
    inspection_date = Column(DateTime(timezone=True))
    inspection_type = Column(String) # routine, surprise, NAAC_prep, complaint_based
    team_members = Column(JSONB)
    findings = Column(JSONB)
    action_points = Column(JSONB)
    compliance_score = Column(Float)
    status = Column(String) # draft, finalized, college_responded

class InspectionResponse(Base):
    __tablename__ = "inspection_responses"
    id = Column(String, primary_key=True, default=generate_uuid)
    inspection_id = Column(String, ForeignKey("inspection_records.id"))
    college_id = Column(String, ForeignKey("colleges.id"))
    response_by = Column(String, ForeignKey("users.id"))
    response_text = Column(Text)
    response_date = Column(DateTime(timezone=True), server_default=func.now())

