import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, MessageSquare, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiDocumentComment, ApiDocumentWithUploader } from '../../types/api';
import { documentService } from '../../services';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../utils/formatters';

interface FilePreviewModalProps {
  doc: ApiDocumentWithUploader;
  url: string | null;
  onClose: () => void;
  onDownload: () => void;
  canComment?: boolean;
  initialCommentCount?: number;
  onCommentAdded?: (comment: ApiDocumentComment) => void;
  onCommentsLoaded?: (comments: ApiDocumentComment[]) => void;
}

export function FilePreviewModal({ doc, url, onClose, onDownload, canComment = false, initialCommentCount, onCommentAdded, onCommentsLoaded }: FilePreviewModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ApiDocumentComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const handleToggleComments = async () => {
    if (!canComment) return;
    const opening = !showComments;
    setShowComments(opening);
    if (opening && !commentsLoaded) {
      setLoadingComments(true);
      try {
        const res = await documentService.listComments(doc.id);
        setComments(res.items);
        setCommentsLoaded(true);
        onCommentsLoaded?.(res.items);
      } catch {
        toast.error(t('documents.noComments'));
      } finally {
        setLoadingComments(false);
        setTimeout(() => commentInputRef.current?.focus(), 50);
      }
    } else if (opening) {
      setTimeout(() => commentInputRef.current?.focus(), 50);
    }
  };

  const handleSendComment = async () => {
    const text = commentText.trim();
    if (!text || sendingComment) return;
    setSendingComment(true);
    try {
      const comment = await documentService.addComment(doc.id, text);
      setComments(prev => [...prev, comment]);
      setCommentText('');
      onCommentAdded?.(comment);
    } catch {
      toast.error(t('documents.sendComment'));
    } finally {
      setSendingComment(false);
    }
  };

  const isPdf = doc.file_extension === 'pdf';
  const commentCount = commentsLoaded ? comments.length : (initialCommentCount ?? doc.comments_count ?? 0);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-7xl mx-auto flex flex-col overflow-hidden"
        style={{ height: '92dvh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={16} className="text-blue-600 shrink-0" />
            <span className="text-sm font-medium text-slate-800 truncate">{doc.original_name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canComment && isPdf && (
              <button
                type="button"
                onClick={handleToggleComments}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors relative"
                title={t('documents.comments')}
                style={{
                  backgroundColor: showComments ? 'rgb(239 246 255)' : undefined,
                  color: showComments ? 'rgb(37 99 235)' : 'rgb(148 163 184)',
                }}
              >
                <MessageSquare size={15} />
                {commentCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {commentCount}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onDownload}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title={t('documents.download')}
            >
              <Download size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body: PDF iframe + optional comment panel */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {url ? (
              isPdf ? (
                <iframe src={url} title={doc.original_name} className="w-full h-full border-0" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <FileText size={48} className="opacity-30" />
                  <p className="text-sm">{t('documents.previewNotSupported')}</p>
                  <button onClick={onDownload} className="btn btn-primary flex items-center gap-2">
                    <Download size={14} />
                    {t('documents.downloadToView')}
                  </button>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Comment panel */}
          {canComment && isPdf && showComments && (
            <div className="w-72 shrink-0 border-l border-slate-200 flex flex-col bg-white">
              <div className="px-4 py-3 border-b border-slate-100 shrink-0">
                <h3 className="text-sm font-semibold text-slate-800">{t('documents.comments')}</h3>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {loadingComments ? (
                  <div className="flex justify-center py-6">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">{t('documents.noComments')}</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold text-blue-600">
                          {comment.author.full_name[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
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
              <div className="px-4 py-3 border-t border-slate-100 shrink-0 flex items-end gap-2">
                <textarea
                  ref={commentInputRef}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder={t('documents.commentPlaceholder')}
                  className="input resize-none flex-1 text-xs py-2"
                  rows={2}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSendComment}
                  disabled={sendingComment || !commentText.trim()}
                  className="btn btn-primary p-2 disabled:opacity-40 shrink-0"
                  title={t('documents.sendComment')}
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
