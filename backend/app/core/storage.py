import boto3
import mimetypes
from pathlib import Path
import re
from botocore.config import Config
from botocore.exceptions import ClientError
from app.core.config import settings
from app.core.exceptions import LCMSException


def _sanitize_filename(filename: str) -> str:
    """Remove path separators and reserved characters from filename."""
    name = re.sub(r"[/\\:]", "_", filename)
    if len(name) > 200:
        name = name[:200]
    return name


class StorageService:
    def __init__(self):
        self._client = None
        self._bucket_region = None

    @property
    def client(self):
        if self._client is None:
            self._client = self._build_client(self._bucket_region or settings.S3_REGION)
        return self._client

    def _build_client(self, region_name: str):
        return boto3.client(
            "s3",
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=region_name,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "virtual"},
            ),
        )

    @staticmethod
    def _normalize_bucket_region(region: str | None) -> str:
        if not region:
            return "us-east-1"
        if region == "EU":
            return "eu-west-1"
        return region

    def _resolve_bucket_region(self) -> str:
        if self._bucket_region:
            return self._bucket_region

        try:
            self.client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
            self._bucket_region = settings.S3_REGION
            return self._bucket_region
        except ClientError as e:
            headers = e.response.get("ResponseMetadata", {}).get("HTTPHeaders", {})
            redirected_region = headers.get("x-amz-bucket-region")
            if redirected_region:
                self._bucket_region = self._normalize_bucket_region(redirected_region)
                self._client = self._build_client(self._bucket_region)
                return self._bucket_region

            raise LCMSException(
                message=f"Cannot access S3 bucket: {e}",
                status_code=500,
            )

    def _ensure_bucket_exists(self) -> None:
        """AWS S3 buckets must exist before uploading."""
        try:
            self._resolve_bucket_region()
            self.client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        except ClientError as e:
            raise LCMSException(
                message=f"Cannot access S3 bucket: {e}",
                status_code=500,
            )

    def upload_file(
        self,
        file_content: bytes,
        original_filename: str,
        content_type: str,
        sub_lesson_id: str | None = None,
    ) -> tuple[str, str]:
        """
        Upload a file to S3 and return (stored_name, download_url).
        If sub_lesson_id is provided, stores under Documents/{sub_lesson_id}/{filename}.
        Raises LCMSException on failure.
        """
        self._ensure_bucket_exists()

        safe_name = _sanitize_filename(original_filename)
        if sub_lesson_id:
            key = f"Documents/{sub_lesson_id}/{safe_name}"
        else:
            key = f"documents/{safe_name}"

        try:
            self.client.put_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=key,
                Body=file_content,
                ContentType=content_type,
            )
        except ClientError as e:
            raise LCMSException(
                message=f"Failed to upload file: {e}",
                status_code=500,
            )

        download_url = self.get_presigned_download_url(key)
        return key, download_url

    def upload_object(
        self,
        key: str,
        file_content: bytes,
        content_type: str,
    ) -> str:
        """Upload bytes to an explicit S3 key."""
        self._ensure_bucket_exists()
        try:
            self.client.put_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=key,
                Body=file_content,
                ContentType=content_type,
            )
        except ClientError as e:
            raise LCMSException(
                message=f"Failed to upload file: {e}",
                status_code=500,
            )
        return key

    def upload_local_file(
        self,
        key: str,
        file_path: str | Path,
        content_type: str,
    ) -> str:
        """Upload a local file to an explicit S3 key."""
        self._ensure_bucket_exists()
        try:
            with open(file_path, "rb") as f:
                self.client.upload_fileobj(
                    f,
                    settings.S3_BUCKET_NAME,
                    key,
                    ExtraArgs={"ContentType": content_type},
                )
        except ClientError as e:
            raise LCMSException(
                message=f"Failed to upload file: {e}",
                status_code=500,
            )
        return key

    def delete_file(self, stored_name: str) -> None:
        """Delete a file from S3 by its stored name (full key)."""
        try:
            self.client.delete_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=stored_name,
            )
        except ClientError as e:
            raise LCMSException(
                message=f"Failed to delete file: {e}",
                status_code=500,
            )

    def get_presigned_download_url(self, stored_name: str, expires_in: int = 3600) -> str:
        """Return a temporary signed URL for private S3 objects."""
        self._resolve_bucket_region()
        try:
            return self.client.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": settings.S3_BUCKET_NAME,
                    "Key": stored_name,
                },
                ExpiresIn=expires_in,
            )
        except ClientError as e:
            raise LCMSException(
                message=f"Failed to generate download URL: {e}",
                status_code=500,
            )

    @staticmethod
    def guess_mime_type(filename: str) -> str:
        mime, _ = mimetypes.guess_type(filename)
        return mime or "application/octet-stream"


storage_service = StorageService()
