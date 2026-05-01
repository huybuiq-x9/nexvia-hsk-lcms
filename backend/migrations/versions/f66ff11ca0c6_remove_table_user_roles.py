"""remove table user_roles

Revision ID: f66ff11ca0c6
Revises: 2d32638c9255
Create Date: 2026-05-01 03:23:59.830798

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f66ff11ca0c6'
down_revision: Union[str, None] = '2d32638c9255'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
