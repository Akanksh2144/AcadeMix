import ast
import os

with open('models.py', 'r', encoding='utf-8') as f:
    source_lines = f.readlines()
    source = "".join(source_lines)

tree = ast.parse(source)

# Discover the line boundaries for each class
class_boundaries = {}
class_nodes = [n for n in tree.body if isinstance(n, ast.ClassDef)]
for i, node in enumerate(class_nodes):
    start = node.lineno - 1
    # include decorators
    if node.decorator_list:
        start = node.decorator_list[0].lineno - 1
    
    # end line is the line before the next top-level node, or end of file
    next_lineno = len(source_lines)
    # Find the next node in tree.body
    node_idx = tree.body.index(node)
    if node_idx + 1 < len(tree.body):
        next_node = tree.body[node_idx + 1]
        next_lineno_start = next_node.lineno - 1
        if hasattr(next_node, 'decorator_list') and next_node.decorator_list:
            next_lineno_start = next_node.decorator_list[0].lineno - 1
        next_lineno = next_lineno_start
    
    # Trim trailing blank lines
    while next_lineno > start and source_lines[next_lineno - 1].strip() == '':
        next_lineno -= 1
        
    class_boundaries[node.name] = (start, next_lineno)

mappings = {
    'core': ['SoftDeleteMixin', 'College', 'Department', 'Section', 'Role', 'User', 'UserPermission', 'ParentStudentLink'],
    'academics': ['Course', 'CourseEnrollment', 'Timetable', 'TimetableApproval', 'PeriodSlot', 'AcademicCalendar', 'CourseRegistration', 'RegistrationWindow', 'TeachingRecord', 'ClassInCharge', 'MentorAssignment', 'StudentProgression'],
    'evaluation': ['Quiz', 'Question', 'Option', 'QuizAttempt', 'QuizAnswer', 'ProctoringEvent', 'ProctoringViolation', 'Appeal', 'MarkEntry', 'MarkSubmission', 'MarkSubmissionEntry', 'SemesterGrade', 'CIATemplate', 'SubjectCIAConfig', 'ExamSchedule', 'QuestionPaperSubmission', 'TeachingEvaluation', 'StudyMaterial', 'CodingChallenge', 'ChallengeProgress'],
    'administration': ['FacultyAssignment', 'Announcement', 'AttendanceRecord', 'LeaveRequest', 'InstitutionProfile', 'FeeTemplate', 'FeePayment', 'ActivityPermission', 'TaskAssignment', 'DepartmentMeeting', 'OutOfCampusPermission', 'FreePeriodRequest', 'Scholarship', 'ScholarshipApplication', 'CourseFeedback', 'Grievance', 'MOU', 'CurriculumFeedback', 'DHCircular', 'CircularAcknowledgment', 'DHSubmissionRequirement', 'DHSubmissionRecord', 'InspectionRecord', 'InspectionResponse'],
    'alumni_industry': ['Company', 'PlacementDrive', 'PlacementApplication', 'AlumniJobPosting', 'AlumniMentorship', 'AlumniEvent', 'AlumniEventRegistration', 'AlumniGuestLecture', 'AlumniContribution', 'AlumniAchievement', 'AlumniFeedback', 'IndustryProject', 'IndustryProjectApplication', 'EmployerFeedback', 'RetiredFacultyAdvisory', 'RetiredFacultyResearch', 'ConsultancyEngagement'],
    'audit': ['AuditLog', 'RLSShadowLog']
}

imports = """from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Index, UniqueConstraint, Date, CheckConstraint, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func, text
import uuid
from database import Base

def generate_uuid():
    return str(uuid.uuid4())
"""

os.makedirs('app/models', exist_ok=True)

all_classes_mapped = set()
for mod, cls_list in mappings.items():
    with open(f'app/models/{mod}.py', 'w', encoding='utf-8') as f:
        f.write(imports + '\n')
        # If not core, import SoftDeleteMixin
        if mod != 'core':
            f.write("from app.models.core import SoftDeleteMixin\n\n")
        else:
            f.write("\n")
            
        for cls in cls_list:
            if cls in class_boundaries:
                start, end = class_boundaries[cls]
                class_code = "".join(source_lines[start:end])
                f.write(class_code + '\n\n')
                all_classes_mapped.add(cls)

all_classes_in_file = set(class_boundaries.keys())
unmapped = all_classes_in_file - all_classes_mapped
if unmapped:
    print("Unmapped classes:", unmapped)
else:
    print("All classes mapped successfully.")

# Create __init__.py
with open('app/models/__init__.py', 'w', encoding='utf-8') as f:
    for mod, cls_list in mappings.items():
        f.write(f"from app.models.{mod} import {', '.join([c for c in cls_list if c in class_boundaries])}\n")
