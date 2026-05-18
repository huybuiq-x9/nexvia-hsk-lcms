"""add question category

Revision ID: a3b1c2d4e5f6
Revises: f630dd057c66
Create Date: 2026-05-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a3b1c2d4e5f6'
down_revision: Union[str, None] = 'f630dd057c66'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'questions',
        sa.Column('category', sa.String(20), nullable=False, server_default='vocabulary'),
    )
    op.create_index('idx_questions_category', 'questions', ['category'])


def downgrade() -> None:
    op.drop_index('idx_questions_category', table_name='questions')
    op.drop_column('questions', 'category')
