"""Convert local GUC policies to Kernel-Level Supabase JWT RLS.

Revision ID: e7f6a5b4c3d2
Revises: 
Create Date: 2026-04-10
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e7f6a5b4c3d2'
down_revision = None
branch_labels = None
depends_on = None

# A canonical list of tenant-bound tables dynamically retrieved at migration runtime.

def get_tenant_tables(conn):
    from sqlalchemy.engine.reflection import Inspector
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()
    tenant_tables = []
    for table in tables:
        columns = [c['name'] for c in inspector.get_columns(table)]
        if 'college_id' in columns and table != 'colleges':
            tenant_tables.append(table)
    return tenant_tables

def upgrade():
    conn = op.get_bind()
    tenant_tables = get_tenant_tables(conn)
    
    for table in tenant_tables:
        op.execute(f"""
            DO $$ 
            BEGIN 
                DROP POLICY IF EXISTS tenant_isolation_policy ON "{table}";
            EXCEPTION 
                WHEN undefined_object THEN NULL;
            END $$;
        """)

        op.execute(f"""
            CREATE POLICY supabase_jwt_tenant_isolation ON "{table}"
            FOR ALL
            TO authenticated
            USING (
                (college_id)::text = current_setting('request.jwt.claims', true)::jsonb ->> 'college_id'
            )
            WITH CHECK (
                (college_id)::text = current_setting('request.jwt.claims', true)::jsonb ->> 'college_id'
            );
        """)


def downgrade():
    conn = op.get_bind()
    tenant_tables = get_tenant_tables(conn)
    
    for table in tenant_tables:
        op.execute(f"""
            DROP POLICY IF EXISTS supabase_jwt_tenant_isolation ON "{table}";
        """)
        op.execute(f"""
            CREATE POLICY tenant_isolation_policy ON "{table}"
            FOR ALL
            TO authenticated
            USING (
                (college_id)::text = current_setting('app.current_college', true)
            );
        """)
