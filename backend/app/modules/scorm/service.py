import os
import posixpath
import uuid
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote, unquote

from fastapi import UploadFile
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.exceptions import LCMSException, NotFoundError
from app.core.security import create_scorm_preview_token
from app.core.storage import storage_service
from app.modules.courses.model import SubLesson
from app.modules.scorm.model import ScormComment, ScormPackage
from app.modules.scorm.schema import (
    ScormCommentAuthorInfo,
    ScormCommentCreate,
    ScormCommentListResponse,
    ScormCommentResponse,
    ScormPackageListResponse,
    ScormPackageResponse,
    ScormPreviewSessionResponse,
    ScormUploadResponse,
)
from app.shared.enums import ReviewAction, ScormPackageStatus, SubLessonStatus


CHUNK_SIZE = 1024 * 1024
SCORM_PREVIEW_TOKEN_EXPIRE_SECONDS = 30 * 60


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
    resp = ScormPackageResponse.model_validate(package)
    # Only count if already eagerly loaded — avoid async lazy-load errors
    if "comments" in package.__dict__:
        return resp.model_copy(update={"comments_count": len(package.__dict__["comments"])})
    return resp


def preview_cookie_name(package_id: uuid.UUID) -> str:
    return f"scorm_preview_{package_id.hex}"


def _validate_zip_filename(filename: str | None) -> str:
    original_filename = filename or "package.zip"
    if not original_filename.lower().endswith(".zip"):
        raise LCMSException("Only .zip SCORM packages are allowed", status_code=400)
    return original_filename


def _ensure_ready_for_preview(package: ScormPackage) -> None:
    if package.status != ScormPackageStatus.READY.value:
        raise LCMSException("SCORM package is not ready for preview", status_code=400)
    if not package.extracted_prefix or not package.launch_path:
        raise LCMSException("SCORM package preview metadata is incomplete", status_code=400)


def _normalize_asset_path(asset_path: str) -> str:
    clean = unquote(asset_path).replace("\\", "/").strip()
    if not clean or clean.startswith("/"):
        raise LCMSException("Invalid SCORM asset path", status_code=400)
    normalized = posixpath.normpath(clean)
    if normalized in ("", ".", "..") or normalized.startswith("../"):
        raise LCMSException("Invalid SCORM asset path", status_code=400)
    return normalized


def _asset_key(package: ScormPackage, asset_path: str) -> str:
    normalized_path = _normalize_asset_path(asset_path)
    prefix = (package.extracted_prefix or "").rstrip("/")
    if not prefix:
        raise LCMSException("SCORM package extracted files are not available", status_code=400)
    return f"{prefix}/{normalized_path}"


def _launch_url(package: ScormPackage) -> str:
    launch_path = quote(package.launch_path or "", safe="/")
    launch_url = f"/api/v1/scorm/packages/{package.id}/assets/{launch_path}"
    launch_parameters = (package.launch_parameters or "").strip()
    if launch_parameters:
        if launch_parameters.startswith("?"):
            launch_url = f"{launch_url}{launch_parameters}"
        else:
            launch_url = f"{launch_url}?{launch_parameters}"
    return launch_url


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
    from app.modules.courses.service import add_review_log

    sublesson = await _get_sublesson_orm(db, sub_lesson_id)
    existing_result = await db.execute(
        select(ScormPackage.id)
        .where(ScormPackage.sub_lesson_id == sub_lesson_id)
        .where(ScormPackage.deleted_at.is_(None))
        .limit(1)
    )
    if existing_result.scalar_one_or_none() is not None:
        raise LCMSException(
            "SCORM package already exists for this SubLesson. Use reupload to create a new version.",
            status_code=409,
        )

    result = await _create_package_version(
        db=db,
        sub_lesson_id=sub_lesson_id,
        uploader_id=uploader_id,
        file=file,
    )
    add_review_log(
        db,
        actor_id=uploader_id,
        sublesson=sublesson,
        action=ReviewAction.UPLOAD_SCORM,
        from_status=sublesson.status,
        to_status=sublesson.status,
    )
    await db.commit()
    return result


async def reupload_package(
    db: AsyncSession,
    package_id: uuid.UUID,
    uploader_id: uuid.UUID,
    file: UploadFile,
) -> ScormUploadResponse:
    from app.modules.courses.service import add_review_log

    current_package = await _get_package_orm(db, package_id)
    if not current_package.is_current:
        raise LCMSException("Only the current SCORM package can be re-uploaded", status_code=400)

    sublesson = await _get_sublesson_orm(db, current_package.sub_lesson_id)
    result = await _create_package_version(
        db=db,
        sub_lesson_id=current_package.sub_lesson_id,
        uploader_id=uploader_id,
        file=file,
    )
    add_review_log(
        db,
        actor_id=uploader_id,
        sublesson=sublesson,
        action=ReviewAction.REUPLOAD_SCORM,
        from_status=sublesson.status,
        to_status=sublesson.status,
    )
    await db.commit()
    return result


async def _create_package_version(
    db: AsyncSession,
    sub_lesson_id: uuid.UUID,
    uploader_id: uuid.UUID,
    file: UploadFile,
) -> ScormUploadResponse:
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
        async_result = await run_in_threadpool(
            process_scorm_package_task.apply_async,
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
        .options(selectinload(ScormPackage.comments))
        .where(ScormPackage.sub_lesson_id == sub_lesson_id)
        .where(ScormPackage.deleted_at.is_(None))
        .order_by(ScormPackage.created_at.desc())
    )
    count_q = select(func.count()).select_from(
        select(ScormPackage)
        .where(ScormPackage.sub_lesson_id == sub_lesson_id)
        .where(ScormPackage.deleted_at.is_(None))
        .subquery()
    )
    total = (await db.execute(count_q)).scalar() or 0
    result = await db.execute(query.offset(skip).limit(limit))
    packages = list(result.scalars().all())
    return ScormPackageListResponse(
        total=total,
        items=[_to_response(package) for package in packages],
    )


async def create_preview_session(
    db: AsyncSession,
    package_id: uuid.UUID,
) -> tuple[ScormPreviewSessionResponse, str]:
    package = await _get_package_orm(db, package_id)
    _ensure_ready_for_preview(package)

    token = create_scorm_preview_token(
        str(package.id),
        expires_delta=timedelta(seconds=SCORM_PREVIEW_TOKEN_EXPIRE_SECONDS),
    )
    return (
        ScormPreviewSessionResponse(
            launch_url=_launch_url(package),
            expires_in=SCORM_PREVIEW_TOKEN_EXPIRE_SECONDS,
        ),
        token,
    )


async def get_asset_object(
    db: AsyncSession,
    package_id: uuid.UUID,
    asset_path: str,
) -> dict:
    package = await _get_package_orm(db, package_id)
    _ensure_ready_for_preview(package)
    key = _asset_key(package, asset_path)
    obj = await run_in_threadpool(storage_service.get_object, key)
    if not obj.get("ContentType"):
        obj["ContentType"] = storage_service.guess_mime_type(asset_path)
    return obj


def _to_comment_response(comment: ScormComment) -> ScormCommentResponse:
    return ScormCommentResponse(
        id=comment.id,
        scorm_package_id=comment.scorm_package_id,
        author_id=comment.author_id,
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        author=ScormCommentAuthorInfo(
            id=comment.author.id,
            full_name=comment.author.full_name,
        ) if hasattr(comment, "author") and comment.author else ScormCommentAuthorInfo(
            id=comment.author_id,
            full_name="",
        ),
    )


async def add_comment(
    db: AsyncSession,
    package_id: uuid.UUID,
    author_id: uuid.UUID,
    data: ScormCommentCreate,
) -> ScormCommentResponse:
    await _get_package_orm(db, package_id)

    comment = ScormComment(
        scorm_package_id=package_id,
        author_id=author_id,
        content=data.content,
    )
    db.add(comment)
    await db.commit()

    result = await db.execute(
        select(ScormComment)
        .options(selectinload(ScormComment.author))
        .where(ScormComment.id == comment.id)
    )
    comment = result.scalar_one()
    return _to_comment_response(comment)


async def list_comments(
    db: AsyncSession,
    package_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
) -> ScormCommentListResponse:
    await _get_package_orm(db, package_id)

    query = (
        select(ScormComment)
        .options(selectinload(ScormComment.author))
        .where(ScormComment.scorm_package_id == package_id)
        .order_by(ScormComment.created_at.asc())
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    result = await db.execute(query.offset(skip).limit(limit))
    comments = list(result.scalars().all())

    return ScormCommentListResponse(
        total=total,
        items=[_to_comment_response(c) for c in comments],
    )
