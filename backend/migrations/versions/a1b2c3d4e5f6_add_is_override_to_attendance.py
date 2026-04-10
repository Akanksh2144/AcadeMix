"""add is_override column to attendance_records

Revision ID: a1b2c3d4e5f6
Revises: 982e5ce3d268
Create Date: 2026-04-08 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '982e5ce3d268'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'attendance_records',
        sa.Column('is_override', sa.Boolean(), nullable=False, server_default='false')
    )


def downgrade() -> None:
    op.drop_column('attendance_records', 'is_override')
