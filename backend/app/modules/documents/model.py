import uuid
from typing import TYPE_CHECKING

from sqlalchemy import String, BigInteger, ForeignKey
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
    stored_name: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    file_extension: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)

    sub_lesson: Mapped["SubLesson"] = relationship(
        "SubLesson",
        back_populates="documents",
    )
    uploader: Mapped["User"] = relationship(
        "User",
        foreign_keys=[uploader_id],
    )
