import uuid
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.courses.model import Course, Lesson, SubLesson
from app.modules.courses import schema as course_schema
from app.modules.users.model import User
from app.core.exceptions import NotFoundError, AlreadyExistsError


def _to_course_response(course: Course) -> course_schema.CourseResponse:
    return course_schema.CourseResponse(
        id=course.id,
        title=course.title,
        description=course.description,
        assigned_expert_id=course.assigned_expert_id,
        status=course.status,
        order_index=course.order_index,
        created_at=course.created_at,
        updated_at=course.updated_at,
    )


def _to_lesson_response(lesson: Lesson) -> course_schema.LessonResponse:
    return course_schema.LessonResponse(
        id=lesson.id,
        course_id=lesson.course_id,
        assigned_teacher_id=lesson.assigned_teacher_id,
        assigned_converter_id=lesson.assigned_converter_id,
        title=lesson.title,
        description=lesson.description,
        status=lesson.status,
        order_index=lesson.order_index,
        created_at=lesson.created_at,
        updated_at=lesson.updated_at,
    )


def _to_sublesson_response(sl: SubLesson) -> course_schema.SubLessonResponse:
    return course_schema.SubLessonResponse(
        id=sl.id,
        lesson_id=sl.lesson_id,
        title=sl.title,
        description=sl.description,
        status=sl.status,
        order_index=sl.order_index,
        submitted_at=sl.submitted_at,
        approved_at=sl.approved_at,
        created_at=sl.created_at,
        updated_at=sl.updated_at,
    )


def _lesson_brief(lesson: Lesson) -> course_schema.LessonBrief:
    active_sub_lessons = [sl for sl in (lesson.sub_lessons or []) if sl.deleted_at is None]
    return course_schema.LessonBrief(
        id=lesson.id,
        title=lesson.title,
        description=lesson.description,
        status=lesson.status,
        order_index=lesson.order_index,
        assigned_teacher_id=lesson.assigned_teacher_id,
        assigned_converter_id=lesson.assigned_converter_id,
        sub_lessons_count=len(active_sub_lessons),
    )


def _to_course_with_lessons(course: Course) -> course_schema.CourseWithLessonsResponse:
    return course_schema.CourseWithLessonsResponse(
        id=course.id,
        title=course.title,
        description=course.description,
        assigned_expert_id=course.assigned_expert_id,
        status=course.status,
        order_index=course.order_index,
        created_at=course.created_at,
        updated_at=course.updated_at,
        lessons=sorted([_lesson_brief(l) for l in (course.lessons or []) if l.deleted_at is None], key=lambda l: l.order_index),
    )


async def _get_course_orm(db: AsyncSession, course_id: uuid.UUID) -> Course:
    result = await db.execute(
        select(Course)
        .options(selectinload(Course.lessons).selectinload(Lesson.sub_lessons))
        .where(Course.id == course_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise NotFoundError("Course", str(course_id))
    return course


async def _get_lesson_orm(db: AsyncSession, lesson_id: uuid.UUID) -> Lesson:
    result = await db.execute(
        select(Lesson)
        .options(selectinload(Lesson.sub_lessons))
        .where(Lesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise NotFoundError("Lesson", str(lesson_id))
    return lesson


async def _get_sublesson_orm(db: AsyncSession, sublesson_id: uuid.UUID) -> SubLesson:
    result = await db.execute(
        select(SubLesson).where(SubLesson.id == sublesson_id)
    )
    sl = result.scalar_one_or_none()
    if not sl:
        raise NotFoundError("SubLesson", str(sublesson_id))
    return sl


async def _get_user_orm(db: AsyncSession, user_id: uuid.UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User", str(user_id))
    return user


# ─── Course ──────────────────────────────────────────────────────────────────

async def list_courses(
    db: AsyncSession,
    current_user,
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
) -> course_schema.CourseListResponse:
    roles = _user_roles(current_user)

    query = (
        select(Course)
        .options(selectinload(Course.lessons).selectinload(Lesson.sub_lessons))
        .where(Course.deleted_at.is_(None))
    )

    if search:
        query = query.where(Course.title.ilike(f"%{search}%"))

    if "admin" not in roles:
        if "expert" in roles:
            query = query.where(Course.assigned_expert_id == current_user.id)
        elif "teacher" in roles or "converter" in roles:
            return course_schema.CourseListResponse(total=0, items=[])
        else:
            return course_schema.CourseListResponse(total=0, items=[])

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.offset(skip).limit(limit).order_by(Course.created_at.desc())
    result = await db.execute(query)
    courses = list(result.scalars().all())

    return course_schema.CourseListResponse(
        total=total,
        items=[_to_course_with_lessons(c) for c in courses],
    )


async def get_course(
    db: AsyncSession,
    current_user,
    course_id: uuid.UUID,
) -> course_schema.CourseWithLessonsResponse:
    roles = _user_roles(current_user)
    course = await _get_course_orm(db, course_id)

    if "admin" not in roles:
        if "expert" in roles:
            if course.assigned_expert_id != current_user.id:
                raise HTTPException(status_code=403, detail="You do not have access to this course")
        elif "teacher" in roles:
            # teacher has access via lesson, handled at lesson level
            pass
        elif "converter" in roles:
            pass
        else:
            raise HTTPException(status_code=403, detail="You do not have access to this course")
    return _to_course_with_lessons(course)


async def create_course(
    db: AsyncSession,
    data: course_schema.CourseCreate,
    current_user_id: uuid.UUID,
) -> course_schema.CourseWithLessonsResponse:
    await _get_user_orm(db, data.assigned_expert_id)

    course = Course(
        created_by=current_user_id,
        assigned_expert_id=data.assigned_expert_id,
        title=data.title,
        description=data.description,
    )
    db.add(course)
    await db.flush()

    for lesson_data in data.lessons:
        if lesson_data.teacher_id:
            await _get_user_orm(db, lesson_data.teacher_id)
        if lesson_data.converter_id:
            await _get_user_orm(db, lesson_data.converter_id)
        lesson = Lesson(
            course_id=course.id,
            title=lesson_data.title,
            description=lesson_data.description,
            order_index=lesson_data.order_index,
            assigned_teacher_id=lesson_data.teacher_id,
            assigned_converter_id=lesson_data.converter_id,
        )
        db.add(lesson)

    await db.commit()

    course = await _get_course_orm(db, course.id)
    return _to_course_with_lessons(course)


async def update_course(
    db: AsyncSession,
    course_id: uuid.UUID,
    data: course_schema.CourseUpdate,
) -> course_schema.CourseResponse:
    course = await _get_course_orm(db, course_id)
    if data.title is not None:
        course.title = data.title
    if data.description is not None:
        course.description = data.description
    if data.order_index is not None:
        course.order_index = data.order_index
    if data.assigned_expert_id is not None:
        await _get_user_orm(db, data.assigned_expert_id)
        course.assigned_expert_id = data.assigned_expert_id

    if data.delete_lesson_ids:
        for lid in data.delete_lesson_ids:
            result = await db.execute(select(Lesson).where(Lesson.id == lid, Lesson.course_id == course_id))
            lesson = result.scalar_one_or_none()
            if lesson:
                lesson.deleted_at = datetime.now(timezone.utc)

    if data.lessons is not None:
        for lesson_data in data.lessons:
            if lesson_data.teacher_id:
                await _get_user_orm(db, lesson_data.teacher_id)
            if lesson_data.converter_id:
                await _get_user_orm(db, lesson_data.converter_id)
            if lesson_data.id:
                result = await db.execute(select(Lesson).where(Lesson.id == lesson_data.id, Lesson.course_id == course_id))
                lesson = result.scalar_one_or_none()
                if lesson:
                    lesson.title = lesson_data.title
                    lesson.description = lesson_data.description
                    lesson.order_index = lesson_data.order_index
                    lesson.assigned_teacher_id = lesson_data.teacher_id
                    lesson.assigned_converter_id = lesson_data.converter_id
            else:
                lesson = Lesson(
                    course_id=course.id,
                    title=lesson_data.title,
                    description=lesson_data.description,
                    order_index=lesson_data.order_index,
                    assigned_teacher_id=lesson_data.teacher_id,
                    assigned_converter_id=lesson_data.converter_id,
                )
                db.add(lesson)

    await db.commit()
    await db.refresh(course)
    return _to_course_response(course)


async def delete_course(db: AsyncSession, course_id: uuid.UUID) -> None:
    course = await _get_course_orm(db, course_id)
    course.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# ─── Lesson ───────────────────────────────────────────────────────────────────

async def get_lesson(
    db: AsyncSession, lesson_id: uuid.UUID
) -> course_schema.LessonWithSubLessonsResponse:
    lesson = await _get_lesson_orm(db, lesson_id)
    active_sub_lessons = [
        _to_sublesson_response(sl)
        for sl in (lesson.sub_lessons or [])
        if sl.deleted_at is None
    ]
    active_sub_lessons.sort(key=lambda sl: sl.order_index)
    return course_schema.LessonWithSubLessonsResponse(
        id=lesson.id,
        course_id=lesson.course_id,
        title=lesson.title,
        description=lesson.description,
        status=lesson.status,
        order_index=lesson.order_index,
        assigned_teacher_id=lesson.assigned_teacher_id,
        assigned_converter_id=lesson.assigned_converter_id,
        created_at=lesson.created_at,
        updated_at=lesson.updated_at,
        sub_lessons=active_sub_lessons,
    )


async def create_lesson(
    db: AsyncSession,
    course_id: uuid.UUID,
    data: course_schema.LessonCreate,
) -> course_schema.LessonWithSubLessonsResponse:
    await _get_course_orm(db, course_id)
    if data.teacher_id:
        await _get_user_orm(db, data.teacher_id)
    if data.converter_id:
        await _get_user_orm(db, data.converter_id)

    lesson = Lesson(
        course_id=course_id,
        title=data.title,
        description=data.description,
        order_index=data.order_index,
        assigned_teacher_id=data.teacher_id,
        assigned_converter_id=data.converter_id,
    )
    db.add(lesson)
    await db.commit()

    lesson = await _get_lesson_orm(db, lesson.id)
    return course_schema.LessonWithSubLessonsResponse(
        id=lesson.id,
        course_id=lesson.course_id,
        assigned_teacher_id=lesson.assigned_teacher_id,
        assigned_converter_id=lesson.assigned_converter_id,
        title=lesson.title,
        description=lesson.description,
        status=lesson.status,
        order_index=lesson.order_index,
        created_at=lesson.created_at,
        updated_at=lesson.updated_at,
        sub_lessons=[],
    )


async def assign_lesson(
    db: AsyncSession,
    lesson_id: uuid.UUID,
    data: course_schema.LessonAssignRequest,
) -> course_schema.LessonResponse:
    lesson = await _get_lesson_orm(db, lesson_id)

    if data.teacher_id is not None:
        await _get_user_orm(db, data.teacher_id)
        lesson.assigned_teacher_id = data.teacher_id

    if data.converter_id is not None:
        await _get_user_orm(db, data.converter_id)
        lesson.assigned_converter_id = data.converter_id

    await db.commit()
    await db.refresh(lesson)
    return _to_lesson_response(lesson)


async def update_lesson(
    db: AsyncSession,
    lesson_id: uuid.UUID,
    data: course_schema.LessonUpdate,
) -> course_schema.LessonResponse:
    lesson = await _get_lesson_orm(db, lesson_id)
    if data.title is not None:
        lesson.title = data.title
    if data.description is not None:
        lesson.description = data.description
    if data.order_index is not None:
        lesson.order_index = data.order_index
    await db.commit()
    await db.refresh(lesson)
    return _to_lesson_response(lesson)


async def delete_lesson(db: AsyncSession, lesson_id: uuid.UUID) -> None:
    lesson = await _get_lesson_orm(db, lesson_id)
    lesson.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# ─── SubLesson ────────────────────────────────────────────────────────────────

async def get_sublesson(
    db: AsyncSession, sublesson_id: uuid.UUID
) -> course_schema.SubLessonResponse:
    sl = await _get_sublesson_orm(db, sublesson_id)
    return _to_sublesson_response(sl)


async def create_sublesson(
    db: AsyncSession,
    lesson_id: uuid.UUID,
    data: course_schema.SubLessonCreate,
) -> course_schema.SubLessonResponse:
    lesson = await _get_lesson_orm(db, lesson_id)

    sl = SubLesson(
        lesson_id=lesson.id,
        title=data.title,
        description=data.description,
        order_index=data.order_index,
    )
    db.add(sl)
    await db.commit()
    await db.refresh(sl)
    return _to_sublesson_response(sl)


async def update_sublesson(
    db: AsyncSession,
    sublesson_id: uuid.UUID,
    data: course_schema.SubLessonUpdate,
) -> course_schema.SubLessonResponse:
    sl = await _get_sublesson_orm(db, sublesson_id)
    if data.title is not None:
        sl.title = data.title
    if data.description is not None:
        sl.description = data.description
    if data.order_index is not None:
        sl.order_index = data.order_index
    await db.commit()
    await db.refresh(sl)
    return _to_sublesson_response(sl)


async def delete_sublesson(db: AsyncSession, sublesson_id: uuid.UUID) -> None:
    sl = await _get_sublesson_orm(db, sublesson_id)
    sl.deleted_at = datetime.now(timezone.utc)
    await db.commit()


async def delete_sublesson_batch(
    db: AsyncSession,
    lesson_id: uuid.UUID,
    ids: list[uuid.UUID],
) -> None:
    if not ids:
        return
    stmt = (
        update(SubLesson)
        .where(SubLesson.id.in_(ids))
        .where(SubLesson.lesson_id == lesson_id)
        .values(deleted_at=datetime.now(timezone.utc))
    )
    await db.execute(stmt)
    await db.commit()


# ─── Role-Based Access Helpers ────────────────────────────────────────────────

def _user_roles(user) -> set[str]:
    return {r.role for r in user.roles if r.revoked_at is None}


# ─── Standalone Lessons List ───────────────────────────────────────────────────

async def list_lessons(
    db: AsyncSession,
    current_user,
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
    course_id: uuid.UUID | None = None,
    status: str | None = None,
) -> course_schema.LessonListResponse:
    roles = _user_roles(current_user)

    query = (
        select(Lesson)
        .options(
            selectinload(Lesson.course),
            selectinload(Lesson.sub_lessons),
        )
        .where(Lesson.deleted_at.is_(None))
    )

    if search:
        query = query.where(Lesson.title.ilike(f"%{search}%"))

    if course_id is not None:
        query = query.where(Lesson.course_id == course_id)

    if status is not None:
        query = query.where(Lesson.status == status)

    # Role-based filtering
    if "admin" not in roles:
        if "expert" in roles:
            query = query.where(Lesson.course.has(assigned_expert_id=current_user.id))
        elif "teacher" in roles:
            query = query.where(Lesson.assigned_teacher_id == current_user.id)
        elif "converter" in roles:
            query = query.where(Lesson.assigned_converter_id == current_user.id)
        else:
            # No relevant role — return empty
            return course_schema.LessonListResponse(total=0, items=[])

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.offset(skip).limit(limit).order_by(Lesson.created_at.desc())
    result = await db.execute(query)
    lessons = list(result.scalars().all())

    items = []
    for lesson in lessons:
        active_sub = [sl for sl in (lesson.sub_lessons or []) if sl.deleted_at is None]
        items.append(course_schema.LessonListItem(
            id=lesson.id,
            title=lesson.title,
            description=lesson.description,
            status=lesson.status,
            order_index=lesson.order_index,
            assigned_teacher_id=lesson.assigned_teacher_id,
            assigned_converter_id=lesson.assigned_converter_id,
            sub_lessons_count=len(active_sub),
            course_title=lesson.course.title if lesson.course else None,
        ))

    return course_schema.LessonListResponse(total=total, items=items)


# ─── Standalone SubLessons List ───────────────────────────────────────────────

async def list_sub_lessons(
    db: AsyncSession,
    current_user,
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
    course_id: uuid.UUID | None = None,
    lesson_id: uuid.UUID | None = None,
    status: str | None = None,
) -> course_schema.SubLessonListResponse:
    roles = _user_roles(current_user)

    query = (
        select(SubLesson)
        .options(
            selectinload(SubLesson.lesson).selectinload(Lesson.course),
        )
        .where(SubLesson.deleted_at.is_(None))
    )

    if search:
        query = query.where(SubLesson.title.ilike(f"%{search}%"))

    if lesson_id is not None:
        query = query.where(SubLesson.lesson_id == lesson_id)

    if course_id is not None:
        query = query.where(SubLesson.lesson.has(Lesson.course_id == course_id))

    if status is not None:
        query = query.where(SubLesson.status == status)

    # Role-based filtering
    if "admin" not in roles:
        if "expert" in roles:
            query = query.where(
                SubLesson.lesson.has(
                    Lesson.course.has(assigned_expert_id=current_user.id)
                )
            )
        elif "teacher" in roles:
            query = query.where(SubLesson.lesson.has(assigned_teacher_id=current_user.id))
        elif "converter" in roles:
            query = query.where(SubLesson.lesson.has(assigned_converter_id=current_user.id))
        else:
            return course_schema.SubLessonListResponse(total=0, items=[])

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.offset(skip).limit(limit).order_by(SubLesson.created_at.desc())
    result = await db.execute(query)
    sublessons = list(result.scalars().all())

    items = []
    for sl in sublessons:
        lesson = sl.lesson
        course = lesson.course if lesson else None
        items.append(course_schema.SubLessonListItem(
            id=sl.id,
            lesson_id=sl.lesson_id,
            title=sl.title,
            description=sl.description,
            status=sl.status,
            order_index=sl.order_index,
            submitted_at=sl.submitted_at,
            approved_at=sl.approved_at,
            created_at=sl.created_at,
            updated_at=sl.updated_at,
            lesson_title=lesson.title if lesson else None,
            course_id=course.id if course else None,
            course_title=course.title if course else None,
        ))

    return course_schema.SubLessonListResponse(total=total, items=items)
