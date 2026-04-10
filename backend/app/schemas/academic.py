from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime, timezone

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


class TimetableSlot(BaseModel):
    section: str
    day: str  # Mon, Tue, Wed, Thu, Fri, Sat
    period: int  # 1-6
    subject_code: str
    subject_name: str
    teacher_id: str
    teacher_name: str
    semester: int = 3


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


class ManualRegistrationCreate(BaseModel):
    student_id: str
    semester: int
    academic_year: str
    subject_code: str
    is_arrear: bool = False


class ExpertAssignRequest(BaseModel):
    expert_user_id: str
    subject_code: str
    academic_year: str
    department_id: Optional[str] = None


class CollegeSettingsUpdate(BaseModel):
    settings: dict
