import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import (
    AdminOnly,
    ConverterSubmitScormAccess,
    CurrentUser,
    ExpertAssignedToSubLesson,
    ExpertReviewScormAccess,
    TeacherAssignedToLesson,
    TeacherAssignedToSubLesson,
    TeacherSubmitAccessToSubLesson,
    get_db,
)
from app.modules.courses import schema as course_schema
from app.modules.courses.service import CourseService, LessonService, SubLessonService
from app.shared.enums import LessonStatus, SubLessonStatus

router = APIRouter()


def get_course_service(db: Annotated[AsyncSession, Depends(get_db)]) -> CourseService:
    return CourseService(db)


def get_lesson_service(db: Annotated[AsyncSession, Depends(get_db)]) -> LessonService:
    return LessonService(db)


def get_sublesson_service(db: Annotated[AsyncSession, Depends(get_db)]) -> SubLessonService:
    return SubLessonService(db)


# ─── Course Routes ───────────────────────────────────────────────────────────────

@router.get("/", response_model=course_schema.CourseListResponse)
async def list_courses(
    service: Annotated[CourseService, Depends(get_course_service)],
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
):
    return await service.list(current_user, skip, limit, search)


@router.get("/{course_id}", response_model=course_schema.CourseWithLessonsResponse)
async def get_course(
    course_id: uuid.UUID,
    service: Annotated[CourseService, Depends(get_course_service)],
    current_user: CurrentUser,
):
    return await service.get(current_user, course_id)


@router.post("/", response_model=course_schema.CourseWithLessonsResponse, status_code=201)
async def create_course(
    data: course_schema.CourseCreate,
    service: Annotated[CourseService, Depends(get_course_service)],
    current_user: AdminOnly,
):
    return await service.create(data, current_user.id)


@router.patch("/{course_id}", response_model=course_schema.CourseResponse)
async def update_course(
    course_id: uuid.UUID,
    data: course_schema.CourseUpdate,
    service: Annotated[CourseService, Depends(get_course_service)],
    current_user: AdminOnly,
):
    return await service.update(course_id, data)


@router.delete("/{course_id}", status_code=204)
async def delete_course(
    course_id: uuid.UUID,
    service: Annotated[CourseService, Depends(get_course_service)],
    current_user: AdminOnly,
):
    await service.delete(course_id)


# ─── Standalone Lessons List ───────────────────────────────────────────────────

@router.get(
    "/lessons/",
    response_model=course_schema.LessonListResponse,
)
async def list_lessons(
    service: Annotated[LessonService, Depends(get_lesson_service)],
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    course_id: uuid.UUID | None = None,
    status: LessonStatus | None = None,
    expert_ids: list[uuid.UUID] = Query(default=[]),
    teacher_ids: list[uuid.UUID] = Query(default=[]),
    converter_ids: list[uuid.UUID] = Query(default=[]),
):
    return await service.list(current_user, skip, limit, search, course_id, status, expert_ids or None, teacher_ids or None, converter_ids or None)


# ─── Lesson Routes (nested under course) ──────────────────────────────────────

@router.get(
    "/lessons/{lesson_id}",
    response_model=course_schema.LessonWithSubLessonsResponse,
)
async def get_lesson(
    lesson_id: uuid.UUID,
    service: Annotated[LessonService, Depends(get_lesson_service)],
    current_user: CurrentUser,
):
    return await service.get(lesson_id)


@router.post(
    "/{course_id}/lessons",
    response_model=course_schema.LessonWithSubLessonsResponse,
    status_code=201,
)
async def create_lesson(
    course_id: uuid.UUID,
    data: course_schema.LessonCreate,
    service: Annotated[LessonService, Depends(get_lesson_service)],
    current_user: AdminOnly,
):
    return await service.create(course_id, data)


@router.patch("/lessons/{lesson_id}", response_model=course_schema.LessonResponse)
async def update_lesson(
    lesson_id: uuid.UUID,
    data: course_schema.LessonUpdate,
    service: Annotated[LessonService, Depends(get_lesson_service)],
    current_user: TeacherAssignedToLesson,
):
    return await service.update(lesson_id, data)


@router.patch("/lessons/{lesson_id}/assign", response_model=course_schema.LessonResponse)
async def assign_lesson(
    lesson_id: uuid.UUID,
    data: course_schema.LessonAssignRequest,
    service: Annotated[LessonService, Depends(get_lesson_service)],
    current_user: AdminOnly,
):
    return await service.assign(lesson_id, data)


@router.delete("/lessons/{lesson_id}", status_code=204)
async def delete_lesson(
    lesson_id: uuid.UUID,
    service: Annotated[LessonService, Depends(get_lesson_service)],
    current_user: TeacherAssignedToLesson,
):
    await service.delete(lesson_id)


# ─── Standalone SubLessons List ───────────────────────────────────────────────

@router.get(
    "/sub-lessons/",
    response_model=course_schema.SubLessonListResponse,
)
async def list_sub_lessons(
    service: Annotated[SubLessonService, Depends(get_sublesson_service)],
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    course_id: uuid.UUID | None = None,
    lesson_id: uuid.UUID | None = None,
    status: SubLessonStatus | None = None,
    expert_ids: list[uuid.UUID] = Query(default=[]),
    teacher_ids: list[uuid.UUID] = Query(default=[]),
    converter_ids: list[uuid.UUID] = Query(default=[]),
):
    return await service.list(current_user, skip, limit, search, course_id, lesson_id, status, expert_ids or None, teacher_ids or None, converter_ids or None)


# ─── SubLesson Routes ─────────────────────────────────────────────────────────

@router.get(
    "/sub-lessons/{sublesson_id}",
    response_model=course_schema.SubLessonResponse,
)
async def get_sublesson(
    sublesson_id: uuid.UUID,
    service: Annotated[SubLessonService, Depends(get_sublesson_service)],
    current_user: CurrentUser,
):
    return await service.get(sublesson_id)


@router.get(
    "/sub-lessons/{sublesson_id}/review-logs",
    response_model=course_schema.ReviewLogListResponse,
)
async def list_sublesson_review_logs(
    sublesson_id: uuid.UUID,
    service: Annotated[SubLessonService, Depends(get_sublesson_service)],
    current_user: TeacherAssignedToSubLesson,
    skip: int = 0,
    limit: int = 50,
):
    return await service.list_review_logs(sublesson_id, skip=skip, limit=limit)


@router.post(
    "/lessons/{lesson_id}/sub-lessons",
    response_model=course_schema.SubLessonResponse,
    status_code=201,
)
async def create_sublesson(
    lesson_id: uuid.UUID,
    data: course_schema.SubLessonCreate,
    service: Annotated[SubLessonService, Depends(get_sublesson_service)],
    current_user: TeacherAssignedToLesson,
):
    return await service.create(lesson_id, data)


@router.patch(
    "/sub-lessons/{sublesson_id}", response_model=course_schema.SubLessonResponse
)
async def update_sublesson(
    sublesson_id: uuid.UUID,
    data: course_schema.SubLessonUpdate,
    service: Annotated[SubLessonService, Depends(get_sublesson_service)],
    current_user: TeacherAssignedToSubLesson,
):
    return await service.update(sublesson_id, data)


@router.delete("/sub-lessons/{sublesson_id}", status_code=204)
async def delete_sublesson(
    sublesson_id: uuid.UUID,
    service: Annotated[SubLessonService, Depends(get_sublesson_service)],
    current_user: TeacherAssignedToSubLesson,
):
    await service.delete(sublesson_id)


@router.post(
    "/lessons/{lesson_id}/sub-lessons/batch-delete",
    status_code=204,
)
async def delete_sublesson_batch(
    lesson_id: uuid.UUID,
    ids: list[uuid.UUID],
    service: Annotated[SubLessonService, Depends(get_sublesson_service)],
    current_user: TeacherAssignedToLesson,
):
    await service.delete_batch(lesson_id, ids)


@router.post(
    "/sub-lessons/{sublesson_id}/submit",
    response_model=course_schema.SubLessonResponse,
)
async def submit_sublesson(
    sublesson_id: uuid.UUID,
    service: Annotated[SubLessonService, Depends(get_sublesson_service)],
    current_user: TeacherSubmitAccessToSubLesson,
):
    return await service.submit(sublesson_id, current_user.id)


@router.post(
    "/sub-lessons/{sublesson_id}/review",
    response_model=course_schema.SubLessonResponse,
)
async def review_sublesson(
    sublesson_id: uuid.UUID,
    data: course_schema.SubLessonReviewRequest,
    service: Annotated[SubLessonService, Depends(get_sublesson_service)],
    current_user: ExpertAssignedToSubLesson,
):
    return await service.review(sublesson_id, data.action, current_user.id)


@router.post(
    "/sub-lessons/{sublesson_id}/submit-scorm",
    response_model=course_schema.SubLessonResponse,
)
async def submit_scorm_sublesson(
    sublesson_id: uuid.UUID,
    service: Annotated[SubLessonService, Depends(get_sublesson_service)],
    current_user: ConverterSubmitScormAccess,
):
    return await service.submit_scorm(sublesson_id, current_user.id)


@router.post(
    "/sub-lessons/{sublesson_id}/review-scorm",
    response_model=course_schema.SubLessonResponse,
)
async def review_scorm_sublesson(
    sublesson_id: uuid.UUID,
    data: course_schema.ScormReviewRequest,
    service: Annotated[SubLessonService, Depends(get_sublesson_service)],
    current_user: ExpertReviewScormAccess,
):
    return await service.review_scorm(sublesson_id, data.action, current_user.id)


@router.post(
    "/sub-lessons/{sublesson_id}/revert",
    response_model=course_schema.SubLessonResponse,
)
async def revert_sublesson(
    sublesson_id: uuid.UUID,
    data: course_schema.SubLessonRevertRequest,
    service: Annotated[SubLessonService, Depends(get_sublesson_service)],
    current_user: AdminOnly,
):
    return await service.revert(sublesson_id, data.target_status, current_user.id, data.comment)
