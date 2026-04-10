import re
with open(r'c:\AcadMix\backend\models.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Issue 11
content = re.sub(r"server_default='false'", "server_default=text('false')", content)
content = re.sub(r"from sqlalchemy.sql import func", "from sqlalchemy.sql import func, text", content)

# Issue 10
content = re.sub(r"exam_type = Column\(String, nullable=False\)", "exam_type = Column(String, nullable=False, index=True)", content)

# Issue 12
content = re.sub(r"course_id = Column\(String, nullable=False\)  # subject_code, not FK", "course_id = Column(String, ForeignKey('courses.code', ondelete='CASCADE'), nullable=False)", content)

# Course Model
if "class Course(" not in content:
    old_course = r'class CourseEnrollment\(Base, SoftDeleteMixin\):\n    __tablename__ = "course_enrollments"'
    new_course = '''class Course(Base, SoftDeleteMixin):
    __tablename__ = "courses"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False, unique=True, index=True)

class CourseEnrollment(Base, SoftDeleteMixin):
    __tablename__ = "course_enrollments"'''
    content = content.replace(old_course, new_course)

# Issue 6 (Append model)
if 'ParentStudentLink' not in content:
    content += '''\nclass ParentStudentLink(Base, SoftDeleteMixin):\n    __tablename__ = "parent_student_links"\n    id = Column(String, primary_key=True, index=True, default=generate_uuid)\n    parent_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)\n    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)\n    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)\n'''

with open(r'c:\AcadMix\backend\models.py', 'w', encoding='utf-8') as f:
    f.write(content)
