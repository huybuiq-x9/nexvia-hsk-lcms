import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Integer, String, BigInteger, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.shared.base_model import BaseModel

if TYPE_CHECKING:
    from app.modules.courses.model import SubLesson
    from app.modules.users.model import User


class Document(BaseModel):
    __tablename__ = "documents"

    sub_lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sub_lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uploader_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    original_name: Mapped[str] = mapped_column(String(500), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_extension: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    version_group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        default=uuid.uuid4,
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    review_round: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    sub_lesson: Mapped["SubLesson"] = relationship(
        "SubLesson",
        back_populates="documents",
    )
    uploader: Mapped["User"] = relationship(
        "User",
        foreign_keys=[uploader_id],
    )
    comments: Mapped[list["DocumentComment"]] = relationship(
        "DocumentComment",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentComment.created_at",
    )


class DocumentComment(BaseModel):
    __tablename__ = "document_comments"

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    document: Mapped["Document"] = relationship(
        "Document",
        back_populates="comments",
    )
    author: Mapped["User"] = relationship(
        "User",
        foreign_keys=[author_id],
    )
