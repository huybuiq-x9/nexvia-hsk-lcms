import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import LCMSException
from app.core.storage import storage_service
from app.modules.questions import schema as q_schema
from app.modules.questions.model import Question, QuestionBlank, QuestionChoice
from app.modules.users.model import User
from app.shared.enums import QuestionStatus, QuestionType, UserRole

ALLOWED_IMAGE_MIME = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_AUDIO_MIME = {"audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav"}
ALLOWED_MIME = ALLOWED_IMAGE_MIME | ALLOWED_AUDIO_MIME

MEDIA_EXT_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
}


def _active_roles(user: User) -> set[str]:
    return {r.role for r in user.roles if r.revoked_at is None}


def _is_admin(user: User) -> bool:
    return UserRole.ADMIN.value in _active_roles(user)


def _is_teacher(user: User) -> bool:
    return UserRole.TEACHER.value in _active_roles(user)


def _is_expert(user: User) -> bool:
    return UserRole.EXPERT.value in _active_roles(user)


def _resolve_content_block(block: dict | None) -> dict | None:
    """Inject presigned media_url into a ContentBlock dict."""
    if not block:
        return block
    key = block.get("media_key")
    if key:
        block = dict(block)
        block["media_url"] = storage_service.get_presigned_download_url(key)
    return block


def _resolve_question(q: Question) -> Question:
    """Mutate a Question's JSONB fields to inject presigned URLs (in-place on dicts)."""
    q.stem = _resolve_content_block(q.stem)
    q.explanation = _resolve_content_block(q.explanation)
    for choice in q.choices:
        choice.content = _resolve_content_block(choice.content)
    return q


class QuestionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── helpers ───────────────────────────────────────────────────────────────

    async def _get_or_404(self, question_id: uuid.UUID) -> Question:
        result = await self.db.execute(
            select(Question)
            .options(selectinload(Question.choices), selectinload(Question.blanks))
            .where(Question.id == question_id, Question.deleted_at.is_(None))
        )
        q = result.scalar_one_or_none()
        if not q:
            raise LCMSException(message="Question not found", status_code=404)
        return q

    def _assert_teacher_owner(self, q: Question, user: User) -> None:
        if _is_admin(user):
            return
        if not (_is_teacher(user) and q.created_by == user.id):
            raise LCMSException(message="Only the question owner can modify it", status_code=403)

    def _assert_editable(self, q: Question, user: User) -> None:
        self._assert_teacher_owner(q, user)
        if q.status != QuestionStatus.DRAFT:
            raise LCMSException(
                message="Only draft questions can be modified", status_code=409
            )

    # ── CRUD ──────────────────────────────────────────────────────────────────

    async def create(self, data: q_schema.QuestionCreate, user: User) -> Question:
        if not (_is_teacher(user) or _is_admin(user)):
            raise LCMSException(message="Only teachers can create questions", status_code=403)

        q = Question(
            sub_lesson_id=data.sub_lesson_id,
            question_type=data.question_type,
            difficulty=data.difficulty,
            tags=data.tags,
            stem=data.stem.model_dump(exclude_none=True),
            explanation=data.explanation.model_dump(exclude_none=True) if data.explanation else None,
            order_index=data.order_index,
            status=QuestionStatus.DRAFT,
            created_by=user.id,
            updated_by=user.id,
        )
        self.db.add(q)
        await self.db.flush()

        for i, c in enumerate(data.choices):
            choice = QuestionChoice(
                question_id=q.id,
                content=c.content.model_dump(exclude_none=True),
                is_correct=c.is_correct,
                order_index=c.order_index if c.order_index is not None else i,
                correct_order=c.correct_order,
                group_name=c.group_name,
                created_by=user.id,
                updated_by=user.id,
            )
            self.db.add(choice)

        for b in data.blanks:
            blank = QuestionBlank(
                question_id=q.id,
                blank_index=b.blank_index,
                accepted_answers=b.accepted_answers,
                case_sensitive=b.case_sensitive,
                created_by=user.id,
                updated_by=user.id,
            )
            self.db.add(blank)

        await self.db.commit()
        await self.db.refresh(q)
        result = await self.db.execute(
            select(Question)
            .options(selectinload(Question.choices), selectinload(Question.blanks))
            .where(Question.id == q.id)
        )
        q = result.scalar_one()
        return _resolve_question(q)

    async def list(
        self,
        user: User,
        sub_lesson_id: uuid.UUID | None,
        question_type: QuestionType | None,
        status: QuestionStatus | None,
        difficulty: str | None,
        skip: int,
        limit: int,
    ) -> q_schema.QuestionListResponse:
        stmt = (
            select(Question)
            .options(selectinload(Question.choices), selectinload(Question.blanks))
            .where(Question.deleted_at.is_(None))
        )

        if not _is_admin(user) and not _is_expert(user):
            # teacher sees only their own questions
            stmt = stmt.where(Question.created_by == user.id)

        if sub_lesson_id:
            stmt = stmt.where(Question.sub_lesson_id == sub_lesson_id)
        if question_type:
            stmt = stmt.where(Question.question_type == question_type)
        if status:
            stmt = stmt.where(Question.status == status)
        if difficulty:
            stmt = stmt.where(Question.difficulty == difficulty)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.db.execute(count_stmt)).scalar_one()

        stmt = stmt.order_by(Question.order_index, Question.created_at).offset(skip).limit(limit)
        rows = (await self.db.execute(stmt)).scalars().all()
        items = [_resolve_question(q) for q in rows]
        return q_schema.QuestionListResponse(total=total, items=items)

    async def get(self, question_id: uuid.UUID, user: User) -> Question:
        q = await self._get_or_404(question_id)
        if not _is_admin(user) and not _is_expert(user):
            if q.created_by != user.id:
                raise LCMSException(message="Not authorized", status_code=403)
        return _resolve_question(q)

    async def update(
        self, question_id: uuid.UUID, data: q_schema.QuestionUpdate, user: User
    ) -> Question:
        q = await self._get_or_404(question_id)
        self._assert_editable(q, user)

        if data.difficulty is not None:
            q.difficulty = data.difficulty
        if data.tags is not None:
            q.tags = data.tags
        if data.stem is not None:
            q.stem = data.stem.model_dump(exclude_none=True)
        if data.explanation is not None:
            q.explanation = data.explanation.model_dump(exclude_none=True)
        if data.order_index is not None:
            q.order_index = data.order_index
        q.updated_by = user.id

        if data.choices is not None:
            for c in q.choices:
                await self.db.delete(c)
            await self.db.flush()
            for i, c in enumerate(data.choices):
                self.db.add(QuestionChoice(
                    question_id=q.id,
                    content=c.content.model_dump(exclude_none=True),
                    is_correct=c.is_correct,
                    order_index=c.order_index if c.order_index is not None else i,
                    correct_order=c.correct_order,
                    group_name=c.group_name,
                    created_by=user.id,
                    updated_by=user.id,
                ))

        if data.blanks is not None:
            for b in q.blanks:
                await self.db.delete(b)
            await self.db.flush()
            for b in data.blanks:
                self.db.add(QuestionBlank(
                    question_id=q.id,
                    blank_index=b.blank_index,
                    accepted_answers=b.accepted_answers,
                    case_sensitive=b.case_sensitive,
                    created_by=user.id,
                    updated_by=user.id,
                ))

        await self.db.commit()
        return await self.get(question_id, user)

    async def delete(self, question_id: uuid.UUID, user: User) -> None:
        from datetime import datetime, timezone
        q = await self._get_or_404(question_id)
        self._assert_teacher_owner(q, user)
        q.deleted_at = datetime.now(timezone.utc)
        q.deleted_by = user.id
        await self.db.commit()

    # ── Media ─────────────────────────────────────────────────────────────────

    async def upload_media(
        self,
        question_id: uuid.UUID,
        target: str,
        choice_id: uuid.UUID | None,
        file: UploadFile,
        user: User,
    ) -> q_schema.MediaUploadResponse:
        q = await self._get_or_404(question_id)
        self._assert_teacher_owner(q, user)

        content_type = file.content_type or ""
        if content_type not in ALLOWED_MIME:
            raise LCMSException(
                message=f"Unsupported media type '{content_type}'. Allowed: image/jpeg, image/png, image/webp, audio/mpeg, audio/mp4, audio/ogg",
                status_code=422,
            )

        ext = MEDIA_EXT_MAP.get(content_type, Path(file.filename or "file").suffix)
        file_uuid = str(uuid.uuid4())

        if target == "stem":
            s3_key = f"questions/{question_id}/stem/{file_uuid}{ext}"
        elif target == "explanation":
            s3_key = f"questions/{question_id}/explanation/{file_uuid}{ext}"
        elif target == "choice" and choice_id:
            s3_key = f"questions/{question_id}/choices/{choice_id}/{file_uuid}{ext}"
        else:
            raise LCMSException(message="Invalid target or missing choice_id", status_code=422)

        content = await file.read()
        storage_service.upload_object(s3_key, content, content_type)
        media_url = storage_service.get_presigned_download_url(s3_key)

        block_patch = {
            "media_key": s3_key,
            "original_filename": file.filename or f"{file_uuid}{ext}",
        }

        if target == "stem":
            q.stem = {**(q.stem or {}), **block_patch}
            q.updated_by = user.id
        elif target == "explanation":
            q.explanation = {**(q.explanation or {}), **block_patch}
            q.updated_by = user.id
        elif target == "choice" and choice_id:
            result = await self.db.execute(
                select(QuestionChoice).where(
                    QuestionChoice.id == choice_id, QuestionChoice.question_id == q.id
                )
            )
            choice = result.scalar_one_or_none()
            if not choice:
                raise LCMSException(message="Choice not found", status_code=404)
            choice.content = {**(choice.content or {}), **block_patch}
            choice.updated_by = user.id

        await self.db.commit()
        return q_schema.MediaUploadResponse(
            media_key=s3_key,
            media_url=media_url,
            original_filename=file.filename or f"{file_uuid}{ext}",
        )

    async def delete_media(
        self, question_id: uuid.UUID, media_key: str, user: User
    ) -> None:
        q = await self._get_or_404(question_id)
        self._assert_teacher_owner(q, user)

        if not media_key.startswith(f"questions/{question_id}/"):
            raise LCMSException(message="Media key does not belong to this question", status_code=422)

        storage_service.delete_file(media_key)

        def _strip_media(block: dict | None) -> dict | None:
            if block and block.get("media_key") == media_key:
                block = dict(block)
                block.pop("media_key", None)
                block.pop("media_url", None)
                block.pop("original_filename", None)
            return block

        q.stem = _strip_media(q.stem)
        q.explanation = _strip_media(q.explanation)

        for choice in q.choices:
            choice.content = _strip_media(choice.content)

        q.updated_by = user.id
        await self.db.commit()

    # ── Review ────────────────────────────────────────────────────────────────

    async def publish(
        self, question_id: uuid.UUID, user: User, comment: str | None
    ) -> Question:
        if not (_is_expert(user) or _is_admin(user)):
            raise LCMSException(message="Only experts can publish questions", status_code=403)
        q = await self._get_or_404(question_id)
        q.status = QuestionStatus.PUBLISHED
        q.updated_by = user.id
        await self.db.commit()
        return await self.get(question_id, user)

    async def reject(
        self, question_id: uuid.UUID, user: User, comment: str | None
    ) -> Question:
        if not (_is_expert(user) or _is_admin(user)):
            raise LCMSException(message="Only experts can reject questions", status_code=403)
        q = await self._get_or_404(question_id)
        q.status = QuestionStatus.DRAFT
        q.updated_by = user.id
        await self.db.commit()
        return await self.get(question_id, user)
