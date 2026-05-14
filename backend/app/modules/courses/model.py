import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.shared.base_model import BaseModel
from app.shared.enums import CourseStatus, LessonStatus, SubLessonStatus

if TYPE_CHECKING:
    from app.modules.users.model import User
    from app.modules.documents.model import Document
    from app.modules.scorm.model import ScormPackage


class Course(BaseModel):
    __tablename__ = "courses"

    assigned_expert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[CourseStatus] = mapped_column(
        String(50), default=CourseStatus.DRAFT, nullable=False
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    assigned_expert: Mapped["User"] = relationship(
        "User",
        foreign_keys=[assigned_expert_id],
        back_populates="expert_courses",
    )
    lessons: Mapped[list["Lesson"]] = relationship(
        "Lesson",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="Lesson.order_index",
    )


class Lesson(BaseModel):
    __tablename__ = "lessons"

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    assigned_teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    assigned_converter_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[LessonStatus] = mapped_column(
        String(50), default=LessonStatus.DRAFT, nullable=False
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    course: Mapped["Course"] = relationship("Course", back_populates="lessons")
    assigned_teacher: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[assigned_teacher_id],
        back_populates="teacher_lessons",
    )
    assigned_converter: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[assigned_converter_id],
        back_populates="converter_lessons",
    )
    sub_lessons: Mapped[list["SubLesson"]] = relationship(
        "SubLesson",
        back_populates="lesson",
        cascade="all, delete-orphan",
        order_by="SubLesson.order_index",
    )


class SubLesson(BaseModel):
    __tablename__ = "sub_lessons"

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[SubLessonStatus] = mapped_column(
        String(50), default=SubLessonStatus.DRAFT, nullable=False
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    lesson: Mapped["Lesson"] = relationship("Lesson", back_populates="sub_lessons")
    documents: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="sub_lesson",
        cascade="all, delete-orphan",
        order_by="Document.created_at",
    )
    scorm_packages: Mapped[list["ScormPackage"]] = relationship(
        "ScormPackage",
        back_populates="sub_lesson",
        cascade="all, delete-orphan",
        order_by="ScormPackage.created_at",
    )


class ReviewLog(Base):
    __tablename__ = "review_logs"
    __table_args__ = (
        Index("idx_review_logs_entity", "entity_type", "entity_id", "created_at"),
        Index("idx_review_logs_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    from_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    snapshot: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    actor: Mapped["User"] = relationship("User")
