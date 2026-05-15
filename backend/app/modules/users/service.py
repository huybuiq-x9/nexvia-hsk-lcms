import uuid
from datetime import datetime, timezone
from sqlalchemy import select, delete, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.modules.users.model import User, UserRoleAssignment
from app.modules.courses.model import Course, Lesson
from app.modules.users import schema as user_schema
from app.core.security import async_get_password_hash, async_verify_password
from app.core.exceptions import NotFoundError, AlreadyExistsError, ForbiddenDeletionError
from fastapi import HTTPException, status
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

    @staticmethod
    async def get_me(user: User) -> user_schema.UserWithRoles:
        return UserService._to_user_with_roles(user)

    async def get_by_id(self, user_id: uuid.UUID) -> User:
        result = await self._db.execute(
            select(User).options(selectinload(User.roles)).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User", str(user_id))
        return user

    async def get_by_email(self, email: str) -> User | None:
        result = await self._db.execute(
            select(User).options(selectinload(User.roles)).where(User.email == email)
        )
        return result.scalar_one_or_none()


    async def create(self, data: user_schema.UserCreate) -> user_schema.UserResponse:
        existing = await self.get_by_email(data.email)
        if existing:
            raise AlreadyExistsError("User", data.email)

        hashed_pw = await async_get_password_hash(data.password)
        user = User(
            email=data.email,
            hashed_password=hashed_pw,
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
        user = await self.get_by_id(user.id)
        return self._to_user_response(user)

    async def update(
        self,
        user_id: uuid.UUID,
        data: user_schema.UserUpdate,
    ) -> user_schema.UserResponse:
        user = await self.get_by_id(user_id)
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

    async def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
    ) -> None:
        if not await async_verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect",
            )
        user.hashed_password = await async_get_password_hash(new_password)
        await self._db.commit()

    async def delete(self, user_id: uuid.UUID) -> None:
        user = await self.get_by_id(user_id)

        assigned_courses = (
            (await self._db.execute(select(func.count()).select_from(Course).where(Course.assigned_expert_id == user_id)))
            .scalar() or 0
        )
        assigned_lessons = (
            (await self._db.execute(
                select(func.count())
                .select_from(Lesson)
                .where(
                    (Lesson.assigned_teacher_id == user_id) | (Lesson.assigned_converter_id == user_id)
                )
            ))
            .scalar() or 0
        )

        msgs: list[str] = []
        if assigned_courses > 0:
            msgs.append(f"expert ({assigned_courses} course{'s' if assigned_courses > 1 else ''})")
        if assigned_lessons > 0:
            msgs.append(f"teacher/converter ({assigned_lessons} lesson{'s' if assigned_lessons > 1 else ''})")
        if msgs:
            raise ForbiddenDeletionError(
                f"Cannot delete user: they are still assigned as {', '.join(msgs)}. "
                f"Please unassign them before deleting."
            )

        user.is_active = False
        from app.modules.auth.model import RefreshToken
        await self._db.execute(
            delete(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False,
            )
        )
        user.deleted_at = datetime.now(timezone.utc)
        await self._db.commit()
