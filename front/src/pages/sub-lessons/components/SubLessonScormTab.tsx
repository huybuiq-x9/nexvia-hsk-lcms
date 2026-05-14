import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AlertCircle, CheckCircle2, Eye, FileArchive, Loader2, MessageSquare, Send, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FileDropzone } from '../../../components/ui/FileDropzone';
import { useToast } from '../../../contexts/ToastContext';
import { scormService } from '../../../services';
import { formatDate } from '../../../utils/formatters';
import type { ApiScormComment, ApiScormPackage, ScormPackageStatus } from '../../../types/api';
import { useSubLessonScorm } from '../hooks/useSubLessonScorm';
import { ScormPreviewModal } from './ScormPreviewModal';

const MAX_SCORM_SIZE = 200 * 1024 * 1024;

const getApiErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback;

interface SubLessonScormTabProps {
  subLessonId: string;
  canUpload?: boolean;
  canComment?: boolean;
  onRefresh?: () => void;
  onScormPackageChange?: (pkg: ApiScormPackage | null) => void;
  onPreviewOpen?: () => void;
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
  canComment,
}: {
  versions: ApiScormPackage[];
  onPreview: (scormPackage: ApiScormPackage) => void;
  previewLoadingId: string | null;
  canComment?: boolean;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, ApiScormComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [sendingComment, setSendingComment] = useState<Record<string, boolean>>({});
  const commentInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const toggleComments = async (versionId: string) => {
    if (!canComment) return;
    const isExpanding = expandedId !== versionId;
    if (isExpanding) {
      setExpandedId(versionId);
      if (!commentsMap[versionId]) {
        setLoadingComments(prev => ({ ...prev, [versionId]: true }));
        try {
          const res = await scormService.listComments(versionId);
          setCommentsMap(prev => ({ ...prev, [versionId]: res.items }));
        } catch {
          toast.error(t('scorm.commentsLoadError'));
        } finally {
          setLoadingComments(prev => ({ ...prev, [versionId]: false }));
        }
      }
      setTimeout(() => { commentInputRefs.current[versionId]?.focus(); }, 50);
    } else {
      setExpandedId(null);
    }
  };

  const sendComment = async (versionId: string) => {
    if (!canComment) return;
    const text = commentText[versionId]?.trim();
    if (!text) return;
    setSendingComment(prev => ({ ...prev, [versionId]: true }));
    try {
      const comment = await scormService.addComment(versionId, text);
      setCommentsMap(prev => ({ ...prev, [versionId]: [...(prev[versionId] || []), comment] }));
      setCommentText(prev => ({ ...prev, [versionId]: '' }));
    } catch {
      toast.error(t('scorm.commentSendError'));
    } finally {
      setSendingComment(prev => ({ ...prev, [versionId]: false }));
    }
  };

  if (versions.length === 0) return null;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">{t('scorm.versionsTitle')}</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {versions.map(version => {
          const isPreviewLoading = previewLoadingId === version.id;
          const isExpanded = expandedId === version.id;
          const versionComments = commentsMap[version.id] || [];
          const isLoadingCmt = loadingComments[version.id];
          const isSendingCmt = sendingComment[version.id];
          const versionCommentText = commentText[version.id] || '';
          const commentCount = isExpanded ? versionComments.length : (version.comments_count ?? 0);

          return (
            <div key={version.id} className="group">
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
                  <FileArchive size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-800">v{version.version}</span>
                    {version.is_current && (
                      <span className="text-xs font-medium text-blue-600">{t('scorm.current')}</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-700 truncate">
                    {version.title || version.original_filename}
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">
                    {version.launch_path || version.original_filename}
                    <span className="mx-1">·</span>
                    {formatDate(version.uploaded_at ?? version.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusBadge status={version.status} />
                  {canComment && (
                    <button
                      type="button"
                      onClick={() => toggleComments(version.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors relative"
                      title={t('scorm.comments')}
                      style={{
                        backgroundColor: isExpanded ? 'rgb(239 246 255)' : undefined,
                        color: isExpanded ? 'rgb(37 99 235)' : 'rgb(148 163 184)',
                      }}
                    >
                      <MessageSquare size={15} />
                      {commentCount > 0 && !isExpanded && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                          {commentCount}
                        </span>
                      )}
                    </button>
                  )}
                  {version.status === 'ready' && (
                    <button
                      type="button"
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={previewLoadingId !== null}
                      onClick={() => onPreview(version)}
                      title={t('scorm.preview')}
                      aria-label={t('scorm.preview')}
                    >
                      {isPreviewLoading ? (
                        <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Eye size={15} />
                      )}
                    </button>
                  )}
                  {version.status === 'processing' && (
                    <span title={t('scorm.processingHint')}>
                      <Loader2 size={15} className="text-blue-500 animate-spin" />
                    </span>
                  )}
                </div>
              </div>

              {/* Inline comments panel */}
              {canComment && isExpanded && (
                <div className="pl-4 pr-4 pb-4 ml-4 border-l-2 border-blue-200">
                  <div className="space-y-2 mb-3">
                    {isLoadingCmt ? (
                      <div className="flex justify-center py-4">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : versionComments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">{t('scorm.noComments')}</p>
                    ) : (
                      versionComments.map(comment => (
                        <div key={comment.id} className="flex gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[9px] font-bold text-blue-600">
                              {comment.author.full_name[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-700">{comment.author.full_name}</span>
                              <span className="text-[10px] text-slate-400">{formatDate(comment.created_at)}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={el => { commentInputRefs.current[version.id] = el; }}
                      value={versionCommentText}
                      onChange={e => setCommentText(prev => ({ ...prev, [version.id]: e.target.value }))}
                      placeholder={t('scorm.commentPlaceholder')}
                      className="input resize-none flex-1 text-xs py-2"
                      rows={2}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendComment(version.id);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => sendComment(version.id)}
                      disabled={isSendingCmt || !versionCommentText.trim()}
                      className="btn btn-primary p-2 disabled:opacity-40 shrink-0"
                      title={t('scorm.sendComment')}
                    >
                      <Send size={13} />
                    </button>
                  </div>
                </div>
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
  canComment = false,
  onRefresh,
  onScormPackageChange,
  onPreviewOpen,
}: SubLessonScormTabProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { scormPackage, versions, loading, uploading, uploadPackage, reuploadPackage } = useSubLessonScorm(subLessonId);
  const reuploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onScormPackageChange?.(scormPackage);
  }, [scormPackage, onScormPackageChange]);
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
      onRefresh?.();
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
      onRefresh?.();
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
      onPreviewOpen?.();
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

      {canUpload && scormPackage && scormPackage.status === 'ready' && (
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
          canComment={canComment}
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
          canComment={canComment}
          onClose={() => {
            setPreviewPackage(null);
            setPreviewUrl(null);
          }}
        />
      )}
    </div>
  );
}
