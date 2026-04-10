from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime, timezone

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    priority: str = "info"  # info, warning, urgent
    visibility: str = "all"  # all, faculty, students


class AttendanceMarkItem(BaseModel):
    student_id: str
    status: str = Field(..., pattern="^(present|absent|od|medical|late)$")
    remarks: Optional[str] = None


class AttendanceMarkBatch(BaseModel):
    period_slot_id: str
    date: str          # "YYYY-MM-DD"
    entries: List[AttendanceMarkItem]


class LeaveApply(BaseModel):
    leave_type: str = Field(..., pattern="^(CL|EL|ML|OD|medical)$")
    from_date: str    # "YYYY-MM-DD"
    to_date: str      # "YYYY-MM-DD"
    reason: str = Field(..., max_length=500)
    document_url: Optional[str] = None


class LeaveReview(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    remarks: Optional[str] = None


class LeaveCancelRequest(BaseModel):
    cancel_from: Optional[str] = None # "YYYY-MM-DD"
    cancel_to: Optional[str] = None   # "YYYY-MM-DD"


class AttendanceOverride(BaseModel):
    date: str
    period_slot_id: str
    status: str
    reason: str


class ActivityPermissionCreate(BaseModel):
    activity_type: str
    title: str
    description: Optional[str] = None
    date: str
    venue: Optional[str] = None


class OutOfCampusCreate(BaseModel):
    destination: str
    purpose: str
    departure_time: str
    return_time: str


class FreePeriodRequestCreate(BaseModel):
    period_slot_id: str
    date: str
    reason: str


class ActivityReview(BaseModel):
    action: str  # approve or reject


class MOUCreate(BaseModel):
    purpose: str
    signed_date: str
    valid_until: str
    document_url: Optional[str] = None
    status: Optional[str] = "active"
    benefits: Optional[dict] = None


class CurriculumFeedbackCreate(BaseModel):
    department_id: Optional[str] = None
    academic_year: str
    feedback_items: dict
    overall_rating: int


class EmployerFeedbackCreate(BaseModel):
    student_id: str
    performance_rating: int
    technical_skills_rating: int
    soft_skills_rating: int
    overall_feedback: str
    feedback_period: str


class IndustryProjectCreate(BaseModel):
    title: str
    description: str
    domain: Optional[str] = None
    max_students: int = 1
    stipend_if_any: Optional[float] = None
    duration_weeks: Optional[int] = None


class DriveRequestCreate(BaseModel):
    drive_type: str
    job_description: Optional[str] = None
    bond_period: Optional[str] = None
    work_location: Optional[str] = None
    stipend: Optional[float] = None


class TrainingProgramCreate(BaseModel):
    title: str
    description: str
    event_type: str = "workshop"
    date: str
    venue: Optional[str] = None
    max_capacity: Optional[int] = None


class AdvisoryRoleCreate(BaseModel):
    role_type: str  # research_advisor/board_of_studies/curriculum_committee/iqac_member
    scope_description: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None


class ResearchCreate(BaseModel):
    title: str
    funding_agency: Optional[str] = None
    co_investigators: Optional[list] = []
    start_date: str
    end_date: Optional[str] = None
    status: Optional[str] = "ongoing"
    grant_amount: Optional[float] = None
    publication_urls: Optional[list] = []


class ConsultancyCreate(BaseModel):
    client_organization: str
    topic: str
    start_date: str
    end_date: Optional[str] = None
    is_paid: Optional[bool] = False
    fee_amount: Optional[float] = None
    description: Optional[str] = None


class TaskAssignmentCreate(BaseModel):
    assignee_id: str
    title: str
    description: Optional[str] = None
    deadline: str
    priority: Optional[str] = "medium"


class MeetingCreate(BaseModel):
    department_id: str
    date: str
    agenda: str


class ScholarshipApplyRequest(BaseModel):
    scholarship_id: str


class ShortlistRequest(BaseModel):
    student_ids: List[str]


class SelectRequest(BaseModel):
    student_id: str
    ctc: float
    role: str
    joining_date: Optional[str] = None
    location: Optional[str] = None
    offer_url: Optional[str] = None

class InstitutionProfileUpdate(BaseModel):
    recognitions: Optional[dict] = None
    infrastructure: Optional[dict] = None
    library: Optional[dict] = None
    mous: Optional[list] = None
    extension_activities: Optional[list] = None
    research_publications: Optional[list] = None
