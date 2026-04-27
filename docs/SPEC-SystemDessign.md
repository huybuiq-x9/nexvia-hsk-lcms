# LCMS Backend — FastAPI Project Structure

> **Stack:** FastAPI + SQLAlchemy 2.0 (async) + Alembic + PostgreSQL  
> **Pattern:** Modular Monolith — mỗi feature là 1 module độc lập, model nằm trong module  
> **Python:** 3.11+

---

## Cấu trúc thư mục

```
lcms/                           ← root monorepo
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/v1/router.py
│   │   ├── core/               (config, security, deps, permissions)
│   │   ├── db/                 (base, session, migrations/)
│   │   ├── shared/             (base_model, enums, storage)
│   │   └── modules/            ← mỗi module có model.py riêng
│   │       ├── auth/
│   │       ├── users/
│   │       ├── courses/
│   │       ├── lessons/
│   │       ├── sub_lessons/    (+ status_machine.py)
│   │       ├── materials/
│   │       ├── scorm/
│   │       ├── questions/
│   │       ├── exams/
│   │       ├── reviews/
│   │       └── notifications/
│   └── tests/
├── frontend/
│   └── src/
│       ├── app/                (App.tsx, router, layouts)
│       ├── pages/              (admin/ teacher/ expert/ converter/)
│       ├── features/           (api.ts + types.ts theo domain)
│       ├── components/         (common/ course/ review/)
│       ├── hooks/
│       ├── lib/
│       └── store/
└── infra/
    ├── nginx/
    └── github-actions/
```

---

## Chi tiết từng thành phần quan trọng

### `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.config import settings

app = FastAPI(
    title="LCMS API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
```

---

### `app/api/v1/router.py`

```python
from fastapi import APIRouter
from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.courses.router import router as courses_router
from app.modules.lessons.router import router as lessons_router
from app.modules.sub_lessons.router import router as sub_lessons_router
from app.modules.materials.router import router as materials_router
from app.modules.scorm.router import router as scorm_router
from app.modules.questions.router import router as questions_router
from app.modules.exams.router import router as exams_router
from app.modules.reviews.router import router as reviews_router
from app.modules.notifications.router import router as notifications_router

api_router = APIRouter()

api_router.include_router(auth_router,          prefix="/auth",          tags=["Auth"])
api_router.include_router(users_router,         prefix="/users",         tags=["Users"])
api_router.include_router(courses_router,       prefix="/courses",       tags=["Courses"])
api_router.include_router(lessons_router,       prefix="/lessons",       tags=["Lessons"])
api_router.include_router(sub_lessons_router,   prefix="/sub-lessons",   tags=["Sub Lessons"])
api_router.include_router(materials_router,     prefix="/sub-lessons",   tags=["Materials"])
api_router.include_router(scorm_router,         prefix="/sub-lessons",   tags=["SCORM"])
api_router.include_router(questions_router,     prefix="/questions",     tags=["Questions"])
api_router.include_router(exams_router,         prefix="/exams",         tags=["Exams"])
api_router.include_router(reviews_router,       prefix="/reviews",       tags=["Reviews"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
```

---

### `app/core/config.py`

```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str  # postgresql+asyncpg://user:pass@host/dbname

    # S3 / MinIO
    S3_ENDPOINT_URL: str
    S3_ACCESS_KEY: str
    S3_SECRET_KEY: str
    S3_BUCKET_NAME: str
    S3_PUBLIC_URL: str

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    # Question Bank
    QUESTION_DRAW_SIZE: int = 5     # Số câu random khi học

    class Config:
        env_file = ".env"

settings = Settings()
```

---

### `app/core/deps.py`

```python
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.core.security import decode_access_token
from app.modules.users.model import User
from app.shared.enums import UserRole

bearer = HTTPBearer()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    payload = decode_access_token(credentials.credentials)
    user = await db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user

def role_required(*roles: UserRole):
    """Decorator-style dependency kiểm tra role"""
    async def checker(
        current_user: Annotated[User, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(get_db)],
    ) -> User:
        user_roles = {ur.role for ur in current_user.roles if ur.revoked_at is None}
        if not any(role in user_roles for role in roles):
            raise HTTPException(status_code=403, detail="Forbidden")
        return current_user
    return checker

# Shorthand dependencies
AdminOnly      = Depends(role_required(UserRole.ADMIN))
TeacherOnly    = Depends(role_required(UserRole.TEACHER))
ExpertOnly     = Depends(role_required(UserRole.EXPERT))
ConverterOnly  = Depends(role_required(UserRole.CONVERTER))
AdminOrExpert  = Depends(role_required(UserRole.ADMIN, UserRole.EXPERT))
```

---

### `app/shared/base_model.py`

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class BaseModel(Base):
    """Mixin dùng chung cho tất cả models"""
    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
```

---

### `app/shared/enums.py`

```python
import enum

class UserRole(str, enum.Enum):
    ADMIN     = "admin"
    TEACHER   = "teacher"
    EXPERT    = "expert"
    CONVERTER = "converter"

class CourseStatus(str, enum.Enum):
    DRAFT             = "draft"
    IN_PROGRESS       = "in_progress"
    READY_TO_PUBLISH  = "ready_to_publish"
    PUBLISHED         = "published"
    UNPUBLISHED       = "unpublished"

class LessonStatus(str, enum.Enum):
    DRAFT       = "draft"
    IN_PROGRESS = "in_progress"
    APPROVED    = "approved"

class SubLessonStatus(str, enum.Enum):
    DRAFT            = "draft"
    IN_PROGRESS      = "in_progress"
    SUBMITTED        = "submitted"
    REVIEWING        = "reviewing"
    IN_CONVERSION    = "in_conversion"
    SCORM_UPLOADED   = "scorm_uploaded"
    SCORM_REVIEWING  = "scorm_reviewing"
    APPROVED         = "approved"

class ExamStatus(str, enum.Enum):
    DRAFT      = "draft"
    SUBMITTED  = "submitted"
    REVIEWING  = "reviewing"
    PUBLISHED  = "published"
    REJECTED   = "rejected"
    ARCHIVED   = "archived"

class QuestionType(str, enum.Enum):
    SINGLE_CHOICE     = "single_choice"
    MULTI_CHOICE      = "multi_choice"
    FILL_BLANK        = "fill_blank"
    TRUE_FALSE        = "true_false"
    MATCHING          = "matching"
    PICTURE_MATCHING  = "picture_matching"
    FORM_DIALOGUE     = "form_dialogue"
    SENTENCE_ORDERING = "sentence_ordering"

class DifficultyLevel(str, enum.Enum):
    EASY   = "easy"
    MEDIUM = "medium"
    HARD   = "hard"

class ReviewAction(str, enum.Enum):
    SUBMIT           = "submit"
    APPROVE          = "approve"
    REJECT           = "reject"
    UPLOAD_SCORM     = "upload_scorm"
    ASSIGN_CONVERTER = "assign_converter"
    PUBLISH          = "publish"
    UNPUBLISH        = "unpublish"
    ASSIGN_TEACHER   = "assign_teacher"
    ASSIGN_EXPERT    = "assign_expert"

class NotificationEvent(str, enum.Enum):
    TEACHER_SUBMITTED         = "teacher_submitted"
    EXPERT_REJECTED_SUBLESSON = "expert_rejected_sublesson"
    EXPERT_APPROVED_CONTENT   = "expert_approved_content"
    CONVERTER_UPLOADED_SCORM  = "converter_uploaded_scorm"
    EXPERT_REJECTED_SCORM     = "expert_rejected_scorm"
    EXPERT_APPROVED_SCORM     = "expert_approved_scorm"
    ADMIN_PUBLISHED_COURSE    = "admin_published_course"
    TEACHER_SUBMITTED_EXAM    = "teacher_submitted_exam"
    EXPERT_REJECTED_EXAM      = "expert_rejected_exam"
    EXPERT_APPROVED_EXAM      = "expert_approved_exam"
    TEACHER_ADDED_TO_COURSE   = "teacher_added_to_course"
    EXPERT_ASSIGNED_TO_COURSE = "expert_assigned_to_course"
```

---

### Ví dụ module: `app/modules/sub_lessons/model.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.shared.base_model import BaseModel
from app.shared.enums import SubLessonStatus

class SubLesson(BaseModel):
    __tablename__ = "sub_lessons"

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lessons.id"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[SubLessonStatus] = mapped_column(
        SAEnum(SubLessonStatus, name="sub_lesson_status"),
        nullable=False,
        default=SubLessonStatus.DRAFT,
    )
    order_index: Mapped[int] = mapped_column(nullable=False, default=0)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    lesson: Mapped["Lesson"] = relationship(back_populates="sub_lessons")
    materials: Mapped[list["SubLessonMaterial"]] = relationship(back_populates="sub_lesson")
    scorm_packages: Mapped[list["ScormPackage"]] = relationship(back_populates="sub_lesson")
    questions: Mapped[list["Question"]] = relationship(back_populates="sub_lesson")
    exams: Mapped[list["Exam"]] = relationship(back_populates="sub_lesson")
```

---

### Ví dụ module: `app/modules/sub_lessons/status_machine.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.shared.enums import SubLessonStatus, LessonStatus, CourseStatus
from app.core.exceptions import InvalidStatusTransitionError

# Các transition được phép
ALLOWED_TRANSITIONS: dict[SubLessonStatus, list[SubLessonStatus]] = {
    SubLessonStatus.DRAFT:           [SubLessonStatus.IN_PROGRESS],
    SubLessonStatus.IN_PROGRESS:     [SubLessonStatus.SUBMITTED],
    SubLessonStatus.SUBMITTED:       [SubLessonStatus.REVIEWING],
    SubLessonStatus.REVIEWING:       [SubLessonStatus.IN_CONVERSION, SubLessonStatus.IN_PROGRESS],
    SubLessonStatus.IN_CONVERSION:   [SubLessonStatus.SCORM_UPLOADED],
    SubLessonStatus.SCORM_UPLOADED:  [SubLessonStatus.SCORM_REVIEWING],
    SubLessonStatus.SCORM_REVIEWING: [SubLessonStatus.APPROVED, SubLessonStatus.IN_CONVERSION],
    SubLessonStatus.APPROVED:        [],
}

def validate_transition(current: SubLessonStatus, next: SubLessonStatus) -> None:
    if next not in ALLOWED_TRANSITIONS.get(current, []):
        raise InvalidStatusTransitionError(
            f"Cannot transition from '{current}' to '{next}'"
        )

async def transition(
    db: AsyncSession,
    sub_lesson: "SubLesson",
    new_status: SubLessonStatus,
) -> None:
    """Chuyển trạng thái sub-lesson và propagate lên Lesson + Course"""
    validate_transition(sub_lesson.status, new_status)
    sub_lesson.status = new_status
    await db.flush()
    await _propagate_to_lesson(db, sub_lesson.lesson_id)

async def _propagate_to_lesson(db: AsyncSession, lesson_id: uuid.UUID) -> None:
    from app.modules.lessons.model import Lesson
    from app.modules.sub_lessons.model import SubLesson

    lesson = await db.get(Lesson, lesson_id)
    if not lesson:
        return

    result = await db.execute(
        select(SubLesson.status)
        .where(SubLesson.lesson_id == lesson_id)
        .where(SubLesson.deleted_at.is_(None))
    )
    statuses = [row[0] for row in result.all()]

    if all(s == SubLessonStatus.APPROVED for s in statuses):
        lesson.status = LessonStatus.APPROVED
    elif any(s != SubLessonStatus.DRAFT for s in statuses):
        lesson.status = LessonStatus.IN_PROGRESS

    await db.flush()
    await _propagate_to_course(db, lesson.course_id)

async def _propagate_to_course(db: AsyncSession, course_id: uuid.UUID) -> None:
    from app.modules.courses.model import Course
    from app.modules.lessons.model import Lesson

    course = await db.get(Course, course_id)
    if not course:
        return

    result = await db.execute(
        select(Lesson.status)
        .where(Lesson.course_id == course_id)
        .where(Lesson.deleted_at.is_(None))
    )
    statuses = [row[0] for row in result.all()]

    if all(s == LessonStatus.APPROVED for s in statuses):
        course.status = CourseStatus.READY_TO_PUBLISH
    elif any(s != LessonStatus.DRAFT for s in statuses):
        course.status = CourseStatus.IN_PROGRESS

    await db.flush()
```

---

### Ví dụ module: `app/modules/sub_lessons/router.py`

```python
from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, get_current_user, role_required, TeacherOnly
from app.shared.enums import UserRole
from app.modules.sub_lessons import service, schema
from app.modules.users.model import User

router = APIRouter()

@router.get("/{sub_lesson_id}", response_model=schema.SubLessonResponse)
async def get_sub_lesson(
    sub_lesson_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return await service.get_by_id(db, sub_lesson_id)

@router.post("/", response_model=schema.SubLessonResponse)
async def create_sub_lesson(
    payload: schema.SubLessonCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, TeacherOnly],
):
    return await service.create(db, payload, current_user)

@router.post("/{sub_lesson_id}/submit")
async def submit_sub_lesson(
    sub_lesson_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, TeacherOnly],
):
    return await service.submit(db, sub_lesson_id, current_user)
```

---

### `app/db/base.py`

```python
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

# Import tất cả models ở đây để Alembic autogenerate nhận đủ
from app.modules.auth.model import RefreshToken          # noqa
from app.modules.users.model import User, UserRole       # noqa
from app.modules.courses.model import Course             # noqa
from app.modules.lessons.model import Lesson             # noqa
from app.modules.sub_lessons.model import SubLesson      # noqa
from app.modules.materials.model import SubLessonMaterial # noqa
from app.modules.scorm.model import ScormPackage         # noqa
from app.modules.questions.model import Question, QuestionMedia, QuestionOption  # noqa
from app.modules.exams.model import Exam, ExamSection, ExamQuestion, ExamQuestionOption  # noqa
from app.modules.reviews.model import ReviewLog          # noqa
from app.modules.notifications.model import Notification, EmailLog  # noqa
```

---

## `requirements.txt`

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
asyncpg==0.29.0
alembic==1.13.1
pydantic==2.7.1
pydantic-settings==2.2.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
boto3==1.34.84
httpx==0.27.0
```

## `requirements-dev.txt`

```
pytest==8.2.0
pytest-asyncio==0.23.6
pytest-cov==5.0.0
httpx==0.27.0
faker==24.11.0
ruff==0.4.4
```

---

## Quy tắc quan trọng

| Quy tắc | Lý do |
|---|---|
| **Model nằm trong module**, không có folder `models/` riêng | Tránh circular import, dễ tìm |
| **Import model trong `db/base.py`** | Alembic autogenerate cần thấy đủ models |
| **Service không import router**, router import service | Tránh circular dependency |
| **Status machine tách file riêng** | Logic phức tạp, cần unit test độc lập |
| **Dùng `async` toàn bộ** | FastAPI + asyncpg cho throughput tốt hơn |
| **Mỗi router là 1 `APIRouter()`** | Gộp vào `api/v1/router.py` để dễ quản lý prefix/tag |
| **`shared/enums.py` là single source of truth** | Tránh duplicate string enum giữa modules |