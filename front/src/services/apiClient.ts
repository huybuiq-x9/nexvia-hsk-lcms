import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Prevent concurrent refresh attempts — only one refresh runs at a time
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const processRefreshQueue = (token: string) => {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
};

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiError>) => {
    const req = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only handle 401 and not already retried
    if (error.response?.status !== 401 || req._retry) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      localStorage.removeItem('access_token');
      window.location.href = '/';
      return Promise.reject(error);
    }

    if (!isRefreshing) {
      isRefreshing = true;
      req._retry = true;

      try {
        // Use raw axios — bypass the interceptor chain entirely
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        const { access_token, refresh_token: newRefresh } = res.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', newRefresh);
        req.headers.Authorization = `Bearer ${access_token}`;
        processRefreshQueue(access_token);
        return client(req);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // Another request is already refreshing — queue this one
    return new Promise((resolve) => {
      refreshQueue.push((token: string) => {
        req.headers.Authorization = `Bearer ${token}`;
        resolve(client(req));
      });
    });
  }
);

export default client;
