from typing import Annotated
import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, CurrentUser, AdminOnly
from app.modules.users import schema as user_schema
from app.modules.users.service import UserService
from app.shared.enums import UserRole

router = APIRouter()


def get_user_service(db: Annotated[AsyncSession, Depends(get_db)]) -> UserService:
    return UserService(db)


@router.get("/me", response_model=user_schema.UserWithRoles)
async def get_me(current_user: CurrentUser):
    return await UserService.get_me(current_user)


@router.patch("/me", response_model=user_schema.UserResponse)
async def update_me(
    data: user_schema.UserUpdate,
    current_user: CurrentUser,
    svc: Annotated[UserService, Depends(get_user_service)],
):
    return await svc.update(current_user.id, data)


@router.post("/me/change-password")
async def change_my_password(
    data: user_schema.ChangePasswordRequest,
    current_user: CurrentUser,
    svc: Annotated[UserService, Depends(get_user_service)],
):
    await svc.change_password(current_user, data.current_password, data.new_password)
    return {"message": "Password changed successfully"}


@router.get("/", response_model=user_schema.UserListResponse)
async def list_users(
    svc: Annotated[UserService, Depends(get_user_service)],
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    role: UserRole | None = None,
):
    return await svc.list_users(skip, limit, search, role)


@router.get("/{user_id}", response_model=user_schema.UserWithRoles)
async def get_user(
    user_id: uuid.UUID,
    svc: Annotated[UserService, Depends(get_user_service)],
    current_user: CurrentUser,
):
    return await svc.get_by_id(user_id)


@router.post("/", response_model=user_schema.UserResponse, status_code=201)
async def create_user(
    data: user_schema.UserCreate,
    svc: Annotated[UserService, Depends(get_user_service)],
    _: AdminOnly,
):
    return await svc.create(data)


@router.patch("/{user_id}", response_model=user_schema.UserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: user_schema.UserUpdate,
    svc: Annotated[UserService, Depends(get_user_service)],
    _: AdminOnly,
):
    return await svc.update(user_id, data)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    svc: Annotated[UserService, Depends(get_user_service)],
    _: AdminOnly,
):
    await svc.delete(user_id)
