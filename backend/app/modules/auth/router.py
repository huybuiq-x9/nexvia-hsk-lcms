from typing import Annotated
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, CurrentUser, OptionalUser
from app.modules.auth import service, schema as auth_schema
from app.modules.users.model import User

router = APIRouter()


def _get_client_info(request: Request) -> tuple[str | None, str | None]:
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None
    return user_agent, ip_address


@router.post("/login", response_model=auth_schema.AuthResponse)
async def login(
    data: auth_schema.LoginRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user_agent, ip_address = _get_client_info(request)
    user, tokens = await service.authenticate(
        db, data.email, data.password, user_agent, ip_address
    )
    roles = [r.role for r in user.roles if r.revoked_at is None]
    return auth_schema.AuthResponse(
        user=auth_schema.UserWithRoles(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superadmin=user.is_superadmin,
            avatar_url=user.avatar_url,
            created_at=user.created_at,
            updated_at=user.updated_at,
            roles=roles,
        ),
        tokens=tokens,
    )


@router.post("/refresh", response_model=auth_schema.TokenResponse)
async def refresh_token(
    data: auth_schema.RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    _, tokens = await service.refresh_tokens(db, data.refresh_token)
    return tokens


@router.post("/logout")
async def logout(
    data: auth_schema.RefreshTokenRequest | None = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
    current_user: OptionalUser = None,
):
    if data and data.refresh_token:
        await service.logout(db, data.refresh_token)
    return {"message": "Logged out successfully"}


@router.post("/logout-all")
async def logout_all(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await service.revoke_all_user_tokens(db, current_user.id)
    return {"message": "Logged out from all devices"}
