"""remove_scorm

Revision ID: 5a1ac5338963
Revises: 9c0f6a2d7e1b
Create Date: 2026-05-14 02:03:34.721256

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5a1ac5338963'
down_revision: Union[str, None] = '9c0f6a2d7e1b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop child table first (scorm_comments references scorm_packages)
    op.drop_index('ix_scorm_comments_author_id', table_name='scorm_comments')
    op.drop_index('ix_scorm_comments_scorm_package_id', table_name='scorm_comments')
    op.drop_index('ix_scorm_comments_sub_lesson_id', table_name='scorm_comments')
    op.drop_table('scorm_comments')

    # Then drop parent table
    op.drop_index('ix_scorm_packages_sub_lesson_id', table_name='scorm_packages')
    op.drop_index('ix_scorm_packages_uploader_id', table_name='scorm_packages')
    op.drop_table('scorm_packages')

    # Drop FK and columns from sub_lessons
    op.drop_constraint('fk_sub_lessons_scorm_uploaded_by_id_users', 'sub_lessons', type_='foreignkey')
    op.drop_column('sub_lessons', 'scorm_file_size')
    op.drop_column('sub_lessons', 'scorm_stored_name')
    op.drop_column('sub_lessons', 'scorm_uploaded_by_id')
    op.drop_column('sub_lessons', 'scorm_uploaded_at')
    op.drop_column('sub_lessons', 'scorm_filename')


def downgrade() -> None:
    op.add_column('sub_lessons', sa.Column('scorm_filename', sa.VARCHAR(length=255), autoincrement=False, nullable=True))
    op.add_column('sub_lessons', sa.Column('scorm_uploaded_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True))
    op.add_column('sub_lessons', sa.Column('scorm_uploaded_by_id', sa.UUID(), autoincrement=False, nullable=True))
    op.add_column('sub_lessons', sa.Column('scorm_stored_name', sa.VARCHAR(length=500), autoincrement=False, nullable=True))
    op.add_column('sub_lessons', sa.Column('scorm_file_size', sa.BIGINT(), autoincrement=False, nullable=True))
    op.create_foreign_key('fk_sub_lessons_scorm_uploaded_by_id_users', 'sub_lessons', 'users', ['scorm_uploaded_by_id'], ['id'], ondelete='SET NULL')

    op.create_table('scorm_comments',
    sa.Column('sub_lesson_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('author_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('content', sa.TEXT(), autoincrement=False, nullable=False),
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('created_by', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('updated_by', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('deleted_by', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('scorm_package_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], name='scorm_comments_author_id_fkey', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['scorm_package_id'], ['scorm_packages.id'], name='fk_scorm_comments_scorm_package_id_scorm_packages', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['sub_lesson_id'], ['sub_lessons.id'], name='scorm_comments_sub_lesson_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='scorm_comments_pkey')
    )
    op.create_index('ix_scorm_comments_sub_lesson_id', 'scorm_comments', ['sub_lesson_id'], unique=False)
    op.create_index('ix_scorm_comments_scorm_package_id', 'scorm_comments', ['scorm_package_id'], unique=False)
    op.create_index('ix_scorm_comments_author_id', 'scorm_comments', ['author_id'], unique=False)

    op.create_table('scorm_packages',
    sa.Column('sub_lesson_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('uploader_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('title', sa.VARCHAR(length=500), autoincrement=False, nullable=False),
    sa.Column('schema', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('schema_version', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('sco_launch', sa.VARCHAR(length=500), autoincrement=False, nullable=False),
    sa.Column('filename', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
    sa.Column('stored_name', sa.VARCHAR(length=500), autoincrement=False, nullable=False),
    sa.Column('file_size', sa.BIGINT(), autoincrement=False, nullable=True),
    sa.Column('uploaded_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('files_count', sa.INTEGER(), server_default=sa.text('0'), autoincrement=False, nullable=False),
    sa.Column('version', sa.INTEGER(), server_default=sa.text('1'), autoincrement=False, nullable=False),
    sa.Column('is_current', sa.BOOLEAN(), server_default=sa.text('true'), autoincrement=False, nullable=False),
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('created_by', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('updated_by', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('deleted_by', sa.UUID(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['sub_lesson_id'], ['sub_lessons.id'], name='scorm_packages_sub_lesson_id_fkey', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['uploader_id'], ['users.id'], name='scorm_packages_uploader_id_fkey', ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name='scorm_packages_pkey')
    )
    op.create_index('ix_scorm_packages_uploader_id', 'scorm_packages', ['uploader_id'], unique=False)
    op.create_index('ix_scorm_packages_sub_lesson_id', 'scorm_packages', ['sub_lesson_id'], unique=False)
