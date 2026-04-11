from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Index, UniqueConstraint, Date, CheckConstraint, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func, text
import uuid
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

from app.models.core import SoftDeleteMixin

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
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    quiz_id = Column(String, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String, nullable=False)
    marks = Column(Float, nullable=False)
    points = Column(Integer, nullable=False, default=1)
    content = Column(JSONB, nullable=False)


class Option(Base, SoftDeleteMixin):
    __tablename__ = "options"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    question_id = Column(String, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    text = Column(String, nullable=False)
    is_correct = Column(Boolean, nullable=False, default=False)


class QuizAttempt(Base, SoftDeleteMixin):
    __tablename__ = "quiz_attempts"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    quiz_id = Column(String, ForeignKey("quizzes.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(String, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    final_score = Column(Float, nullable=True)
    telemetry_strikes = Column(Integer, default=0, nullable=False)

    __table_args__ = (
        Index("ix_quiz_attempts_q_s_s", "quiz_id", "student_id", "status"),
    )


class QuizAnswer(Base, SoftDeleteMixin):
    __tablename__ = "quiz_answers"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    attempt_id = Column(String, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String, ForeignKey("questions.id", ondelete="RESTRICT"), nullable=False)
    selected_option_id = Column(String, ForeignKey("options.id", ondelete="RESTRICT"), nullable=True)
    code_submitted = Column(String, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    marks_awarded = Column(Float, nullable=True)


class ProctoringEvent(Base, SoftDeleteMixin):
    __tablename__ = "proctoring_events"
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    attempt_id = Column(String, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    mediapipe_raw = Column(JSONB, nullable=True)


class ProctoringViolation(Base, SoftDeleteMixin):
    __tablename__ = "proctoring_violations"
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    attempt_id = Column(String, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False)
    violation_type = Column(String, nullable=False)
    suspicion_score = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    evidence_url = Column(String, nullable=True)


class Appeal(Base, SoftDeleteMixin):
    __tablename__ = "appeals"
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    violation_id = Column(String, ForeignKey("proctoring_violations.id", ondelete="RESTRICT"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    faculty_reviewed_by = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    status = Column(String, nullable=False, default="pending")
    reason = Column(String, nullable=False)
    appeal_date = Column(DateTime(timezone=True), server_default=func.now())


class MarkSubmission(Base, SoftDeleteMixin):
    __tablename__ = "mark_submissions"
    id              = Column(String, primary_key=True, default=generate_uuid)
    college_id      = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id      = Column(String, ForeignKey("users.id"), nullable=False)
    assignment_id   = Column(String, ForeignKey("faculty_assignments.id"), nullable=False)
    subject_code    = Column(String, nullable=False)
    exam_type       = Column(String, nullable=False)
    component_id    = Column(String, nullable=True)
    max_marks       = Column(Float, nullable=False)
    semester        = Column(Integer, nullable=False, default=1)
    status          = Column(String, nullable=False, default="draft")
    submitted_at    = Column(DateTime(timezone=True), nullable=True)
    reviewed_by     = Column(String, ForeignKey("users.id"), nullable=True)
    reviewed_at     = Column(DateTime(timezone=True), nullable=True)
    review_remarks  = Column(String, nullable=True)
    published_at    = Column(DateTime(timezone=True), nullable=True)
    
    __table_args__ = (
        Index("ix_mark_sub_fac_course_exam", "faculty_id", "subject_code", "exam_type"),
    )


class MarkSubmissionEntry(Base):
    __tablename__ = "mark_submission_entries"
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    id             = Column(String, primary_key=True, default=generate_uuid)
    submission_id  = Column(String, ForeignKey("mark_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id     = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    marks_obtained = Column(Float, nullable=False)
    status         = Column(String, nullable=False, default="present")
    
    __table_args__ = (
        UniqueConstraint("submission_id", "student_id", name="uq_submission_student"),
    )


class SemesterGrade(Base, SoftDeleteMixin):
    __tablename__ = "semester_grades"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
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


class CIATemplate(Base, SoftDeleteMixin):
    """Defines what a CIA assessment consists of."""
    __tablename__ = "cia_templates"
    id          = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id  = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String, nullable=False)        # e.g. "CSE Internal Assessment"
    description = Column(String, nullable=True)
    total_marks = Column(Integer, nullable=False)       # e.g. 25
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_cia_templates_college", "college_id"),
    )

class CIATemplateComponent(Base):
    """Normalized components for CIA Template instead of JSONB."""
    __tablename__ = "cia_template_components"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    template_id = Column(String, ForeignKey("cia_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    component_type = Column(String, nullable=False)  # test, assignment, attendance, practical, etc.
    name = Column(String, nullable=False)
    max_marks = Column(Integer, nullable=False)
    count = Column(Integer, nullable=True)  # e.g., 2 tests
    best_of = Column(Integer, nullable=True)  # e.g., best 2
    slabs = Column(String, nullable=True)  # JSON-encoded array for attendance slabs, mapped logically




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
    is_consolidation_enabled = Column(Boolean, nullable=False, server_default=text('false'))
    created_at               = Column(DateTime(timezone=True), server_default=func.now())
    updated_at               = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_cia_config_subject_year", "subject_code", "academic_year", "college_id"),
    )

# ─── Phase 2: Timetable System ───────────────────────────────────────────────


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
    is_published = Column(Boolean, nullable=False, server_default=text('false'))
    document_url = Column(String, nullable=True)
    created_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        CheckConstraint("session IN ('FN', 'AN')", name="ck_exam_session"),
        Index("ix_exam_sched_college_dept_batch", "college_id", "department_id", "batch"),
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

# ═══════════════════════════════════════════════════════════════════════════════
# RLS Shadow Mode Audit Log
# ═══════════════════════════════════════════════════════════════════════════════


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
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    challenge_id = Column(String, ForeignKey("coding_challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String, nullable=False) # "completed"
    language_used = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

# ─── Phase 1: Permission Layer ───────────────────────────────────────────────




