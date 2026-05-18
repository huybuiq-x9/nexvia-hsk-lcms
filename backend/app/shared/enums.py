import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    EXPERT = "expert"
    CONVERTER = "converter"


class CourseStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    READY_TO_PUBLISH = "ready_to_publish"
    PUBLISHED = "published"
    UNPUBLISHED = "unpublished"


class LessonStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    APPROVED = "approved"


class SubLessonStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    REVIEWING = "reviewing"
    CONVERTING = "converting"
    APPROVED = "approved"
    REJECTED = "rejected"
    SCORM_REVIEWING = "scorm_reviewing"


class ScormPackageStatus(str, enum.Enum):
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class ExamStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REVIEWING = "reviewing"
    PUBLISHED = "published"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class QuestionType(str, enum.Enum):
    TF         = "tf"
    SC         = "sc"
    MC         = "mc"
    FIT        = "fit"
    FITS       = "fits"
    FIB        = "fib"
    SQ         = "sq"
    MAT        = "mat"
    PAIR_MATCH = "pair_match"


class QuestionStatus(str, enum.Enum):
    DRAFT     = "draft"
    PUBLISHED = "published"
    ARCHIVED  = "archived"


class ContentMediaType(str, enum.Enum):
    TEXT             = "text"
    IMAGE            = "image"
    AUDIO            = "audio"
    TEXT_IMAGE       = "text_image"
    TEXT_AUDIO       = "text_audio"
    TEXT_IMAGE_AUDIO = "text_image_audio"


class DifficultyLevel(str, enum.Enum):
    EASY   = "easy"
    MEDIUM = "medium"
    HARD   = "hard"


class QuestionCategory(str, enum.Enum):
    VOCABULARY = "vocabulary"
    GRAMMAR    = "grammar"
    READING    = "reading"


class ReviewAction(str, enum.Enum):
    SUBMIT = "submit"
    APPROVE = "approve"
    REJECT = "reject"
    UPLOAD_DOCUMENT = "upload_document"
    REUPLOAD_DOCUMENT = "reupload_document"
    ASSIGN_CONVERTER = "assign_converter"
    PUBLISH = "publish"
    UNPUBLISH = "unpublish"
    ASSIGN_TEACHER = "assign_teacher"
    ASSIGN_EXPERT = "assign_expert"
    UPLOAD_SCORM = "upload_scorm"
    REUPLOAD_SCORM = "reupload_scorm"
    SUBMIT_SCORM = "submit_scorm"
    APPROVE_SCORM = "approve_scorm"
    REJECT_SCORM = "reject_scorm"
    REVERT = "revert"


class NotificationEvent(str, enum.Enum):
    TEACHER_SUBMITTED = "teacher_submitted"
    EXPERT_REJECTED_SUBLESSON = "expert_rejected_sublesson"
    EXPERT_APPROVED_CONTENT = "expert_approved_content"
    ADMIN_PUBLISHED_COURSE = "admin_published_course"
    TEACHER_SUBMITTED_EXAM = "teacher_submitted_exam"
    EXPERT_REJECTED_EXAM = "expert_rejected_exam"
    EXPERT_APPROVED_EXAM = "expert_approved_exam"
    TEACHER_ADDED_TO_COURSE = "teacher_added_to_course"
    EXPERT_ASSIGNED_TO_COURSE = "expert_assigned_to_course"
