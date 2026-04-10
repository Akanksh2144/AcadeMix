import re

# 1. Refactor nodal_routes.py
with open(r'c:\AcadMix\backend\nodal_routes.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Add imports
imports = """from app.core.security import require_role, get_current_user
nodal_router = APIRouter()
"""
if "nodal_router = APIRouter()" not in text:
    text = text.replace("import models\nfrom database import get_db\n", "import models\nfrom database import get_db\n" + imports)

# Remove def setup_nodal_routes
if "def setup_nodal_routes(app, require_role, get_current_user):" in text:
    text = text.replace("def setup_nodal_routes(app, require_role, get_current_user):", "def setup_nodal_routes_dummy(): # removed")

# Replace @app. with @nodal_router.
text = text.replace("@app.", "@nodal_router.")

# Fix old code using app.
text = re.sub(r'async def get_nodal_jurisdiction_colleges\(.*?\):', 'async def get_nodal_jurisdiction_colleges(user_id: str, session: AsyncSession):', text)

# Save
with open(r'c:\AcadMix\backend\nodal_routes.py', 'w', encoding='utf-8') as f:
    f.write(text)

# 2. Refactor server_new.py to use APIRouter
with open(r'c:\AcadMix\backend\server_new.py', 'r', encoding='utf-8') as f:
    server_text = f.read()

if "nodal_routes.setup_nodal_routes(app, require_role, get_current_user)" in server_text:
    server_text = server_text.replace("nodal_routes.setup_nodal_routes(app, require_role, get_current_user)", "app.include_router(nodal_routes.nodal_router)")

with open(r'c:\AcadMix\backend\server_new.py', 'w', encoding='utf-8') as f:
    f.write(server_text)

# 3. Refactor app/main.py
with open(r'c:\AcadMix\backend\app\main.py', 'r', encoding='utf-8') as f:
    main_text = f.read()

if "nodal_routes.setup_nodal_routes(app, require_role, get_current_user)" in main_text:
    main_text = main_text.replace("nodal_routes.setup_nodal_routes(app, require_role, get_current_user)", "app.include_router(nodal_routes.nodal_router)")

with open(r'c:\AcadMix\backend\app\main.py', 'w', encoding='utf-8') as f:
    f.write(main_text)

# 4. Refactor seed_permissions.py
with open(r'c:\AcadMix\backend\seed_permissions.py', 'r', encoding='utf-8') as f:
    seed_text = f.read()

replacement = """        target_roles = ["teacher", "hod", "exam_cell"]
        
        ROLE_PERMISSIONS = {
            "teacher": {"quizzes": ["create", "edit", "delete", "publish", "view"], "marks": ["create", "edit", "delete", "publish", "view"]},
            "hod": {"marks": ["create", "edit", "delete", "publish", "view"], "placements": ["create", "edit", "delete", "publish", "view"], "leaves": ["approve", "reject", "view"]},
            "exam_cell": {"marks": ["create", "edit", "delete", "publish", "view"]}
        }

        result = await session.execute(select(models.Role))
        existing_roles = list(result.scalars().all())
        existing_names = {r.name for r in existing_roles}
        
        updated = 0
        added = 0
        
        for role_name in target_roles:
            perms = ROLE_PERMISSIONS.get(role_name, {})"""

old_loop = """        target_roles = ["teacher", "hod", "exam_cell"]
        
        result = await session.execute(select(models.Role))
        existing_roles = list(result.scalars().all())
        existing_names = {r.name for r in existing_roles}
        
        updated = 0
        added = 0
        
        for role_name in target_roles:
            perms = {}
            if role_name == "teacher":
                perms["quizzes"] = ["create", "edit", "delete", "publish", "view"]
                perms["marks"] = ["create", "edit", "delete", "publish", "view"]
            elif role_name == "hod":
                perms["marks"] = ["create", "edit", "delete", "publish", "view"]
                perms["placements"] = ["create", "edit", "delete", "publish", "view"]
                perms["leaves"] = ["approve", "reject", "view"]
            elif role_name == "exam_cell":
                perms["marks"] = ["create", "edit", "delete", "publish", "view"]"""

if old_loop in seed_text:
    seed_text = seed_text.replace(old_loop, replacement)
    with open(r'c:\AcadMix\backend\seed_permissions.py', 'w', encoding='utf-8') as f:
        f.write(seed_text)
