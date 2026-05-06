from datetime import datetime
from typing import Annotated
import uuid

from pydantic import BaseModel, EmailStr, Field, ConfigDict

from app.shared.enums import UserRole


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: Annotated[str, Field(min_length=1)]


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: Annotated[str, Field(min_length=8, max_length=128)]


class MessageResponse(BaseModel):
    message: str


class ForgotPasswordResponse(BaseModel):
    message: str
    sent: bool = False


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenData(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sub: uuid.UUID
    email: str
    roles: list[UserRole]


class AuthResponse(BaseModel):
    user: "UserWithRoles"
    tokens: TokenResponse


from app.modules.users.schema import UserWithRoles

AuthResponse.model_rebuild()
