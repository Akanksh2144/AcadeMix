from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime, timezone

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
    assigned_classes: list = Field([], max_items=50)
    negative_marks: float = Field(0.0, ge=0.0, le=10.0)
    questions: list = Field([], max_items=250)


class AnswerSubmit(BaseModel):
    question_index: int
    answer: object


class SemesterResultCreate(BaseModel):
    student_id: str
    semester: int
    subjects: list = Field(..., max_items=30)
    sgpa: float
    cgpa: float


class CodeExecuteRequest(BaseModel):
    code: str = Field(..., max_length=15000)
    language: str = Field("python", max_length=50)
    test_input: str = Field("", max_length=5000)


class CIATemplateCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    total_marks: int = Field(..., ge=1, le=200)
    components: list = Field(..., max_items=20)


class CIATemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    total_marks: Optional[int] = Field(None, ge=1, le=200)
    components: Optional[list] = Field(None, max_items=20)


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
    entries: list = Field(..., max_items=5000)


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


class ResultRequest(BaseModel):
    student_id: str
    round_name: str
    result: str # pass or fail
    remarks: Optional[str] = ""


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


