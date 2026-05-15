import { useCallback, useEffect, useRef, useState } from 'react';
import { scormService } from '../../../services';
import type { ApiScormPackage } from '../../../types/api';

export function useSubLessonScorm(subLessonId: string) {
  const [scormPackage, setScormPackage] = useState<ApiScormPackage | null>(null);
  const [versions, setVersions] = useState<ApiScormPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadCurrentPackage = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [current, versionList] = await Promise.all([
        scormService.getCurrentPackage(subLessonId),
        scormService.listPackages(subLessonId, { limit: 100 }),
      ]);
      setScormPackage(current);
      setVersions(versionList.items);
      return current;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [subLessonId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCurrentPackage();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCurrentPackage]);

  const pollTimerRef = useRef<ReturnType<typeof window.setInterval> | null>(null);

  useEffect(() => {
    if (scormPackage?.status !== 'processing') {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    // Tính thời gian đã trôi qua kể từ lúc upload
    const uploadedAt = scormPackage.uploaded_at ? new Date(scormPackage.uploaded_at).getTime() : Date.now();

    const scheduleNext = () => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
      }
      const elapsed = Date.now() - uploadedAt;

      if (elapsed >= 120_000) {
        // Đã quá 120s — dừng polling, Celery task thực sự bị lỗi
        pollTimerRef.current = null;
        return;
      }

      // 0–30s: poll nhanh mỗi 2s; 30s+: poll chậm mỗi 5s
      const interval = elapsed < 30_000 ? 2_000 : 5_000;
      pollTimerRef.current = window.setInterval(() => {
        void loadCurrentPackage(false);
        scheduleNext();
      }, interval);
    };

    scheduleNext();
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [loadCurrentPackage, scormPackage?.status, scormPackage?.uploaded_at]);

  const uploadPackage = async (file: File) => {
    setUploading(true);
    try {
      const res = await scormService.uploadPackage(subLessonId, file);
      setScormPackage(res.package);
      await loadCurrentPackage(false);
      return res.package;
    } finally {
      setUploading(false);
    }
  };

  const reuploadPackage = async (packageId: string, file: File) => {
    setUploading(true);
    try {
      const res = await scormService.reuploadPackage(packageId, file);
      setScormPackage(res.package);
      await loadCurrentPackage(false);
      return res.package;
    } finally {
      setUploading(false);
    }
  };

  return {
    scormPackage,
    versions,
    loading,
    uploading,
    uploadPackage,
    reuploadPackage,
    reload: loadCurrentPackage,
  };
}
