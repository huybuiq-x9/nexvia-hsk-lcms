from datetime import datetime
import uuid
from typing import Annotated
from pydantic import BaseModel, Field, ConfigDict


class UploaderInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str
    email: str


class CommentAuthorInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str


class DocumentCommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    document_id: uuid.UUID
    author_id: uuid.UUID
    content: str
    created_at: datetime
    updated_at: datetime
    author: CommentAuthorInfo


class DocumentCommentCreate(BaseModel):
    content: Annotated[str, Field(min_length=1, max_length=2000)]


class DocumentCommentListResponse(BaseModel):
    total: int
    items: list[DocumentCommentResponse]


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    sub_lesson_id: uuid.UUID
    uploader_id: uuid.UUID
    original_name: str
    stored_name: str
    file_extension: str
    file_size: int
    mime_type: str
    version_group_id: uuid.UUID
    version: int
    is_current: bool
    review_round: int
    created_at: datetime
    updated_at: datetime


class DocumentWithUploaderResponse(DocumentResponse):
    uploader: UploaderInfo
    comments_count: int = 0


class DocumentListResponse(BaseModel):
    total: int
    items: list[DocumentWithUploaderResponse]


class DocumentUploadResponse(BaseModel):
    documents: list[DocumentResponse]
    download_urls: list[str]
