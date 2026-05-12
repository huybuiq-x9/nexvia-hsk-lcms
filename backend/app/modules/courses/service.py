import uuid
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.courses.model import Course, Lesson, ReviewLog, SubLesson
from app.modules.courses import schema as course_schema
from app.modules.users.model import User
from app.core.exceptions import NotFoundError
from app.shared.enums import LessonStatus, ReviewAction, SubLessonStatus, UserRole


# ─── Module-Level Helpers (shared across classes) ──────────────────────────────

def _status_value(status: SubLessonStatus | str | None) -> str | None:
    if status is None:
        return None
    return status.value if hasattr(status, "value") else str(status)


def _role_value(role: UserRole) -> str:
    return role.value


def _user_roles(user) -> set[str]:
    return {r.role for r in user.roles if r.revoked_at is None}


def _sublesson_snapshot(sl: SubLesson) -> dict:
    return {
        "id": str(sl.id),
        "lesson_id": str(sl.lesson_id),
        "title": sl.title,
        "description": sl.description,
        "status": _status_value(sl.status),
        "order_index": sl.order_index,
        "submitted_at": sl.submitted_at.isoformat() if sl.submitted_at else None,
        "approved_at": sl.approved_at.isoformat() if sl.approved_at else None,
        "scorm_filename": sl.scorm_filename,
        "scorm_file_size": sl.scorm_file_size,
        "scorm_uploaded_at": sl.scorm_uploaded_at.isoformat() if sl.scorm_uploaded_at else None,
        "scorm_uploaded_by_id": str(sl.scorm_uploaded_by_id) if sl.scorm_uploaded_by_id else None,
    }


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
        scorm_filename=sl.scorm_filename,
        scorm_file_size=sl.scorm_file_size,
        scorm_uploaded_at=sl.scorm_uploaded_at,
        scorm_uploaded_by_id=sl.scorm_uploaded_by_id,
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


def _add_review_log(
    db: AsyncSession,
    *,
    actor_id: uuid.UUID,
    sublesson: SubLesson,
    action: ReviewAction,
    from_status: SubLessonStatus | str | None,
    to_status: SubLessonStatus | str | None,
    comment: str | None = None,
) -> None:
    db.add(ReviewLog(
        actor_id=actor_id,
        entity_type="sub_lesson",
        entity_id=sublesson.id,
        action=action.value,
        from_status=_status_value(from_status),
        to_status=_status_value(to_status),
        comment=comment,
        snapshot=_sublesson_snapshot(sublesson),
    ))


# ─── Service Classes ────────────────────────────────────────────────────────────


class CourseService:
    """Service class for Course-related operations."""

    def __init__(self, db: AsyncSession):
        self._db = db

    async def _get_course_orm(self, course_id: uuid.UUID) -> Course:
        result = await self._db.execute(
            select(Course)
            .options(selectinload(Course.lessons).selectinload(Lesson.sub_lessons))
            .where(Course.id == course_id)
        )
        course = result.scalar_one_or_none()
        if not course:
            raise NotFoundError("Course", str(course_id))
        return course

    async def _get_user(self, user_id: uuid.UUID) -> User:
        result = await self._db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User", str(user_id))
        return user

    async def list(
        self,
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

        if _role_value(UserRole.ADMIN) not in roles:
            if _role_value(UserRole.EXPERT) in roles:
                query = query.where(Course.assigned_expert_id == current_user.id)
            elif _role_value(UserRole.TEACHER) in roles:
                query = query.join(Lesson, Lesson.course_id == Course.id).where(
                    Lesson.assigned_teacher_id == current_user.id,
                    Lesson.deleted_at.is_(None),
                )
            elif _role_value(UserRole.CONVERTER) in roles:
                query = query.join(Lesson, Lesson.course_id == Course.id).where(
                    Lesson.assigned_converter_id == current_user.id,
                    Lesson.deleted_at.is_(None),
                )
            else:
                return course_schema.CourseListResponse(total=0, items=[])

        count_q = select(func.count()).select_from(query.subquery())
        total = (await self._db.execute(count_q)).scalar() or 0

        query = query.offset(skip).limit(limit).order_by(Course.created_at.desc()).distinct()
        result = await self._db.execute(query)
        courses = list(result.scalars().all())

        return course_schema.CourseListResponse(
            total=total,
            items=[_to_course_with_lessons(c) for c in courses],
        )

    async def get(
        self,
        current_user,
        course_id: uuid.UUID,
    ) -> course_schema.CourseWithLessonsResponse:
        roles = _user_roles(current_user)
        course = await self._get_course_orm(course_id)

        if _role_value(UserRole.ADMIN) not in roles:
            if _role_value(UserRole.EXPERT) in roles:
                if course.assigned_expert_id != current_user.id:
                    raise HTTPException(status_code=403, detail="You do not have access to this course")
            elif _role_value(UserRole.TEACHER) in roles:
                result = await self._db.execute(
                    select(Lesson.id).where(
                        Lesson.course_id == course_id,
                        Lesson.assigned_teacher_id == current_user.id,
                        Lesson.deleted_at.is_(None),
                    ).limit(1)
                )
                if result.scalar_one_or_none() is None:
                    raise HTTPException(status_code=403, detail="You do not have access to this course")
            elif _role_value(UserRole.CONVERTER) in roles:
                result = await self._db.execute(
                    select(Lesson.id).where(
                        Lesson.course_id == course_id,
                        Lesson.assigned_converter_id == current_user.id,
                        Lesson.deleted_at.is_(None),
                    ).limit(1)
                )
                if result.scalar_one_or_none() is None:
                    raise HTTPException(status_code=403, detail="You do not have access to this course")
            else:
                raise HTTPException(status_code=403, detail="You do not have access to this course")
        return _to_course_with_lessons(course)

    async def create(
        self,
        data: course_schema.CourseCreate,
        current_user_id: uuid.UUID,
    ) -> course_schema.CourseWithLessonsResponse:
        await self._get_user(data.assigned_expert_id)

        course = Course(
            created_by=current_user_id,
            assigned_expert_id=data.assigned_expert_id,
            title=data.title,
            description=data.description,
        )
        self._db.add(course)
        await self._db.flush()

        for lesson_data in data.lessons:
            if lesson_data.teacher_id:
                await self._get_user(lesson_data.teacher_id)
            if lesson_data.converter_id:
                await self._get_user(lesson_data.converter_id)
            lesson = Lesson(
                course_id=course.id,
                title=lesson_data.title,
                description=lesson_data.description,
                order_index=lesson_data.order_index,
                assigned_teacher_id=lesson_data.teacher_id,
                assigned_converter_id=lesson_data.converter_id,
            )
            self._db.add(lesson)

        await self._db.commit()

        course = await self._get_course_orm(course.id)
        return _to_course_with_lessons(course)

    async def update(
        self,
        course_id: uuid.UUID,
        data: course_schema.CourseUpdate,
    ) -> course_schema.CourseResponse:
        course = await self._get_course_orm(course_id)
        if data.title is not None:
            course.title = data.title
        if data.description is not None:
            course.description = data.description
        if data.order_index is not None:
            course.order_index = data.order_index
        if data.assigned_expert_id is not None:
            await self._get_user(data.assigned_expert_id)
            course.assigned_expert_id = data.assigned_expert_id

        if data.delete_lesson_ids:
            for lid in data.delete_lesson_ids:
                result = await self._db.execute(select(Lesson).where(Lesson.id == lid, Lesson.course_id == course_id))
                lesson = result.scalar_one_or_none()
                if lesson:
                    lesson.deleted_at = datetime.now(timezone.utc)

        if data.lessons is not None:
            for lesson_data in data.lessons:
                if lesson_data.teacher_id:
                    await self._get_user(lesson_data.teacher_id)
                if lesson_data.converter_id:
                    await self._get_user(lesson_data.converter_id)
                if lesson_data.id:
                    result = await self._db.execute(select(Lesson).where(Lesson.id == lesson_data.id, Lesson.course_id == course_id))
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
                    self._db.add(lesson)

        await self._db.commit()
        await self._db.refresh(course)
        return _to_course_response(course)

    async def delete(self, course_id: uuid.UUID) -> None:
        course = await self._get_course_orm(course_id)
        now = datetime.now(timezone.utc)
        course.deleted_at = now

        for lesson in course.lessons:
            lesson.deleted_at = now
            for sublesson in lesson.sub_lessons:
                sublesson.deleted_at = now

        await self._db.commit()


class LessonService:
    """Service class for Lesson-related operations."""

    def __init__(self, db: AsyncSession):
        self._db = db

    async def _get_course_orm(self, course_id: uuid.UUID) -> Course:
        result = await self._db.execute(
            select(Course)
            .options(selectinload(Course.lessons).selectinload(Lesson.sub_lessons))
            .where(Course.id == course_id)
        )
        course = result.scalar_one_or_none()
        if not course:
            raise NotFoundError("Course", str(course_id))
        return course

    async def _get_lesson_orm(self, lesson_id: uuid.UUID) -> Lesson:
        result = await self._db.execute(
            select(Lesson)
            .options(selectinload(Lesson.sub_lessons))
            .where(Lesson.id == lesson_id)
        )
        lesson = result.scalar_one_or_none()
        if not lesson:
            raise NotFoundError("Lesson", str(lesson_id))
        return lesson

    async def _get_user(self, user_id: uuid.UUID) -> User:
        result = await self._db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User", str(user_id))
        return user

    async def get(
        self,
        lesson_id: uuid.UUID,
    ) -> course_schema.LessonWithSubLessonsResponse:
        lesson = await self._get_lesson_orm(lesson_id)
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

    async def create(
        self,
        course_id: uuid.UUID,
        data: course_schema.LessonCreate,
    ) -> course_schema.LessonWithSubLessonsResponse:
        await self._get_course_orm(course_id)
        if data.teacher_id:
            await self._get_user(data.teacher_id)
        if data.converter_id:
            await self._get_user(data.converter_id)

        lesson = Lesson(
            course_id=course_id,
            title=data.title,
            description=data.description,
            order_index=data.order_index,
            assigned_teacher_id=data.teacher_id,
            assigned_converter_id=data.converter_id,
        )
        self._db.add(lesson)
        await self._db.commit()

        lesson = await self._get_lesson_orm(lesson.id)
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

    async def assign(
        self,
        lesson_id: uuid.UUID,
        data: course_schema.LessonAssignRequest,
    ) -> course_schema.LessonResponse:
        lesson = await self._get_lesson_orm(lesson_id)

        if data.teacher_id is not None:
            await self._get_user(data.teacher_id)
            lesson.assigned_teacher_id = data.teacher_id

        if data.converter_id is not None:
            await self._get_user(data.converter_id)
            lesson.assigned_converter_id = data.converter_id

        await self._db.commit()
        await self._db.refresh(lesson)
        return _to_lesson_response(lesson)

    async def update(
        self,
        lesson_id: uuid.UUID,
        data: course_schema.LessonUpdate,
    ) -> course_schema.LessonResponse:
        lesson = await self._get_lesson_orm(lesson_id)
        if data.title is not None:
            lesson.title = data.title
        if data.description is not None:
            lesson.description = data.description
        if data.order_index is not None:
            lesson.order_index = data.order_index
        await self._db.commit()
        await self._db.refresh(lesson)
        return _to_lesson_response(lesson)

    async def delete(self, lesson_id: uuid.UUID) -> None:
        lesson = await self._get_lesson_orm(lesson_id)
        now = datetime.now(timezone.utc)
        lesson.deleted_at = now

        for sublesson in lesson.sub_lessons:
            sublesson.deleted_at = now

        await self._db.commit()

    async def list(
        self,
        current_user,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        course_id: uuid.UUID | None = None,
        status: LessonStatus | None = None,
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
            query = query.where(Lesson.status == status.value)

        if _role_value(UserRole.ADMIN) not in roles:
            if _role_value(UserRole.EXPERT) in roles:
                query = query.where(Lesson.course.has(assigned_expert_id=current_user.id))
            elif _role_value(UserRole.TEACHER) in roles:
                query = query.where(Lesson.assigned_teacher_id == current_user.id)
            elif _role_value(UserRole.CONVERTER) in roles:
                query = query.where(Lesson.assigned_converter_id == current_user.id)
            else:
                return course_schema.LessonListResponse(total=0, items=[])

        count_q = select(func.count()).select_from(query.subquery())
        total = (await self._db.execute(count_q)).scalar() or 0

        query = query.offset(skip).limit(limit).order_by(Lesson.created_at.desc())
        result = await self._db.execute(query)
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
                assigned_expert_id=lesson.course.assigned_expert_id if lesson.course else None,
                course_title=lesson.course.title if lesson.course else None,
            ))

        return course_schema.LessonListResponse(total=total, items=items)


class SubLessonService:
    """Service class for SubLesson-related operations."""

    def __init__(self, db: AsyncSession):
        self._db = db

    async def _get_lesson_orm(self, lesson_id: uuid.UUID) -> Lesson:
        result = await self._db.execute(
            select(Lesson)
            .options(selectinload(Lesson.sub_lessons))
            .where(Lesson.id == lesson_id)
        )
        lesson = result.scalar_one_or_none()
        if not lesson:
            raise NotFoundError("Lesson", str(lesson_id))
        return lesson

    async def _get_sublesson_orm(self, sublesson_id: uuid.UUID) -> SubLesson:
        result = await self._db.execute(
            select(SubLesson).where(SubLesson.id == sublesson_id)
        )
        sl = result.scalar_one_or_none()
        if not sl:
            raise NotFoundError("SubLesson", str(sublesson_id))
        return sl

    async def get(
        self,
        sublesson_id: uuid.UUID,
    ) -> course_schema.SubLessonResponse:
        sl = await self._get_sublesson_orm(sublesson_id)
        return _to_sublesson_response(sl)

    async def list_review_logs(
        self,
        sublesson_id: uuid.UUID,
    ) -> course_schema.ReviewLogListResponse:
        await self._get_sublesson_orm(sublesson_id)

        count_result = await self._db.execute(
            select(func.count(ReviewLog.id))
            .where(ReviewLog.entity_type == "sub_lesson")
            .where(ReviewLog.entity_id == sublesson_id)
        )
        total = count_result.scalar() or 0

        result = await self._db.execute(
            select(ReviewLog)
            .options(selectinload(ReviewLog.actor))
            .where(ReviewLog.entity_type == "sub_lesson")
            .where(ReviewLog.entity_id == sublesson_id)
            .order_by(ReviewLog.created_at.desc())
        )
        return course_schema.ReviewLogListResponse(total=total, items=list(result.scalars().all()))

    async def create(
        self,
        lesson_id: uuid.UUID,
        data: course_schema.SubLessonCreate,
    ) -> course_schema.SubLessonResponse:
        lesson = await self._get_lesson_orm(lesson_id)

        sl = SubLesson(
            lesson_id=lesson.id,
            title=data.title,
            description=data.description,
            order_index=data.order_index,
        )
        self._db.add(sl)
        await self._db.commit()
        await self._db.refresh(sl)
        return _to_sublesson_response(sl)

    async def update(
        self,
        sublesson_id: uuid.UUID,
        data: course_schema.SubLessonUpdate,
    ) -> course_schema.SubLessonResponse:
        sl = await self._get_sublesson_orm(sublesson_id)
        if data.title is not None:
            sl.title = data.title
        if data.description is not None:
            sl.description = data.description
        if data.order_index is not None:
            sl.order_index = data.order_index
        await self._db.commit()
        await self._db.refresh(sl)
        return _to_sublesson_response(sl)

    async def submit(
        self,
        sublesson_id: uuid.UUID,
        actor_id: uuid.UUID,
    ) -> course_schema.SubLessonResponse:
        sl = await self._get_sublesson_orm(sublesson_id)
        if sl.status not in (SubLessonStatus.DRAFT, SubLessonStatus.IN_PROGRESS):
            from app.core.exceptions import InvalidStatusTransitionError
            raise InvalidStatusTransitionError(
                f"Cannot submit sublesson: current status is '{_status_value(sl.status)}', "
                "only DRAFT or IN_PROGRESS can be submitted."
            )
        from_status = sl.status
        sl.status = SubLessonStatus.REVIEWING
        sl.submitted_at = datetime.now(timezone.utc)
        _add_review_log(
            self._db,
            actor_id=actor_id,
            sublesson=sl,
            action=ReviewAction.SUBMIT,
            from_status=from_status,
            to_status=sl.status,
        )
        await self._db.commit()
        await self._db.refresh(sl)
        return _to_sublesson_response(sl)

    async def review(
        self,
        sublesson_id: uuid.UUID,
        action: ReviewAction,
        actor_id: uuid.UUID,
    ) -> course_schema.SubLessonResponse:
        sl = await self._get_sublesson_orm(sublesson_id)
        from_status = sl.status

        if sl.status == SubLessonStatus.REVIEWING:
            if action == ReviewAction.APPROVE:
                sl.status = SubLessonStatus.CONVERTING
            elif action == ReviewAction.REJECT:
                sl.status = SubLessonStatus.IN_PROGRESS
            else:
                from app.core.exceptions import InvalidStatusTransitionError
                raise InvalidStatusTransitionError(
                    f"Invalid review action: '{action.value}'. Must be 'approve' or 'reject'."
                )
        elif sl.status == SubLessonStatus.SCORM_REVIEWING:
            if action == ReviewAction.APPROVE:
                sl.status = SubLessonStatus.APPROVED
                sl.approved_at = datetime.now(timezone.utc)
            elif action == ReviewAction.REJECT:
                sl.status = SubLessonStatus.CONVERTING
            else:
                from app.core.exceptions import InvalidStatusTransitionError
                raise InvalidStatusTransitionError(
                    f"Invalid review action: '{action.value}'. Must be 'approve' or 'reject'."
                )
        else:
            from app.core.exceptions import InvalidStatusTransitionError
            raise InvalidStatusTransitionError(
                f"Cannot review sublesson: current status is '{_status_value(sl.status)}', "
                "only REVIEWING or SCORM_REVIEWING can be reviewed."
            )

        _add_review_log(
            self._db,
            actor_id=actor_id,
            sublesson=sl,
            action=action,
            from_status=from_status,
            to_status=sl.status,
        )
        await self._db.commit()
        await self._db.refresh(sl)
        return _to_sublesson_response(sl)

    async def submit_scorm(
        self,
        sublesson_id: uuid.UUID,
        actor_id: uuid.UUID,
    ) -> course_schema.SubLessonResponse:
        sl = await self._get_sublesson_orm(sublesson_id)
        if sl.status != SubLessonStatus.CONVERTING:
            from app.core.exceptions import InvalidStatusTransitionError
            raise InvalidStatusTransitionError(
                f"Cannot submit SCORM: current status is '{_status_value(sl.status)}', "
                "only CONVERTING can submit SCORM for review."
            )
        if not sl.scorm_stored_name:
            from app.core.exceptions import InvalidStatusTransitionError
            raise InvalidStatusTransitionError("Cannot submit SCORM: no SCORM package has been uploaded.")
        from_status = sl.status
        sl.status = SubLessonStatus.SCORM_REVIEWING
        _add_review_log(
            self._db,
            actor_id=actor_id,
            sublesson=sl,
            action=ReviewAction.SUBMIT,
            from_status=from_status,
            to_status=sl.status,
        )
        await self._db.commit()
        await self._db.refresh(sl)
        return _to_sublesson_response(sl)

    async def delete(self, sublesson_id: uuid.UUID) -> None:
        sl = await self._get_sublesson_orm(sublesson_id)
        sl.deleted_at = datetime.now(timezone.utc)
        await self._db.commit()

    async def delete_batch(
        self,
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
        await self._db.execute(stmt)
        await self._db.commit()

    async def list(
        self,
        current_user,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        course_id: uuid.UUID | None = None,
        lesson_id: uuid.UUID | None = None,
        status: SubLessonStatus | None = None,
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
            query = query.where(SubLesson.status == status.value)

        if _role_value(UserRole.ADMIN) not in roles:
            if _role_value(UserRole.EXPERT) in roles:
                query = query.where(
                    SubLesson.lesson.has(
                        Lesson.course.has(assigned_expert_id=current_user.id)
                    )
                )
            elif _role_value(UserRole.TEACHER) in roles:
                query = query.where(SubLesson.lesson.has(assigned_teacher_id=current_user.id))
            elif _role_value(UserRole.CONVERTER) in roles:
                query = query.where(SubLesson.lesson.has(assigned_converter_id=current_user.id))
            else:
                return course_schema.SubLessonListResponse(total=0, items=[])

        count_q = select(func.count()).select_from(query.subquery())
        total = (await self._db.execute(count_q)).scalar() or 0

        query = query.offset(skip).limit(limit).order_by(SubLesson.created_at.desc())
        result = await self._db.execute(query)
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
                scorm_filename=sl.scorm_filename,
                scorm_file_size=sl.scorm_file_size,
                scorm_uploaded_at=sl.scorm_uploaded_at,
                scorm_uploaded_by_id=sl.scorm_uploaded_by_id,
                created_at=sl.created_at,
                updated_at=sl.updated_at,
                lesson_title=lesson.title if lesson else None,
                assigned_teacher_id=lesson.assigned_teacher_id if lesson else None,
                assigned_converter_id=lesson.assigned_converter_id if lesson else None,
                course_id=course.id if course else None,
                assigned_expert_id=course.assigned_expert_id if course else None,
                course_title=course.title if course else None,
            ))

        return course_schema.SubLessonListResponse(total=total, items=items)


# Alias for backward compatibility with other modules
add_review_log = _add_review_log
