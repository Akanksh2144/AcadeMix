"""migrate_rls_to_jwt_claims

Revision ID: c4b5e9733b6b
Revises: 18582ecc26c1
Create Date: 2026-04-10 12:45:32.155625

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4b5e9733b6b'
down_revision: Union[str, Sequence[str], None] = '18582ecc26c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Look up all tables that currently have the tenant_isolation policy
    conn = op.get_bind()
    tables = conn.execute(sa.text('''
        SELECT c.relname
        FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        WHERE p.polname = 'tenant_isolation'
    ''')).scalars().all()

    for table in tables:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table};")
        op.execute(f'''
        CREATE POLICY tenant_isolation ON {table}
        AS PERMISSIVE FOR ALL TO authenticated
        USING (college_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'college_id'))
        WITH CHECK (college_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'college_id'));
        ''')

def downgrade() -> None:
    conn = op.get_bind()
    tables = conn.execute(sa.text('''
        SELECT c.relname
        FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        WHERE p.polname = 'tenant_isolation'
    ''')).scalars().all()

    for table in tables:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table};")
        op.execute(f'''
        CREATE POLICY tenant_isolation ON {table}
        AS PERMISSIVE FOR ALL TO authenticated
        USING (college_id::text = current_setting('app.current_college', true));
        ''')
