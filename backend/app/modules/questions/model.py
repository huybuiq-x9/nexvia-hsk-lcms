import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.base_model import BaseModel
from app.shared.enums import DifficultyLevel, QuestionCategory, QuestionStatus, QuestionType

if TYPE_CHECKING:
    from app.modules.courses.model import SubLesson
    from app.modules.users.model import User


class Question(BaseModel):
    __tablename__ = "questions"
    __table_args__ = (
        Index("idx_questions_sub_lesson", "sub_lesson_id"),
        Index("idx_questions_type", "question_type"),
        Index("idx_questions_status", "status"),
    )

    sub_lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sub_lessons.id", ondelete="CASCADE"),
        nullable=True,
    )
    question_type: Mapped[QuestionType] = mapped_column(String(20), nullable=False)
    difficulty: Mapped[DifficultyLevel] = mapped_column(
        String(10), default=DifficultyLevel.MEDIUM, nullable=False
    )
    stem: Mapped[dict] = mapped_column(JSONB, nullable=False)
    explanation: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[QuestionStatus] = mapped_column(
        String(20), default=QuestionStatus.DRAFT, nullable=False
    )
    category: Mapped[QuestionCategory] = mapped_column(
        String(20), default=QuestionCategory.VOCABULARY, nullable=False
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    sub_lesson: Mapped["SubLesson | None"] = relationship("SubLesson", back_populates="questions")
    choices: Mapped[list["QuestionChoice"]] = relationship(
        "QuestionChoice",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuestionChoice.order_index",
    )
    blanks: Mapped[list["QuestionBlank"]] = relationship(
        "QuestionBlank",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuestionBlank.blank_index",
    )


class QuestionChoice(BaseModel):
    __tablename__ = "question_choices"
    __table_args__ = (
        Index("idx_choices_question", "question_id"),
    )

    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
    )
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    correct_order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    group_name: Mapped[str | None] = mapped_column(String(20), nullable=True)
    match_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("question_choices.id", ondelete="SET NULL"),
        nullable=True,
    )

    question: Mapped["Question"] = relationship("Question", back_populates="choices")


class QuestionBlank(BaseModel):
    __tablename__ = "question_blanks"
    __table_args__ = (
        Index("idx_blanks_question", "question_id"),
    )

    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
    )
    blank_index: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    accepted_answers: Mapped[list] = mapped_column(ARRAY(Text), default=list, nullable=False)
    case_sensitive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    question: Mapped["Question"] = relationship("Question", back_populates="blanks")
