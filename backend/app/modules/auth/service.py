import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.auth import schema as auth_schema
from app.modules.auth.model import RefreshToken
from app.modules.users.model import User
from app.modules.users.service import UserService
from app.modules.users import schema as user_schema
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    verify_password,
    get_password_hash,
)
from app.core.exceptions import InvalidCredentialsError, InvalidTokenError
from app.core.config import settings


async def authenticate(
    db: AsyncSession,
    email: str,
    password: str,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> tuple[User, auth_schema.TokenResponse]:
    user_svc = UserService(db)
    user = await user_svc.get_by_email(email)
    if not user or not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError()

    if not user.is_active:
        raise InvalidCredentialsError()

    return await _create_tokens(db, user, user_agent, ip_address)


async def _create_tokens(
    db: AsyncSession,
    user: User,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> tuple[User, auth_schema.TokenResponse]:
    roles = [r.role for r in user.roles if r.revoked_at is None]

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "roles": roles}
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(db_token)
    await db.commit()

    return user, auth_schema.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


async def refresh_tokens(
    db: AsyncSession,
    refresh_token: str,
) -> tuple[User, auth_schema.TokenResponse]:
    try:
        payload = decode_refresh_token(refresh_token)
    except Exception:
        raise InvalidTokenError("Invalid or expired refresh token")

    user_id = payload.get("sub")
    if not user_id:
        raise InvalidTokenError("Invalid refresh token payload")

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == refresh_token,
            RefreshToken.is_revoked == False,
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    db_token = result.scalar_one_or_none()
    if not db_token:
        raise InvalidTokenError("Refresh token has been revoked or expired")

    user_svc = UserService(db)
    user = await user_svc.get_by_id(uuid.UUID(user_id))
    if not user or not user.is_active:
        raise InvalidTokenError("User not found or inactive")

    db_token.is_revoked = True
    await db.flush()

    return await _create_tokens(db, user, db_token.user_agent, db_token.ip_address)


async def revoke_token(db: AsyncSession, refresh_token: str) -> None:
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == refresh_token)
    )
    db_token = result.scalar_one_or_none()
    if db_token:
        db_token.is_revoked = True
        await db.commit()


async def revoke_all_user_tokens(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(
        delete(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False,
        )
    )
    await db.commit()


async def logout(db: AsyncSession, refresh_token: str | None) -> None:
    if refresh_token:
        await revoke_token(db, refresh_token)
