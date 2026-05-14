import { useRef, useState, type ChangeEvent } from 'react';
import { AlertCircle, CheckCircle2, Eye, FileArchive, Loader2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FileDropzone } from '../../../components/ui/FileDropzone';
import { useToast } from '../../../contexts/ToastContext';
import { scormService } from '../../../services';
import { formatDate } from '../../../utils/formatters';
import type { ApiScormPackage, ScormPackageStatus } from '../../../types/api';
import { useSubLessonScorm } from '../hooks/useSubLessonScorm';
import { ScormPreviewModal } from './ScormPreviewModal';

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

function VersionHistory({
  versions,
  onPreview,
  previewLoadingId,
}: {
  versions: ApiScormPackage[];
  onPreview: (scormPackage: ApiScormPackage) => void;
  previewLoadingId: string | null;
}) {
  const { t } = useTranslation();
  if (versions.length === 0) return null;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">{t('scorm.versionsTitle')}</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {versions.map(version => {
          const isPreviewLoading = previewLoadingId === version.id;
          return (
            <div key={version.id} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
                <FileArchive size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-800">v{version.version}</span>
                  {version.is_current && (
                    <span className="text-xs font-medium text-blue-600">{t('scorm.current')}</span>
                  )}
                  <StatusBadge status={version.status} />
                </div>
                <div className="font-medium text-slate-900 truncate mt-1">
                  {version.title || version.original_filename}
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  {version.launch_path || version.original_filename}
                  <span className="mx-1.5">·</span>
                  {formatDate(version.uploaded_at ?? version.created_at)}
                </div>
                {version.status === 'processing' && (
                  <div className="text-xs text-blue-700 mt-2">
                    {t('scorm.processingHint')}
                  </div>
                )}
                {version.status === 'failed' && (
                  <div className="text-xs text-red-700 mt-2">
                    {version.error_message || t('scorm.failedFallback')}
                  </div>
                )}
              </div>
              {version.status === 'ready' && (
                <button
                  type="button"
                  className="btn btn-secondary px-3 py-2 shrink-0"
                  disabled={previewLoadingId !== null}
                  onClick={() => onPreview(version)}
                >
                  {isPreviewLoading ? (
                    <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Eye size={15} />
                  )}
                  {t('scorm.preview')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SubLessonScormTab({
  subLessonId,
  canUpload = false,
}: SubLessonScormTabProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { scormPackage, versions, loading, uploading, uploadPackage, reuploadPackage } = useSubLessonScorm(subLessonId);
  const reuploadInputRef = useRef<HTMLInputElement>(null);
  const [previewPackage, setPreviewPackage] = useState<ApiScormPackage | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  const validateFile = (files: File[]) => {
    if (files.length > 1) {
      toast.error(t('scorm.singleFileOnly'));
      return null;
    }
    const file = files[0];
    if (!file) return null;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error(t('scorm.onlyZip'));
      return null;
    }
    if (file.size > MAX_SCORM_SIZE) {
      toast.error(t('scorm.fileTooBig'));
      return null;
    }
    return file;
  };

  const handleFiles = async (files: File[]) => {
    if (!canUpload || uploading || scormPackage) return;
    const file = validateFile(files);
    if (!file) return;

    try {
      await uploadPackage(file);
      toast.success(t('scorm.uploadStarted'));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('scorm.uploadError')));
    }
  };

  const handleReupload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!canUpload || uploading || !scormPackage) return;
    const file = validateFile(files);
    if (!file) return;

    try {
      await reuploadPackage(scormPackage.id, file);
      toast.success(t('scorm.reuploadStarted'));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('scorm.reuploadError')));
    }
  };

  const handlePreview = async (packageToPreview: ApiScormPackage) => {
    if (packageToPreview.status !== 'ready' || previewLoadingId) return;
    setPreviewLoadingId(packageToPreview.id);
    setPreviewUrl(null);
    setPreviewPackage(null);
    try {
      const session = await scormService.createPreviewSession(packageToPreview.id);
      setPreviewUrl(session.launch_url);
      setPreviewPackage(packageToPreview);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('scorm.previewError')));
    } finally {
      setPreviewLoadingId(null);
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
      {canUpload && !scormPackage && (
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

      {canUpload && scormPackage && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <div>
            <p className="text-sm font-medium text-blue-900">{t('scorm.versionManagedTitle')}</p>
            <p className="text-xs text-blue-700 mt-0.5">{t('scorm.versionManagedHint')}</p>
          </div>
          <input
            ref={reuploadInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleReupload}
          />
          <button
            type="button"
            className="btn btn-primary inline-flex items-center justify-center gap-2 shrink-0"
            disabled={uploading}
            onClick={() => reuploadInputRef.current?.click()}
          >
            {uploading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload size={15} />
            )}
            {t('scorm.reupload')}
          </button>
        </div>
      )}

      {!canUpload && (
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600">
          {t('scorm.uploadLocked')}
        </div>
      )}

      {scormPackage ? (
        <VersionHistory
          versions={versions.length > 0 ? versions : [scormPackage]}
          onPreview={handlePreview}
          previewLoadingId={previewLoadingId}
        />
      ) : (
        <EmptyState
          icon={<FileArchive size={36} />}
          message={t('scorm.noPackage')}
          hint={canUpload ? t('scorm.noPackageHint') : t('scorm.noPackageReadOnlyHint')}
        />
      )}

      {previewPackage && previewUrl && (
        <ScormPreviewModal
          scormPackage={previewPackage}
          launchUrl={previewUrl}
          onClose={() => {
            setPreviewPackage(null);
            setPreviewUrl(null);
          }}
        />
      )}
    </div>
  );
}
