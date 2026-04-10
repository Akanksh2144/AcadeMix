import re

with open('models.py', 'r') as f:
    text = f.read()

classes = text.split('class ')[1:]

tables_with_college_id = []

for cls in classes:
    match = re.search(r'__tablename__\s*=\s*"(.*?)"', cls)
    if not match: continue
    tablename = match.group(1)
    
    if 'college_id = Column' in cls:
        tables_with_college_id.append(tablename)

print(tables_with_college_id)
