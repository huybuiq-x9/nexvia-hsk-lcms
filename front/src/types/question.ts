// Question Bank types — mirrors backend modules/questions/schema.py

// ─── Enums ────────────────────────────────────────────────────────────────────

export const QUESTION_TYPE = {
  TF:         'tf',
  SC:         'sc',
  MC:         'mc',
  FIT:        'fit',
  FITS:       'fits',
  FIB:        'fib',
  SQ:         'sq',
  MAT:        'mat',
  PAIR_MATCH: 'pair_match',
} as const;

export type QuestionType = (typeof QUESTION_TYPE)[keyof typeof QUESTION_TYPE];

export const QUESTION_STATUS = {
  DRAFT:     'draft',
  PUBLISHED: 'published',
  ARCHIVED:  'archived',
} as const;

export type QuestionStatus = (typeof QUESTION_STATUS)[keyof typeof QUESTION_STATUS];

export const DIFFICULTY = {
  EASY:   'easy',
  MEDIUM: 'medium',
  HARD:   'hard',
} as const;

export type Difficulty = (typeof DIFFICULTY)[keyof typeof DIFFICULTY];

export const CONTENT_MEDIA_TYPE = {
  TEXT:       'text',
  IMAGE:      'image',
  AUDIO:      'audio',
  TEXT_IMAGE: 'text_image',
  TEXT_AUDIO: 'text_audio',
} as const;

export type ContentMediaType = (typeof CONTENT_MEDIA_TYPE)[keyof typeof CONTENT_MEDIA_TYPE];

// ─── Status colors ────────────────────────────────────────────────────────────

export const QUESTION_STATUS_COLORS: Record<QuestionStatus, string> = {
  [QUESTION_STATUS.DRAFT]:     'bg-slate-50 text-slate-600 border-slate-200',
  [QUESTION_STATUS.PUBLISHED]: 'bg-green-50 text-green-700 border-green-200',
  [QUESTION_STATUS.ARCHIVED]:  'bg-red-50 text-red-600 border-red-200',
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  [DIFFICULTY.EASY]:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  [DIFFICULTY.MEDIUM]: 'bg-amber-50 text-amber-700 border-amber-200',
  [DIFFICULTY.HARD]:   'bg-red-50 text-red-600 border-red-200',
};

// ─── ContentBlock ─────────────────────────────────────────────────────────────

export interface ContentBlock {
  type: ContentMediaType;
  text?: string;
  media_key?: string;
  media_url?: string;             // presigned URL — only in responses
  original_filename?: string;
}

// ─── Choice ───────────────────────────────────────────────────────────────────

export interface ApiQuestionChoice {
  id: string;
  content: ContentBlock;
  is_correct: boolean | null;
  order_index: number;
  correct_order: number | null;
  group_name: string | null;      // "source"/"target" for MAT, "left"/"right" for PAIR_MATCH
  match_id: string | null;
}

export interface ApiQuestionChoiceCreate {
  content: ContentBlock;
  is_correct?: boolean | null;
  order_index?: number;
  correct_order?: number | null;
  group_name?: string | null;
  match_id?: string | null;
}

// ─── Blank ────────────────────────────────────────────────────────────────────

export interface ApiQuestionBlank {
  id: string;
  blank_index: number;
  accepted_answers: string[];
  case_sensitive: boolean;
}

export interface ApiQuestionBlankCreate {
  blank_index: number;
  accepted_answers: string[];
  case_sensitive?: boolean;
}

// ─── Question ─────────────────────────────────────────────────────────────────

export interface ApiQuestionResponse {
  id: string;
  sub_lesson_id: string | null;
  question_type: QuestionType;
  difficulty: Difficulty;
  tags: string[];
  stem: ContentBlock;
  explanation: ContentBlock | null;
  status: QuestionStatus;
  order_index: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  choices: ApiQuestionChoice[];
  blanks: ApiQuestionBlank[];
}

export interface ApiQuestionCreate {
  sub_lesson_id?: string | null;
  question_type: QuestionType;
  difficulty?: Difficulty;
  tags?: string[];
  stem: ContentBlock;
  explanation?: ContentBlock | null;
  order_index?: number;
  choices?: ApiQuestionChoiceCreate[];
  blanks?: ApiQuestionBlankCreate[];
}

export interface ApiQuestionUpdate {
  difficulty?: Difficulty;
  tags?: string[];
  stem?: ContentBlock;
  explanation?: ContentBlock | null;
  order_index?: number;
  choices?: ApiQuestionChoiceCreate[];
  blanks?: ApiQuestionBlankCreate[];
}

export interface ApiQuestionListResponse {
  total: number;
  items: ApiQuestionResponse[];
}

// ─── Media upload ─────────────────────────────────────────────────────────────

export interface ApiMediaUploadResponse {
  media_key: string;
  media_url: string;
  original_filename: string;
}

export type MediaUploadTarget = 'stem' | 'explanation' | 'choice';

// ─── Question type metadata (for UI labels) ───────────────────────────────────

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  [QUESTION_TYPE.TF]:         'Đúng / Sai',
  [QUESTION_TYPE.SC]:         'Trắc nghiệm 1 đáp án',
  [QUESTION_TYPE.MC]:         'Trắc nghiệm nhiều đáp án',
  [QUESTION_TYPE.FIT]:        'Điền vào chỗ trống (1 ô)',
  [QUESTION_TYPE.FITS]:       'Điền vào chỗ trống (nhiều ô)',
  [QUESTION_TYPE.FIB]:        'Điền câu trả lời tự do',
  [QUESTION_TYPE.SQ]:         'Sắp xếp thứ tự',
  [QUESTION_TYPE.MAT]:        'Kéo và thả',
  [QUESTION_TYPE.PAIR_MATCH]: 'Vẽ đường nối',
};
