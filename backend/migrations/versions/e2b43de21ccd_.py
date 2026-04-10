"""empty message

Revision ID: e2b43de21ccd
Revises: 58da7c3a52d9, e7f6a5b4c3d2
Create Date: 2026-04-10 10:47:04.420656

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2b43de21ccd'
down_revision: Union[str, Sequence[str], None] = ('58da7c3a52d9', 'e7f6a5b4c3d2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
