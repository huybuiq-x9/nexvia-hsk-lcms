import { AlertCircle, CheckCircle2, FileArchive, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FileDropzone } from '../../../components/ui/FileDropzone';
import { useToast } from '../../../contexts/ToastContext';
import { formatDate, formatFileSize } from '../../../utils/formatters';
import type { ApiScormPackage, ScormPackageStatus } from '../../../types/api';
import { useSubLessonScorm } from '../hooks/useSubLessonScorm';

const MAX_SCORM_SIZE = 200 * 1024 * 1024;

const getApiErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback;

interface SubLessonScormTabProps {
  subLessonId: string;
  canUpload?: boolean;
}

function StatusBadge({ status }: { status: ScormPackageStatus }) {
  const { t } = useTranslation();
  const styles: Record<ScormPackageStatus, string> = {
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    ready: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${styles[status]}`}>
      {status === 'processing' && <Loader2 size={12} className="animate-spin" />}
      {status === 'ready' && <CheckCircle2 size={12} />}
      {status === 'failed' && <AlertCircle size={12} />}
      {t(`scorm.status.${status}`)}
    </span>
  );
}

function ScormPackageSummary({ scormPackage }: { scormPackage: ApiScormPackage }) {
  const { t } = useTranslation();

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-start gap-3 p-4 bg-slate-50">
        <div className="w-10 h-10 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
          <FileArchive size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 truncate">
              {scormPackage.title || scormPackage.original_filename}
            </h3>
            <StatusBadge status={scormPackage.status} />
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">{scormPackage.original_filename}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 text-sm">
        <div>
          <div className="text-xs text-slate-400">{t('scorm.version')}</div>
          <div className="font-medium text-slate-700">v{scormPackage.version}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">{t('scorm.fileSize')}</div>
          <div className="font-medium text-slate-700">{formatFileSize(scormPackage.file_size)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">{t('scorm.filesCount')}</div>
          <div className="font-medium text-slate-700">{scormPackage.files_count || '-'}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">{t('scorm.uploadedAt')}</div>
          <div className="font-medium text-slate-700">
            {formatDate(scormPackage.uploaded_at ?? scormPackage.created_at)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">{t('scorm.schemaVersion')}</div>
          <div className="font-medium text-slate-700">{scormPackage.schema_version || '-'}</div>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <div className="text-xs text-slate-400">{t('scorm.launchPath')}</div>
          <div className="font-medium text-slate-700 truncate">{scormPackage.launch_path || '-'}</div>
        </div>
      </div>

      {scormPackage.status === 'processing' && (
        <div className="px-4 pb-4 text-xs text-blue-700">
          {t('scorm.processingHint')}
        </div>
      )}

      {scormPackage.status === 'failed' && (
        <div className="mx-4 mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {scormPackage.error_message || t('scorm.failedFallback')}
        </div>
      )}
    </div>
  );
}

export function SubLessonScormTab({
  subLessonId,
  canUpload = false,
}: SubLessonScormTabProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { scormPackage, loading, uploading, uploadPackage } = useSubLessonScorm(subLessonId);

  const handleFiles = async (files: File[]) => {
    if (!canUpload || uploading) return;
    const file = files[0];
    if (!file) return;

    if (files.length > 1) {
      toast.error(t('scorm.singleFileOnly'));
      return;
    }
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error(t('scorm.onlyZip'));
      return;
    }
    if (file.size > MAX_SCORM_SIZE) {
      toast.error(t('scorm.fileTooBig'));
      return;
    }

    try {
      await uploadPackage(file);
      toast.success(t('scorm.uploadStarted'));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('scorm.uploadError')));
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
          maxSize={MAX_SCORM_SIZE}
          multiple={false}
          onFiles={handleFiles}
          uploading={uploading}
          label={t('scorm.dropzone')}
          hint={t('scorm.dropzoneHint')}
          uploadingLabel={t('scorm.uploading')}
        />
      )}

      {!canUpload && (
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600">
          {t('scorm.uploadLocked')}
        </div>
      )}

      {scormPackage ? (
        <ScormPackageSummary scormPackage={scormPackage} />
      ) : (
        <EmptyState
          icon={<FileArchive size={36} />}
          message={t('scorm.noPackage')}
          hint={canUpload ? t('scorm.noPackageHint') : t('scorm.noPackageReadOnlyHint')}
        />
      )}
    </div>
  );
}
