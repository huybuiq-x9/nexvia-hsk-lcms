"""add scorm package fields

Revision ID: 3f9b7ad8c2e1
Revises: 09697284a1b1
Create Date: 2026-05-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "3f9b7ad8c2e1"
down_revision: Union[str, None] = "09697284a1b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sub_lessons", sa.Column("scorm_stored_name", sa.String(length=500), nullable=True))
    op.add_column("sub_lessons", sa.Column("scorm_filename", sa.String(length=255), nullable=True))
    op.add_column("sub_lessons", sa.Column("scorm_file_size", sa.BigInteger(), nullable=True))
    op.add_column("sub_lessons", sa.Column("scorm_uploaded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("sub_lessons", sa.Column("scorm_uploaded_by_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_sub_lessons_scorm_uploaded_by_id_users",
        "sub_lessons",
        "users",
        ["scorm_uploaded_by_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_sub_lessons_scorm_uploaded_by_id_users",
        "sub_lessons",
        type_="foreignkey",
    )
    op.drop_column("sub_lessons", "scorm_uploaded_by_id")
    op.drop_column("sub_lessons", "scorm_uploaded_at")
    op.drop_column("sub_lessons", "scorm_file_size")
    op.drop_column("sub_lessons", "scorm_filename")
    op.drop_column("sub_lessons", "scorm_stored_name")
