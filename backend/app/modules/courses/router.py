import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, AdminOnly
from app.modules.courses import service, schema as course_schema

router = APIRouter()


@router.get("/", response_model=course_schema.CourseListResponse)
async def list_courses(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: AdminOnly,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
):
    return await service.list_courses(db, skip, limit, search)


@router.get("/{course_id}", response_model=course_schema.CourseWithLessonsResponse)
async def get_course(
    course_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: AdminOnly,
):
    return await service.get_course(db, course_id)


@router.post("/", response_model=course_schema.CourseWithLessonsResponse, status_code=201)
async def create_course(
    data: course_schema.CourseCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: AdminOnly,
):
    return await service.create_course(db, data, current_user.id)


@router.patch("/{course_id}", response_model=course_schema.CourseResponse)
async def update_course(
    course_id: uuid.UUID,
    data: course_schema.CourseUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: AdminOnly,
):
    return await service.update_course(db, course_id, data)


@router.delete("/{course_id}", status_code=204)
async def delete_course(
    course_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: AdminOnly,
):
    await service.delete_course(db, course_id)


# ─── Lesson routes (nested under course) ──────────────────────────────────────

@router.get(
    "/lessons/{lesson_id}",
    response_model=course_schema.LessonWithSubLessonsResponse,
)
async def get_lesson(
    lesson_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: AdminOnly,
):
    return await service.get_lesson(db, lesson_id)


@router.post(
    "/{course_id}/lessons",
    response_model=course_schema.LessonWithSubLessonsResponse,
    status_code=201,
)
async def create_lesson(
    course_id: uuid.UUID,
    data: course_schema.LessonCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: AdminOnly,
):
    return await service.create_lesson(db, course_id, data)


@router.patch("/lessons/{lesson_id}", response_model=course_schema.LessonResponse)
async def update_lesson(
    lesson_id: uuid.UUID,
    data: course_schema.LessonUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: AdminOnly,
):
    return await service.update_lesson(db, lesson_id, data)


@router.patch("/lessons/{lesson_id}/assign", response_model=course_schema.LessonResponse)
async def assign_lesson(
    lesson_id: uuid.UUID,
    data: course_schema.LessonAssignRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: AdminOnly,
):
    return await service.assign_lesson(db, lesson_id, data)


@router.delete("/lessons/{lesson_id}", status_code=204)
async def delete_lesson(
    lesson_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: AdminOnly,
):
    await service.delete_lesson(db, lesson_id)


# ─── SubLesson routes ─────────────────────────────────────────────────────────

@router.get(
    "/sub-lessons/{sublesson_id}",
    response_model=course_schema.SubLessonResponse,
)
async def get_sublesson(
    sublesson_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: AdminOnly,
):
    return await service.get_sublesson(db, sublesson_id)


@router.post(
    "/lessons/{lesson_id}/sub-lessons",
    response_model=course_schema.SubLessonResponse,
    status_code=201,
)
async def create_sublesson(
    lesson_id: uuid.UUID,
    data: course_schema.SubLessonCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: AdminOnly,
):
    return await service.create_sublesson(db, lesson_id, data)


@router.patch(
    "/sub-lessons/{sublesson_id}", response_model=course_schema.SubLessonResponse
)
async def update_sublesson(
    sublesson_id: uuid.UUID,
    data: course_schema.SubLessonUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: AdminOnly,
):
    return await service.update_sublesson(db, sublesson_id, data)


@router.delete("/sub-lessons/{sublesson_id}", status_code=204)
async def delete_sublesson(
    sublesson_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: AdminOnly,
):
    await service.delete_sublesson(db, sublesson_id)


@router.post(
    "/lessons/{lesson_id}/sub-lessons/batch-delete",
    status_code=204,
)
async def delete_sublesson_batch(
    lesson_id: uuid.UUID,
    ids: list[uuid.UUID],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: AdminOnly,
):
    for sublesson_id in ids:
        await service.delete_sublesson(db, sublesson_id)
