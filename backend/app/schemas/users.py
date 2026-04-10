from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime, timezone

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


class RoleCreate(BaseModel):
    name: str = Field(..., max_length=50)
    permissions: dict = {}


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    permissions: Optional[dict] = None


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


class ProfileReview(BaseModel):
    section: str
    record_index: int
    action: str
    remarks: str = ""


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


