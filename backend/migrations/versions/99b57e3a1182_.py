"""empty message

Revision ID: 99b57e3a1182
Revises: 8e6c9c747b99, c4f5a6b7d8e9
Create Date: 2026-04-09 18:07:45.041486

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99b57e3a1182'
down_revision: Union[str, Sequence[str], None] = ('8e6c9c747b99', 'c4f5a6b7d8e9')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
