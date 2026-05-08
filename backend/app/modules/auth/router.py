from typing import Annotated
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db
from app.modules.auth import service, schema as auth_schema

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
    db: Annotated[AsyncSession, Depends(get_db)],
    data: auth_schema.RefreshTokenRequest | None = None,
):
    if data and data.refresh_token:
        await service.logout(db, data.refresh_token)
    return {"message": "Logged out successfully"}


@router.post("/forgot-password", response_model=auth_schema.ForgotPasswordResponse)
async def forgot_password(
    data: auth_schema.ForgotPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],s
):
    sent = await service.send_password_reset_email(db, data.email)
    return auth_schema.ForgotPasswordResponse(
        message="If that email exists in our system, a password reset link has been sent.",
        sent=sent,
    )


@router.post("/reset-password", response_model=auth_schema.MessageResponse)
async def reset_password(
    data: auth_schema.ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await service.reset_password(db, data.token, data.new_password)
    return auth_schema.MessageResponse(message="Password reset successfully. You can now login with your new password.")
