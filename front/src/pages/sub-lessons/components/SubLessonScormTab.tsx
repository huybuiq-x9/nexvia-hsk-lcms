import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, FileArchive, MessageSquare, Play, Send, Upload } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FileDropzone } from '../../../components/ui/FileDropzone';
import { useToast } from '../../../contexts/ToastContext';
import { formatDate, formatFileSize } from '../../../utils/formatters';
import { scormService } from '../../../services';
import { createScormPreviewRuntime, type ScormRuntimeSnapshot } from '../../../utils/scormRuntime';
import type { ApiScormComment, ApiScormPackageInfo } from '../../../types/api';

const getApiErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback;

interface SubLessonScormTabProps {
  subLessonId: string;
  canUpload?: boolean;
  canPreview?: boolean;
  canViewComments?: boolean;
  canAddComment?: boolean;
  onUploaded?: () => void;
}

export function SubLessonScormTab({
  subLessonId,
  canUpload = false,
  canPreview = true,
  canViewComments = true,
  canAddComment = true,
  onUploaded,
}: SubLessonScormTabProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [info, setInfo] = useState<ApiScormPackageInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<ApiScormComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<ScormRuntimeSnapshot>({
    initialized: false,
    data: {},
    events: [],
  });
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const reuploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const runtime = createScormPreviewRuntime(setRuntimeSnapshot);
    return () => runtime.dispose();
  }, []);

  const launchUrl = info?.sco_launch
    ? scormService.buildLaunchUrl(subLessonId, info.sco_launch)
    : null;

  const openPreview = async () => {
    if (!canPreview) return;
    if (info) {
      setShowPreview(true);
      return;
    }
    setPreviewLoading(true);
    try {
      const data = await scormService.getPackageInfo(subLessonId);
      setInfo(data);
      setShowPreview(true);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        toast.error(t('courses.noScorm'));
      } else {
        toast.error(getApiErrorMessage(err, t('courses.modal.errorGeneric')));
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const uploadScormFile = async (file: File, successMessage: string) => {
    setUploading(true);
    try {
      const uploaded = await scormService.uploadPackage(subLessonId, file);
      setInfo(uploaded);
      setShowPreview(false);
      setCommentsOpen(false);
      setComments([]);
      setCommentsLoaded(false);
      onUploaded?.();
      toast.success(successMessage);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('scorm.uploadError')));
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = async (files: File[]) => {
    if (!canUpload) return;
    const file = files[0];
    if (!file) return;
    await uploadScormFile(file, t('scorm.uploadSuccess'));
  };

  const handleReupload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!canUpload) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await uploadScormFile(file, t('scorm.reuploadSuccess'));
  };

  const toggleComments = async () => {
    if (!canViewComments) return;
    const nextOpen = !commentsOpen;
    setCommentsOpen(nextOpen);
    if (!nextOpen) return;

    if (!commentsLoaded) {
      setCommentsLoading(true);
      try {
        const res = await scormService.listComments(subLessonId);
        setComments(res.items);
        setCommentsLoaded(true);
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, t('courses.modal.errorGeneric')));
      } finally {
        setCommentsLoading(false);
      }
    }

    setTimeout(() => commentInputRef.current?.focus(), 50);
  };

  const sendComment = async () => {
    if (!canAddComment) return;
    const content = commentText.trim();
    if (!content) return;

    setSendingComment(true);
    try {
      const comment = await scormService.addComment(subLessonId, content);
      setComments(prev => [...prev, comment]);
      setCommentText('');
      setInfo(prev => prev ? {
        ...prev,
        comments_count: (prev.comments_count ?? 0) + 1,
      } : prev);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('courses.modal.errorGeneric')));
    } finally {
      setSendingComment(false);
    }
  };

  return (
    <div className="space-y-4">
      {canUpload && !info && (
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
                    <span className="font-medium text-slate-500">v{info.version}</span>
                    {info.file_size !== null && <span>{formatFileSize(info.file_size)}</span>}
                    <span>{info.schema_version || info.schema}</span>
                    <span>{t('scorm.filesCount', { count: info.files_count })}</span>
                    {info.uploaded_at && <span>{formatDate(info.uploaded_at)}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canViewComments && (
                  <button
                    onClick={toggleComments}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors relative"
                    title={t('documents.comments')}
                  >
                    <MessageSquare size={14} />
                    {(info.comments_count ?? 0) > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                        {info.comments_count}
                      </span>
                    )}
                  </button>
                )}
                {canPreview && (
                  <button
                    onClick={openPreview}
                    disabled={previewLoading}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                    title={t('documents.preview')}
                  >
                    {previewLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : launchUrl ? (
                      <Eye size={14} />
                    ) : (
                      <Eye size={14} className="opacity-30" />
                    )}
                  </button>
                )}
                {canUpload && (
                  <>
                    <input
                      ref={reuploadInputRef}
                      type="file"
                      accept=".zip"
                      className="hidden"
                      onChange={handleReupload}
                    />
                    <button
                      onClick={() => reuploadInputRef.current?.click()}
                      disabled={uploading}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                      title={t('scorm.reupload')}
                    >
                      {uploading ? (
                        <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {canViewComments && commentsOpen && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="space-y-3 mb-3">
                  {commentsLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">{t('documents.noComments')}</p>
                  ) : (
                    comments.map(comment => (
                      <div key={comment.id} className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-blue-600">
                            {comment.author.full_name[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700">
                              {comment.author.full_name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatDate(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap break-words">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {canAddComment && (
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={commentInputRef}
                      value={commentText}
                      onChange={event => setCommentText(event.target.value)}
                      placeholder={t('documents.commentPlaceholder')}
                      className="input resize-none flex-1 text-xs py-2"
                      rows={2}
                      onKeyDown={event => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          sendComment();
                        }
                      }}
                    />
                    <button
                      onClick={sendComment}
                      disabled={sendingComment || !commentText.trim()}
                      className="btn btn-primary p-2 disabled:opacity-40 shrink-0"
                      title={t('documents.sendComment')}
                    >
                      {sendingComment ? (
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {canPreview && showPreview && (
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
          )}
        </>
      )}
    </div>
  );
}
