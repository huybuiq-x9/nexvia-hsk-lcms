from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 240
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/lcms"

    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "lcms"
    S3_PUBLIC_URL: str = "http://localhost:9000/lcms"

    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    QUESTION_DRAW_SIZE: int = 5

    @property
    def parsed_cors_origins(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, str):
            return json.loads(self.CORS_ORIGINS)
        return self.CORS_ORIGINS

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
