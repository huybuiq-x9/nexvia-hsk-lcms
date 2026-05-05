// API response types matching FastAPI backend

export const API_ROLE = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  EXPERT: 'expert',
  CONVERTER: 'converter',
} as const;

export type ApiRole = (typeof API_ROLE)[keyof typeof API_ROLE];

export const API_ROLES: ApiRole[] = Object.values(API_ROLE);

export type RoleLabelType = Record<ApiRole, string>;

export const ROLE_COLORS: Record<ApiRole, string> = {
  [API_ROLE.ADMIN]:     'bg-blue-50 text-blue-700 border-blue-200',
  [API_ROLE.TEACHER]:   'bg-green-50 text-green-700 border-green-200',
  [API_ROLE.EXPERT]:    'bg-purple-50 text-purple-700 border-purple-200',
  [API_ROLE.CONVERTER]: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

export interface ApiUserResponse {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superadmin: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiUserWithRoles extends ApiUserResponse {
  roles: ApiRole[];
}

export interface ApiTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface ApiAuthResponse {
  user: ApiUserWithRoles;
  tokens: ApiTokenResponse;
}

export interface ApiUserCreate {
  email: string;
  full_name: string;
  password: string;
  roles: ApiRole[];
}

export interface ApiUserUpdate {
  full_name?: string;
  is_active?: boolean;
  roles?: ApiRole[];
  remove_roles?: ApiRole[];
}

export interface ApiUserListResponse {
  total: number;
  items: ApiUserWithRoles[];
}

export interface ApiError {
  detail: string;
}

// ─── Course / Lesson / SubLesson ────────────────────────────────────────────

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
  SUBMITTED: 'submitted',
  REVIEWING: 'reviewing',
  IN_CONVERSION: 'in_conversion',
  SCORM_UPLOADED: 'scorm_uploaded',
  SCORM_REVIEWING: 'scorm_reviewing',
  APPROVED: 'approved',
  PUBLISHED: 'published',
} as const;

export type SubLessonStatus = (typeof SUB_LESSON_STATUS)[keyof typeof SUB_LESSON_STATUS];

export const SUB_LESSON_STATUSES: SubLessonStatus[] = Object.values(SUB_LESSON_STATUS);

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
  [SUB_LESSON_STATUS.DRAFT]:           'bg-slate-50 text-slate-600 border-slate-200',
  [SUB_LESSON_STATUS.IN_PROGRESS]:     'bg-blue-50 text-blue-700 border-blue-200',
  [SUB_LESSON_STATUS.SUBMITTED]:       'bg-amber-50 text-amber-700 border-amber-200',
  [SUB_LESSON_STATUS.REVIEWING]:       'bg-orange-50 text-orange-700 border-orange-200',
  [SUB_LESSON_STATUS.IN_CONVERSION]:   'bg-violet-50 text-violet-700 border-violet-200',
  [SUB_LESSON_STATUS.SCORM_UPLOADED]:  'bg-violet-50 text-violet-700 border-violet-200',
  [SUB_LESSON_STATUS.SCORM_REVIEWING]: 'bg-orange-50 text-orange-700 border-orange-200',
  [SUB_LESSON_STATUS.APPROVED]:        'bg-green-50 text-green-700 border-green-200',
  [SUB_LESSON_STATUS.PUBLISHED]:       'bg-green-50 text-green-700 border-green-200',
};

export interface ApiSubLessonResponse {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  status: SubLessonStatus;
  order_index: number;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiSubLessonCreate {
  title: string;
  description?: string | null;
  order_index?: number;
}

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
  course_title: string | null;
}

export interface ApiLessonListResponse {
  total: number;
  items: ApiLessonListItem[];
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
  created_at: string;
  updated_at: string;
  lesson_title: string | null;
  course_id: string | null;
  course_title: string | null;
}

export interface ApiSubLessonListResponse {
  total: number;
  items: ApiSubLessonListItem[];
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

export interface ApiSubLessonUpdate {
  title?: string;
  description?: string | null;
  order_index?: number;
}

export interface ApiSubLessonBatchDelete {
  ids: string[];
}

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

// ─── Document ──────────────────────────────────────────────────────────────────

export interface ApiDocumentResponse {
  id: string;
  sub_lesson_id: string;
  uploader_id: string;
  original_name: string;
  stored_name: string;
  file_extension: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

export interface ApiDocumentWithUploader extends ApiDocumentResponse {
  uploader: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface ApiDocumentUploadResponse {
  document: ApiDocumentResponse;
  download_url: string;
}

export interface ApiDocumentListResponse {
  total: number;
  items: ApiDocumentWithUploader[];
}

export const FILE_TYPE_COLORS: Record<string, string> = {
  pdf:  'bg-red-50 text-red-700 border-red-200',
  pptx: 'bg-orange-50 text-orange-700 border-orange-200',
  ppt:  'bg-orange-50 text-orange-700 border-orange-200',
  docx: 'bg-blue-50 text-blue-700 border-blue-200',
  doc:  'bg-blue-50 text-blue-700 border-blue-200',
  xlsx: 'bg-green-50 text-green-700 border-green-200',
  xls:  'bg-green-50 text-green-700 border-green-200',
};

export const FILE_TYPE_ICONS: Record<string, string> = {
  pdf:  '📄',
  pptx: '📊',
  ppt:  '📊',
  docx: '📝',
  doc:  '📝',
  xlsx: '📈',
  xls:  '📈',
};
