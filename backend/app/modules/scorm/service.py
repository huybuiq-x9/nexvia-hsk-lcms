import os
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import LCMSException, NotFoundError
from app.modules.courses.model import SubLesson
from app.modules.scorm.model import ScormPackage
from app.modules.scorm.schema import (
    ScormPackageListResponse,
    ScormPackageResponse,
    ScormUploadResponse,
)
from app.shared.enums import ScormPackageStatus


CHUNK_SIZE = 1024 * 1024


async def _get_sublesson_orm(db: AsyncSession, sublesson_id: uuid.UUID) -> SubLesson:
    result = await db.execute(select(SubLesson).where(SubLesson.id == sublesson_id))
    sublesson = result.scalar_one_or_none()
    if not sublesson:
        raise NotFoundError("SubLesson", str(sublesson_id))
    return sublesson


async def _get_package_orm(db: AsyncSession, package_id: uuid.UUID) -> ScormPackage:
    result = await db.execute(
        select(ScormPackage)
        .where(ScormPackage.id == package_id)
        .where(ScormPackage.deleted_at.is_(None))
    )
    package = result.scalar_one_or_none()
    if not package:
        raise NotFoundError("SCORM package", str(package_id))
    return package


def _to_response(package: ScormPackage) -> ScormPackageResponse:
    return ScormPackageResponse.model_validate(package)


def _validate_zip_filename(filename: str | None) -> str:
    original_filename = filename or "package.zip"
    if not original_filename.lower().endswith(".zip"):
        raise LCMSException("Only .zip SCORM packages are allowed", status_code=400)
    return original_filename


async def _write_upload_to_staging(file: UploadFile, package_id: uuid.UUID) -> tuple[str, int]:
    staging_dir = Path(settings.SCORM_UPLOAD_TMP_DIR)
    staging_dir.mkdir(parents=True, exist_ok=True)
    staging_path = staging_dir / f"{package_id}.zip"

    total_size = 0
    try:
        with open(staging_path, "wb") as out:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > settings.SCORM_MAX_ZIP_SIZE:
                    raise LCMSException(
                        f"SCORM package exceeds maximum size of {settings.SCORM_MAX_ZIP_SIZE // (1024 * 1024)} MB",
                        status_code=400,
                    )
                out.write(chunk)
    except Exception:
        if staging_path.exists():
            staging_path.unlink()
        raise

    if total_size == 0:
        staging_path.unlink(missing_ok=True)
        raise LCMSException("SCORM package is empty", status_code=400)
    if not zipfile.is_zipfile(staging_path):
        staging_path.unlink(missing_ok=True)
        raise LCMSException("Uploaded file is not a valid ZIP archive", status_code=400)

    return str(staging_path), total_size


async def upload_package(
    db: AsyncSession,
    sub_lesson_id: uuid.UUID,
    uploader_id: uuid.UUID,
    file: UploadFile,
) -> ScormUploadResponse:
    await _get_sublesson_orm(db, sub_lesson_id)
    original_filename = _validate_zip_filename(file.filename)
    package_id = uuid.uuid4()
    staging_path, file_size = await _write_upload_to_staging(file, package_id)

    max_version_result = await db.execute(
        select(func.max(ScormPackage.version))
        .where(ScormPackage.sub_lesson_id == sub_lesson_id)
        .where(ScormPackage.deleted_at.is_(None))
    )
    next_version = (max_version_result.scalar() or 0) + 1

    await db.execute(
        update(ScormPackage)
        .where(ScormPackage.sub_lesson_id == sub_lesson_id)
        .where(ScormPackage.deleted_at.is_(None))
        .where(ScormPackage.is_current.is_(True))
        .values(is_current=False)
    )

    package = ScormPackage(
        id=package_id,
        sub_lesson_id=sub_lesson_id,
        uploader_id=uploader_id,
        original_filename=original_filename,
        file_size=file_size,
        version=next_version,
        is_current=True,
        status=ScormPackageStatus.PROCESSING.value,
        uploaded_at=datetime.now(timezone.utc),
        created_by=uploader_id,
        updated_by=uploader_id,
    )
    db.add(package)
    await db.commit()
    await db.refresh(package)

    from app.modules.scorm.tasks import process_scorm_package_task

    try:
        async_result = process_scorm_package_task.apply_async(
            args=[str(package.id), staging_path],
            queue="scorm",
        )
    except Exception:
        if os.path.exists(staging_path):
            os.unlink(staging_path)
        package.status = ScormPackageStatus.FAILED.value
        package.error_message = "Failed to enqueue SCORM processing task"
        await db.commit()
        raise LCMSException("Failed to enqueue SCORM processing task", status_code=500)

    package.task_id = async_result.id
    await db.commit()
    await db.refresh(package)
    return ScormUploadResponse(package=_to_response(package))


async def get_package(
    db: AsyncSession,
    package_id: uuid.UUID,
) -> ScormPackageResponse:
    package = await _get_package_orm(db, package_id)
    return _to_response(package)


async def get_current_package(
    db: AsyncSession,
    sub_lesson_id: uuid.UUID,
) -> ScormPackageResponse | None:
    await _get_sublesson_orm(db, sub_lesson_id)
    result = await db.execute(
        select(ScormPackage)
        .where(ScormPackage.sub_lesson_id == sub_lesson_id)
        .where(ScormPackage.deleted_at.is_(None))
        .where(ScormPackage.is_current.is_(True))
        .order_by(ScormPackage.created_at.desc())
        .limit(1)
    )
    package = result.scalar_one_or_none()
    return _to_response(package) if package else None


async def list_packages(
    db: AsyncSession,
    sub_lesson_id: uuid.UUID,
    skip: int = 0,
    limit: int = 20,
) -> ScormPackageListResponse:
    await _get_sublesson_orm(db, sub_lesson_id)
    query = (
        select(ScormPackage)
        .where(ScormPackage.sub_lesson_id == sub_lesson_id)
        .where(ScormPackage.deleted_at.is_(None))
        .order_by(ScormPackage.created_at.desc())
    )
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0
    result = await db.execute(query.offset(skip).limit(limit))
    packages = list(result.scalars().all())
    return ScormPackageListResponse(
        total=total,
        items=[_to_response(package) for package in packages],
    )
