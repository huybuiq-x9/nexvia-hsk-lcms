// Document types matching FastAPI backend

export interface ApiDocumentResponse {
  id: string;
  sub_lesson_id: string;
  uploader_id: string;
  original_name: string;
  stored_name: string;
  file_extension: string;
  file_size: number;
  mime_type: string;
  version_group_id: string;
  version: number;
  is_current: boolean;
  review_round: number;
  created_at: string;
  updated_at: string;
}

export interface ApiDocumentWithUploader extends ApiDocumentResponse {
  uploader: {
    id: string;
    full_name: string;
    email: string;
  };
  comments_count?: number;
}

export interface ApiDocumentUploadResponse {
  documents: ApiDocumentResponse[];
  download_urls: string[];
}

export interface ApiDocumentListResponse {
  total: number;
  items: ApiDocumentWithUploader[];
}

export interface ApiDocumentCommentAuthor {
  id: string;
  full_name: string;
}

export interface ApiDocumentComment {
  id: string;
  document_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: ApiDocumentCommentAuthor;
}

export interface ApiDocumentCommentListResponse {
  total: number;
  items: ApiDocumentComment[];
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
