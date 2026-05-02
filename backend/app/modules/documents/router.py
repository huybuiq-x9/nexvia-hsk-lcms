import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, TeacherAssignedToSubLesson, TeacherAssignedToDocument
from app.modules.documents import service
from app.modules.documents.schema import (
    DocumentListResponse,
    DocumentUploadResponse,
    DocumentWithUploaderResponse,
)

router = APIRouter()


@router.get(
    "/sub-lessons/{sublesson_id}/documents",
    response_model=DocumentListResponse,
)
async def list_documents(
    sublesson_id: uuid.UUID,
    current_user: TeacherAssignedToSubLesson,
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
async def upload_document(
    sublesson_id: uuid.UUID,
    current_user: TeacherAssignedToSubLesson,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
) -> DocumentUploadResponse:
    content = await file.read()
    return await service.upload_document(
        db=db,
        sub_lesson_id=sublesson_id,
        uploader_id=current_user.id,
        file_content=content,
        original_filename=file.filename or "unknown",
        file_size=len(content),
    )


@router.get("/{document_id}/download")
async def get_download_url(
    document_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    url = await service.get_download_url(db, document_id)
    return {"url": url}


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: uuid.UUID,
    current_user: TeacherAssignedToDocument,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await service.delete_document(db, document_id)
