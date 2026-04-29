// API response types matching FastAPI backend

export type ApiRole = 'admin' | 'teacher' | 'expert' | 'converter';

export type RoleLabelType = Record<ApiRole, string>;

export const ROLE_COLORS: Record<ApiRole, string> = {
  admin:     'bg-blue-50 text-blue-700 border-blue-200',
  teacher:    'bg-green-50 text-green-700 border-green-200',
  expert:     'bg-purple-50 text-purple-700 border-purple-200',
  converter:  'bg-cyan-50 text-cyan-700 border-cyan-200',
};

export interface ApiUserResponse {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superadmin: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiUserWithRoles extends ApiUserResponse {
  roles: string[];
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
  avatar_url?: string;
  is_active?: boolean;
}

export interface ApiUserListResponse {
  total: number;
  items: ApiUserWithRoles[];
}

export interface ApiError {
  detail: string;
}
