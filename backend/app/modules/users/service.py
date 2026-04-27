import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.modules.users.model import User, UserRoleAssignment
from app.modules.users import schema as user_schema
from app.core.security import get_password_hash, verify_password
from app.core.exceptions import NotFoundError, AlreadyExistsError, InvalidCredentialsError


async def get_by_id(db: AsyncSession, user_id: uuid.UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User", str(user_id))
    return user


async def get_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(User.email == email)
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: user_schema.UserCreate) -> User:
    existing = await get_by_email(db, data.email)
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
            assigned_at=datetime.utcnow(),
        )
        db.add(role_assignment)

    await db.commit()
    await db.refresh(user)
    return user


async def update(db: AsyncSession, user_id: uuid.UUID, data: user_schema.UserUpdate) -> User:
    user = await get_by_id(db, user_id)
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url
    if data.is_active is not None:
        user.is_active = data.is_active
    await db.commit()
    await db.refresh(user)
    return user


async def list_users(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
    role: str | None = None,
) -> tuple[list[User], int]:
    query = select(User).where(User.deleted_at.is_(None))

    if search:
        query = query.where(User.full_name.ilike(f"%{search}%"))

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
    result = await db.execute(query)
    users = list(result.scalars().all())

    return users, total


async def assign_role(
    db: AsyncSession,
    user_id: uuid.UUID,
    role: str,
) -> User:
    user = await get_by_id(db, user_id)

    existing_role = next(
        (r for r in user.roles if r.role == role and r.revoked_at is None),
        None,
    )
    if existing_role:
        return user

    role_assignment = UserRoleAssignment(
        user_id=user.id,
        role=role,
        assigned_at=datetime.utcnow(),
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
    user = await get_by_id(db, user_id)

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
) -> User:
    if not verify_password(current_password, user.hashed_password):
        raise InvalidCredentialsError()

    user.hashed_password = get_password_hash(new_password)
    await db.commit()
    await db.refresh(user)
    return user
