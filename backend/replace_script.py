import os, re

def process_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    original = c
    c = c.replace("models.User.profile_data['department'].astext", "UserProfile.department")
    c = c.replace('models.User.profile_data["department"].astext', "UserProfile.department")
    c = c.replace("models.User.profile_data['batch'].astext", "UserProfile.batch")
    c = c.replace('models.User.profile_data["batch"].astext', "UserProfile.batch")
    c = c.replace("models.User.profile_data['section'].astext", "UserProfile.section")
    c = c.replace('models.User.profile_data["section"].astext', "UserProfile.section")
    c = c.replace("models.User.profile_data['college_id'].astext", "UserProfile.college_id")
    c = c.replace('models.User.profile_data["college_id"].astext', "UserProfile.college_id")

    c = re.sub(r"u\.profile_data->>['\"]department['\"]", 'user_profiles.department', c)
    c = re.sub(r"u\.profile_data->>['\"]total_classes_attended['\"]", 'user_profiles.telemetry_strikes', c) # Mapped for now
    
    if "from app.models.core import" not in c and "UserProfile" in c:
        c = c.replace("from app import models", "from app import models\nfrom app.models.core import UserProfile")

    if c != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        print(f"Fixed SQL in {path}")

process_file('app/services/principal_service.py')
process_file('app/services/user_service.py')
process_file('app/services/marks_service.py')
process_file('app/services/hod_service.py')
