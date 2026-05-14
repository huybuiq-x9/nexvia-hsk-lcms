import { useCallback, useEffect, useState } from 'react';
import { scormService } from '../../../services';
import type { ApiScormPackage } from '../../../types/api';

export function useSubLessonScorm(subLessonId: string) {
  const [scormPackage, setScormPackage] = useState<ApiScormPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadCurrentPackage = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const current = await scormService.getCurrentPackage(subLessonId);
      setScormPackage(current);
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

  useEffect(() => {
    if (scormPackage?.status !== 'processing') return;
    const timer = window.setInterval(() => {
      void loadCurrentPackage(false);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [loadCurrentPackage, scormPackage?.status]);

  const uploadPackage = async (file: File) => {
    setUploading(true);
    try {
      const res = await scormService.uploadPackage(subLessonId, file);
      setScormPackage(res.package);
      return res.package;
    } finally {
      setUploading(false);
    }
  };

  return {
    scormPackage,
    loading,
    uploading,
    uploadPackage,
    reload: loadCurrentPackage,
  };
}
