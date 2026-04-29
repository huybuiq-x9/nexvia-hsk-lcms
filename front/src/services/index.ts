import client from './apiClient';
import type {
  ApiAuthResponse,
  ApiTokenResponse,
  ApiUserWithRoles,
  ApiUserCreate,
  ApiUserListResponse,
} from '../types/api';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authService = {
  async login(email: string, password: string): Promise<ApiAuthResponse> {
    const res = await client.post<ApiAuthResponse>('/auth/login', { email, password });
    return res.data;
  },

  async refresh(refreshToken: string): Promise<ApiTokenResponse> {
    const res = await client.post<ApiTokenResponse>('/auth/refresh', { refresh_token: refreshToken });
    return res.data;
  },

  async logout(refreshToken?: string): Promise<void> {
    await client.post('/auth/logout', { refresh_token: refreshToken });
  },
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const userService = {
  async getMe(): Promise<ApiUserWithRoles> {
    const res = await client.get<ApiUserWithRoles>('/users/me');
    return res.data;
  },

  async listUsers(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<ApiUserListResponse> {
    const res = await client.get<ApiUserListResponse>('/users/', { params });
    return res.data;
  },

  async getUser(userId: string): Promise<ApiUserWithRoles> {
    const res = await client.get<ApiUserWithRoles>(`/users/${userId}`);
    return res.data;
  },

  async createUser(data: ApiUserCreate): Promise<ApiUserWithRoles> {
    const res = await client.post<ApiUserWithRoles>('/users/', data);
    return res.data;
  },

  async updateUser(
    userId: string,
    data: { full_name?: string; is_active?: boolean }
  ): Promise<ApiUserWithRoles> {
    const res = await client.patch<ApiUserWithRoles>(`/users/${userId}`, data);
    return res.data;
  },

  async assignRole(userId: string, role: string): Promise<{ roles: string[] }> {
    const res = await client.post<{ roles: string[] }>(`/users/${userId}/roles`, { role });
    return res.data;
  },

  async revokeRole(userId: string, role: string): Promise<void> {
    await client.delete(`/users/${userId}/roles/${role}`);
  },

  async deleteUser(userId: string): Promise<void> {
    await client.delete(`/users/${userId}`);
  },
};
