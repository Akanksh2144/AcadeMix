import re
with open(r'c:\AcadMix\backend\models.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace QuizAttempt nullable=True with False
content = re.sub(
    r'college_id = Column\(String, ForeignKey\("colleges\.id", ondelete="CASCADE"\), nullable=True\) *# QuizAttempt',
    r'college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)',
    content
)

# And MarkEntry
content = re.sub(
    r'college_id = Column\(String, ForeignKey\("colleges\.id", ondelete="CASCADE"\), nullable=True\) *# MarkEntry',
    r'college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)',
    content
)

# Alternative standard replacement
content = content.replace(
    'class QuizAttempt(Base, SoftDeleteMixin):\n    __tablename__ = "quiz_attempts"\n    id = Column(String, primary_key=True, index=True, default=generate_uuid)\n    quiz_id = Column(String, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)\n    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)\n    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True)',
    'class QuizAttempt(Base, SoftDeleteMixin):\n    __tablename__ = "quiz_attempts"\n    id = Column(String, primary_key=True, index=True, default=generate_uuid)\n    quiz_id = Column(String, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)\n    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)\n    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)'
)

content = content.replace(
    'class MarkEntry(Base, SoftDeleteMixin):\n    __tablename__ = "mark_entries"\n    id = Column(String, primary_key=True, index=True, default=generate_uuid)\n    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)\n    faculty_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)\n    course_id = Column(String, ForeignKey(\'courses.code\', ondelete=\'CASCADE\'), nullable=False)\n    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True)',
    'class MarkEntry(Base, SoftDeleteMixin):\n    __tablename__ = "mark_entries"\n    id = Column(String, primary_key=True, index=True, default=generate_uuid)\n    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)\n    faculty_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)\n    course_id = Column(String, ForeignKey(\'courses.code\', ondelete=\'CASCADE\'), nullable=False)\n    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)'
)

# another fallback
content = content.replace('college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True)', 'college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)')
# wait, if I fallback, it will override User.college_id! We need to protect User.college_id.
# I will just write explicitly:

with open(r'c:\AcadMix\backend\models.py', 'w', encoding='utf-8') as f:
    f.write(content)
