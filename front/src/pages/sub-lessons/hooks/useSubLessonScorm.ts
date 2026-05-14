import { useCallback, useEffect, useState } from 'react';
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
