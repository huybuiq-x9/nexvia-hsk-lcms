# Import all models here for Alembic autogenerate
from app.modules.auth.model import RefreshToken  # noqa: F401
from app.modules.users.model import User, UserRoleAssignment  # noqa: F401
from app.modules.courses.model import Course, Lesson, ReviewLog, SubLesson  # noqa: F401
from app.modules.documents.model import Document  # noqa: F401
from app.modules.scorm.model import ScormPackage  # noqa: F401
from app.modules.questions.model import Question, QuestionChoice, QuestionBlank  # noqa: F401
