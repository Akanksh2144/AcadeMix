import ast
import os

with open('app/schemas.py', 'r', encoding='utf-8') as f:
    source_lines = f.readlines()
    source = "".join(source_lines)

tree = ast.parse(source)

# Discover the line boundaries for each class
class_boundaries = {}
class_nodes = [n for n in tree.body if isinstance(n, ast.ClassDef)]
for i, node in enumerate(class_nodes):
    start = node.lineno - 1
    if node.decorator_list:
        start = node.decorator_list[0].lineno - 1
    
    next_lineno = len(source_lines)
    node_idx = tree.body.index(node)
    if node_idx + 1 < len(tree.body):
        next_node = tree.body[node_idx + 1]
        next_lineno_start = next_node.lineno - 1
        if hasattr(next_node, 'decorator_list') and next_node.decorator_list:
            next_lineno_start = next_node.decorator_list[0].lineno - 1
        next_lineno = next_lineno_start
    
    while next_lineno > start and source_lines[next_lineno - 1].strip() == '':
        next_lineno -= 1
        
    class_boundaries[node.name] = (start, next_lineno)

mappings = {
    'users': ['LoginRequest', 'RegisterRequest', 'StudentProfileData', 'UserUpdate', 'RoleCreate', 'RoleUpdate', 'FacultyProfileUpdate', 'ProfileReview', 'CollegeSettingsUpdate'],
    'academic': ['DepartmentCreate', 'DepartmentUpdate', 'SectionCreate', 'SectionUpdate', 'FacultyAssignment', 'SubjectAllocationUpdate', 'PermissionFlagsUpdate', 'TimetableSlot', 'AcademicCalendarCreate', 'PeriodSlotCreate', 'BulkSlotsUpsert', 'ClassInChargeCreate', 'MentorAssignmentCreate', 'StudentProgressionCreate', 'SubstituteAssign', 'RegistrationWindowCreate', 'CourseRegistrationSchema', 'InstitutionProfileUpdate', 'TeachingPlanCreate', 'ClassRecordCreate', 'TeachingRecordUpdate', 'ManualRegistrationCreate', 'ExpertAssignRequest'],
    'evaluation': ['QuizCreate', 'AnswerSubmit', 'SemesterResultCreate', 'CodeExecuteRequest', 'CIATemplateCreate', 'CIATemplateUpdate', 'SubjectCIAConfigCreate', 'MarkEntryItem', 'MarkEntrySave', 'MarkReview', 'EndtermEntry', 'ExamScheduleCreate', 'ExamScheduleUpdate', 'ChallengeSubmit', 'ViolationReport', 'ResultRequest', 'FeedbackCreate', 'QuestionPaperReview', 'TeachingEvalRequest', 'FacultyQuestionPaper', 'FacultyStudyMaterial'],
    'administrative': ['AnnouncementCreate', 'AttendanceMarkItem', 'AttendanceMarkBatch', 'LeaveApply', 'LeaveReview', 'LeaveCancelRequest', 'AttendanceOverride', 'ActivityPermissionCreate', 'OutOfCampusCreate', 'FreePeriodRequestCreate', 'ActivityReview', 'MOUCreate', 'CurriculumFeedbackCreate', 'EmployerFeedbackCreate', 'IndustryProjectCreate', 'DriveRequestCreate', 'TrainingProgramCreate', 'AdvisoryRoleCreate', 'ResearchCreate', 'ConsultancyCreate', 'TaskAssignmentCreate', 'MeetingCreate', 'ScholarshipApplyRequest', 'ShortlistRequest', 'SelectRequest']
}

imports = """from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime, timezone
"""

os.makedirs('app/schemas', exist_ok=True)

all_classes_mapped = set()
for mod, cls_list in mappings.items():
    with open(f'app/schemas/{mod}.py', 'w', encoding='utf-8') as f:
        f.write(imports + '\n')
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
with open('app/schemas/__init__.py', 'w', encoding='utf-8') as f:
    for mod, cls_list in mappings.items():
        found = [c for c in cls_list if c in class_boundaries]
        if found:
            f.write(f"from .{mod} import {', '.join(found)}\n")
