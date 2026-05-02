import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.shared.base_model import BaseModel
from app.shared.enums import CourseStatus, LessonStatus, SubLessonStatus

if TYPE_CHECKING:
    from app.modules.users.model import User
    from app.modules.documents.model import Document


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
