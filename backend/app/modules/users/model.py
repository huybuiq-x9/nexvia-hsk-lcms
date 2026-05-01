import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.shared.base_model import BaseModel
from app.shared.enums import UserRole

if TYPE_CHECKING:
    from app.modules.auth.model import RefreshToken


class User(BaseModel):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superadmin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    roles: Mapped[list["UserRoleAssignment"]] = relationship(
        "UserRoleAssignment",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    expert_courses: Mapped[list["Course"]] = relationship(
        "Course",
        back_populates="assigned_expert",
    )
    teacher_lessons: Mapped[list["Lesson"]] = relationship(
        "Lesson",
        back_populates="assigned_teacher",
        foreign_keys="Lesson.assigned_teacher_id",
    )
    converter_lessons: Mapped[list["Lesson"]] = relationship(
        "Lesson",
        back_populates="assigned_converter",
        foreign_keys="Lesson.assigned_converter_id",
    )

    def has_role(self, role: UserRole) -> bool:
        return any(
            r.role == role and r.revoked_at is None
            for r in self.roles
        )


class UserRoleAssignment(BaseModel):
    __tablename__ = "user_role_assignments"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="roles")
