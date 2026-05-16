import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, get_db
from app.modules.questions import schema as q_schema
from app.modules.questions.service import QuestionService
from app.shared.enums import DifficultyLevel, QuestionStatus, QuestionType

router = APIRouter()


def get_service(db: Annotated[AsyncSession, Depends(get_db)]) -> QuestionService:
    return QuestionService(db)


@router.post("/", response_model=q_schema.QuestionResponse, status_code=201)
async def create_question(
    data: q_schema.QuestionCreate,
    current_user: CurrentUser,
    service: Annotated[QuestionService, Depends(get_service)],
):
    return await service.create(data, current_user)


@router.get("/", response_model=q_schema.QuestionListResponse)
async def list_questions(
    current_user: CurrentUser,
    service: Annotated[QuestionService, Depends(get_service)],
    sub_lesson_id: uuid.UUID | None = Query(None),
    question_type: QuestionType | None = Query(None),
    status: QuestionStatus | None = Query(None),
    difficulty: DifficultyLevel | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    return await service.list(
        current_user, sub_lesson_id, question_type, status,
        difficulty.value if difficulty else None, skip, limit,
    )


@router.get("/{question_id}", response_model=q_schema.QuestionResponse)
async def get_question(
    question_id: uuid.UUID,
    current_user: CurrentUser,
    service: Annotated[QuestionService, Depends(get_service)],
):
    return await service.get(question_id, current_user)


@router.put("/{question_id}", response_model=q_schema.QuestionResponse)
async def update_question(
    question_id: uuid.UUID,
    data: q_schema.QuestionUpdate,
    current_user: CurrentUser,
    service: Annotated[QuestionService, Depends(get_service)],
):
    return await service.update(question_id, data, current_user)


@router.delete("/{question_id}", status_code=204)
async def delete_question(
    question_id: uuid.UUID,
    current_user: CurrentUser,
    service: Annotated[QuestionService, Depends(get_service)],
):
    await service.delete(question_id, current_user)


@router.post("/{question_id}/media", response_model=q_schema.MediaUploadResponse)
async def upload_media(
    question_id: uuid.UUID,
    current_user: CurrentUser,
    service: Annotated[QuestionService, Depends(get_service)],
    file: UploadFile = File(...),
    target: str = Form(...),          # "stem" | "explanation" | "choice"
    choice_id: uuid.UUID | None = Form(None),
):
    return await service.upload_media(question_id, target, choice_id, file, current_user)


@router.delete("/{question_id}/media", status_code=204)
async def delete_media(
    question_id: uuid.UUID,
    current_user: CurrentUser,
    service: Annotated[QuestionService, Depends(get_service)],
    media_key: str = Query(...),
):
    await service.delete_media(question_id, media_key, current_user)


@router.post("/{question_id}/publish", response_model=q_schema.QuestionResponse)
async def publish_question(
    question_id: uuid.UUID,
    current_user: CurrentUser,
    service: Annotated[QuestionService, Depends(get_service)],
    body: q_schema.QuestionReviewRequest = q_schema.QuestionReviewRequest(),
):
    return await service.publish(question_id, current_user, body.comment)


@router.post("/{question_id}/reject", response_model=q_schema.QuestionResponse)
async def reject_question(
    question_id: uuid.UUID,
    current_user: CurrentUser,
    service: Annotated[QuestionService, Depends(get_service)],
    body: q_schema.QuestionReviewRequest = q_schema.QuestionReviewRequest(),
):
    return await service.reject(question_id, current_user, body.comment)
