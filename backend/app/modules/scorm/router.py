import uuid
from collections.abc import Iterator
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import (
    ScormUploadAccessToSubLesson,
    ScormUploadAccessToPackage,
    ScormViewAccessToPackage,
    ScormViewAccessToSubLesson,
    get_db,
)
from app.core.security import decode_scorm_preview_token
from app.modules.scorm import service
from app.modules.scorm.schema import (
    ScormPackageListResponse,
    ScormPackageResponse,
    ScormPreviewSessionResponse,
    ScormUploadResponse,
)

router = APIRouter()


def _preview_cookie_path(request: Request, package_id: uuid.UUID) -> str:
    try:
        probe_path = request.app.url_path_for(
            "get_scorm_asset",
            package_id=str(package_id),
            asset_path="__asset__",
        )
        return str(probe_path).removesuffix("/__asset__")
    except Exception:
        return f"/api/v1/scorm/packages/{package_id}/assets"


def _iter_s3_body(body) -> Iterator[bytes]:
    try:
        while True:
            chunk = body.read(service.CHUNK_SIZE)
            if not chunk:
                break
            yield chunk
    finally:
        body.close()


def _validate_preview_cookie(request: Request, package_id: uuid.UUID) -> None:
    token = request.cookies.get(service.preview_cookie_name(package_id))
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing SCORM preview session",
        )
    try:
        payload = decode_scorm_preview_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired SCORM preview session",
        )
    if payload.get("sub") != str(package_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SCORM preview session does not match this package",
        )


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


@router.post(
    "/packages/{package_id}/reupload",
    response_model=ScormUploadResponse,
    status_code=201,
)
async def reupload_scorm_package(
    package_id: uuid.UUID,
    current_user: ScormUploadAccessToPackage,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
) -> ScormUploadResponse:
    return await service.reupload_package(
        db=db,
        package_id=package_id,
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


@router.post(
    "/packages/{package_id}/preview-session",
    response_model=ScormPreviewSessionResponse,
)
async def create_scorm_preview_session(
    package_id: uuid.UUID,
    request: Request,
    response: Response,
    current_user: ScormViewAccessToPackage,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ScormPreviewSessionResponse:
    payload, token = await service.create_preview_session(db, package_id)
    response.set_cookie(
        key=service.preview_cookie_name(package_id),
        value=token,
        max_age=payload.expires_in,
        httponly=True,
        secure=settings.APP_ENV not in {"development", "local", "test"},
        samesite="lax",
        path=_preview_cookie_path(request, package_id),
    )
    return payload


@router.get(
    "/packages/{package_id}/assets/{asset_path:path}",
    name="get_scorm_asset",
)
async def get_scorm_asset(
    package_id: uuid.UUID,
    asset_path: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    _validate_preview_cookie(request, package_id)
    obj = await service.get_asset_object(db, package_id, asset_path)
    headers = {
        "Cache-Control": "private, max-age=3600",
    }
    if obj.get("ContentLength") is not None:
        headers["Content-Length"] = str(obj["ContentLength"])
    if obj.get("ETag"):
        headers["ETag"] = obj["ETag"]
    return StreamingResponse(
        _iter_s3_body(obj["Body"]),
        media_type=obj.get("ContentType") or "application/octet-stream",
        headers=headers,
    )
