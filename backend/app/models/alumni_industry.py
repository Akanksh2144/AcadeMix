from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Index, UniqueConstraint, Date, CheckConstraint, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func, text
import uuid
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

from app.models.core import SoftDeleteMixin

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
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    id            = Column(String, primary_key=True, index=True, default=generate_uuid)
    event_id      = Column(String, ForeignKey("alumni_events.id", ondelete="CASCADE"), nullable=False, index=True)
    alumni_id     = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rsvp_status   = Column(String, nullable=False, server_default='attending')  # attending/maybe/not_attending
    attended      = Column(Boolean, nullable=False, server_default=text('false'))
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
    is_anonymous      = Column(Boolean, nullable=False, server_default=text('false'))
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
    is_featured = Column(Boolean, nullable=False, server_default=text('false'))
    is_verified = Column(Boolean, nullable=False, server_default=text('false'))
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
    is_anonymous  = Column(Boolean, nullable=False, server_default=text('false'))
    status        = Column(String, nullable=False, server_default='new')  # new/acknowledged/resolved
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

# ─── Parents Module ─────────────────────────────────────────────


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
    is_paid             = Column(Boolean, nullable=False, server_default=text('false'))
    fee_amount          = Column(Float, nullable=True)
    description         = Column(String, nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())


# ─── Expert Subject Module ──────────────────────────────────────


