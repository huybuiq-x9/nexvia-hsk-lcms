import client from './apiClient';
import type {
  ApiAuthResponse,
  ApiTokenResponse,
  ApiUserWithRoles,
  ApiUserCreate,
  ApiUserUpdate,
  ApiUserListResponse,
  ApiSystemStats,
  ApiCourseCreate,
  ApiCourseUpdate,
  ApiCourseListResponse,
  ApiCourseWithLessons,
  ApiCourseResponse,
  ApiLessonCreate,
  ApiLessonListItem,
  ApiLessonWithSubLessons,
  ApiLessonResponse,
  ApiLessonAssign,
  ApiLessonListResponse,
  ApiSubLessonCreate,
  ApiSubLessonResponse,
  ApiSubLessonListResponse,
  ApiDocumentListResponse,
  ApiDocumentUploadResponse,
  ApiRole,
  LessonStatus,
  SubLessonStatus,
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
    role?: ApiRole;
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
    data: ApiUserUpdate
  ): Promise<ApiUserWithRoles> {
    const res = await client.patch<ApiUserWithRoles>(`/users/${userId}`, data);
    return res.data;
  },

  async deleteUser(userId: string): Promise<void> {
    await client.delete(`/users/${userId}`);
  },

  async changePassword(data: { current_password: string; new_password: string }): Promise<void> {
    await client.post('/users/me/change-password', data);
  },
};

// ─── Courses ─────────────────────────────────────────────────────────────────

export const courseService = {
  async listCourses(params?: {
    skip?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiCourseListResponse> {
    const res = await client.get<ApiCourseListResponse>('/courses/', { params });
    return res.data;
  },

  async getCoursesForFilter(): Promise<ApiCourseWithLessons[]> {
    // Fetch all courses (paginated) for dropdown filter options
    const res = await client.get<ApiCourseListResponse>('/courses/', { params: { limit: 100 } });
    return res.data.items;
  },

  async getCourse(courseId: string): Promise<ApiCourseWithLessons> {
    const res = await client.get<ApiCourseWithLessons>(`/courses/${courseId}`);
    return res.data;
  },

  async createCourse(data: ApiCourseCreate): Promise<ApiCourseWithLessons> {
    const res = await client.post<ApiCourseWithLessons>('/courses/', data);
    return res.data;
  },

  async updateCourse(
    courseId: string,
    data: ApiCourseUpdate
  ): Promise<ApiCourseResponse> {
    const res = await client.patch<ApiCourseResponse>(`/courses/${courseId}`, data);
    return res.data;
  },

  async deleteCourse(courseId: string): Promise<void> {
    await client.delete(`/courses/${courseId}`);
  },

  async createLesson(
    courseId: string,
    data: ApiLessonCreate
  ): Promise<ApiLessonWithSubLessons> {
    const res = await client.post<ApiLessonWithSubLessons>(`/courses/${courseId}/lessons`, data);
    return res.data;
  },

  async updateLesson(
    lessonId: string,
    data: { title?: string; description?: string | null; order_index?: number }
  ): Promise<ApiLessonResponse> {
    const res = await client.patch<ApiLessonResponse>(`/courses/lessons/${lessonId}`, data);
    return res.data;
  },

  async assignLesson(
    lessonId: string,
    data: ApiLessonAssign
  ): Promise<ApiLessonResponse> {
    const res = await client.patch<ApiLessonResponse>(`/courses/lessons/${lessonId}/assign`, data);
    return res.data;
  },

  async getLesson(lessonId: string): Promise<ApiLessonWithSubLessons> {
    const res = await client.get<ApiLessonWithSubLessons>(`/courses/lessons/${lessonId}`);
    return res.data;
  },

  async getSubLesson(sublessonId: string): Promise<ApiSubLessonResponse> {
    const res = await client.get<ApiSubLessonResponse>(`/courses/sub-lessons/${sublessonId}`);
    return res.data;
  },

  async deleteLesson(lessonId: string): Promise<void> {
    await client.delete(`/courses/lessons/${lessonId}`);
  },

  async listLessons(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    course_id?: string;
    status?: LessonStatus;
  }): Promise<ApiLessonListResponse> {
    const res = await client.get<ApiLessonListResponse>('/courses/lessons/', { params });
    return res.data;
  },

  async listLessonsForFilter(params?: {
    course_id?: string;
    status?: LessonStatus;
  }): Promise<ApiLessonListItem[]> {
    const res = await client.get<ApiLessonListResponse>('/courses/lessons/', { params: { ...params, limit: 100 } });
    return res.data.items;
  },

  async createSubLesson(
    lessonId: string,
    data: ApiSubLessonCreate
  ): Promise<ApiSubLessonResponse> {
    const res = await client.post<ApiSubLessonResponse>(`/courses/lessons/${lessonId}/sub-lessons`, data);
    return res.data;
  },

  async listSubLessons(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    course_id?: string;
    lesson_id?: string;
    status?: SubLessonStatus;
  }): Promise<ApiSubLessonListResponse> {
    const res = await client.get<ApiSubLessonListResponse>('/courses/sub-lessons/', { params });
    return res.data;
  },

  async updateSubLesson(
    sublessonId: string,
    data: { title?: string; description?: string | null; order_index?: number }
  ): Promise<ApiSubLessonResponse> {
    const res = await client.patch<ApiSubLessonResponse>(`/courses/sub-lessons/${sublessonId}`, data);
    return res.data;
  },

  async deleteSubLesson(sublessonId: string): Promise<void> {
    await client.delete(`/courses/sub-lessons/${sublessonId}`);
  },

  async deleteSubLessonBatch(lessonId: string, ids: string[]): Promise<void> {
    await client.post(`/courses/lessons/${lessonId}/sub-lessons/batch-delete`, ids);
  },
};

// ─── System ───────────────────────────────────────────────────────────────────

export const systemService = {
  async getStats(): Promise<ApiSystemStats> {
    const res = await client.get<ApiSystemStats>('/system/stats');
    return res.data;
  },
};

// ─── Documents ─────────────────────────────────────────────────────────────────

export const documentService = {
  async listDocuments(sublessonId: string, params?: { skip?: number; limit?: number }): Promise<ApiDocumentListResponse> {
    const res = await client.get<ApiDocumentListResponse>(`/documents/sub-lessons/${sublessonId}/documents`, { params });
    return res.data;
  },

  async uploadDocument(sublessonId: string, file: File): Promise<ApiDocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post<ApiDocumentUploadResponse>(
      `/documents/sub-lessons/${sublessonId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },

  async deleteDocument(documentId: string): Promise<void> {
    await client.delete(`/documents/${documentId}`);
  },

  async getDownloadUrl(documentId: string): Promise<string> {
    const res = await client.get<{ url: string }>(`/documents/${documentId}/download`);
    return res.data.url;
  },
};
