import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, BigInteger, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.base_model import BaseModel

if TYPE_CHECKING:
    from app.modules.courses.model import SubLesson
    from app.modules.users.model import User


class ScormPackage(BaseModel):
    __tablename__ = "scorm_packages"

    sub_lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sub_lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uploader_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    schema: Mapped[str] = mapped_column(String(100), nullable=False)
    schema_version: Mapped[str] = mapped_column(String(100), nullable=False)
    sco_launch: Mapped[str] = mapped_column(String(500), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    files_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    sub_lesson: Mapped["SubLesson"] = relationship(
        "SubLesson",
        back_populates="scorm_packages",
    )
    uploader: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[uploader_id],
    )
    comments: Mapped[list["ScormComment"]] = relationship(
        "ScormComment",
        back_populates="scorm_package",
        cascade="all, delete-orphan",
        order_by="ScormComment.created_at",
    )


class ScormComment(BaseModel):
    __tablename__ = "scorm_comments"

    sub_lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sub_lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scorm_package_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scorm_packages.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    sub_lesson: Mapped["SubLesson"] = relationship(
        "SubLesson",
        back_populates="scorm_comments",
    )
    author: Mapped["User"] = relationship(
        "User",
        foreign_keys=[author_id],
    )
    scorm_package: Mapped["ScormPackage | None"] = relationship(
        "ScormPackage",
        back_populates="comments",
    )
