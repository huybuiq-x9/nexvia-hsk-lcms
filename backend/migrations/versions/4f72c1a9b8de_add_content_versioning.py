"""add content versioning

Revision ID: 4f72c1a9b8de
Revises: 8a7dc58e4f2b
Create Date: 2026-05-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4f72c1a9b8de"
down_revision: Union[str, None] = "8a7dc58e4f2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("version_group_id", sa.UUID(), nullable=True))
    op.add_column("documents", sa.Column("version", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("documents", sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("documents", sa.Column("review_round", sa.Integer(), nullable=False, server_default="1"))
    op.execute("UPDATE documents SET version_group_id = id WHERE version_group_id IS NULL")
    op.alter_column("documents", "version_group_id", nullable=False)
    op.create_index(op.f("ix_documents_version_group_id"), "documents", ["version_group_id"], unique=False)

    op.create_table(
        "scorm_packages",
        sa.Column("sub_lesson_id", sa.UUID(), nullable=False),
        sa.Column("uploader_id", sa.UUID(), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("schema", sa.String(length=100), nullable=False),
        sa.Column("schema_version", sa.String(length=100), nullable=False),
        sa.Column("sco_launch", sa.String(length=500), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("stored_name", sa.String(length=500), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("files_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.true()),
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

    op.add_column("scorm_comments", sa.Column("scorm_package_id", sa.UUID(), nullable=True))
    op.create_index(op.f("ix_scorm_comments_scorm_package_id"), "scorm_comments", ["scorm_package_id"], unique=False)
    op.create_foreign_key(
        "fk_scorm_comments_scorm_package_id_scorm_packages",
        "scorm_comments",
        "scorm_packages",
        ["scorm_package_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_scorm_comments_scorm_package_id_scorm_packages",
        "scorm_comments",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_scorm_comments_scorm_package_id"), table_name="scorm_comments")
    op.drop_column("scorm_comments", "scorm_package_id")

    op.drop_index(op.f("ix_scorm_packages_uploader_id"), table_name="scorm_packages")
    op.drop_index(op.f("ix_scorm_packages_sub_lesson_id"), table_name="scorm_packages")
    op.drop_table("scorm_packages")

    op.drop_index(op.f("ix_documents_version_group_id"), table_name="documents")
    op.drop_column("documents", "review_round")
    op.drop_column("documents", "is_current")
    op.drop_column("documents", "version")
    op.drop_column("documents", "version_group_id")
