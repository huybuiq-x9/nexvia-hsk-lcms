import { useState, useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, Trash2, Eye, MessageSquare, Send, Upload } from 'lucide-react';
import { useSubLessonDocuments } from '../hooks/useSubLessonDocuments';
import { FileDropzone } from '../../../components/ui/FileDropzone';
import { FileIcon } from '../../../components/ui/FileIcon';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { FilePreviewModal } from '../../../components/ui/FilePreviewModal';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../contexts/ToastContext';
import { formatFileSize, formatDate } from '../../../utils/formatters';
import { documentService } from '../../../services';
import { SUB_LESSON_STATUS } from '../../../types/api';
import type { ApiDocumentWithUploader, ApiDocumentComment } from '../../../types/api';

const getApiErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback;

interface SubLessonDocumentsTabProps {
  subLessonId: string;
  subLessonStatus: string;
  onRefresh: () => void;
  canUpload?: boolean;
  canPreview?: boolean;
  canDownload?: boolean;
  canComment?: boolean;
  canDelete?: boolean;
}

export function SubLessonDocumentsTab({
  subLessonId,
  subLessonStatus,
  onRefresh,
  canUpload = true,
  canPreview = true,
  canDownload = true,
  canComment = true,
  canDelete = false,
}: SubLessonDocumentsTabProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const {
    documents,
    loading,
    uploading,
    uploadDocuments,
    deleteDocument,
    getDownloadUrl,
    reload,
  } = useSubLessonDocuments(subLessonId, onRefresh);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reuploadingDocId, setReuploadingDocId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ApiDocumentWithUploader | null>(null);
  const [, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Inline comments state
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, ApiDocumentComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [sendingComment, setSendingComment] = useState<Record<string, boolean>>({});
  const commentInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const reuploadInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const isLocked = !(
    subLessonStatus === SUB_LESSON_STATUS.DRAFT ||
    subLessonStatus === SUB_LESSON_STATUS.IN_PROGRESS
  );

  const handleFiles = async (files: File[]) => {
    if (!canUpload || isLocked) return;
    try {
      await uploadDocuments(files);
      toast.success(t('documents.uploadSuccess'));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('documents.uploadError')));
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !canDelete || isLocked) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteId);
      toast.success(t('documents.deleteSuccess'));
      setDeleteId(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('courses.modal.errorGeneric')));
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (doc: ApiDocumentWithUploader) => {
    if (!canDownload) return;
    try {
      const url = await getDownloadUrl(doc.id);
      window.open(url, '_blank');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('courses.modal.errorGeneric')));
    }
  };

  const handleReupload = async (
    doc: ApiDocumentWithUploader,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (!canUpload || isLocked) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setReuploadingDocId(doc.id);
    try {
      await documentService.reuploadDocument(doc.id, file);
      await reload();
      onRefresh();
      toast.success(t('documents.reuploadSuccess'));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('documents.reuploadError')));
    } finally {
      setReuploadingDocId(null);
    }
  };

  const handlePreview = async (doc: ApiDocumentWithUploader) => {
    if (!canPreview) return;
    setPreviewLoading(true);
    setPreviewUrl(null);
    setPreviewDoc(null);
    try {
      const url = await getDownloadUrl(doc.id);
      setPreviewUrl(url);
      setPreviewDoc(doc);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('courses.modal.errorGeneric')));
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleComments = async (doc: ApiDocumentWithUploader) => {
    if (!canComment) return;
    const docId = doc.id;
    const isExpanding = expandedDocId !== docId;

    if (isExpanding) {
      setExpandedDocId(docId);
      if (!commentsMap[docId]) {
        setLoadingComments(prev => ({ ...prev, [docId]: true }));
        try {
          const res = await documentService.listComments(docId);
          setCommentsMap(prev => ({ ...prev, [docId]: res.items }));
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, t('courses.modal.errorGeneric')));
        } finally {
          setLoadingComments(prev => ({ ...prev, [docId]: false }));
        }
      }
      setTimeout(() => {
        commentInputRefs.current[docId]?.focus();
      }, 50);
    } else {
      setExpandedDocId(null);
    }
  };

  const sendComment = async (docId: string) => {
    if (!canComment) return;
    const text = commentText[docId]?.trim();
    if (!text) return;
    setSendingComment(prev => ({ ...prev, [docId]: true }));
    try {
      const comment = await documentService.addComment(docId, text);
      setCommentsMap(prev => ({
        ...prev,
        [docId]: [...(prev[docId] || []), comment],
      }));
      setCommentText(prev => ({ ...prev, [docId]: '' }));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('courses.modal.errorGeneric')));
    } finally {
      setSendingComment(prev => ({ ...prev, [docId]: false }));
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
      {canUpload && !isLocked && (
        <FileDropzone
          accept={['pdf', 'pptx', 'ppt', 'docx', 'doc', 'xlsx', 'xls']}
          maxSize={200 * 1024 * 1024}
          onFiles={handleFiles}
          uploading={uploading}
        />
      )}

      {canUpload && isLocked && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span className="shrink-0">🔒</span>
          <span>{t('documents.lockedAfterSubmit')}</span>
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState
          icon={<FileText size={36} />}
          message={t('documents.noDocuments')}
          hint={t('documents.noDocumentsHint')}
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {documents.map(doc => {
            const isExpanded = expandedDocId === doc.id;
            const docComments = commentsMap[doc.id] || [];
            const isLoadingCmt = loadingComments[doc.id];
            const isSendingCmt = sendingComment[doc.id];
            const docCommentText = commentText[doc.id] || '';
            const isReuploading = reuploadingDocId === doc.id;

            return (
              <div key={doc.id} className="group">
                {/* Document row */}
                <div className="flex items-center gap-3 py-3 px-1 hover:bg-slate-50 rounded-lg transition-colors">
                  <div
                    className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${
                      doc.file_extension === 'pdf' ? 'bg-red-50 text-red-700 border-red-200' :
                      (doc.file_extension === 'pptx' || doc.file_extension === 'ppt') ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      (doc.file_extension === 'docx' || doc.file_extension === 'doc') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      (doc.file_extension === 'xlsx' || doc.file_extension === 'xls') ? 'bg-green-50 text-green-700 border-green-200' :
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <FileIcon extension={doc.file_extension} size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{doc.original_name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="font-medium text-slate-500">v{doc.version}</span>
                      <span>·</span>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>·</span>
                      <span>{formatDate(doc.created_at)}</span>
                      <span>·</span>
                      <span>{doc.uploader.full_name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {canPreview && doc.file_extension === 'pdf' && (
                      <button
                        onClick={() => handlePreview(doc)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                        title={t('documents.preview')}
                      >
                        <Eye size={15} />
                      </button>
                    )}
                    {canComment && (
                      <button
                        onClick={() => toggleComments(doc)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors relative"
                        title={t('documents.comments')}
                        style={{
                          backgroundColor: isExpanded ? 'rgb(239 246 255)' : undefined,
                          color: isExpanded ? 'rgb(37 99 235)' : undefined,
                          opacity: isExpanded ? 1 : undefined,
                        }}
                      >
                        <MessageSquare size={15} />
                        {(doc.comments_count ?? 0) > 0 && !isExpanded && (
                          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                            {doc.comments_count}
                          </span>
                        )}
                      </button>
                    )}
                    {canDownload && (
                      <button
                        onClick={() => handleDownload(doc)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                        title={t('documents.download')}
                      >
                        <Download size={15} />
                      </button>
                    )}
                    {canUpload && !isLocked && (
                      <>
                        <input
                          ref={el => { reuploadInputRefs.current[doc.id] = el; }}
                          type="file"
                          accept={`.${doc.file_extension}`}
                          className="hidden"
                          onChange={event => handleReupload(doc, event)}
                        />
                        <button
                          onClick={() => reuploadInputRefs.current[doc.id]?.click()}
                          disabled={isReuploading}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                          title={t('documents.reupload')}
                        >
                          {isReuploading ? (
                            <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Upload size={15} />
                          )}
                        </button>
                      </>
                    )}
                    {canDelete && !isLocked && (
                      <button
                        onClick={() => setDeleteId(doc.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                        title={t('documents.delete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline comments panel */}
                {canComment && isExpanded && (
                  <div className="pl-4 pr-1 pb-4 ml-4 border-l-2 border-blue-200">
                    {/* Comments list */}
                    <div className="space-y-2 mb-3">
                      {isLoadingCmt ? (
                        <div className="flex justify-center py-4">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : docComments.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">{t('documents.noComments')}</p>
                      ) : (
                        docComments.map(comment => (
                          <div key={comment.id} className="flex gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[9px] font-bold text-blue-600">{comment.author.full_name[0]?.toUpperCase()}</span>
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

                    {/* Comment input */}
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={el => { commentInputRefs.current[doc.id] = el; }}
                        value={docCommentText}
                        onChange={e => setCommentText(prev => ({ ...prev, [doc.id]: e.target.value }))}
                        placeholder={t('documents.commentPlaceholder')}
                        className="input resize-none flex-1 text-xs py-2"
                        rows={2}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendComment(doc.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => sendComment(doc.id)}
                        disabled={isSendingCmt || !docCommentText.trim()}
                        className="btn btn-primary p-2 disabled:opacity-40 shrink-0"
                        title={t('documents.sendComment')}
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
      )}

      {deleteId && (
        <ConfirmModal
          title={t('documents.deleteConfirm')}
          message=""
          confirmLabel={t('documents.delete')}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          variant="danger"
          loading={deleting}
          icon={<Trash2 size={20} className="text-red-600" />}
        />
      )}

      {previewDoc && (
        <FilePreviewModal
          doc={previewDoc}
          url={previewUrl}
          onClose={() => { setPreviewDoc(null); setPreviewUrl(null); }}
          onDownload={() => handleDownload(previewDoc)}
          canComment={canComment}
        />
      )}
    </div>
  );
}
