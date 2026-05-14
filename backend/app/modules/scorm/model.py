import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.base_model import BaseModel
from app.shared.enums import ScormPackageStatus

if TYPE_CHECKING:
    from app.modules.courses.model import SubLesson
    from app.modules.users.model import User


class ScormPackage(BaseModel):
    __tablename__ = "scorm_packages"

    sub_lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sub_lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uploader_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    source_key: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    extracted_prefix: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    manifest_identifier: Mapped[str | None] = mapped_column(String(500), nullable=True)
    organization_identifier: Mapped[str | None] = mapped_column(String(500), nullable=True)
    schema_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    schema_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    launch_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    launch_parameters: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    files_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        default=ScormPackageStatus.PROCESSING.value,
        nullable=False,
        index=True,
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    sub_lesson: Mapped["SubLesson"] = relationship(
        "SubLesson",
        back_populates="scorm_packages",
    )
    uploader: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[uploader_id],
    )
