import type { AxiosError } from 'axios';
import type { ApiError } from '../types/api';

export function parseApiError(
  err: unknown,
  fallback: string
): string {
  return (
    (err as AxiosError<ApiError>)?.response?.data?.detail
    ?? fallback
  );
}
