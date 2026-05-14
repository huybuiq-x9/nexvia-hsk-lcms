"""add scorm packages

Revision ID: 6c2d9e1f4a33
Revises: 5a1ac5338963
Create Date: 2026-05-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6c2d9e1f4a33"
down_revision: Union[str, None] = "5a1ac5338963"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scorm_packages",
        sa.Column("sub_lesson_id", sa.UUID(), nullable=False),
        sa.Column("uploader_id", sa.UUID(), nullable=True),
        sa.Column("original_filename", sa.String(length=500), nullable=False),
        sa.Column("source_key", sa.String(length=1000), nullable=True),
        sa.Column("extracted_prefix", sa.String(length=1000), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=True),
        sa.Column("manifest_identifier", sa.String(length=500), nullable=True),
        sa.Column("organization_identifier", sa.String(length=500), nullable=True),
        sa.Column("schema_name", sa.String(length=100), nullable=True),
        sa.Column("schema_version", sa.String(length=100), nullable=True),
        sa.Column("launch_path", sa.String(length=1000), nullable=True),
        sa.Column("launch_parameters", sa.String(length=1000), nullable=True),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("files_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("is_current", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="processing", nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("task_id", sa.String(length=255), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("updated_by", sa.UUID(), nullable=True),
        sa.Column("deleted_by", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(["sub_lesson_id"], ["sub_lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploader_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_scorm_packages_sub_lesson_id"), "scorm_packages", ["sub_lesson_id"], unique=False)
    op.create_index(op.f("ix_scorm_packages_uploader_id"), "scorm_packages", ["uploader_id"], unique=False)
    op.create_index(op.f("ix_scorm_packages_status"), "scorm_packages", ["status"], unique=False)
    op.create_index(
        "ix_scorm_packages_sub_lesson_current",
        "scorm_packages",
        ["sub_lesson_id", "is_current"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_scorm_packages_sub_lesson_current", table_name="scorm_packages")
    op.drop_index(op.f("ix_scorm_packages_status"), table_name="scorm_packages")
    op.drop_index(op.f("ix_scorm_packages_uploader_id"), table_name="scorm_packages")
    op.drop_index(op.f("ix_scorm_packages_sub_lesson_id"), table_name="scorm_packages")
    op.drop_table("scorm_packages")
