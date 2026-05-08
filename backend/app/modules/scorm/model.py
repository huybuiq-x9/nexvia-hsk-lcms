import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.base_model import BaseModel

if TYPE_CHECKING:
    from app.modules.courses.model import SubLesson
    from app.modules.users.model import User


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
    content: Mapped[str] = mapped_column(Text, nullable=False)

    sub_lesson: Mapped["SubLesson"] = relationship(
        "SubLesson",
        back_populates="scorm_comments",
    )
    author: Mapped["User"] = relationship(
        "User",
        foreign_keys=[author_id],
    )
