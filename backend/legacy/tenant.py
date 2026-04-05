"""
Multi-Tenancy middleware for AcadeMix.
Every document in MongoDB carries a `tenant_id` field.
This module provides helpers to:
  - derive tenant_id from a college name
  - inject tenant_id into queries automatically
  - stamp new documents with tenant_id before insertion
"""

# ── Mapping ─────────────────────────────────────────────────────────────────
# Human-readable college name  →  machine-level tenant key
COLLEGE_TO_TENANT = {
    "GNITC": "gnitc",
    "GNIT":  "gnit",
    "GNU":   "gnu",
}

SUPER_ADMIN_TENANT = "__all__"   # sentinel value for God-mode admin


def derive_tenant_id(college: str) -> str:
    """Convert a college display name to a tenant_id.
    Falls back to lowercased + stripped version if not in the map."""
    if not college:
        return "gnitc"  # default tenant
    return COLLEGE_TO_TENANT.get(college.upper().strip(), college.lower().strip())


def get_tenant_id(user: dict) -> str:
    """Extract tenant_id from an authenticated user dict.
    Super-admins (role=admin, college=ALL) get the sentinel value."""
    if user.get("role") == "admin" and user.get("college", "").upper() == "ALL":
        return SUPER_ADMIN_TENANT
    return user.get("tenant_id", derive_tenant_id(user.get("college", "")))


def is_super_admin(user: dict) -> bool:
    """Check if the user is the platform-wide super admin."""
    return get_tenant_id(user) == SUPER_ADMIN_TENANT


def tenant_query(user: dict, base_query: dict | None = None) -> dict:
    """Return a MongoDB query dict with automatic tenant_id injection.
    
    Super-admins bypass the filter (they see everything).
    Everyone else gets their tenant_id prepended.
    
    Usage:
        query = tenant_query(user, {"role": "student"})
        # → {"tenant_id": "gnitc", "role": "student"}
    """
    q = dict(base_query) if base_query else {}
    tid = get_tenant_id(user)
    if tid != SUPER_ADMIN_TENANT:
        q["tenant_id"] = tid
    return q


def inject_tenant(user: dict, doc: dict) -> dict:
    """Stamp a document with the correct tenant_id before insertion.
    
    Usage:
        doc = inject_tenant(user, {"name": "Quiz 1", ...})
        await db.quizzes.insert_one(doc)
    """
    doc["tenant_id"] = derive_tenant_id(user.get("college", ""))
    return doc
