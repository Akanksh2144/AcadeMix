"""enable_rls_policies

Revision ID: af6d054a654b
Revises: b2c3d4e5f6a7
Create Date: 2026-04-09 00:07:15.822902

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'af6d054a654b'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create a dedicated 'authenticated' role if it doesn't exist
    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
            CREATE ROLE authenticated;
        END IF;
    END
    $$;
    """)

    # The core tables that enforce multi-tenant isolation
    rls_tables = [
        "users",
        "mark_entries",
        "semester_grades",
        "attendance_records",
        "period_slots",
        "leave_requests",
        "placement_applications",
        "course_registrations"
    ]

    for table in rls_tables:
        # 2. Enable Postgres RLS engine on the table
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        
        # 3. Create the tenant boundary policy
        # college_id must exactly match the JWT tenant claim injected into the GUC
        op.execute(f"""
        CREATE POLICY tenant_isolation ON {table}
        AS PERMISSIVE
        FOR ALL
        TO authenticated
        USING (college_id = current_setting('app.current_college'));
        """)
        
        # 4. Grant schema access permissions to the authenticated role
        op.execute(f"GRANT ALL ON {table} TO authenticated;")

def downgrade() -> None:
    rls_tables = [
        "users",
        "mark_entries",
        "semester_grades",
        "attendance_records",
        "period_slots",
        "leave_requests",
        "placement_applications",
        "course_registrations"
    ]

    for table in rls_tables:
        op.execute(f"REVOKE ALL ON {table} FROM authenticated;")
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table};")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")

    op.execute("DROP ROLE IF EXISTS authenticated;")
