import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.modules.users.model import User, UserRoleAssignment
from app.modules.users import schema as user_schema
from app.core.security import get_password_hash, verify_password
from app.core.exceptions import NotFoundError, AlreadyExistsError, InvalidCredentialsError


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _active_roles(user: User) -> list[str]:
    return [r.role for r in user.roles if r.revoked_at is None]


def _to_user_with_roles(user: User) -> user_schema.UserWithRoles:
    return user_schema.UserWithRoles(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superadmin=user.is_superadmin,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        updated_at=user.updated_at,
        roles=_active_roles(user),
    )


def _to_user_response(user: User) -> user_schema.UserResponse:
    return user_schema.UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superadmin=user.is_superadmin,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


async def _get_user_orm(db: AsyncSession, user_id: uuid.UUID) -> User:
    result = await db.execute(
        select(User).options(selectinload(User.roles)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User", str(user_id))
    return user


async def _get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(
        select(User).options(selectinload(User.roles)).where(User.email == email)
    )
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------

async def get_me(user: User) -> user_schema.UserWithRoles:
    return _to_user_with_roles(user)


async def get_by_id(db: AsyncSession, user_id: uuid.UUID) -> User:
    return await _get_user_orm(db, user_id)


async def get_by_email(db: AsyncSession, email: str) -> User | None:
    return await _get_user_by_email(db, email)


async def get_by_id_schema(db: AsyncSession, user_id: uuid.UUID) -> user_schema.UserWithRoles:
    user = await _get_user_orm(db, user_id)
    return _to_user_with_roles(user)


async def create(db: AsyncSession, data: user_schema.UserCreate) -> user_schema.UserResponse:
    existing = await _get_user_by_email(db, data.email)
    if existing:
        raise AlreadyExistsError("User", data.email)

    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    await db.flush()

    for role in data.roles:
        role_assignment = UserRoleAssignment(
            user_id=user.id,
            role=role.value,
            assigned_at=datetime.now(timezone.utc),
        )
        db.add(role_assignment)

    await db.commit()
    user = await _get_user_orm(db, user.id)
    return _to_user_response(user)


async def update(
    db: AsyncSession, user_id: uuid.UUID, data: user_schema.UserUpdate
) -> user_schema.UserResponse:
    user = await _get_user_orm(db, user_id)
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url
    if data.is_active is not None:
        user.is_active = data.is_active
    await db.commit()
    await db.refresh(user)
    return _to_user_response(user)


async def list_users(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
    role: str | None = None,
) -> user_schema.UserListResponse:
    query = (
        select(User)
        .options(selectinload(User.roles))
        .where(User.deleted_at.is_(None))
    )

    if search:
        query = query.where(User.full_name.ilike(f"%{search}%"))

    if role:
        role_subq = (
            select(UserRoleAssignment.user_id)
            .where(
                and_(
                    UserRoleAssignment.user_id == User.id,
                    UserRoleAssignment.role == role,
                    UserRoleAssignment.revoked_at.is_(None),
                )
            )
            .limit(1)
            .scalar_subquery()
        )
        query = query.where(role_subq.exists())

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
    result = await db.execute(query)
    users = list(result.scalars().all())

    return user_schema.UserListResponse(
        total=total,
        items=[_to_user_with_roles(u) for u in users],
    )


async def assign_role(
    db: AsyncSession,
    user_id: uuid.UUID,
    role: str,
) -> User:
    user = await _get_user_orm(db, user_id)
    existing_role = next(
        (r for r in user.roles if r.role == role and r.revoked_at is None),
        None,
    )
    if existing_role:
        return user

    role_assignment = UserRoleAssignment(
        user_id=user.id,
        role=role,
        assigned_at=datetime.now(timezone.utc),
    )
    db.add(role_assignment)
    await db.commit()
    await db.refresh(user)
    return user


async def revoke_role(
    db: AsyncSession,
    user_id: uuid.UUID,
    role: str,
) -> User:
    user = await _get_user_orm(db, user_id)
    for r in user.roles:
        if r.role == role and r.revoked_at is None:
            r.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


async def change_password(
    db: AsyncSession,
    user: User,
    current_password: str,
    new_password: str,
) -> None:
    if not verify_password(current_password, user.hashed_password):
        raise InvalidCredentialsError()
    user.hashed_password = get_password_hash(new_password)
    await db.commit()


async def delete(db: AsyncSession, user_id: uuid.UUID) -> None:
    user = await _get_user_orm(db, user_id)
    user.deleted_at = datetime.now(timezone.utc)
    await db.commit()
