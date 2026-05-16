import uuid
from datetime import datetime
from typing import Annotated, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator

from app.shared.enums import ContentMediaType, DifficultyLevel, QuestionStatus, QuestionType


# ─── ContentBlock ─────────────────────────────────────────────────────────────

class ContentBlock(BaseModel):
    type: ContentMediaType
    text: str | None = None
    media_key: str | None = None
    media_url: str | None = None          # resolved at response time, not stored
    original_filename: str | None = None

    @field_validator("text")
    @classmethod
    def text_required_for_text_types(cls, v, info):
        t = info.data.get("type")
        if t in (ContentMediaType.TEXT, ContentMediaType.TEXT_IMAGE, ContentMediaType.TEXT_AUDIO) and not v:
            raise ValueError(f"text is required when type is '{t}'")
        return v

    @field_validator("media_key")
    @classmethod
    def media_key_required_for_media_types(cls, v, info):
        t = info.data.get("type")
        if t in (ContentMediaType.IMAGE, ContentMediaType.AUDIO,
                 ContentMediaType.TEXT_IMAGE, ContentMediaType.TEXT_AUDIO) and not v:
            # allow None on create — key is filled after upload
            pass
        return v


# ─── Choice schemas ───────────────────────────────────────────────────────────

class QuestionChoiceCreate(BaseModel):
    content: ContentBlock
    is_correct: bool | None = None
    order_index: int = 0
    correct_order: int | None = None
    group_name: str | None = None
    match_id: uuid.UUID | None = None


class QuestionChoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    content: Any          # ContentBlock as dict from DB
    is_correct: bool | None
    order_index: int
    correct_order: int | None
    group_name: str | None
    match_id: uuid.UUID | None


# ─── Blank schemas ────────────────────────────────────────────────────────────

class QuestionBlankCreate(BaseModel):
    blank_index: Annotated[int, Field(ge=1)]
    accepted_answers: list[str] = Field(default_factory=list)
    case_sensitive: bool = False


class QuestionBlankResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    blank_index: int
    accepted_answers: list[str]
    case_sensitive: bool


# ─── Question create / update ─────────────────────────────────────────────────

class QuestionCreate(BaseModel):
    sub_lesson_id: uuid.UUID | None = None
    question_type: QuestionType
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    tags: list[str] = Field(default_factory=list)
    stem: ContentBlock
    explanation: ContentBlock | None = None
    order_index: int = 0
    choices: list[QuestionChoiceCreate] = Field(default_factory=list)
    blanks: list[QuestionBlankCreate] = Field(default_factory=list)


class QuestionUpdate(BaseModel):
    difficulty: DifficultyLevel | None = None
    tags: list[str] | None = None
    stem: ContentBlock | None = None
    explanation: ContentBlock | None = None
    order_index: int | None = None
    choices: list[QuestionChoiceCreate] | None = None
    blanks: list[QuestionBlankCreate] | None = None


# ─── Question response ────────────────────────────────────────────────────────

class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    sub_lesson_id: uuid.UUID | None
    question_type: QuestionType
    difficulty: DifficultyLevel
    tags: list[str]
    stem: Any
    explanation: Any | None
    status: QuestionStatus
    order_index: int
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    choices: list[QuestionChoiceResponse] = []
    blanks: list[QuestionBlankResponse] = []


class QuestionListResponse(BaseModel):
    total: int
    items: list[QuestionResponse]


# ─── Media upload ─────────────────────────────────────────────────────────────

class MediaUploadResponse(BaseModel):
    media_key: str
    media_url: str
    original_filename: str


# ─── Review ───────────────────────────────────────────────────────────────────

class QuestionReviewRequest(BaseModel):
    comment: str | None = None
