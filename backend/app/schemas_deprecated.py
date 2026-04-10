from typing import Optional, List
from pydantic import BaseModel, Field, validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone
from app import models


class LoginRequest(BaseModel):
    college_id: str
    password: str

class RegisterRequest(BaseModel):
    name: str = Field(..., max_length=150)
    college_id: str = Field(..., max_length=50)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field("student", max_length=30)
    college: str = Field("GNITC", max_length=50)
    department: str = Field("", max_length=100)
    batch: str = Field("", max_length=20)
    section: str = Field("", max_length=20)

class StudentProfileData(BaseModel):
    batch: Optional[str] = None
    section: Optional[str] = None
    department: Optional[str] = None
    first_graduate: Optional[bool] = None
    community: Optional[str] = None
    blood_group: Optional[str] = None
    hostel_required: Optional[bool] = None
    transport_required: Optional[bool] = None
    aadhaar_number: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    languages_known: Optional[list] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    college_id: Optional[str] = None # roll number / faculty ID
    department: Optional[str] = None
    batch: Optional[str] = None
    section: Optional[str] = None
    password: Optional[str] = None
    profile_data: Optional[StudentProfileData] = None

class DepartmentCreate(BaseModel):
    name: str = Field(..., max_length=150)
    code: str = Field(..., max_length=20)

class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    code: Optional[str] = Field(None, max_length=20)

class SectionCreate(BaseModel):
    department_id: str
    name: str = Field(..., max_length=50)

class SectionUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    department_id: Optional[str] = None

class RoleCreate(BaseModel):
    name: str = Field(..., max_length=50)
    permissions: dict = {}

class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    permissions: Optional[dict] = None

class QuizCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    subject: str = Field(..., min_length=2, max_length=200)
    description: str = Field("", max_length=2000)
    total_marks: float = Field(0.0, ge=0.0, le=1000.0)
    duration_mins: int = Field(60, ge=1, le=480)
    negative_marking: bool = False
    timed: bool = True
    randomize_questions: bool = False
    randomize_options: bool = False
    show_answers_after: bool = True
    allow_reattempt: bool = False
    assigned_classes: list = []
    negative_marks: float = Field(0.0, ge=0.0, le=10.0)
    questions: list = []

class AnswerSubmit(BaseModel):
    question_index: int
    answer: object

class SemesterResultCreate(BaseModel):
    student_id: str
    semester: int
    subjects: list
    sgpa: float
    cgpa: float

class CodeExecuteRequest(BaseModel):
    code: str = Field(..., max_length=15000)
    language: str = Field("python", max_length=50)
    test_input: str = Field("", max_length=5000)

class FacultyAssignment(BaseModel):
    teacher_id: str
    subject_code: str
    subject_name: str
    department: str
    batch: str
    section: str
    semester: int = 1
    academic_year: str
    credits: Optional[int] = None
    hours_per_week: Optional[int] = None
    is_lab: bool = False

class SubjectAllocationUpdate(BaseModel):
    credits: Optional[int] = None
    hours_per_week: Optional[int] = None
    is_lab: Optional[bool] = None

class PermissionFlagsUpdate(BaseModel):
    flags: dict  # e.g. {"can_create_timetable": true, "is_subject_expert": false}

class CIATemplateCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    total_marks: int = Field(..., ge=1, le=200)
    components: list  # list of component dicts

class CIATemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    total_marks: Optional[int] = Field(None, ge=1, le=200)
    components: Optional[list] = None

class SubjectCIAConfigCreate(BaseModel):
    subject_code: str
    subject_name: Optional[str] = None
    academic_year: str
    semester: int = Field(..., ge=1, le=8)
    template_id: str

class MarkEntryItem(BaseModel):
    student_id: str
    college_id: str
    student_name: str
    marks: Optional[float] = None

class MarkEntrySave(BaseModel):
    assignment_id: str
    exam_type: str  # mid1 or mid2
    component_id: Optional[str] = None
    semester: int
    max_marks: float = Field(30, gt=0, le=200)
    entries: List[MarkEntryItem] = Field(..., max_items=5000)
    revision_reason: Optional[str] = None

class MarkReview(BaseModel):
    action: str  # approve or reject
    remarks: str = ""

class EndtermEntry(BaseModel):
    subject_code: str
    subject_name: str
    department: str
    batch: str
    section: str
    semester: int
    max_marks: float = 100
    entries: list

class TimetableSlot(BaseModel):
    section: str
    day: str  # Mon, Tue, Wed, Thu, Fri, Sat
    period: int  # 1-6
    subject_code: str
    subject_name: str
    teacher_id: str
    teacher_name: str
    semester: int = 3

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    priority: str = "info"  # info, warning, urgent
    visibility: str = "all"  # all, faculty, students

class CollegeSettingsUpdate(BaseModel):
    settings: dict

    @validator("settings")
    def validate_settings(cls, v):
        # 1. Advanced Grade Scale Validator
        scale = v.get("grade_scale")
        if scale is not None:
            if not isinstance(scale, list) or len(scale) == 0:
                raise ValueError("grade_scale must be a non-empty list of dictionaries")
            prev_pct = 101.0
            has_zero = False
            for item in scale:
                pct = item.get("min_pct")
                if pct is None:
                    raise ValueError("Each grade scale item must have min_pct")
                if float(pct) >= prev_pct:
                    raise ValueError(f"grade_scale min_pct must be strictly monotonically decreasing. Violating element: {pct}")
                if float(pct) <= 0:
                    has_zero = True
                prev_pct = float(pct)
            if not has_zero:
                raise ValueError("grade_scale must end exactly at or below min_pct=0")
                
        # 2. Strict Attendance Bounds Validator
        if "attendance_min_pct" in v:
            val = v["attendance_min_pct"]
            if not isinstance(val, (int, float)):
                raise ValueError("attendance_min_pct must be a number")
            if not (1 <= float(val) <= 100):
                raise ValueError("attendance_min_pct must be between 1 and 100")
                
        # 3. Late Entry Validator
        if "late_entry_window_hours" in v:
            val = v["late_entry_window_hours"]
            if not isinstance(val, int) or val < 0:
                raise ValueError("late_entry_window_hours must be a positive integer")
                
        # 4. OD configuration
        if "od_counts_as_present" in v:
            val = v["od_counts_as_present"]
            if not isinstance(val, bool):
                raise ValueError("od_counts_as_present must be a boolean flag")
                
        return v

class ExamScheduleCreate(BaseModel):
    department_id: str
    batch: str
    semester: int
    academic_year: str
    subject_code: str
    subject_name: str
    exam_date: str  # YYYY-MM-DD
    session: str    # FN or AN
    exam_time: str
    document_url: Optional[str] = None

class ExamScheduleUpdate(BaseModel):
    department_id: Optional[str] = None
    batch: Optional[str] = None
    semester: Optional[int] = None
    academic_year: Optional[str] = None
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    exam_date: Optional[str] = None
    session: Optional[str] = None
    exam_time: Optional[str] = None
    document_url: Optional[str] = None

class ChallengeSubmit(BaseModel):
    challenge_id: str
    code: str
    language: str = "python"

class ViolationReport(BaseModel):
    violation_type: str = "tab_switch"  # tab_switch, fullscreen_exit, window_blur

class AcademicCalendarCreate(BaseModel):
    academic_year: str
    semester: int = Field(..., ge=1, le=8)
    start_date: str   # "YYYY-MM-DD"
    end_date: str
    working_days: Optional[list] = ["MON", "TUE", "WED", "THU", "FRI"]
    events: Optional[list] = []

class PeriodSlotCreate(BaseModel):
    department_id: str
    batch: str
    section: str
    semester: int = Field(..., ge=1, le=8)
    academic_year: str
    day: str          # MON, TUE, WED, THU, FRI
    period_no: int = Field(..., ge=1, le=10)
    start_time: str   # "09:00"
    end_time: str     # "09:50"
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    faculty_id: Optional[str] = None
    slot_type: str = "regular"

class BulkSlotsUpsert(BaseModel):
    slots: List[PeriodSlotCreate]  # up to an entire week of slots at once

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

class ClassInChargeCreate(BaseModel):
    faculty_ids: List[str]
    department: str
    batch: str
    section: str
    semester: int = Field(..., ge=1, le=8)

class MentorAssignmentCreate(BaseModel):
    faculty_id: str
    student_ids: List[str]

class StudentProgressionCreate(BaseModel):
    student_id: str
    progression_type: str = Field(..., pattern="^(higher_studies|competitive_exam|co_curricular|employment)$")
    details: dict

class SubstituteAssign(BaseModel):
    faculty_id: str

class RegistrationWindowCreate(BaseModel):
    semester: int = Field(..., ge=1, le=8)
    academic_year: str
    open_at: str    # "YYYY-MM-DDTHH:MM"
    close_at: str   # "YYYY-MM-DDTHH:MM"

class CourseRegistrationSchema(BaseModel):
    subject_code: str
    semester: int = Field(..., ge=1, le=8)
    academic_year: str
    is_arrear: bool = False

class InstitutionProfileUpdate(BaseModel):
    recognitions: Optional[dict] = None
    infrastructure: Optional[dict] = None
    library: Optional[dict] = None
    mous: Optional[list] = None
    extension_activities: Optional[dict] = None
    research_publications: Optional[dict] = None

class TeachingPlanCreate(BaseModel):
    period_slot_id: str
    date: str  # "YYYY-MM-DD"
    planned_topic: str = Field(..., max_length=500)

class ClassRecordCreate(BaseModel):
    period_slot_id: str
    date: str  # "YYYY-MM-DD"
    actual_topic: str = Field(..., max_length=500)
    methodology: str = Field(..., pattern="^(Lecture|Demo|Lab|Discussion|Tutorial)$")
    remarks: Optional[str] = Field(None, max_length=500)

class TeachingRecordUpdate(BaseModel):
    planned_topic: Optional[str] = Field(None, max_length=500)
    actual_topic: Optional[str] = Field(None, max_length=500)
    methodology: Optional[str] = None
    remarks: Optional[str] = Field(None, max_length=500)

class FacultyProfileUpdate(BaseModel):
    """Sectioned profile structure. Each section is a list of records with a status field.
    Structure: { "educational": [{"degree": "...", "status": "draft"}], "experience": [...], ... }
    """
    personal: Optional[dict] = None       # phone, dob, aadhaar, blood_group, gender, address
    educational: Optional[list] = None    # [{degree, university, year, percentage, status}]
    experience: Optional[list] = None     # [{position, institution, from_date, to_date, status}]
    research: Optional[list] = None       # [{title, journal, year, doi, status}]
    publications: Optional[list] = None   # [{title, publisher, year, isbn, status}]
    patents: Optional[list] = None        # [{title, application_no, year, status}]
    memberships: Optional[list] = None    # [{body, membership_id, from_date, status}]
    training: Optional[list] = None       # [{program, organizer, dates, certificate_url, status}]

class ShortlistRequest(BaseModel):
    student_ids: List[str]

class ResultRequest(BaseModel):
    student_id: str
    round_name: str
    result: str # pass or fail
    remarks: Optional[str] = ""

class SelectRequest(BaseModel):
    student_id: str
    ctc: float
    role: str
    joining_date: Optional[str] = None
    location: Optional[str] = None
    offer_url: Optional[str] = None

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

class ManualRegistrationCreate(BaseModel):
    student_id: str
    semester: int
    academic_year: str
    subject_code: str
    is_arrear: bool = False

class ProfileReview(BaseModel):
    section: str
    record_index: int
    action: str
    remarks: str = ""

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

class FeedbackCreate(BaseModel):
    faculty_id: str
    subject_code: str
    academic_year: str
    semester: int
    content_rating: int
    teaching_rating: int
    engagement_rating: int
    assessment_rating: int
    overall_rating: int
    comments: Optional[str] = None

class ExpertAssignRequest(BaseModel):
    expert_user_id: str
    subject_code: str
    academic_year: str
    department_id: Optional[str] = None

class QuestionPaperReview(BaseModel):
    status: str
    comments: Optional[str] = None

class TeachingEvalRequest(BaseModel):
    faculty_id: str
    subject_code: str
    academic_year: str
    content_coverage_rating: int
    methodology_rating: int
    engagement_rating: int
    assessment_quality_rating: int
    overall_rating: int
    comments: Optional[str] = None
    evaluation_date: str

class FacultyQuestionPaper(BaseModel):
    subject_code: str
    academic_year: str
    semester: int
    exam_type: str
    paper_url: str

class FacultyStudyMaterial(BaseModel):
    subject_code: str
    title: str
    file_url: str          # renamed from material_url
    material_type: str
    academic_year: str     # also required by model but was missing

