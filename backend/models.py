from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Index
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
