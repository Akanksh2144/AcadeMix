"""add rls_shadow_logs table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-08 21:32:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'rls_shadow_logs',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('expected_college_id', sa.String(), nullable=False),
        sa.Column('actual_college_id', sa.String(), nullable=True),
        sa.Column('table_name', sa.String(), nullable=False),
        sa.Column('row_id', sa.String(), nullable=True),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('user_role', sa.String(), nullable=True),
        sa.Column('query_text', sa.String(), nullable=True),
        sa.Column('violation_type', sa.String(), nullable=False),
        sa.Column('resolved', sa.Boolean(), nullable=False, server_default='false'),
    )
    op.create_index('ix_rls_shadow_resolved_ts', 'rls_shadow_logs', ['resolved', 'timestamp'])
    op.create_index('ix_rls_shadow_violation_type', 'rls_shadow_logs', ['violation_type'])


def downgrade() -> None:
    op.drop_index('ix_rls_shadow_violation_type', table_name='rls_shadow_logs')
    op.drop_index('ix_rls_shadow_resolved_ts', table_name='rls_shadow_logs')
    op.drop_table('rls_shadow_logs')
