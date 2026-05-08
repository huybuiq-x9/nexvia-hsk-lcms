import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, FileArchive, Play, Send } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FileDropzone } from '../../../components/ui/FileDropzone';
import { useToast } from '../../../contexts/ToastContext';
import { formatDate, formatFileSize } from '../../../utils/formatters';
import { scormService } from '../../../services';
import { createScormPreviewRuntime, type ScormRuntimeSnapshot } from '../../../utils/scormRuntime';
import type { ApiScormPackageInfo } from '../../../types/api';

interface SubLessonScormTabProps {
  subLessonId: string;
  canUpload?: boolean;
  canSubmit?: boolean;
  onUploaded?: () => void;
  onSubmitScorm?: () => void;
}

export function SubLessonScormTab({
  subLessonId,
  canUpload = false,
  canSubmit = false,
  onUploaded,
  onSubmitScorm,
}: SubLessonScormTabProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [info, setInfo] = useState<ApiScormPackageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<ScormRuntimeSnapshot>({
    initialized: false,
    data: {},
    events: [],
  });

  useEffect(() => {
    let mounted = true;
    scormService.getPackageInfo(subLessonId)
      .then(data => {
        if (mounted) setInfo(data);
      })
      .catch(() => {
        if (mounted) setInfo(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [subLessonId]);

  useEffect(() => {
    const runtime = createScormPreviewRuntime(setRuntimeSnapshot);
    return () => runtime.dispose();
  }, []);

  const launchUrl = info?.sco_launch
    ? scormService.buildLaunchUrl(subLessonId, info.sco_launch)
    : null;

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await scormService.uploadPackage(subLessonId, file);
      setInfo(uploaded);
      onUploaded?.();
      toast.success(t('scorm.uploadSuccess'));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? t('scorm.uploadError');
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canUpload && (
        <FileDropzone
          accept={['zip']}
          maxSize={500 * 1024 * 1024}
          onFiles={handleFiles}
          uploading={uploading}
        />
      )}

      {!info ? (
        <EmptyState
          icon={<FileArchive size={40} className="opacity-50" />}
          message={t('courses.noScorm')}
          hint={canUpload ? t('scorm.noPackageHintUpload') : t('scorm.noPackageHint')}
        />
      ) : (
        <>
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <FileArchive size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{info.title}</h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{info.filename}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mt-1">
                    {info.file_size !== null && <span>{formatFileSize(info.file_size)}</span>}
                    <span>{info.schema_version || info.schema}</span>
                    <span>{t('scorm.filesCount', { count: info.files_count })}</span>
                    {info.uploaded_at && <span>{formatDate(info.uploaded_at)}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canSubmit && (
                  <button
                    onClick={onSubmitScorm}
                    className="btn btn-primary flex items-center gap-1.5 text-sm"
                  >
                    <Send size={14} />
                    {t('subLessons.actions.submitScorm')}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <Eye size={16} />
                {t('scorm.preview')}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className={runtimeSnapshot.initialized ? 'text-green-700' : 'text-slate-500'}>
                  {runtimeSnapshot.initialized ? t('scorm.runtimeRunning') : t('scorm.runtimeIdle')}
                </span>
                <span>{t('scorm.runtimeEvents', { count: runtimeSnapshot.events.length })}</span>
              </div>
            </div>

            {launchUrl ? (
              <iframe
                key={launchUrl}
                title={t('scorm.preview')}
                src={launchUrl}
                className="w-full h-[640px] bg-white"
                allow="fullscreen; autoplay"
              />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <Play size={28} className="mb-2" />
                <p className="text-sm">{t('scorm.noLaunchFile')}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
