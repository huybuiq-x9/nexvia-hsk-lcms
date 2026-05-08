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
from app.shared.enums import SubLessonStatus, UserRole

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

    if not user or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def _active_role_values(user: User) -> set[str]:
    return {r.role for r in user.roles if r.revoked_at is None}


def _is_admin(roles: set[str]) -> bool:
    return UserRole.ADMIN.value in roles


def _is_assigned_teacher(sublesson: SubLesson, user: User, roles: set[str]) -> bool:
    return (
        UserRole.TEACHER.value in roles
        and sublesson.lesson.assigned_teacher_id == user.id
    )


def _is_assigned_converter(sublesson: SubLesson, user: User, roles: set[str]) -> bool:
    return (
        UserRole.CONVERTER.value in roles
        and sublesson.lesson.assigned_converter_id == user.id
    )


def _is_assigned_expert(sublesson: SubLesson, user: User, roles: set[str]) -> bool:
    return (
        UserRole.EXPERT.value in roles
        and sublesson.lesson.course.assigned_expert_id == user.id
    )


async def _load_sublesson_for_access(
    sublesson_id: uuid.UUID,
    db: AsyncSession,
) -> SubLesson:
    result = await db.execute(
        select(SubLesson)
        .options(selectinload(SubLesson.lesson).selectinload(Lesson.course))
        .where(SubLesson.id == sublesson_id)
    )
    sublesson = result.scalar_one_or_none()
    if not sublesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SubLesson not found")
    return sublesson


def _can_view_documents(sublesson: SubLesson, user: User, roles: set[str]) -> bool:
    if _is_admin(roles):
        return True
    if _is_assigned_teacher(sublesson, user, roles):
        return sublesson.status in (SubLessonStatus.DRAFT, SubLessonStatus.IN_PROGRESS)
    if _is_assigned_expert(sublesson, user, roles):
        return sublesson.status == SubLessonStatus.REVIEWING
    if _is_assigned_converter(sublesson, user, roles):
        return sublesson.status == SubLessonStatus.CONVERTING
    return False


def _can_upload_documents(sublesson: SubLesson, user: User, roles: set[str]) -> bool:
    if _is_admin(roles):
        return True
    return (
        _is_assigned_teacher(sublesson, user, roles)
        and sublesson.status in (SubLessonStatus.DRAFT, SubLessonStatus.IN_PROGRESS)
    )


def _can_comment_documents(sublesson: SubLesson, user: User, roles: set[str]) -> bool:
    if _is_admin(roles):
        return True
    if _is_assigned_teacher(sublesson, user, roles):
        return sublesson.status in (SubLessonStatus.DRAFT, SubLessonStatus.IN_PROGRESS)
    if _is_assigned_expert(sublesson, user, roles):
        return sublesson.status == SubLessonStatus.REVIEWING
    return False


def _can_view_scorm(sublesson: SubLesson, user: User, roles: set[str]) -> bool:
    if _is_admin(roles):
        return True
    if _is_assigned_converter(sublesson, user, roles):
        return sublesson.status == SubLessonStatus.CONVERTING
    if _is_assigned_expert(sublesson, user, roles):
        return sublesson.status == SubLessonStatus.SCORM_REVIEWING
    return False


def _can_upload_scorm(sublesson: SubLesson, user: User, roles: set[str]) -> bool:
    if _is_admin(roles):
        return True
    return (
        _is_assigned_converter(sublesson, user, roles)
        and sublesson.status == SubLessonStatus.CONVERTING
    )


def _can_comment_scorm(sublesson: SubLesson, user: User, roles: set[str]) -> bool:
    if _is_admin(roles):
        return True
    return (
        _is_assigned_expert(sublesson, user, roles)
        and sublesson.status == SubLessonStatus.SCORM_REVIEWING
    )


def role_required(*roles: UserRole):
    required_roles = {role.value for role in roles}

    async def checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        user_roles = _active_role_values(current_user)
        if user_roles.isdisjoint(required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to perform this action",
            )
        return current_user
    return checker


CurrentUser = Annotated[User, Depends(get_current_user)]
AdminOnly = Annotated[User, Depends(role_required(UserRole.ADMIN))]
TeacherOnly = Annotated[User, Depends(role_required(UserRole.TEACHER))]
ExpertOnly = Annotated[User, Depends(role_required(UserRole.EXPERT))]
ConverterOnly = Annotated[User, Depends(role_required(UserRole.CONVERTER))]
AdminOrExpert = Annotated[User, Depends(role_required(UserRole.ADMIN, UserRole.EXPERT))]


async def teacher_assigned_to_sublesson(
    sublesson_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    user_roles = _active_role_values(current_user)
    if UserRole.ADMIN.value in user_roles:
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

    if UserRole.TEACHER.value in user_roles:
        if lesson.assigned_teacher_id == current_user.id:
            return current_user

    if UserRole.CONVERTER.value in user_roles:
        if lesson.assigned_converter_id == current_user.id:
            return current_user

    if UserRole.EXPERT.value in user_roles:
        if lesson.course.assigned_expert_id == current_user.id:
            return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You are not assigned to this Sub-Lesson",
    )


async def expert_assigned_to_sublesson(
    sublesson_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Admin or expert assigned to the parent course of the sublesson."""
    user_roles = _active_role_values(current_user)
    if UserRole.ADMIN.value in user_roles:
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

    if UserRole.EXPERT.value in user_roles:
        if lesson.course.assigned_expert_id == current_user.id:
            return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You are not assigned as an expert to this Sub-Lesson",
    )


async def teacher_assigned_to_document(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    from app.modules.documents.model import Document
    user_roles = _active_role_values(current_user)
    if UserRole.ADMIN.value in user_roles:
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

    if UserRole.TEACHER.value in user_roles:
        if lesson.assigned_teacher_id == current_user.id:
            return current_user

    if UserRole.CONVERTER.value in user_roles:
        if lesson.assigned_converter_id == current_user.id:
            return current_user

    if UserRole.EXPERT.value in user_roles:
        if lesson.course.assigned_expert_id == current_user.id:
            return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You are not assigned to this document",
    )


async def document_view_access_to_sublesson(
    sublesson_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    roles = _active_role_values(current_user)
    sublesson = await _load_sublesson_for_access(sublesson_id, db)
    if _can_view_documents(sublesson, current_user, roles):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have permission to view documents for this Sub-Lesson",
    )


async def document_upload_access_to_sublesson(
    sublesson_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    roles = _active_role_values(current_user)
    sublesson = await _load_sublesson_for_access(sublesson_id, db)
    if _can_upload_documents(sublesson, current_user, roles):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only the assigned teacher can upload documents before content review",
    )


async def _load_document_sublesson_for_access(
    document_id: uuid.UUID,
    db: AsyncSession,
):
    from app.modules.documents.model import Document

    result = await db.execute(
        select(Document)
        .options(selectinload(Document.sub_lesson).selectinload(SubLesson.lesson).selectinload(Lesson.course))
        .where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document.sub_lesson


async def document_view_access_to_document(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    roles = _active_role_values(current_user)
    sublesson = await _load_document_sublesson_for_access(document_id, db)
    if _can_view_documents(sublesson, current_user, roles):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have permission to access this document",
    )


async def document_comment_access_to_document(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    roles = _active_role_values(current_user)
    sublesson = await _load_document_sublesson_for_access(document_id, db)
    if _can_comment_documents(sublesson, current_user, roles):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have permission to comment on this document",
    )


async def document_delete_access_to_document(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    roles = _active_role_values(current_user)
    sublesson = await _load_document_sublesson_for_access(document_id, db)
    if _can_upload_documents(sublesson, current_user, roles):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only the assigned teacher can delete documents before content review",
    )


async def document_upload_access_to_document(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    roles = _active_role_values(current_user)
    sublesson = await _load_document_sublesson_for_access(document_id, db)
    if _can_upload_documents(sublesson, current_user, roles):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only the assigned teacher can re-upload documents before content review",
    )


async def scorm_view_access_to_sublesson(
    sublesson_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    roles = _active_role_values(current_user)
    sublesson = await _load_sublesson_for_access(sublesson_id, db)
    if _can_view_scorm(sublesson, current_user, roles):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have permission to access SCORM for this Sub-Lesson",
    )


async def scorm_upload_access_to_sublesson(
    sublesson_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    roles = _active_role_values(current_user)
    sublesson = await _load_sublesson_for_access(sublesson_id, db)
    if _can_upload_scorm(sublesson, current_user, roles):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only the assigned converter can upload SCORM while converting",
    )


async def scorm_comment_access_to_sublesson(
    sublesson_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    roles = _active_role_values(current_user)
    sublesson = await _load_sublesson_for_access(sublesson_id, db)
    if _can_comment_scorm(sublesson, current_user, roles):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have permission to comment on SCORM for this Sub-Lesson",
    )


async def teacher_submit_access_to_sublesson(
    sublesson_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    return await document_upload_access_to_sublesson(sublesson_id, current_user, db)


async def converter_submit_access_to_sublesson(
    sublesson_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    return await scorm_upload_access_to_sublesson(sublesson_id, current_user, db)


TeacherAssignedToSubLesson = Annotated[User, Depends(teacher_assigned_to_sublesson)]
ExpertAssignedToSubLesson = Annotated[User, Depends(expert_assigned_to_sublesson)]
TeacherAssignedToDocument = Annotated[User, Depends(teacher_assigned_to_document)]
DocumentViewAccessToSubLesson = Annotated[User, Depends(document_view_access_to_sublesson)]
DocumentUploadAccessToSubLesson = Annotated[User, Depends(document_upload_access_to_sublesson)]
DocumentViewAccessToDocument = Annotated[User, Depends(document_view_access_to_document)]
DocumentCommentAccessToDocument = Annotated[User, Depends(document_comment_access_to_document)]
DocumentDeleteAccessToDocument = Annotated[User, Depends(document_delete_access_to_document)]
DocumentUploadAccessToDocument = Annotated[User, Depends(document_upload_access_to_document)]
ScormViewAccessToSubLesson = Annotated[User, Depends(scorm_view_access_to_sublesson)]
ScormUploadAccessToSubLesson = Annotated[User, Depends(scorm_upload_access_to_sublesson)]
ScormCommentAccessToSubLesson = Annotated[User, Depends(scorm_comment_access_to_sublesson)]
TeacherSubmitAccessToSubLesson = Annotated[User, Depends(teacher_submit_access_to_sublesson)]
ConverterSubmitAccessToSubLesson = Annotated[User, Depends(converter_submit_access_to_sublesson)]


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
    user_roles = _active_role_values(current_user)

    result = await db.execute(
        select(Lesson)
        .options(selectinload(Lesson.course))
        .where(Lesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    if UserRole.ADMIN.value in user_roles:
        return

    if UserRole.EXPERT.value in user_roles:
        if lesson.course.assigned_expert_id == current_user.id:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this lesson as an expert",
        )

    if UserRole.TEACHER.value in user_roles:
        if lesson.assigned_teacher_id == current_user.id:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this lesson as a teacher",
        )

    if UserRole.CONVERTER.value in user_roles:
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
    user_roles = _active_role_values(current_user)

    result = await db.execute(
        select(SubLesson)
        .options(selectinload(SubLesson.lesson).selectinload(Lesson.course))
        .where(SubLesson.id == sublesson_id)
    )
    sublesson = result.scalar_one_or_none()
    if not sublesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SubLesson not found")

    if UserRole.ADMIN.value in user_roles:
        return

    lesson = sublesson.lesson

    if UserRole.EXPERT.value in user_roles:
        if lesson.course.assigned_expert_id == current_user.id:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this sub-lesson as an expert",
        )

    if UserRole.TEACHER.value in user_roles:
        if lesson.assigned_teacher_id == current_user.id:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this sub-lesson as a teacher",
        )

    if UserRole.CONVERTER.value in user_roles:
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
