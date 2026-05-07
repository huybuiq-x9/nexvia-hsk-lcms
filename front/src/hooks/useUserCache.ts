import { useState, useCallback } from 'react';
import { userService } from '../services';
import type { ApiUserWithRoles } from '../types/api';

export function useUserCache() {
  const [cache, setCache] = useState<Record<string, ApiUserWithRoles>>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const loadUser = useCallback((id: string) => {
    if (!id || cache[id] || loading.has(id)) return;
    setLoading(prev => new Set([...prev, id]));
    userService.getUser(id)
      .then(u => {
        setCache(c => ({ ...c, [id]: u }));
      })
      .catch(() => {})
      .finally(() => {
        setLoading(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { cache, loading, loadUser };
}
