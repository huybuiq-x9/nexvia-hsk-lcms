import uuid
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.security import decode_access_token
from app.core.config import settings
from app.modules.users.model import User
from app.modules.courses.model import SubLesson, Lesson

bearer = HTTPBearer()

# Create engine and session factory here to avoid circular imports
_engine = None
_async_session_local = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.APP_ENV == "development",
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
    return _engine


def get_session_factory():
    global _async_session_local
    if _async_session_local is None:
        _async_session_local = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _async_session_local


async def get_db() -> AsyncSession:
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    try:
        payload = decode_access_token(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).options(selectinload(User.roles)).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def role_required(*roles: str):
    async def checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        user_roles = {r.role for r in current_user.roles if r.revoked_at is None}
        if not any(role in user_roles for role in roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to perform this action",
            )
        return current_user
    return checker


CurrentUser = Annotated[User, Depends(get_current_user)]
AdminOnly = Annotated[User, Depends(role_required("admin"))]
TeacherOnly = Annotated[User, Depends(role_required("teacher"))]
ExpertOnly = Annotated[User, Depends(role_required("expert"))]
ConverterOnly = Annotated[User, Depends(role_required("converter"))]
AdminOrExpert = Annotated[User, Depends(role_required("admin", "expert"))]


async def get_optional_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(HTTPBearer(auto_error=False))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User | None:
    if credentials is None:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
    except Exception:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    result = await db.execute(select(User).options(selectinload(User.roles)).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        return None

    return user


OptionalUser = Annotated[User | None, Depends(get_optional_current_user)]


async def teacher_assigned_to_sublesson(
    sublesson_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    user_roles = {r.role for r in current_user.roles if r.revoked_at is None}
    if "admin" in user_roles:
        return current_user

    result = await db.execute(
        select(SubLesson)
        .options(selectinload(SubLesson.lesson).selectinload(Lesson.course))
        .where(SubLesson.id == sublesson_id)
    )
    sublesson = result.scalar_one_or_none()
    if not sublesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SubLesson not found")

    lesson = sublesson.lesson

    if "teacher" in user_roles:
        if lesson.assigned_teacher_id == current_user.id:
            return current_user

    if "converter" in user_roles:
        if lesson.assigned_converter_id == current_user.id:
            return current_user

    if "expert" in user_roles:
        if lesson.course.assigned_expert_id == current_user.id:
            return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You are not assigned to this Sub-Lesson",
    )


async def teacher_assigned_to_document(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    from app.modules.documents.model import Document
    user_roles = {r.role for r in current_user.roles if r.revoked_at is None}
    if "admin" in user_roles:
        return current_user

    result = await db.execute(
        select(Document)
        .options(selectinload(Document.sub_lesson).selectinload(SubLesson.lesson).selectinload(Lesson.course))
        .where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    lesson = doc.sub_lesson.lesson

    if "teacher" in user_roles:
        if lesson.assigned_teacher_id == current_user.id:
            return current_user

    if "converter" in user_roles:
        if lesson.assigned_converter_id == current_user.id:
            return current_user

    if "expert" in user_roles:
        if lesson.course.assigned_expert_id == current_user.id:
            return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You are not assigned to this document",
    )


TeacherAssignedToSubLesson = Annotated[User, Depends(teacher_assigned_to_sublesson)]
TeacherAssignedToDocument = Annotated[User, Depends(teacher_assigned_to_document)]


async def teacher_assigned_to_lesson(
    lesson_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Admin bypasses; teacher/converter must be assigned to the lesson."""
    await check_lesson_access(lesson_id, current_user, db)
    return current_user


TeacherAssignedToLesson = Annotated[User, Depends(teacher_assigned_to_lesson)]


async def check_lesson_access(
    lesson_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
) -> None:
    """Raise 403 if the user doesn't have access to the lesson. Admin bypasses."""
    user_roles = {r.role for r in current_user.roles if r.revoked_at is None}

    result = await db.execute(
        select(Lesson)
        .options(selectinload(Lesson.course))
        .where(Lesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    if "admin" in user_roles:
        return

    if "expert" in user_roles:
        if lesson.course.assigned_expert_id == current_user.id:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this lesson as an expert",
        )

    if "teacher" in user_roles:
        if lesson.assigned_teacher_id == current_user.id:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this lesson as a teacher",
        )

    if "converter" in user_roles:
        if lesson.assigned_converter_id == current_user.id:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this lesson as a converter",
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have permission to access this lesson",
    )


async def check_sublesson_access(
    sublesson_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
) -> None:
    """Raise 403 if the user doesn't have access to the sub-lesson. Admin bypasses."""
    user_roles = {r.role for r in current_user.roles if r.revoked_at is None}

    result = await db.execute(
        select(SubLesson)
        .options(selectinload(SubLesson.lesson).selectinload(Lesson.course))
        .where(SubLesson.id == sublesson_id)
    )
    sublesson = result.scalar_one_or_none()
    if not sublesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SubLesson not found")

    if "admin" in user_roles:
        return

    lesson = sublesson.lesson

    if "expert" in user_roles:
        if lesson.course.assigned_expert_id == current_user.id:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this sub-lesson as an expert",
        )

    if "teacher" in user_roles:
        if lesson.assigned_teacher_id == current_user.id:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this sub-lesson as a teacher",
        )

    if "converter" in user_roles:
        if lesson.assigned_converter_id == current_user.id:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this sub-lesson as a converter",
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have permission to access this sub-lesson",
    )
