import sys
from app.main import app
import re

backend_routes = []
for route in app.routes:
    if hasattr(route, "methods") and route.path.startswith("/api"):
        for method in route.methods:
            backend_routes.append(f"{method} {route.path}")

with open("backend_routes.txt", "w") as f:
    f.write("\n".join(sorted(backend_routes)))
print("Success")
