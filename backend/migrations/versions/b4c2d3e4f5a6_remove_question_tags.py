"""remove question tags

Revision ID: b4c2d3e4f5a6
Revises: a3b1c2d4e5f6
Create Date: 2026-05-18 00:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b4c2d3e4f5a6'
down_revision: Union[str, None] = 'a3b1c2d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('questions', 'tags')


def downgrade() -> None:
    op.add_column(
        'questions',
        sa.Column('tags', postgresql.ARRAY(sa.Text()), nullable=False, server_default='{}'),
    )
