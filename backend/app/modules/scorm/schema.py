from datetime import datetime
import uuid
from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field


class ScormPackageInfo(BaseModel):
    sub_lesson_id: uuid.UUID
    title: str
    schema: str
    schema_version: str
    sco_launch: str
    launch_url: str | None = None
    filename: str
    stored_name: str
    file_size: int | None = None
    uploaded_at: datetime | None = None
    uploaded_by_id: uuid.UUID | None = None
    files_count: int
    comments_count: int = 0


class ScormFileListResponse(BaseModel):
    files: list[str]


class ScormCommentAuthorInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str


class ScormCommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    sub_lesson_id: uuid.UUID
    author_id: uuid.UUID
    content: str
    created_at: datetime
    updated_at: datetime
    author: ScormCommentAuthorInfo


class ScormCommentCreate(BaseModel):
    content: Annotated[str, Field(min_length=1, max_length=2000)]


class ScormCommentListResponse(BaseModel):
    total: int
    items: list[ScormCommentResponse]
