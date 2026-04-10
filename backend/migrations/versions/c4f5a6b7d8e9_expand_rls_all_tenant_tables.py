"""expand_rls_all_tenant_tables

Revision ID: c4f5a6b7d8e9
Revises: af6d054a654b
Create Date: 2026-04-09 09:07:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4f5a6b7d8e9'
down_revision: Union[str, Sequence[str], None] = 'af6d054a654b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tables that already have RLS from the previous migration
ALREADY_RLS = {
    "users", "mark_entries", "semester_grades", "attendance_records",
    "period_slots", "leave_requests", "placement_applications", "course_registrations"
}

# All remaining tables with a college_id column that need tenant isolation
NEW_RLS_TABLES = [
    "academic_calendars", "activity_permissions", "alumni_achievements",
    "alumni_contributions", "alumni_events", "alumni_feedback",
    "alumni_guest_lectures", "alumni_job_postings", "alumni_mentorships",
    "announcements", "cia_templates", "circular_acknowledgments",
    "class_in_charges", "companies", "consultancy_engagements",
    "course_feedback", "courses", "curriculum_feedback",
    "department_meetings", "departments", "dh_submission_records",
    "employer_feedback", "exam_schedules", "faculty_assignments",
    "fee_payments", "fee_templates", "free_period_requests",
    "grievances", "industry_project_applications", "industry_projects",
    "inspection_records", "inspection_responses", "institution_profiles",
    "mark_submissions", "mentor_assignments", "mous", "options",
    "out_of_campus_permissions", "parent_student_links",
    "placement_drives", "question_paper_submissions", "questions",
    "quiz_answers", "quiz_attempts", "quizzes", "registration_windows",
    "retired_faculty_advisory", "retired_faculty_research", "roles",
    "scholarship_applications", "scholarships", "sections",
    "student_progressions", "study_materials", "subject_cia_configs",
    "task_assignments", "teaching_evaluations", "teaching_records",
    "timetable_approvals", "timetables", "user_permissions",
]


def upgrade() -> None:
    # Ensure the 'authenticated' role exists (idempotent)
    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
            CREATE ROLE authenticated;
        END IF;
    END
    $$;
    """)

    for table in NEW_RLS_TABLES:
        # Enable RLS on the table
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")

        # Create the tenant boundary policy
        op.execute(f"""
        CREATE POLICY tenant_isolation ON {table}
        AS PERMISSIVE
        FOR ALL
        TO authenticated
        USING (college_id::text = current_setting('app.current_college'));
        """)

        # Grant access to the authenticated role
        op.execute(f"GRANT ALL ON {table} TO authenticated;")


def downgrade() -> None:
    for table in NEW_RLS_TABLES:
        op.execute(f"REVOKE ALL ON {table} FROM authenticated;")
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table};")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")
