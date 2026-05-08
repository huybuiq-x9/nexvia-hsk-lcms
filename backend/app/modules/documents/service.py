import uuid
from datetime import datetime, timezone
from fastapi import UploadFile
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.modules.documents.model import Document, DocumentComment
from app.modules.documents.schema import (
    DocumentResponse,
    DocumentListResponse,
    DocumentUploadResponse,
    DocumentWithUploaderResponse,
    DocumentCommentResponse,
    DocumentCommentCreate,
    DocumentCommentListResponse,
    UploaderInfo,
    CommentAuthorInfo,
)
from app.modules.courses.model import SubLesson
from app.modules.courses.service import add_review_log
from app.shared.enums import ReviewAction, SubLessonStatus
from app.core.storage import storage_service
from app.core.exceptions import NotFoundError, ForbiddenError


MAX_FILE_SIZE = 200 * 1024 * 1024  # 200 MB
ALLOWED_EXTENSIONS = {".pptx", ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".ppt"}


async def _get_sublesson_orm(db: AsyncSession, sublesson_id: uuid.UUID) -> SubLesson:
    result = await db.execute(select(SubLesson).where(SubLesson.id == sublesson_id))
    sl = result.scalar_one_or_none()
    if not sl:
        raise NotFoundError("SubLesson", str(sublesson_id))
    return sl


async def _get_document_orm(db: AsyncSession, document_id: uuid.UUID) -> Document:
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
        version_group_id=doc.version_group_id,
        version=doc.version,
        is_current=doc.is_current,
        review_round=doc.review_round,
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
        version_group_id=doc.version_group_id,
        version=doc.version,
        is_current=doc.is_current,
        review_round=doc.review_round,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        uploader=UploaderInfo(
            id=uploader.id,
            full_name=uploader.full_name,
            email=uploader.email,
        ),
        comments_count=len(doc.comments) if hasattr(doc, "comments") and doc.comments else 0,
    )


def _to_comment_response(comment: DocumentComment) -> DocumentCommentResponse:
    return DocumentCommentResponse(
        id=comment.id,
        document_id=comment.document_id,
        author_id=comment.author_id,
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        author=CommentAuthorInfo(
            id=comment.author.id,
            full_name=comment.author.full_name,
        ) if hasattr(comment, "author") and comment.author else CommentAuthorInfo(
            id=comment.author_id,
            full_name="",
        ),
    )


def _validate_document_file(file: UploadFile, content: bytes) -> tuple[str, str]:
    ext = (file.filename or "unknown").rsplit(".", 1)[-1].lower()

    if len(content) > MAX_FILE_SIZE:
        raise ForbiddenError(
            f"File '{file.filename}' exceeds maximum size of {MAX_FILE_SIZE // (1024*1024)} MB"
        )
    if f".{ext}" not in ALLOWED_EXTENSIONS:
        raise ForbiddenError(
            f"File type '.{ext}' is not allowed. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    return ext, storage_service.guess_mime_type(file.filename or "unknown")


async def list_documents(
    db: AsyncSession,
    sub_lesson_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
) -> DocumentListResponse:
    await _get_sublesson_orm(db, sub_lesson_id)

    query = (
        select(Document)
        .options(selectinload(Document.uploader), selectinload(Document.comments))
        .where(Document.sub_lesson_id == sub_lesson_id)
        .where(Document.deleted_at.is_(None))
        .where(Document.is_current.is_(True))
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


async def upload_documents(
    db: AsyncSession,
    sub_lesson_id: uuid.UUID,
    uploader_id: uuid.UUID,
    files: list[UploadFile],
) -> DocumentUploadResponse:
    if not files:
        raise ForbiddenError("No files provided")

    sublesson = await _get_sublesson_orm(db, sub_lesson_id)
    if sublesson.status not in (SubLessonStatus.DRAFT, SubLessonStatus.IN_PROGRESS):
        raise ForbiddenError(
            f"Cannot upload documents: sublesson status is '{getattr(sublesson.status, 'value', sublesson.status)}'. "
            "Documents can only be uploaded when the sublesson is in DRAFT or IN_PROGRESS status."
        )
    initial_status = sublesson.status
    if sublesson.status == SubLessonStatus.DRAFT:
        sublesson.status = SubLessonStatus.IN_PROGRESS

    results = []
    for file in files:
        content = await file.read()
        ext, mime_type = _validate_document_file(file, content)
        stored_name, download_url = storage_service.upload_file(
            file_content=content,
            original_filename=file.filename or "unknown",
            content_type=mime_type,
            sub_lesson_id=str(sub_lesson_id),
        )

        existing_result = await db.execute(
            select(Document)
            .where(Document.sub_lesson_id == sub_lesson_id)
            .where(Document.original_name == (file.filename or "unknown"))
            .where(Document.deleted_at.is_(None))
            .order_by(Document.version.desc())
        )
        existing_versions = list(existing_result.scalars().all())
        previous_version = existing_versions[0] if existing_versions else None
        version_group_id = (
            previous_version.version_group_id
            if previous_version and previous_version.version_group_id
            else uuid.uuid4()
        )
        next_version = (previous_version.version + 1) if previous_version else 1
        review_round = (previous_version.review_round + 1) if previous_version else 1

        if existing_versions:
            for existing in existing_versions:
                existing.is_current = False

        doc = Document(
            sub_lesson_id=sub_lesson_id,
            uploader_id=uploader_id,
            original_name=file.filename or "unknown",
            stored_name=stored_name,
            file_extension=ext,
            file_size=len(content),
            mime_type=mime_type,
            version_group_id=version_group_id,
            version=next_version,
            is_current=True,
            review_round=review_round,
        )
        db.add(doc)
        add_review_log(
            db,
            actor_id=uploader_id,
            sublesson=sublesson,
            action=ReviewAction.REUPLOAD_DOCUMENT if previous_version else ReviewAction.UPLOAD_DOCUMENT,
            from_status=initial_status if not results else sublesson.status,
            to_status=sublesson.status,
            comment=f"{doc.original_name} v{doc.version}",
        )
        results.append((doc, download_url))

    await db.commit()
    for doc, _ in results:
        await db.refresh(doc)

    return DocumentUploadResponse(
        documents=[_to_document_response(doc) for doc, _ in results],
        download_urls=[url for _, url in results],
    )


async def reupload_document(
    db: AsyncSession,
    document_id: uuid.UUID,
    uploader_id: uuid.UUID,
    file: UploadFile,
) -> DocumentResponse:
    current_doc = await _get_document_orm(db, document_id)
    sublesson = await _get_sublesson_orm(db, current_doc.sub_lesson_id)
    if sublesson.status not in (SubLessonStatus.DRAFT, SubLessonStatus.IN_PROGRESS):
        raise ForbiddenError(
            f"Cannot re-upload document: sublesson status is '{getattr(sublesson.status, 'value', sublesson.status)}'. "
            "Documents can only be re-uploaded when the sublesson is in DRAFT or IN_PROGRESS status."
        )
    from_status = sublesson.status
    if sublesson.status == SubLessonStatus.DRAFT:
        sublesson.status = SubLessonStatus.IN_PROGRESS

    content = await file.read()
    ext, mime_type = _validate_document_file(file, content)
    if ext != current_doc.file_extension:
        raise ForbiddenError(
            f"Replacement file must be '.{current_doc.file_extension}' to match the current document."
        )

    stored_name, _ = storage_service.upload_file(
        file_content=content,
        original_filename=current_doc.original_name,
        content_type=mime_type,
        sub_lesson_id=str(current_doc.sub_lesson_id),
    )

    existing_result = await db.execute(
        select(Document)
        .where(Document.version_group_id == current_doc.version_group_id)
        .where(Document.deleted_at.is_(None))
        .order_by(Document.version.desc())
    )
    existing_versions = list(existing_result.scalars().all())
    previous_version = existing_versions[0] if existing_versions else current_doc

    for existing in existing_versions:
        existing.is_current = False

    doc = Document(
        sub_lesson_id=current_doc.sub_lesson_id,
        uploader_id=uploader_id,
        original_name=current_doc.original_name,
        stored_name=stored_name,
        file_extension=current_doc.file_extension,
        file_size=len(content),
        mime_type=mime_type,
        version_group_id=current_doc.version_group_id,
        version=previous_version.version + 1,
        is_current=True,
        review_round=previous_version.review_round + 1,
    )
    db.add(doc)
    add_review_log(
        db,
        actor_id=uploader_id,
        sublesson=sublesson,
        action=ReviewAction.REUPLOAD_DOCUMENT,
        from_status=from_status,
        to_status=sublesson.status,
        comment=f"{doc.original_name} v{doc.version}",
    )
    await db.commit()
    await db.refresh(doc)
    return _to_document_response(doc)


async def delete_document(
    db: AsyncSession,
    document_id: uuid.UUID,
) -> None:
    doc = await _get_document_orm(db, document_id)
    storage_service.delete_file(doc.stored_name)
    doc.deleted_at = datetime.now(timezone.utc)
    await db.commit()


async def get_download_url(
    db: AsyncSession,
    document_id: uuid.UUID,
) -> str:
    doc = await _get_document_orm(db, document_id)
    return storage_service.get_presigned_download_url(doc.stored_name)


async def add_comment(
    db: AsyncSession,
    document_id: uuid.UUID,
    author_id: uuid.UUID,
    data: DocumentCommentCreate,
) -> DocumentCommentResponse:
    await _get_document_orm(db, document_id)

    comment = DocumentComment(
        document_id=document_id,
        author_id=author_id,
        content=data.content,
    )
    db.add(comment)
    await db.commit()

    result = await db.execute(
        select(DocumentComment)
        .options(selectinload(DocumentComment.author))
        .where(DocumentComment.id == comment.id)
    )
    comment = result.scalar_one()
    return _to_comment_response(comment)


async def list_comments(
    db: AsyncSession,
    document_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
) -> DocumentCommentListResponse:
    await _get_document_orm(db, document_id)

    query = (
        select(DocumentComment)
        .options(selectinload(DocumentComment.author))
        .where(DocumentComment.document_id == document_id)
        .order_by(DocumentComment.created_at.asc())
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    comments = list(result.scalars().all())

    return DocumentCommentListResponse(
        total=total,
        items=[_to_comment_response(c) for c in comments],
    )
