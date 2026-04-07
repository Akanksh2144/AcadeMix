import os

new_models = """

# ─── Expert Subject Module ──────────────────────────────────────

class ExpertAssignment(Base, SoftDeleteMixin):
    \"\"\"Assigns an external subject matter expert to a college subject.\"\"\"
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
    \"\"\"Faculty uploads question papers for expert review/approval.\"\"\"
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
    \"\"\"Expert evaluations of faculty teaching quality across multiple parameters.\"\"\"
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
    \"\"\"Study materials uploaded by faculty, quality verified by experts.\"\"\"
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
"""

file_path = r"C:\AcadMix\backend\models.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if "class ExpertAssignment" not in content:
    with open(file_path, "a", encoding="utf-8") as f:
        f.write(new_models)
    print("Appended new expert models to models.py")
else:
    print("Models already exist!")
