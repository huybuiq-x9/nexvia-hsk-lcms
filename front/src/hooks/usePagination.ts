import { useState, useCallback } from 'react';

export interface UsePaginationOptions {
  initialPage?: number;
  perPage?: number;
}

export interface UsePaginationReturn {
  page: number;
  setPage: (page: number) => void;
  perPage: number;
  totalPages: number;
  offset: number;
  reset: () => void;
}

export function usePagination(
  total: number,
  options: UsePaginationOptions = {}
): UsePaginationReturn & { total: number } {
  const { initialPage = 1, perPage: defaultPerPage = 20 } = options;
  const [page, setPage] = useState(initialPage);

  const perPage = defaultPerPage;
  const totalPages = Math.ceil(total / perPage);
  const offset = (page - 1) * perPage;

  const reset = useCallback(() => setPage(1), []);

  return { page, setPage, perPage, totalPages, offset, total, reset };
}
