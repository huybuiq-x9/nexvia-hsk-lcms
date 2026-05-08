"""add scorm comments

Revision ID: 8a7dc58e4f2b
Revises: 3f9b7ad8c2e1
Create Date: 2026-05-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8a7dc58e4f2b"
down_revision: Union[str, None] = "3f9b7ad8c2e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scorm_comments",
        sa.Column("sub_lesson_id", sa.UUID(), nullable=False),
        sa.Column("author_id", sa.UUID(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("updated_by", sa.UUID(), nullable=True),
        sa.Column("deleted_by", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sub_lesson_id"], ["sub_lessons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_scorm_comments_author_id"), "scorm_comments", ["author_id"], unique=False)
    op.create_index(op.f("ix_scorm_comments_sub_lesson_id"), "scorm_comments", ["sub_lesson_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_scorm_comments_sub_lesson_id"), table_name="scorm_comments")
    op.drop_index(op.f("ix_scorm_comments_author_id"), table_name="scorm_comments")
    op.drop_table("scorm_comments")
