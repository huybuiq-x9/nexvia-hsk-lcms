import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import (
    ScormCommentAccessToSubLesson,
    ScormUploadAccessToSubLesson,
    ScormViewAccessToSubLesson,
    scorm_view_access_to_sublesson,
    get_db,
)
from app.core.security import decode_access_token
from app.modules.scorm.schema import ScormFileListResponse, ScormPackageInfo
from app.modules.scorm import schema as scorm_schema
from app.modules.scorm.service import scorm_service
from app.modules.users.model import User

router = APIRouter()


async def _user_from_access_token(
    token: str,
    db: AsyncSession,
) -> User:
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = await db.execute(
        select(User).options(selectinload(User.roles)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user or user.deleted_at is not None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is inactive")
    return user


@router.post(
    "/sub-lessons/{sublesson_id}/package",
    response_model=ScormPackageInfo,
    status_code=201,
)
async def upload_scorm_package(
    sublesson_id: uuid.UUID,
    current_user: ScormUploadAccessToSubLesson,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
) -> ScormPackageInfo:
    return await scorm_service.upload_package(db, sublesson_id, current_user.id, file)


@router.get("/preview/{sublesson_id}", response_model=ScormPackageInfo)
async def get_scorm_preview(
    sublesson_id: uuid.UUID,
    current_user: ScormViewAccessToSubLesson,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ScormPackageInfo:
    return await scorm_service.get_package_info(db, sublesson_id)


@router.get("/preview/{sublesson_id}/files", response_model=ScormFileListResponse)
async def list_scorm_files(
    sublesson_id: uuid.UUID,
    current_user: ScormViewAccessToSubLesson,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ScormFileListResponse:
    return await scorm_service.get_file_list(db, sublesson_id)


@router.get(
    "/sub-lessons/{sublesson_id}/comments",
    response_model=scorm_schema.ScormCommentListResponse,
)
async def list_scorm_comments(
    sublesson_id: uuid.UUID,
    current_user: ScormViewAccessToSubLesson,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> scorm_schema.ScormCommentListResponse:
    return await scorm_service.list_comments(db, sublesson_id, skip, limit)


@router.post(
    "/sub-lessons/{sublesson_id}/comments",
    response_model=scorm_schema.ScormCommentResponse,
    status_code=201,
)
async def add_scorm_comment(
    sublesson_id: uuid.UUID,
    data: scorm_schema.ScormCommentCreate,
    current_user: ScormCommentAccessToSubLesson,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> scorm_schema.ScormCommentResponse:
    return await scorm_service.add_comment(db, sublesson_id, current_user.id, data)


@router.get("/preview/{sublesson_id}/file")
async def get_scorm_file(
    sublesson_id: uuid.UUID,
    request: Request,
    current_user: ScormViewAccessToSubLesson,
    db: Annotated[AsyncSession, Depends(get_db)],
    path: str = Query(..., description="File path within the SCORM package"),
) -> Response:
    root_url = str(request.base_url).rstrip("/")
    asset_base_url = f"{root_url}/api/v1/scorm/preview/{sublesson_id}/file"
    content, content_type = await scorm_service.get_file_content(
        db,
        sublesson_id,
        path,
        asset_base_url,
    )
    return Response(
        content=content,
        media_type=content_type,
        headers={"Access-Control-Allow-Origin": "*"},
    )


@router.get("/preview/{sublesson_id}/asset/{access_token}/{file_path:path}")
async def get_scorm_asset(
    sublesson_id: uuid.UUID,
    access_token: str,
    file_path: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    current_user = await _user_from_access_token(access_token, db)
    await scorm_view_access_to_sublesson(sublesson_id, current_user, db)

    root_url = str(request.base_url).rstrip("/")
    asset_base_url = f"{root_url}/api/v1/scorm/preview/{sublesson_id}/asset/{access_token}"
    content, content_type = await scorm_service.get_file_content(
        db,
        sublesson_id,
        file_path,
        asset_base_url,
    )
    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
        },
    )
