from typing import Annotated
import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, CurrentUser, AdminOnly
from app.modules.users import service, schema as user_schema

router = APIRouter()


@router.get("/me", response_model=user_schema.UserWithRoles)
async def get_me(current_user: CurrentUser):
    return current_user


@router.patch("/me", response_model=user_schema.UserResponse)
async def update_me(
    data: user_schema.UserUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await service.update(db, current_user.id, data)


@router.post("/me/change-password")
async def change_my_password(
    data: user_schema.ChangePasswordRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await service.change_password(db, current_user, data.current_password, data.new_password)
    return {"message": "Password changed successfully"}


@router.get("/", response_model=user_schema.UserListResponse)
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    role: str | None = None,
):
    users, total = await service.list_users(db, skip, limit, search, role)
    return user_schema.UserListResponse(
        total=total,
        items=[
            user_schema.UserWithRoles(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                is_active=u.is_active,
                is_superadmin=u.is_superadmin,
                avatar_url=u.avatar_url,
                created_at=u.created_at,
                updated_at=u.updated_at,
                roles=[r.role for r in u.roles if r.revoked_at is None],
            )
            for u in users
        ],
    )


@router.get("/{user_id}", response_model=user_schema.UserWithRoles)
async def get_user(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    user = await service.get_by_id(db, user_id)
    return user_schema.UserWithRoles(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superadmin=user.is_superadmin,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        updated_at=user.updated_at,
        roles=[r.role for r in user.roles if r.revoked_at is None],
    )


@router.post("/", response_model=user_schema.UserResponse, status_code=201)
async def create_user(
    data: user_schema.UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    return await service.create(db, data)


@router.patch("/{user_id}", response_model=user_schema.UserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: user_schema.UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    return await service.update(db, user_id, data)


@router.post("/{user_id}/roles")
async def assign_role(
    user_id: uuid.UUID,
    data: user_schema.AssignRoleRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    user = await service.assign_role(db, user_id, data.role.value)
    return {"message": f"Role '{data.role.value}' assigned", "roles": [r.role for r in user.roles if r.revoked_at is None]}


@router.delete("/{user_id}/roles/{role}")
async def revoke_role(
    user_id: uuid.UUID,
    role: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    await service.revoke_role(db, user_id, role)
    return {"message": f"Role '{role}' revoked"}
