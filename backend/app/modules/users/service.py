import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.modules.users.model import User, UserRoleAssignment
from app.modules.users import schema as user_schema
from app.core.security import get_password_hash, verify_password
from app.core.exceptions import NotFoundError, AlreadyExistsError, InvalidCredentialsError
from app.shared.enums import UserRole


class UserService:

    def __init__(self, db: AsyncSession):
        self._db = db

    # -------------------------------------------------------------------------
    # Private helpers
    # -------------------------------------------------------------------------

    @staticmethod
    def _active_roles(user: User) -> list[UserRole]:
        return [UserRole(r.role) for r in user.roles if r.revoked_at is None]

    @staticmethod
    def _to_user_with_roles(user: User) -> user_schema.UserWithRoles:
        return user_schema.UserWithRoles(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superadmin=user.is_superadmin,
            created_at=user.created_at,
            updated_at=user.updated_at,
            roles=UserService._active_roles(user),
        )

    @staticmethod
    def _to_user_response(user: User) -> user_schema.UserResponse:
        return user_schema.UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superadmin=user.is_superadmin,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    async def _get_user_orm(self, user_id: uuid.UUID) -> User:
        result = await self._db.execute(
            select(User).options(selectinload(User.roles)).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User", str(user_id))
        return user

    async def _get_user_by_email(self, email: str) -> User | None:
        result = await self._db.execute(
            select(User).options(selectinload(User.roles)).where(User.email == email)
        )
        return result.scalar_one_or_none()

    # -------------------------------------------------------------------------
    # Public methods
    # -------------------------------------------------------------------------

    @staticmethod
    async def get_me(user: User) -> user_schema.UserWithRoles:
        return UserService._to_user_with_roles(user)

    async def get_by_id(self, user_id: uuid.UUID) -> User:
        return await self._get_user_orm(user_id)

    async def get_by_email(self, email: str) -> User | None:
        return await self._get_user_by_email(email)

    async def get_by_id_schema(self, user_id: uuid.UUID) -> user_schema.UserWithRoles:
        user = await self._get_user_orm(user_id)
        return self._to_user_with_roles(user)

    async def create(self, data: user_schema.UserCreate) -> user_schema.UserResponse:
        existing = await self._get_user_by_email(data.email)
        if existing:
            raise AlreadyExistsError("User", data.email)

        user = User(
            email=data.email,
            hashed_password=get_password_hash(data.password),
            full_name=data.full_name,
        )
        self._db.add(user)
        await self._db.flush()

        for role in data.roles:
            role_assignment = UserRoleAssignment(
                user_id=user.id,
                role=role.value,
                assigned_at=datetime.now(timezone.utc),
            )
            self._db.add(role_assignment)

        await self._db.commit()
        user = await self._get_user_orm(user.id)
        return self._to_user_response(user)

    async def update(
        self,
        user_id: uuid.UUID,
        data: user_schema.UserUpdate,
    ) -> user_schema.UserResponse:
        user = await self._get_user_orm(user_id)
        if data.full_name is not None:
            user.full_name = data.full_name
        if data.is_active is not None:
            user.is_active = data.is_active

        if data.remove_roles is not None:
            for role in data.remove_roles:
                for r in user.roles:
                    if r.role == role.value and r.revoked_at is None:
                        r.revoked_at = datetime.now(timezone.utc)

        if data.roles is not None:
            for role in data.roles:
                existing = next(
                    (r for r in user.roles if r.role == role.value and r.revoked_at is None),
                    None,
                )
                if not existing:
                    self._db.add(UserRoleAssignment(
                        user_id=user.id,
                        role=role.value,
                        assigned_at=datetime.now(timezone.utc),
                    ))

        await self._db.commit()
        await self._db.refresh(user)
        return self._to_user_response(user)

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        role: UserRole | None = None,
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
                        UserRoleAssignment.role == role.value,
                        UserRoleAssignment.revoked_at.is_(None),
                    )
                )
                .limit(1)
                .scalar_subquery()
            )
            query = query.where(role_subq.exists())

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self._db.execute(count_query)).scalar() or 0

        query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
        result = await self._db.execute(query)
        users = list(result.scalars().all())

        return user_schema.UserListResponse(
            total=total,
            items=[self._to_user_with_roles(u) for u in users],
        )

    async def revoke_role(self, user_id: uuid.UUID, role: UserRole) -> User:
        user = await self._get_user_orm(user_id)
        for r in user.roles:
            if r.role == role.value and r.revoked_at is None:
                r.revoked_at = datetime.now(timezone.utc)
        await self._db.commit()
        await self._db.refresh(user)
        return user

    async def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
    ) -> None:
        if not verify_password(current_password, user.hashed_password):
            raise InvalidCredentialsError()
        user.hashed_password = get_password_hash(new_password)
        await self._db.commit()

    async def delete(self, user_id: uuid.UUID) -> None:
        user = await self._get_user_orm(user_id)
        user.deleted_at = datetime.now(timezone.utc)
        await self._db.commit()
