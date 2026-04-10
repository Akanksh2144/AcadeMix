"""fix_orphan_rls_policies

Revision ID: 18582ecc26c1
Revises: c7558ac05206
Create Date: 2026-04-10 12:40:50.247179

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '18582ecc26c1'
down_revision: Union[str, Sequence[str], None] = 'c7558ac05206'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    globals_to_disable = [
        "alembic_version", "colleges", "audit_logs", 
        "rls_shadow_logs", "dh_submission_requirements", "dh_circulars"
    ]
    for table in globals_to_disable:
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")

    tenant_tables = [
        "appeals", "challenge_progress", "proctoring_violations", 
        "course_enrollments", "proctoring_events", "alumni_event_registrations", 
        "mark_submission_entries"
    ]
    for table in tenant_tables:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table};")
        op.execute(f'''
        CREATE POLICY tenant_isolation ON {table}
        AS PERMISSIVE FOR ALL TO authenticated
        USING (college_id::text = current_setting('app.current_college'));
        ''')
        op.execute(f"GRANT ALL ON {table} TO authenticated;")


def downgrade() -> None:
    globals_to_disable = [
        "alembic_version", "colleges", "audit_logs", 
        "rls_shadow_logs", "dh_submission_requirements", "dh_circulars"
    ]
    for table in globals_to_disable:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")

    tenant_tables = [
        "appeals", "challenge_progress", "proctoring_violations", 
        "course_enrollments", "proctoring_events", "alumni_event_registrations", 
        "mark_submission_entries"
    ]
    for table in tenant_tables:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table};")
        op.execute(f"REVOKE ALL ON {table} FROM authenticated;")
