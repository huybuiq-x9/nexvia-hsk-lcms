"""add scorm_comments table linked to scorm_packages

Revision ID: a1e3f9c50d82
Revises: 6c2d9e1f4a33
Create Date: 2026-05-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1e3f9c50d82"
down_revision: Union[str, None] = "6c2d9e1f4a33"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scorm_comments",
        sa.Column("scorm_package_id", sa.UUID(), nullable=False),
        sa.Column("author_id", sa.UUID(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("updated_by", sa.UUID(), nullable=True),
        sa.Column("deleted_by", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(["scorm_package_id"], ["scorm_packages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scorm_comments_scorm_package_id", "scorm_comments", ["scorm_package_id"], unique=False)
    op.create_index("ix_scorm_comments_author_id", "scorm_comments", ["author_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_scorm_comments_author_id", table_name="scorm_comments")
    op.drop_index("ix_scorm_comments_scorm_package_id", table_name="scorm_comments")
    op.drop_table("scorm_comments")
