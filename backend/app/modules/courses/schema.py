from datetime import datetime
import uuid
from typing import Annotated
from pydantic import BaseModel, Field, ConfigDict


class SubLessonBase(BaseModel):
    title: Annotated[str, Field(min_length=1, max_length=500)]
    description: str | None = None
    order_index: int = 0


class SubLessonCreate(SubLessonBase):
    pass


class SubLessonUpdate(BaseModel):
    title: Annotated[str | None, Field(min_length=1, max_length=500)] = None
    description: str | None = None
    order_index: int | None = None


class SubLessonResponse(SubLessonBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    lesson_id: uuid.UUID
    status: str
    submitted_at: datetime | None
    approved_at: datetime | None
    created_at: datetime
    updated_at: datetime


class LessonBase(BaseModel):
    title: Annotated[str, Field(min_length=1, max_length=500)]
    description: str | None = None


class LessonCreate(BaseModel):
    title: Annotated[str, Field(min_length=1, max_length=500)]
    description: str | None = None
    order_index: int = 0
    teacher_id: uuid.UUID | None = None
    converter_id: uuid.UUID | None = None


class LessonUpdate(BaseModel):
    title: Annotated[str | None, Field(min_length=1, max_length=500)] = None
    description: str | None = None
    order_index: int | None = None


class LessonResponse(LessonBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    course_id: uuid.UUID
    assigned_teacher_id: uuid.UUID | None
    assigned_converter_id: uuid.UUID | None
    status: str
    order_index: int
    created_at: datetime
    updated_at: datetime


class LessonWithSubLessonsResponse(LessonResponse):
    sub_lessons: list[SubLessonResponse] = []


class LessonAssignRequest(BaseModel):
    teacher_id: uuid.UUID | None = None
    converter_id: uuid.UUID | None = None


class CourseBase(BaseModel):
    title: Annotated[str, Field(min_length=1, max_length=500)]
    description: str | None = None


class CourseCreate(BaseModel):
    title: Annotated[str, Field(min_length=1, max_length=500)]
    description: str | None = None
    assigned_expert_id: uuid.UUID
    lessons: list[LessonCreate] = []


class CourseUpdate(BaseModel):
    title: Annotated[str | None, Field(min_length=1, max_length=500)] = None
    description: str | None = None
    order_index: int | None = None


class CourseResponse(CourseBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    assigned_expert_id: uuid.UUID
    status: str
    order_index: int
    created_at: datetime
    updated_at: datetime


class LessonBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    description: str | None
    status: str
    order_index: int
    assigned_teacher_id: uuid.UUID | None
    assigned_converter_id: uuid.UUID | None
    sub_lessons_count: int = 0


class CourseWithLessonsResponse(CourseResponse):
    lessons: list[LessonBrief] = []


class CourseListResponse(BaseModel):
    total: int
    items: list[CourseWithLessonsResponse]
