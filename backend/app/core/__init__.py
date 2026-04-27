# Core module - config, security, dependencies, exceptions
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
)
from app.core.deps import (
    get_db,
    get_current_user,
    role_required,
    CurrentUser,
    AdminOnly,
    TeacherOnly,
    ExpertOnly,
    ConverterOnly,
    AdminOrExpert,
)
from app.core.exceptions import (
    LCMSException,
    NotFoundError,
    AlreadyExistsError,
    InvalidCredentialsError,
    InvalidTokenError,
    InvalidStatusTransitionError,
)

__all__ = [
    "settings",
    "verify_password",
    "get_password_hash",
    "create_access_token",
    "create_refresh_token",
    "decode_access_token",
    "decode_refresh_token",
    "get_db",
    "get_current_user",
    "role_required",
    "CurrentUser",
    "AdminOnly",
    "TeacherOnly",
    "ExpertOnly",
    "ConverterOnly",
    "AdminOrExpert",
    "LCMSException",
    "NotFoundError",
    "AlreadyExistsError",
    "InvalidCredentialsError",
    "InvalidTokenError",
    "InvalidStatusTransitionError",
]
