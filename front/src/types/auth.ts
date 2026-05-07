// Auth / User types matching FastAPI backend

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
  [API_ROLE.TEACHER]:  'bg-green-50 text-green-700 border-green-200',
  [API_ROLE.EXPERT]:   'bg-purple-50 text-purple-700 border-purple-200',
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

export interface ApiChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ApiError {
  detail: string;
}
