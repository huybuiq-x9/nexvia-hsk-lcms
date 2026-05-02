from datetime import datetime
import uuid
from pydantic import BaseModel, ConfigDict


class UploaderInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str
    email: str


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
    created_at: datetime
    updated_at: datetime


class DocumentWithUploaderResponse(DocumentResponse):
    uploader: UploaderInfo


class DocumentListResponse(BaseModel):
    total: int
    items: list[DocumentWithUploaderResponse]


class DocumentUploadResponse(BaseModel):
    document: DocumentResponse
    download_url: str
