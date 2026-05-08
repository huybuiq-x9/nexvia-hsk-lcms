import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import (
    DocumentCommentAccessToDocument,
    DocumentDeleteAccessToDocument,
    DocumentUploadAccessToDocument,
    DocumentUploadAccessToSubLesson,
    DocumentViewAccessToDocument,
    DocumentViewAccessToSubLesson,
    get_db,
)
from app.modules.documents import service
from app.modules.documents.schema import (
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
)

router = APIRouter()


@router.get(
    "/sub-lessons/{sublesson_id}/documents",
    response_model=DocumentListResponse,
)
async def list_documents(
    sublesson_id: uuid.UUID,
    current_user: DocumentViewAccessToSubLesson,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> DocumentListResponse:
    return await service.list_documents(db, sublesson_id, skip, limit)


@router.post(
    "/sub-lessons/{sublesson_id}/documents",
    response_model=DocumentUploadResponse,
    status_code=201,
)
async def upload_documents(
    sublesson_id: uuid.UUID,
    current_user: DocumentUploadAccessToSubLesson,
    db: Annotated[AsyncSession, Depends(get_db)],
    files: list[UploadFile] = File(...),
) -> DocumentUploadResponse:
    return await service.upload_documents(
        db=db,
        sub_lesson_id=sublesson_id,
        uploader_id=current_user.id,
        files=files,
    )


@router.post(
    "/{document_id}/reupload",
    response_model=DocumentResponse,
    status_code=201,
)
async def reupload_document(
    document_id: uuid.UUID,
    current_user: DocumentUploadAccessToDocument,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
) -> DocumentResponse:
    return await service.reupload_document(
        db=db,
        document_id=document_id,
        uploader_id=current_user.id,
        file=file,
    )


@router.get("/{document_id}/download")
async def get_download_url(
    document_id: uuid.UUID,
    current_user: DocumentViewAccessToDocument,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    url = await service.get_download_url(db, document_id)
    return {"url": url}


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: uuid.UUID,
    current_user: DocumentDeleteAccessToDocument,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await service.delete_document(db, document_id)


@router.get("/{document_id}/comments", response_model=service.DocumentCommentListResponse)
async def list_document_comments(
    document_id: uuid.UUID,
    current_user: DocumentCommentAccessToDocument,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> service.DocumentCommentListResponse:
    return await service.list_comments(db, document_id, skip, limit)


@router.post(
    "/{document_id}/comments",
    response_model=service.DocumentCommentResponse,
    status_code=201,
)
async def add_document_comment(
    document_id: uuid.UUID,
    data: service.DocumentCommentCreate,
    current_user: DocumentCommentAccessToDocument,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> service.DocumentCommentResponse:
    return await service.add_comment(db, document_id, current_user.id, data)
