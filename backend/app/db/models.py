# Import all models here for Alembic autogenerate
from app.modules.auth.model import RefreshToken  # noqa: F401
from app.modules.users.model import User, UserRoleAssignment  # noqa: F401
from app.modules.courses.model import Course, Lesson, SubLesson  # noqa: F401
from app.modules.documents.model import Document  # noqa: F401
