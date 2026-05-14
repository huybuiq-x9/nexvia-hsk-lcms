from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict

from app.shared.enums import ScormPackageStatus


class ScormPackageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sub_lesson_id: uuid.UUID
    uploader_id: uuid.UUID | None
    original_filename: str
    source_key: str | None
    extracted_prefix: str | None
    title: str | None
    manifest_identifier: str | None
    organization_identifier: str | None
    schema_name: str | None
    schema_version: str | None
    launch_path: str | None
    launch_parameters: str | None
    file_size: int
    files_count: int
    version: int
    is_current: bool
    status: ScormPackageStatus
    error_message: str | None
    task_id: str | None
    uploaded_at: datetime | None
    processed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ScormUploadResponse(BaseModel):
    package: ScormPackageResponse


class ScormPackageListResponse(BaseModel):
    total: int
    items: list[ScormPackageResponse]
