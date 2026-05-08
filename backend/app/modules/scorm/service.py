import posixpath
import uuid
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from xml.etree.ElementTree import ParseError

import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.exceptions import ForbiddenError, LCMSException, NotFoundError
from app.core.storage import storage_service
from app.modules.courses.model import SubLesson
from app.modules.scorm.manifest import parse_imsmanifest
from app.modules.scorm.model import ScormComment, ScormPackage
from app.modules.scorm.schema import (
    ScormCommentAuthorInfo,
    ScormCommentCreate,
    ScormCommentListResponse,
    ScormCommentResponse,
    ScormFileListResponse,
    ScormPackageInfo,
)
from app.shared.enums import SubLessonStatus


MAX_SCORM_SIZE = 500 * 1024 * 1024


class ScormService:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = boto3.client(
                "s3",
                endpoint_url=settings.S3_ENDPOINT_URL,
                aws_access_key_id=settings.S3_ACCESS_KEY,
                aws_secret_access_key=settings.S3_SECRET_KEY,
                region_name="us-east-1",
            )
        return self._client

    async def _get_sublesson_orm(self, db: AsyncSession, sublesson_id: uuid.UUID) -> SubLesson:
        result = await db.execute(select(SubLesson).where(SubLesson.id == sublesson_id))
        sublesson = result.scalar_one_or_none()
        if not sublesson:
            raise NotFoundError("SubLesson", str(sublesson_id))
        return sublesson

    async def _get_current_package(
        self,
        db: AsyncSession,
        sublesson_id: uuid.UUID,
    ) -> ScormPackage | None:
        result = await db.execute(
            select(ScormPackage)
            .where(ScormPackage.sub_lesson_id == sublesson_id)
            .where(ScormPackage.is_current.is_(True))
            .where(ScormPackage.deleted_at.is_(None))
            .order_by(ScormPackage.version.desc())
        )
        return result.scalars().first()

    async def _get_max_package_version(self, db: AsyncSession, sublesson_id: uuid.UUID) -> int:
        result = await db.execute(
            select(func.max(ScormPackage.version))
            .where(ScormPackage.sub_lesson_id == sublesson_id)
            .where(ScormPackage.deleted_at.is_(None))
        )
        return result.scalar() or 0

    def _get_s3_object(self, stored_name: str) -> bytes:
        try:
            response = self.client.get_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=stored_name,
            )
            return response["Body"].read()
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code in ("NoSuchKey", "404"):
                raise NotFoundError("SCORM package", stored_name)
            raise LCMSException(f"Failed to get SCORM package: {e}", status_code=500)

    def _read_zip(self, stored_name: str) -> zipfile.ZipFile:
        try:
            return zipfile.ZipFile(BytesIO(self._get_s3_object(stored_name)))
        except zipfile.BadZipFile:
            raise LCMSException("Invalid SCORM ZIP file", status_code=400)

    def _inspect_package(self, content: bytes) -> tuple[dict, list[str]]:
        try:
            with zipfile.ZipFile(BytesIO(content)) as zf:
                names = sorted(name for name in zf.namelist() if not name.endswith("/"))
                manifest_name = next(
                    (name for name in names if name.lower().endswith("imsmanifest.xml")),
                    None,
                )
                if not manifest_name:
                    raise LCMSException("SCORM package must contain imsmanifest.xml", status_code=400)

                manifest_text = zf.read(manifest_name).decode("utf-8", errors="ignore")
                try:
                    info = parse_imsmanifest(manifest_text)
                except ParseError:
                    raise LCMSException("Invalid imsmanifest.xml", status_code=400)
                if not info.get("sco_launch"):
                    html_candidates = [
                        name for name in names
                        if name.lower().endswith((".html", ".htm"))
                    ]
                    info["sco_launch"] = html_candidates[0] if html_candidates else ""

                version = (info.get("schema_version") or "").lower()
                if "2004" not in version and "1.3" not in version:
                    raise LCMSException(
                        "Only SCORM 2004 packages are supported",
                        status_code=400,
                    )
                return info, names
        except zipfile.BadZipFile:
            raise LCMSException("Invalid ZIP file", status_code=400)

    async def upload_package(
        self,
        db: AsyncSession,
        sublesson_id: uuid.UUID,
        uploader_id: uuid.UUID,
        file: UploadFile,
    ) -> ScormPackageInfo:
        filename = file.filename or "scorm.zip"
        if not filename.lower().endswith(".zip"):
            raise ForbiddenError("Only .zip SCORM packages are allowed")

        sublesson = await self._get_sublesson_orm(db, sublesson_id)
        if sublesson.status not in (SubLessonStatus.CONVERTING, SubLessonStatus.SCORM_REVIEWING):
            raise ForbiddenError(
                f"Cannot upload SCORM: sublesson status is '{sublesson.status.value}'. "
                "SCORM can only be uploaded while converting or reviewing SCORM."
            )

        content = await file.read()
        if len(content) > MAX_SCORM_SIZE:
            raise ForbiddenError(
                f"SCORM package exceeds maximum size of {MAX_SCORM_SIZE // (1024 * 1024)} MB"
            )

        info, names = self._inspect_package(content)
        current_package = await self._get_current_package(db, sublesson_id)
        max_version = await self._get_max_package_version(db, sublesson_id)

        if not current_package and sublesson.scorm_stored_name:
            legacy_info = self.get_package_info_from_sublesson(sublesson)
            legacy_package = ScormPackage(
                sub_lesson_id=sublesson.id,
                uploader_id=sublesson.scorm_uploaded_by_id,
                title=legacy_info.title,
                schema=legacy_info.schema,
                schema_version=legacy_info.schema_version,
                sco_launch=legacy_info.sco_launch,
                filename=legacy_info.filename,
                stored_name=legacy_info.stored_name,
                file_size=legacy_info.file_size,
                uploaded_at=sublesson.scorm_uploaded_at,
                files_count=legacy_info.files_count,
                version=max(max_version, 1),
                is_current=False,
            )
            db.add(legacy_package)
            max_version = max(max_version, legacy_package.version)

        current_packages = await db.execute(
            select(ScormPackage)
            .where(ScormPackage.sub_lesson_id == sublesson_id)
            .where(ScormPackage.deleted_at.is_(None))
        )
        for package in current_packages.scalars().all():
            package.is_current = False

        stored_name, _ = storage_service.upload_scorm_package(
            file_content=content,
            original_filename=filename,
            sub_lesson_id=str(sublesson_id),
        )

        uploaded_at = datetime.now(timezone.utc)
        package = ScormPackage(
            sub_lesson_id=sublesson_id,
            uploader_id=uploader_id,
            title=info.get("title") or sublesson.title,
            schema=info.get("schema") or "SCORM",
            schema_version=info.get("schema_version") or "",
            sco_launch=info.get("sco_launch") or "",
            filename=filename,
            stored_name=stored_name,
            file_size=len(content),
            uploaded_at=uploaded_at,
            files_count=len(names),
            version=max_version + 1,
            is_current=True,
        )
        db.add(package)

        sublesson.scorm_stored_name = stored_name
        sublesson.scorm_filename = filename
        sublesson.scorm_file_size = len(content)
        sublesson.scorm_uploaded_at = uploaded_at
        sublesson.scorm_uploaded_by_id = uploader_id

        await db.commit()
        await db.refresh(package)
        return self.get_package_info_from_package(package, comments_count=0)

    def _require_scorm(self, sublesson: SubLesson) -> None:
        if not sublesson.scorm_stored_name:
            raise NotFoundError("SCORM package", str(sublesson.id))

    def _normalize_path(self, file_path: str) -> str:
        normalized = posixpath.normpath(file_path).lstrip("/")
        if normalized == "." or normalized.startswith("../"):
            raise ForbiddenError("Invalid SCORM file path")
        return normalized

    def get_package_info_from_sublesson(
        self,
        sublesson: SubLesson,
        comments_count: int = 0,
    ) -> ScormPackageInfo:
        self._require_scorm(sublesson)
        with self._read_zip(sublesson.scorm_stored_name or "") as zf:
            names = sorted(name for name in zf.namelist() if not name.endswith("/"))
            manifest_name = next(
                (name for name in names if name.lower().endswith("imsmanifest.xml")),
                None,
            )
            info = {}
            if manifest_name:
                manifest_text = zf.read(manifest_name).decode("utf-8", errors="ignore")
                try:
                    info = parse_imsmanifest(manifest_text)
                except ParseError:
                    raise LCMSException("Invalid imsmanifest.xml", status_code=400)

            launch = info.get("sco_launch") or next(
                (name for name in names if name.lower().endswith((".html", ".htm"))),
                "",
            )

        return ScormPackageInfo(
            id=None,
            sub_lesson_id=sublesson.id,
            title=info.get("title") or sublesson.title,
            schema=info.get("schema") or "SCORM",
            schema_version=info.get("schema_version") or "",
            sco_launch=launch,
            filename=sublesson.scorm_filename or "",
            stored_name=sublesson.scorm_stored_name or "",
            file_size=sublesson.scorm_file_size,
            uploaded_at=sublesson.scorm_uploaded_at,
            uploaded_by_id=sublesson.scorm_uploaded_by_id,
            files_count=len(names),
            version=1,
            is_current=True,
            comments_count=comments_count,
        )

    def get_package_info_from_package(
        self,
        package: ScormPackage,
        comments_count: int = 0,
    ) -> ScormPackageInfo:
        return ScormPackageInfo(
            id=package.id,
            sub_lesson_id=package.sub_lesson_id,
            title=package.title,
            schema=package.schema,
            schema_version=package.schema_version,
            sco_launch=package.sco_launch,
            filename=package.filename,
            stored_name=package.stored_name,
            file_size=package.file_size,
            uploaded_at=package.uploaded_at,
            uploaded_by_id=package.uploader_id,
            files_count=package.files_count,
            version=package.version,
            is_current=package.is_current,
            comments_count=comments_count,
        )

    async def get_package_info(self, db: AsyncSession, sublesson_id: uuid.UUID) -> ScormPackageInfo:
        current_package = await self._get_current_package(db, sublesson_id)
        if current_package:
            comments_count = await db.scalar(
                select(func.count())
                .select_from(ScormComment)
                .where(ScormComment.scorm_package_id == current_package.id)
                .where(ScormComment.deleted_at.is_(None))
            ) or 0
            return self.get_package_info_from_package(current_package, comments_count=comments_count)

        result = await db.execute(
            select(SubLesson)
            .options(selectinload(SubLesson.scorm_comments))
            .where(SubLesson.id == sublesson_id)
        )
        sublesson = result.scalar_one_or_none()
        if not sublesson:
            raise NotFoundError("SubLesson", str(sublesson_id))
        return self.get_package_info_from_sublesson(
            sublesson,
            comments_count=len(sublesson.scorm_comments or []),
        )

    async def get_file_list(self, db: AsyncSession, sublesson_id: uuid.UUID) -> ScormFileListResponse:
        sublesson = await self._get_sublesson_orm(db, sublesson_id)
        package = await self._get_current_package(db, sublesson_id)
        stored_name = package.stored_name if package else sublesson.scorm_stored_name
        if not stored_name:
            raise NotFoundError("SCORM package", str(sublesson.id))
        with self._read_zip(stored_name) as zf:
            files = sorted(name for name in zf.namelist() if not name.endswith("/"))
        return ScormFileListResponse(files=files)

    async def get_file_content(
        self,
        db: AsyncSession,
        sublesson_id: uuid.UUID,
        file_path: str,
        asset_base_url: str,
    ) -> tuple[bytes, str]:
        sublesson = await self._get_sublesson_orm(db, sublesson_id)
        package = await self._get_current_package(db, sublesson_id)
        stored_name = package.stored_name if package else sublesson.scorm_stored_name
        if not stored_name:
            raise NotFoundError("SCORM package", str(sublesson.id))
        normalized_path = self._normalize_path(file_path)

        with self._read_zip(stored_name) as zf:
            names = set(zf.namelist())
            if normalized_path not in names:
                raise NotFoundError("SCORM file", normalized_path)
            raw_content = zf.read(normalized_path)

        content_type = self._content_type(normalized_path)
        if normalized_path.lower().endswith((".html", ".htm")):
            raw_content = self._inject_runtime(raw_content, normalized_path, asset_base_url)
            content_type = "text/html; charset=utf-8"
        return raw_content, content_type

    def _to_comment_response(self, comment: ScormComment) -> ScormCommentResponse:
        return ScormCommentResponse(
            id=comment.id,
            sub_lesson_id=comment.sub_lesson_id,
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

    async def list_comments(
        self,
        db: AsyncSession,
        sublesson_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> ScormCommentListResponse:
        sublesson = await self._get_sublesson_orm(db, sublesson_id)
        package = await self._get_current_package(db, sublesson_id)
        if not package:
            self._require_scorm(sublesson)

        query = (
            select(ScormComment)
            .options(selectinload(ScormComment.author))
            .where(ScormComment.sub_lesson_id == sublesson_id)
            .where(ScormComment.deleted_at.is_(None))
            .order_by(ScormComment.created_at.asc())
        )
        if package:
            query = query.where(ScormComment.scorm_package_id == package.id)
        else:
            query = query.where(ScormComment.scorm_package_id.is_(None))

        count_q = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_q)).scalar() or 0

        result = await db.execute(query.offset(skip).limit(limit))
        comments = list(result.scalars().all())
        return ScormCommentListResponse(
            total=total,
            items=[self._to_comment_response(comment) for comment in comments],
        )

    async def add_comment(
        self,
        db: AsyncSession,
        sublesson_id: uuid.UUID,
        author_id: uuid.UUID,
        data: ScormCommentCreate,
    ) -> ScormCommentResponse:
        sublesson = await self._get_sublesson_orm(db, sublesson_id)
        package = await self._get_current_package(db, sublesson_id)
        if not package:
            self._require_scorm(sublesson)

        comment = ScormComment(
            sub_lesson_id=sublesson_id,
            scorm_package_id=package.id if package else None,
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
        return self._to_comment_response(comment)

    def _content_type(self, file_path: str) -> str:
        ext = file_path.rsplit(".", 1)[-1].lower() if "." in file_path else ""
        return {
            "html": "text/html; charset=utf-8",
            "htm": "text/html; charset=utf-8",
            "css": "text/css; charset=utf-8",
            "js": "application/javascript; charset=utf-8",
            "xml": "application/xml; charset=utf-8",
            "json": "application/json; charset=utf-8",
            "txt": "text/plain; charset=utf-8",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "gif": "image/gif",
            "svg": "image/svg+xml",
            "webp": "image/webp",
            "mp3": "audio/mpeg",
            "m4a": "audio/mp4",
            "ogg": "audio/ogg",
            "mp4": "video/mp4",
            "webm": "video/webm",
            "pdf": "application/pdf",
        }.get(ext, "application/octet-stream")

    def _inject_runtime(self, raw_content: bytes, file_path: str, asset_base_url: str) -> bytes:
        html = raw_content.decode("utf-8", errors="ignore")
        base_dir = posixpath.dirname(file_path)
        base_href = asset_base_url
        if base_dir:
            base_href = f"{asset_base_url.rstrip('/')}/{base_dir}/"

        base_tag = f'<base href="{base_href}">'
        runtime = """
<script>
(function(){
  var data = {};
  var lastError = "0";
  var initialized = false;
  function ok(){ lastError = "0"; return "true"; }
  function fail(code){ lastError = code || "101"; return "false"; }
  function emit(method, args, result){
    try {
      window.parent.postMessage({
        source: "nexedu-scorm-preview",
        method: method,
        arguments: args || [],
        result: result,
        data: data
      }, "*");
    } catch(e) {}
  }
  var api = {
    Initialize: function(){ initialized = true; var r = ok(); emit("Initialize", arguments, r); return r; },
    Terminate: function(){ initialized = false; var r = ok(); emit("Terminate", arguments, r); return r; },
    GetValue: function(key){ var r = data[key] || ""; emit("GetValue", arguments, r); return r; },
    SetValue: function(key, value){ if(!initialized){ return fail("301"); } data[key] = String(value); var r = ok(); emit("SetValue", arguments, r); return r; },
    Commit: function(){ var r = ok(); emit("Commit", arguments, r); return r; },
    GetLastError: function(){ return lastError; },
    GetErrorString: function(code){ return code === "0" ? "No error" : "SCORM preview runtime error"; },
    GetDiagnostic: function(code){ return code || lastError; }
  };
  window.API_1484_11 = api;
  window.API = api;
})();
</script>
"""
        injection = base_tag + runtime
        lower = html.lower()
        head_index = lower.find("<head>")
        if head_index >= 0:
            insert_at = head_index + len("<head>")
            html = html[:insert_at] + injection + html[insert_at:]
        elif lower.find("<html>") >= 0:
            insert_at = lower.find("<html>") + len("<html>")
            html = html[:insert_at] + "<head>" + injection + "</head>" + html[insert_at:]
        else:
            html = "<head>" + injection + "</head>" + html
        return html.encode("utf-8")


scorm_service = ScormService()
