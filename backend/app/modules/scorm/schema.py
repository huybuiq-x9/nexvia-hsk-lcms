from datetime import datetime
import uuid
from pydantic import BaseModel


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


class ScormFileListResponse(BaseModel):
    files: list[str]
