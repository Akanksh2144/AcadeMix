import re

with open("c:/AcadMix/frontend/src/services/api.js", "r") as f:
    content = f.read()

# Extract patterns like api.get('/api/auth/me') -> GET /api/auth/me
paths = []
matches = re.findall(r'api\.(get|post|put|delete|patch)\([\'\`\"]([^\'\`\"\$]+)', content)
for method, path in matches:
    paths.append(f"{method.upper()} {path}")

with open("c:/AcadMix/backend/frontend_routes.txt", "w") as f:
    f.write("\n".join(sorted(set(paths))))
print("Extracted", len(set(paths)), "frontend paths.")
