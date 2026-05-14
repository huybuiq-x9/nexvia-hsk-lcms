from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 240
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/lcms"

    # ─── AWS S3 ─────────────────────────────────────────────────────────────
    S3_REGION: str = "us-east-1"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET_NAME: str = "lcms"
    CLOUDFRONT_DOMAIN: str = ""

    # ─── SCORM ─────────────────────────────────────────────────────────────
    SCORM_UPLOAD_TMP_DIR: str = "/app/.tmp/scorm-uploads"
    SCORM_MAX_ZIP_SIZE: int = 200 * 1024 * 1024
    SCORM_MAX_EXTRACTED_SIZE: int = 750 * 1024 * 1024
    SCORM_MAX_EXTRACTED_FILES: int = 10000
    SCORM_UPLOAD_WORKERS: int = 8

    CORS_ORIGINS: str = "http://localhost:5173"

    QUESTION_DRAW_SIZE: int = 5

    # ─── Email / SMTP ───────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "nexedu-lcms-noreply@gmail.com"
    SMTP_FROM_NAME: str = "NEXEDU LCMS"
    SMTP_USE_TLS: bool = True
    FRONTEND_URL: str = "http://localhost:5173"

    # ─── Redis / Celery ─────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    @property
    def parsed_cors_origins(self) -> List[str]:
        v = self.CORS_ORIGINS.strip()
        if v.startswith("["):
            return json.loads(v)
        return [o.strip() for o in v.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
