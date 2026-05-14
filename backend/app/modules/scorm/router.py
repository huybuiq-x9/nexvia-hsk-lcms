import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import (
    ScormUploadAccessToSubLesson,
    ScormViewAccessToPackage,
    ScormViewAccessToSubLesson,
    get_db,
)
from app.modules.scorm import service
from app.modules.scorm.schema import (
    ScormPackageListResponse,
    ScormPackageResponse,
    ScormUploadResponse,
)

router = APIRouter()


@router.post(
    "/sub-lessons/{sublesson_id}/packages",
    response_model=ScormUploadResponse,
    status_code=201,
)
async def upload_scorm_package(
    sublesson_id: uuid.UUID,
    current_user: ScormUploadAccessToSubLesson,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
) -> ScormUploadResponse:
    return await service.upload_package(
        db=db,
        sub_lesson_id=sublesson_id,
        uploader_id=current_user.id,
        file=file,
    )


@router.get(
    "/sub-lessons/{sublesson_id}/packages/current",
    response_model=ScormPackageResponse | None,
)
async def get_current_scorm_package(
    sublesson_id: uuid.UUID,
    current_user: ScormViewAccessToSubLesson,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ScormPackageResponse | None:
    return await service.get_current_package(db, sublesson_id)


@router.get(
    "/sub-lessons/{sublesson_id}/packages",
    response_model=ScormPackageListResponse,
)
async def list_scorm_packages(
    sublesson_id: uuid.UUID,
    current_user: ScormViewAccessToSubLesson,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> ScormPackageListResponse:
    return await service.list_packages(db, sublesson_id, skip, limit)


@router.get(
    "/packages/{package_id}",
    response_model=ScormPackageResponse,
)
async def get_scorm_package(
    package_id: uuid.UUID,
    current_user: ScormViewAccessToPackage,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ScormPackageResponse:
    return await service.get_package(db, package_id)
