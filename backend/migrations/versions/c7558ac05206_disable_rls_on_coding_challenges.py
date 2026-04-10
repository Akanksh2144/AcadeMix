"""disable_rls_on_coding_challenges

Revision ID: c7558ac05206
Revises: 3f1d52a01d43
Create Date: 2026-04-10 12:26:51.652156

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7558ac05206'
down_revision: Union[str, Sequence[str], None] = '3f1d52a01d43'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TABLE coding_challenges DISABLE ROW LEVEL SECURITY;")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE coding_challenges ENABLE ROW LEVEL SECURITY;")
