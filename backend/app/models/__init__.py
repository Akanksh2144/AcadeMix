from database import Base
from app.models.core import SoftDeleteMixin, College, Department, Section, Role, User, UserPermission, UserProfile, ParentStudentLink
from app.models.academics import Course, CourseEnrollment, Timetable, TimetableApproval, PeriodSlot, AcademicCalendar, CourseRegistration, RegistrationWindow, TeachingRecord, ClassInCharge, MentorAssignment, StudentProgression
from app.models.evaluation import Quiz, Question, Option, QuizAttempt, QuizAnswer, ProctoringEvent, ProctoringViolation, Appeal, MarkSubmission, MarkSubmissionEntry, SemesterGrade, CIATemplate, CIATemplateComponent, SubjectCIAConfig, ExamSchedule, QuestionPaperSubmission, TeachingEvaluation, StudyMaterial, CodingChallenge, ChallengeProgress
from app.models.administration import FacultyAssignment, Announcement, AttendanceRecord, LeaveRequest, InstitutionProfile, StudentFeeInvoice, FeePayment, ActivityPermission, TaskAssignment, DepartmentMeeting, OutOfCampusPermission, FreePeriodRequest, Scholarship, ScholarshipApplication, CourseFeedback, Grievance, MOU, CurriculumFeedback, DHCircular, CircularAcknowledgment, DHSubmissionRequirement, DHSubmissionRecord, InspectionRecord, InspectionResponse
from app.models.alumni_industry import Company, PlacementDrive, PlacementApplication, AlumniJobPosting, AlumniMentorship, AlumniEvent, AlumniEventRegistration, AlumniGuestLecture, AlumniContribution, AlumniAchievement, AlumniFeedback, IndustryProject, IndustryProjectApplication, EmployerFeedback, RetiredFacultyAdvisory, RetiredFacultyResearch, ConsultancyEngagement
from app.models.audit import AuditLog, RLSShadowLog


