import os
import re

orphans = [
    'course_enrollments', 'proctoring_events', 'proctoring_violations',
    'appeals', 'mark_submission_entries', 'challenge_progress',
    'alumni_event_registrations'
]
directory = 'C:/AcadMix/backend/app/models/'
col_def = '    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)\n'

for filename in os.listdir(directory):
    if filename.endswith(".py"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        modified = False
        for orphan in orphans:
            pattern = re.compile(r'(__tablename__\s*=\s*[\'"]' + orphan + r'[\'"])\n')
            if pattern.search(content) and "college_id = Column" not in content[pattern.search(content).end():pattern.search(content).end()+200]:
                content = pattern.sub(r'\1\n' + col_def, content)
                modified = True
                print(f"Patched {orphan} in {filename}")
                
        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
