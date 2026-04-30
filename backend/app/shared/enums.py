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
    SUBMITTED = "submitted"
    REVIEWING = "reviewing"
    IN_CONVERSION = "in_conversion"
    SCORM_UPLOADED = "scorm_uploaded"
    SCORM_REVIEWING = "scorm_reviewing"
    APPROVED = "approved"
    PUBLISHED = "published"


class ExamStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REVIEWING = "reviewing"
    PUBLISHED = "published"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class QuestionType(str, enum.Enum):
    SINGLE_CHOICE = "single_choice"
    MULTI_CHOICE = "multi_choice"
    FILL_BLANK = "fill_blank"
    TRUE_FALSE = "true_false"
    MATCHING = "matching"
    PICTURE_MATCHING = "picture_matching"
    FORM_DIALOGUE = "form_dialogue"
    SENTENCE_ORDERING = "sentence_ordering"


class DifficultyLevel(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class ReviewAction(str, enum.Enum):
    SUBMIT = "submit"
    APPROVE = "approve"
    REJECT = "reject"
    UPLOAD_SCORM = "upload_scorm"
    ASSIGN_CONVERTER = "assign_converter"
    PUBLISH = "publish"
    UNPUBLISH = "unpublish"
    ASSIGN_TEACHER = "assign_teacher"
    ASSIGN_EXPERT = "assign_expert"


class NotificationEvent(str, enum.Enum):
    TEACHER_SUBMITTED = "teacher_submitted"
    EXPERT_REJECTED_SUBLESSON = "expert_rejected_sublesson"
    EXPERT_APPROVED_CONTENT = "expert_approved_content"
    CONVERTER_UPLOADED_SCORM = "converter_uploaded_scorm"
    EXPERT_REJECTED_SCORM = "expert_rejected_scorm"
    EXPERT_APPROVED_SCORM = "expert_approved_scorm"
    ADMIN_PUBLISHED_COURSE = "admin_published_course"
    TEACHER_SUBMITTED_EXAM = "teacher_submitted_exam"
    EXPERT_REJECTED_EXAM = "expert_rejected_exam"
    EXPERT_APPROVED_EXAM = "expert_approved_exam"
    TEACHER_ADDED_TO_COURSE = "teacher_added_to_course"
    EXPERT_ASSIGNED_TO_COURSE = "expert_assigned_to_course"
