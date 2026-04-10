import re

with open("backend_routes.txt", "r") as f:
    backend_raw = f.read().splitlines()

with open("frontend_routes.txt", "r") as f:
    frontend_raw = f.read().splitlines()

# Simplify backend paths e.g. GET /api/users/{user_id} -> GET /api/users
backend_simplified = set()
for br in backend_raw:
    # remove path variables
    simp = re.sub(r'\{[^\}]+\}', '', br)
    # remove trailing slashes
    simp = simp.rstrip('/')
    backend_simplified.add(simp)

frontend_simplified = set()
for fr in frontend_raw:
    # remove trailing slashes
    simp = fr.rstrip('/')
    # remove trailing ? or query params in case they got caught
    simp = simp.split('?')[0]
    frontend_simplified.add(simp)

missing_in_backend = []
for fr in frontend_simplified:
    if fr == "GET ": continue
    # Try exact match
    if fr in backend_simplified:
        continue
    # Try prefix match (since frontend regex might have chopped off early)
    # e.g. frontend: GET /api/users, backend: GET /api/users/something
    found = False
    for br in backend_simplified:
        if br == fr or br.startswith(fr + "/") or fr.startswith(br + "/"):
            found = True
            break
    if not found:
        missing_in_backend.append(fr)

missing_in_backend.sort()

with open("missing_routes.txt", "w") as f:
    f.write("\n".join(missing_in_backend))

print("Found", len(missing_in_backend), "frontend endpoints without a clean backend match.")
