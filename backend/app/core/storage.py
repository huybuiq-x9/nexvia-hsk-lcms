import boto3
import mimetypes
import re
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

    @property
    def client(self):
        if self._client is None:
            self._client = boto3.client(
                "s3",
                endpoint_url=settings.S3_ENDPOINT_URL or None,
                aws_access_key_id=settings.S3_ACCESS_KEY,
                aws_secret_access_key=settings.S3_SECRET_KEY,
                region_name=settings.S3_REGION,
            )
        return self._client

    @property
    def _is_aws_s3(self) -> bool:
        """True when not using a custom endpoint (MinIO/local stack)."""
        return not bool(settings.S3_ENDPOINT_URL)

    def _ensure_bucket_exists(self) -> None:
        if self._is_aws_s3:
            return
        try:
            self.client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code in ("404", "NoSuchBucket"):
                self.client.create_bucket(Bucket=settings.S3_BUCKET_NAME)
                self.client.put_bucket_policy(
                    Bucket=settings.S3_BUCKET_NAME,
                    Policy="""{
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Sid": "PublicReadGetObject",
                                "Effect": "Allow",
                                "Principal": "*",
                                "Action": "s3:GetObject",
                                "Resource": "arn:aws:s3:::lcms/*"
                            }
                        ]
                    }""",
                )
            else:
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
        Upload a file to S3/MinIO and return (stored_name, public_url).
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

        public_url = f"{settings.S3_PUBLIC_URL}/{key}"
        return key, public_url

    def upload_scorm_package(
        self,
        file_content: bytes,
        original_filename: str,
        sub_lesson_id: str,
    ) -> tuple[str, str]:
        """Upload a SCORM zip to S3/MinIO and return (stored_name, public_url)."""
        self._ensure_bucket_exists()

        safe_name = _sanitize_filename(original_filename)
        key = f"Scorm/{sub_lesson_id}/{safe_name}"

        try:
            self.client.put_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=key,
                Body=file_content,
                ContentType="application/zip",
            )
        except ClientError as e:
            raise LCMSException(
                message=f"Failed to upload SCORM package: {e}",
                status_code=500,
            )

        public_url = f"{settings.S3_PUBLIC_URL}/{key}"
        return key, public_url

    def delete_file(self, stored_name: str) -> None:
        """Delete a file from S3/MinIO by its stored name (full key)."""
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
        """
        Return a public download URL for the file.
        For MinIO (local dev): constructs a direct public URL since the bucket
        policy allows anonymous GetObject. Presigned URLs would have their
        signature broken when the endpoint (minio:9000) differs from the public
        hostname (localhost:9000) that browsers use.
        """
        return f"{settings.S3_PUBLIC_URL}/{stored_name}"

    @staticmethod
    def guess_mime_type(filename: str) -> str:
        mime, _ = mimetypes.guess_type(filename)
        return mime or "application/octet-stream"


storage_service = StorageService()
