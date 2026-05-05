from datetime import datetime
import uuid
from typing import Annotated
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.shared.enums import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: Annotated[str, Field(min_length=1, max_length=255)]


class UserCreate(UserBase):
    password: Annotated[str, Field(min_length=8, max_length=128)]
    roles: list[UserRole] = []


class UserUpdate(BaseModel):
    full_name: Annotated[str | None, Field(min_length=1, max_length=255)] = None
    is_active: bool | None = None
    roles: list[UserRole] | None = None
    remove_roles: list[UserRole] | None = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_active: bool
    is_superadmin: bool
    created_at: datetime
    updated_at: datetime


class UserWithRoles(UserResponse):
    roles: list[UserRole] = []


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: Annotated[str, Field(min_length=8, max_length=128)]


class UserListResponse(BaseModel):
    total: int
    items: list[UserWithRoles]
