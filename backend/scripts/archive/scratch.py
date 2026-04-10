import os

server_path = "c:\\AcadMix\\backend\\server.py"
server_new_path = "c:\\AcadMix\\backend\\server_new.py"

with open(server_path, "r", encoding="utf-8") as f:
    content = f.read()

lines = content.split('\n')

new_lines = (
    lines[0:114] + 
    [
        "",
        "# ─── Routers ────────────────────────────────────────────────────────────",
        "from app.routers import auth, code_execution, health",
        "app.include_router(health.router, prefix=\"/api\", tags=[\"health\"])",
        "app.include_router(auth.router, prefix=\"/api/auth\", tags=[\"auth\"])",
        "app.include_router(code_execution.router, prefix=\"/api/code\", tags=[\"code\"])",
        "from app.core.security import get_current_user",
        "from app.core.deps import require_role, require_permission",
        "from app.core.audit import log_audit",
        ""
    ] + 
    lines[260:671] + 
    lines[819:4980] + 
    lines[5150:]
)

with open(server_new_path, "w", encoding="utf-8") as f:
    f.write('\n'.join(new_lines))

print("server_new.py created successfully.")
