// Course / Lesson / SubLesson types matching FastAPI backend


// ─── Status Enums ─────────────────────────────────────────────────────────────

export const COURSE_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  READY_TO_PUBLISH: 'ready_to_publish',
  PUBLISHED: 'published',
  UNPUBLISHED: 'unpublished',
} as const;

export type CourseStatus = (typeof COURSE_STATUS)[keyof typeof COURSE_STATUS];

export const COURSE_STATUSES: CourseStatus[] = Object.values(COURSE_STATUS);

export const LESSON_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  APPROVED: 'approved',
} as const;

export type LessonStatus = (typeof LESSON_STATUS)[keyof typeof LESSON_STATUS];

export const LESSON_STATUSES: LessonStatus[] = Object.values(LESSON_STATUS);

export const SUB_LESSON_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  REVIEWING: 'reviewing',
  CONVERTING: 'converting',
  SCORM_REVIEWING: 'scorm_reviewing',
  APPROVED: 'approved',
} as const;

export type SubLessonStatus = (typeof SUB_LESSON_STATUS)[keyof typeof SUB_LESSON_STATUS];

export const SUB_LESSON_STATUSES: SubLessonStatus[] = Object.values(SUB_LESSON_STATUS);

// ─── Status Colors ────────────────────────────────────────────────────────────

export const COURSE_STATUS_COLORS: Record<CourseStatus, string> = {
  [COURSE_STATUS.DRAFT]:            'bg-slate-50 text-slate-600 border-slate-200',
  [COURSE_STATUS.IN_PROGRESS]:      'bg-blue-50 text-blue-700 border-blue-200',
  [COURSE_STATUS.READY_TO_PUBLISH]: 'bg-amber-50 text-amber-700 border-amber-200',
  [COURSE_STATUS.PUBLISHED]:        'bg-green-50 text-green-700 border-green-200',
  [COURSE_STATUS.UNPUBLISHED]:      'bg-red-50 text-red-600 border-red-200',
};

export const LESSON_STATUS_COLORS: Record<LessonStatus, string> = {
  [LESSON_STATUS.DRAFT]:       'bg-slate-50 text-slate-600 border-slate-200',
  [LESSON_STATUS.IN_PROGRESS]: 'bg-blue-50 text-blue-700 border-blue-200',
  [LESSON_STATUS.APPROVED]:    'bg-green-50 text-green-700 border-green-200',
};

export const SUB_LESSON_STATUS_COLORS: Record<SubLessonStatus, string> = {
  [SUB_LESSON_STATUS.DRAFT]:          'bg-slate-50 text-slate-600 border-slate-200',
  [SUB_LESSON_STATUS.IN_PROGRESS]:    'bg-blue-50 text-blue-700 border-blue-200',
  [SUB_LESSON_STATUS.REVIEWING]:      'bg-amber-50 text-amber-700 border-amber-200',
  [SUB_LESSON_STATUS.CONVERTING]:     'bg-purple-50 text-purple-700 border-purple-200',
  [SUB_LESSON_STATUS.SCORM_REVIEWING]: 'bg-orange-50 text-orange-700 border-orange-200',
  [SUB_LESSON_STATUS.APPROVED]:       'bg-green-50 text-green-700 border-green-200',
};

// ─── SubLesson ────────────────────────────────────────────────────────────────

export interface ApiSubLessonResponse {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  status: SubLessonStatus;
  order_index: number;
  submitted_at: string | null;
  approved_at: string | null;
  scorm_filename: string | null;
  scorm_file_size: number | null;
  scorm_uploaded_at: string | null;
  scorm_uploaded_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiSubLessonCreate {
  title: string;
  description?: string | null;
  order_index?: number;
}

export interface ApiSubLessonListItem {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  status: SubLessonStatus;
  order_index: number;
  submitted_at: string | null;
  approved_at: string | null;
  scorm_filename: string | null;
  scorm_file_size: number | null;
  scorm_uploaded_at: string | null;
  scorm_uploaded_by_id: string | null;
  created_at: string;
  updated_at: string;
  lesson_title: string | null;
  assigned_teacher_id: string | null;
  assigned_converter_id: string | null;
  course_id: string | null;
  assigned_expert_id: string | null;
  course_title: string | null;
}

export interface ApiSubLessonListResponse {
  total: number;
  items: ApiSubLessonListItem[];
}

export interface ApiSubLessonUpdate {
  title?: string;
  description?: string | null;
  order_index?: number;
}

export interface ApiSubLessonBatchDelete {
  ids: string[];
}

export type ReviewLogAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'upload_document'
  | 'reupload_document'
  | 'upload_scorm'
  | 'reupload_scorm'
  | 'assign_converter'
  | 'publish'
  | 'unpublish'
  | 'assign_teacher'
  | 'assign_expert';

export interface ApiReviewLogActor {
  id: string;
  full_name: string;
}

export interface ApiReviewLog {
  id: string;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  action: ReviewLogAction;
  from_status: string | null;
  to_status: string | null;
  comment: string | null;
  created_at: string;
  actor: ApiReviewLogActor | null;
}

export interface ApiReviewLogListResponse {
  total: number;
  items: ApiReviewLog[];
}

// ─── SCORM ───────────────────────────────────────────────────────────────────

export interface ApiScormPackageInfo {
  id: string | null;
  sub_lesson_id: string;
  title: string;
  schema: string;
  schema_version: string;
  sco_launch: string;
  launch_url: string | null;
  filename: string;
  stored_name: string;
  file_size: number | null;
  uploaded_at: string | null;
  uploaded_by_id: string | null;
  files_count: number;
  version: number;
  is_current: boolean;
  comments_count: number;
}

export interface ApiScormFileListResponse {
  files: string[];
}

export interface ApiScormCommentAuthor {
  id: string;
  full_name: string;
}

export interface ApiScormComment {
  id: string;
  sub_lesson_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: ApiScormCommentAuthor;
}

export interface ApiScormCommentListResponse {
  total: number;
  items: ApiScormComment[];
}

// ─── Lesson ──────────────────────────────────────────────────────────────────

export interface ApiLessonResponse {
  id: string;
  course_id: string;
  assigned_teacher_id: string | null;
  assigned_converter_id: string | null;
  title: string;
  description: string | null;
  status: LessonStatus;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ApiLessonBrief {
  id: string;
  title: string;
  description: string | null;
  status: LessonStatus;
  order_index: number;
  assigned_teacher_id: string | null;
  assigned_converter_id: string | null;
  sub_lessons_count: number;
}

export interface ApiLessonListItem extends ApiLessonBrief {
  assigned_expert_id: string | null;
  course_title: string | null;
}

export interface ApiLessonListResponse {
  total: number;
  items: ApiLessonListItem[];
}

export interface ApiLessonWithSubLessons extends ApiLessonResponse {
  sub_lessons: ApiSubLessonResponse[];
}

export interface ApiLessonCreate {
  id?: string;
  title: string;
  description?: string | null;
  order_index?: number;
  teacher_id?: string | null;
  converter_id?: string | null;
}

export interface ApiLessonAssign {
  teacher_id?: string | null;
  converter_id?: string | null;
}

// ─── Course ──────────────────────────────────────────────────────────────────

export interface ApiCourseResponse {
  id: string;
  assigned_expert_id: string;
  title: string;
  description: string | null;
  status: CourseStatus;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ApiCourseWithLessons extends ApiCourseResponse {
  lessons: ApiLessonBrief[];
}

export interface ApiCourseUpdate {
  title?: string;
  description?: string | null;
  assigned_expert_id?: string;
  lessons?: ApiLessonCreate[];
  delete_lesson_ids?: string[];
}

export interface ApiCourseCreate {
  title: string;
  description?: string | null;
  assigned_expert_id: string;
  lessons?: ApiLessonCreate[];
}

export interface ApiCourseListResponse {
  total: number;
  items: ApiCourseWithLessons[];
}

// ─── System ──────────────────────────────────────────────────────────────────

export interface ApiSystemStats {
  cpu_percent: number;
  memory_percent: number;
  memory_used_mb: number;
  memory_total_mb: number;
  disk_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  active_users: number;
  total_users: number;
  uptime_seconds: number;
  timestamp: string;
}
