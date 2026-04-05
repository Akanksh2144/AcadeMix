from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
import uuid

from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class College(Base):
    __tablename__ = "colleges"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    name = Column(String, nullable=False)
    domain = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Department(Base):
    __tablename__ = "departments"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)

class Section(Base):
    __tablename__ = "sections"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)

class Role(Base):
    __tablename__ = "roles"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    permissions = Column(JSONB, nullable=False, server_default='{}')

class Course(Base):
    __tablename__ = "courses"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    semester = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    credits = Column(Integer, nullable=False)
    type = Column(String, nullable=False) # Theory/Lab

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True)
    role = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    profile_data = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    section = Column(String, nullable=True)
    batch = Column(String, nullable=True)

class Timetable(Base):
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

class Quiz(Base):
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

class Question(Base):
    __tablename__ = "questions"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    quiz_id = Column(String, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)
    marks = Column(Float, nullable=False)
    points = Column(Integer, nullable=False, default=1)
    content = Column(JSONB, nullable=False)

class Option(Base):
    __tablename__ = "options"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    question_id = Column(String, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    text = Column(String, nullable=False)
    is_correct = Column(Boolean, nullable=False, default=False)

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    quiz_id = Column(String, ForeignKey("quizzes.id", ondelete="RESTRICT"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    status = Column(String, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    final_score = Column(Float, nullable=True)

class QuizAnswer(Base):
    __tablename__ = "quiz_answers"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    attempt_id = Column(String, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(String, ForeignKey("questions.id", ondelete="RESTRICT"), nullable=False)
    selected_option_id = Column(String, ForeignKey("options.id", ondelete="RESTRICT"), nullable=True)
    code_submitted = Column(String, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    marks_awarded = Column(Float, nullable=True)

class ProctoringEvent(Base):
    __tablename__ = "proctoring_events"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    attempt_id = Column(String, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    mediapipe_raw = Column(JSONB, nullable=True)

class ProctoringViolation(Base):
    __tablename__ = "proctoring_violations"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    attempt_id = Column(String, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False)
    violation_type = Column(String, nullable=False)
    suspicion_score = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    evidence_url = Column(String, nullable=True)

class Appeal(Base):
    __tablename__ = "appeals"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    violation_id = Column(String, ForeignKey("proctoring_violations.id", ondelete="RESTRICT"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    faculty_reviewed_by = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    status = Column(String, nullable=False, default="pending")
    reason = Column(String, nullable=False)
    appeal_date = Column(DateTime(timezone=True), server_default=func.now())

class MarkEntry(Base):
    __tablename__ = "mark_entries"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    student_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    course_id = Column(String, nullable=False)  # subject_code, not FK (avoids missing-course errors)
    faculty_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    exam_type = Column(String, nullable=False)
    marks_obtained = Column(Float, nullable=False)
    max_marks = Column(Float, nullable=False)
    extra_data = Column(JSONB, nullable=True)  # stores assignment metadata, entries, status, etc.

class SemesterGrade(Base):
    __tablename__ = "semester_grades"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    student_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    semester = Column(Integer, nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="RESTRICT"), nullable=False)
    grade = Column(String, nullable=False)
    credits_earned = Column(Integer, nullable=False)

class FacultyAssignment(Base):
    __tablename__ = "faculty_assignments"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    teacher_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_code = Column(String, nullable=False)
    subject_name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    batch = Column(String, nullable=False)
    section = Column(String, nullable=False)
    semester = Column(Integer, nullable=False, default=1)

class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    priority = Column(String, nullable=False, default="info")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Placement(Base):
    __tablename__ = "placements"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    company = Column(String, nullable=False)
    role = Column(String, nullable=False)
    package = Column(String, nullable=True)
    date = Column(String, nullable=False)
    details = Column(JSONB, nullable=True)
