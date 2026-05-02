import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.modules.documents.model import Document
from app.modules.documents.schema import (
    DocumentResponse,
    DocumentListResponse,
    DocumentUploadResponse,
    DocumentWithUploaderResponse,
    UploaderInfo,
)
from app.modules.courses.model import SubLesson
from app.core.storage import storage_service
from app.core.exceptions import NotFoundError, ForbiddenError


MAX_FILE_SIZE = 200 * 1024 * 1024  # 200 MB
ALLOWED_EXTENSIONS = {".pptx", ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".ppt"}


def _to_document_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        sub_lesson_id=doc.sub_lesson_id,
        uploader_id=doc.uploader_id,
        original_name=doc.original_name,
        stored_name=doc.stored_name,
        file_extension=doc.file_extension,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


def _to_document_with_uploader(doc: Document) -> DocumentWithUploaderResponse:
    uploader = doc.uploader
    return DocumentWithUploaderResponse(
        id=doc.id,
        sub_lesson_id=doc.sub_lesson_id,
        uploader_id=doc.uploader_id,
        original_name=doc.original_name,
        stored_name=doc.stored_name,
        file_extension=doc.file_extension,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        uploader=UploaderInfo(
            id=uploader.id,
            full_name=uploader.full_name,
            email=uploader.email,
        ),
    )


async def _get_sublesson_orm(db: AsyncSession, sublesson_id: uuid.UUID) -> SubLesson:
    result = await db.execute(select(SubLesson).where(SubLesson.id == sublesson_id))
    sl = result.scalar_one_or_none()
    if not sl:
        raise NotFoundError("SubLesson", str(sublesson_id))
    return sl


async def get_document_orm(db: AsyncSession, document_id: uuid.UUID) -> Document:
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.uploader))
        .where(Document.id == document_id)
        .where(Document.deleted_at.is_(None))
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise NotFoundError("Document", str(document_id))
    return doc


async def list_documents(
    db: AsyncSession,
    sub_lesson_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
) -> DocumentListResponse:
    await _get_sublesson_orm(db, sub_lesson_id)

    query = (
        select(Document)
        .options(selectinload(Document.uploader))
        .where(Document.sub_lesson_id == sub_lesson_id)
        .where(Document.deleted_at.is_(None))
        .order_by(Document.created_at.desc())
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    docs = list(result.scalars().all())

    return DocumentListResponse(
        total=total,
        items=[_to_document_with_uploader(d) for d in docs],
    )


async def upload_document(
    db: AsyncSession,
    sub_lesson_id: uuid.UUID,
    uploader_id: uuid.UUID,
    file_content: bytes,
    original_filename: str,
    file_size: int,
) -> DocumentUploadResponse:
    if file_size > MAX_FILE_SIZE:
        raise ForbiddenError(f"File size exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)} MB")

    ext = original_filename.rsplit(".", 1)[-1].lower()
    if f".{ext}" not in ALLOWED_EXTENSIONS:
        raise ForbiddenError(
            f"File type '.{ext}' is not allowed. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    mime_type = storage_service.guess_mime_type(original_filename)

    stored_name, download_url = storage_service.upload_file(
        file_content=file_content,
        original_filename=original_filename,
        content_type=mime_type,
    )

    doc = Document(
        sub_lesson_id=sub_lesson_id,
        uploader_id=uploader_id,
        original_name=original_filename,
        stored_name=stored_name,
        file_extension=ext,
        file_size=file_size,
        mime_type=mime_type,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return DocumentUploadResponse(
        document=_to_document_response(doc),
        download_url=download_url,
    )


async def delete_document(
    db: AsyncSession,
    document_id: uuid.UUID,
) -> None:
    doc = await get_document_orm(db, document_id)
    storage_service.delete_file(doc.stored_name)
    doc.deleted_at = datetime.now(timezone.utc)
    await db.commit()


async def get_download_url(
    db: AsyncSession,
    document_id: uuid.UUID,
) -> str:
    doc = await get_document_orm(db, document_id)
    return storage_service.get_presigned_download_url(doc.stored_name)
