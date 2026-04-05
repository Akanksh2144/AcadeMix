"""
One-time migration script to stamp every existing MongoDB document with tenant_id.

Usage:
    python migrate_tenants.py

This script:
1. Scans every collection in the AcadeMix database
2. For user documents: derives tenant_id from the 'college' field
3. For non-user documents: derives tenant_id from the creating user (or defaults to 'gnitc')
4. Creates compound indexes for efficient tenant-scoped queries
"""

import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import certifi

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / '.env')

from tenant import derive_tenant_id

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


async def migrate():
    client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=10000)
    db = client[DB_NAME]

    print("=" * 60)
    print("AcadeMix Multi-Tenancy Migration")
    print("=" * 60)

    # ── Step 1: Migrate users ──────────────────────────────────
    print("\n[1/3] Migrating users...")
    users_cursor = db.users.find({"tenant_id": {"$exists": False}})
    user_count = 0
    user_tenant_map = {}  # user_id -> tenant_id

    async for user in users_cursor:
        college = user.get("college", "GNITC")
        tid = derive_tenant_id(college)
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"tenant_id": tid}}
        )
        user_tenant_map[str(user["_id"])] = tid
        user_count += 1

    print(f"  ✓ Migrated {user_count} users")

    # Build a full user_tenant_map for lookups
    all_users = await db.users.find({}, {"_id": 1, "tenant_id": 1}).to_list(None)
    for u in all_users:
        user_tenant_map[str(u["_id"])] = u.get("tenant_id", "gnitc")

    # ── Step 2: Migrate all other collections ──────────────────
    print("\n[2/3] Migrating other collections...")

    collections_with_user_ref = {
        "quizzes":            "created_by",
        "quiz_attempts":      "student_id",
        "semester_results":   "student_id",
        "mark_entries":       "teacher_id",
        "faculty_assignments":"teacher_id",
        "timetable_slots":    None,           # will default
        "announcements":      "posted_by_id",
        "endterm_entries":    "entered_by",
        "placements":         None,           # will default
        "coding_challenges":  None,           # shared globally
        "student_progress":   "student_id",
    }

    for coll_name, user_field in collections_with_user_ref.items():
        try:
            cursor = db[coll_name].find({"tenant_id": {"$exists": False}})
            count = 0
            async for doc in cursor:
                tid = "gnitc"  # default
                if user_field and doc.get(user_field):
                    tid = user_tenant_map.get(doc[user_field], "gnitc")
                await db[coll_name].update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"tenant_id": tid}}
                )
                count += 1
            if count > 0:
                print(f"  ✓ {coll_name}: {count} documents migrated")
            else:
                print(f"  - {coll_name}: already migrated or empty")
        except Exception as e:
            print(f"  ✗ {coll_name}: error - {e}")

    # ── Step 3: Create compound indexes ────────────────────────
    print("\n[3/3] Creating compound indexes...")

    index_specs = [
        ("users",              [("tenant_id", 1), ("role", 1)]),
        ("users",              [("tenant_id", 1), ("college_id", 1)]),
        ("users",              [("tenant_id", 1), ("department", 1)]),
        ("quizzes",            [("tenant_id", 1), ("status", 1)]),
        ("quizzes",            [("tenant_id", 1), ("created_by", 1)]),
        ("quiz_attempts",      [("tenant_id", 1), ("student_id", 1), ("quiz_id", 1)]),
        ("quiz_attempts",      [("tenant_id", 1), ("status", 1)]),
        ("mark_entries",       [("tenant_id", 1), ("department", 1), ("status", 1)]),
        ("faculty_assignments",[("tenant_id", 1), ("teacher_id", 1)]),
        ("semester_results",   [("tenant_id", 1), ("student_id", 1)]),
        ("announcements",      [("tenant_id", 1), ("department", 1)]),
        ("endterm_entries",    [("tenant_id", 1), ("department", 1)]),
    ]

    for coll_name, keys in index_specs:
        try:
            await db[coll_name].create_index(keys)
            print(f"  ✓ {coll_name}: index on {[k[0] for k in keys]}")
        except Exception as e:
            print(f"  ✗ {coll_name}: {e}")

    print("\n" + "=" * 60)
    print("Migration complete!")
    print("=" * 60)

    client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
