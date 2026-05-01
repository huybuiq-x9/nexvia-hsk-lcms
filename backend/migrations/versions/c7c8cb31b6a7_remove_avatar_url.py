"""remove avatar url

Revision ID: c7c8cb31b6a7
Revises: f66ff11ca0c6
Create Date: 2026-05-01 08:36:00.889505

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7c8cb31b6a7'
down_revision: Union[str, None] = 'f66ff11ca0c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
