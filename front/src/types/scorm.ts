export type ScormPackageStatus = 'processing' | 'ready' | 'failed';

export interface ApiScormCommentAuthor {
  id: string;
  full_name: string;
}

export interface ApiScormComment {
  id: string;
  scorm_package_id: string;
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

export interface ApiScormPackage {
  id: string;
  sub_lesson_id: string;
  uploader_id: string | null;
  original_filename: string;
  source_key: string | null;
  extracted_prefix: string | null;
  title: string | null;
  manifest_identifier: string | null;
  organization_identifier: string | null;
  schema_name: string | null;
  schema_version: string | null;
  launch_path: string | null;
  launch_parameters: string | null;
  file_size: number;
  files_count: number;
  version: number;
  is_current: boolean;
  status: ScormPackageStatus;
  error_message: string | null;
  task_id: string | null;
  uploaded_at: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  comments_count?: number;
}

export interface ApiScormUploadResponse {
  package: ApiScormPackage;
}

export interface ApiScormPackageListResponse {
  total: number;
  items: ApiScormPackage[];
}

export interface ApiScormPreviewSessionResponse {
  launch_url: string;
  expires_in: number;
}
