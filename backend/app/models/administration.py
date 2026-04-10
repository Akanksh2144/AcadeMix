from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Index, UniqueConstraint, Date, CheckConstraint, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func, text
import uuid
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

from app.models.core import SoftDeleteMixin

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
    is_lab = Column(Boolean, nullable=False, server_default=text('false'))

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
    is_late_entry  = Column(Boolean, nullable=False, server_default=text('false'))
    is_override    = Column(Boolean, nullable=False, server_default=text('false'))  # True when status was changed via override endpoint
    remarks        = Column(String, nullable=True)
    source         = Column(String, nullable=False, server_default="faculty_manual") # faculty_manual, system_leave, late_entry, override

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


class StudentFeeInvoice(Base, SoftDeleteMixin):
    __tablename__ = "student_fee_invoices"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_type = Column(String, nullable=False) # e.g. 'Tuition Fee 2026'
    total_amount = Column(Float, nullable=False)
    academic_year = Column(String, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    description = Column(String, nullable=True)


class FeePayment(Base, SoftDeleteMixin):
    __tablename__ = "fee_payments"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(String, ForeignKey("student_fee_invoices.id", ondelete="NO ACTION"), nullable=False)
    amount_paid = Column(Float, nullable=False)
    status = Column(String, nullable=False) # 'pending', 'success', 'failed'
    transaction_date = Column(DateTime(timezone=True), nullable=True)
    transaction_reference = Column(String, nullable=True) # Razorpay order_id / payment_id
    receipt_url = Column(String, nullable=True)


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


class CourseFeedback(Base, SoftDeleteMixin):
    """Student feedback on courses/faculty.
    Anonymous to faculty (only aggregates shown), identified to admin.
    student_id stored for audit trail and duplicate prevention."""
    __tablename__ = "course_feedback"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_code = Column(String, nullable=False)
    academic_year = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    # Rating fields (1-5 scale)
    content_rating = Column(Integer, nullable=False)
    teaching_rating = Column(Integer, nullable=False)
    engagement_rating = Column(Integer, nullable=False)
    assessment_rating = Column(Integer, nullable=False)
    overall_rating = Column(Integer, nullable=False)
    comments = Column(String, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_feedback_student_subject", "student_id", "subject_code", "academic_year", unique=True),
    )



# ─── Alumni Module ──────────────────────────────────────────────


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


class DHCircular(Base, SoftDeleteMixin):
    __tablename__ = "dh_circulars"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    issued_by = Column(String, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    document_url = Column(String, nullable=True)
    is_mandatory = Column(Boolean, nullable=False, default=False)
    target_colleges = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CircularAcknowledgment(Base, SoftDeleteMixin):
    __tablename__ = "circular_acknowledgments"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    circular_id = Column(String, ForeignKey("dh_circulars.id", ondelete="CASCADE"), nullable=False)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    acknowledged_by = Column(String, nullable=False)
    acknowledged_at = Column(DateTime(timezone=True), server_default=func.now())


class DHSubmissionRequirement(Base, SoftDeleteMixin):
    __tablename__ = "dh_submission_requirements"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    nodal_officer_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    data_type = Column(String, nullable=False)
    deadline = Column(String, nullable=False)
    target_colleges = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DHSubmissionRecord(Base, SoftDeleteMixin):
    __tablename__ = "dh_submission_records"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    requirement_id = Column(String, ForeignKey("dh_submission_requirements.id", ondelete="CASCADE"), nullable=False)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    submitted_by = Column(String, nullable=False)
    submission_url = Column(String, nullable=True)
    status = Column(String, nullable=False, default="submitted")


class InspectionRecord(Base, SoftDeleteMixin):
    __tablename__ = "inspection_records"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    nodal_officer_id = Column(String, nullable=False)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    inspection_date = Column(String, nullable=False)
    inspection_type = Column(String, nullable=False)
    team_members = Column(JSONB, nullable=True)
    findings = Column(JSONB, nullable=True)
    action_points = Column(JSONB, nullable=True)
    compliance_score = Column(Float, nullable=True)
    status = Column(String, nullable=False, default="draft")


class InspectionResponse(Base, SoftDeleteMixin):
    __tablename__ = "inspection_responses"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    inspection_id = Column(String, ForeignKey("inspection_records.id", ondelete="CASCADE"), nullable=False)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    response_by = Column(String, nullable=False)
    response_text = Column(String, nullable=False)
    response_date = Column(DateTime(timezone=True), server_default=func.now())


