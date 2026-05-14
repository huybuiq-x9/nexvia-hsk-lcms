import { useEffect, useRef, useState } from 'react';
import { FileArchive, MessageSquare, RefreshCw, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiScormComment, ApiScormPackage } from '../../../types/api';
import type { Scorm2004API } from 'scorm-again';
import { scormService } from '../../../services';
import { useToast } from '../../../contexts/ToastContext';
import { formatDate } from '../../../utils/formatters';

declare global {
  interface Window {
    API_1484_11?: Scorm2004API;
  }
}

interface ScormPreviewModalProps {
  scormPackage: ApiScormPackage;
  launchUrl: string;
  onClose: () => void;
  canComment?: boolean;
}

export function ScormPreviewModal({
  scormPackage,
  launchUrl,
  onClose,
  canComment = false,
}: ScormPreviewModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ApiScormComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const title = scormPackage.title || scormPackage.original_filename;

  useEffect(() => {
    let api: Scorm2004API | null = null;
    let disposed = false;

    void import('scorm-again').then(({ Scorm2004API }) => {
      if (disposed) return;
      api = new Scorm2004API({
        autocommit: true,
        autocommitSeconds: 10,
        dataCommitFormat: 'json',
        renderCommonCommitFields: true,
        sendFullCommit: true,
        logLevel: import.meta.env.DEV ? 'INFO' : 'ERROR',
        onLogMessage: (level, message) => {
          if (import.meta.env.DEV) {
            console.debug(`[SCORM ${level}]`, message);
          }
        },
      });

      api.cmi.learner_id = 'preview-user';
      api.cmi.learner_name = 'Preview User';
      window.API_1484_11 = api;
      setRuntimeReady(true);
    });

    return () => {
      disposed = true;
      if (api && window.API_1484_11 === api) {
        delete window.API_1484_11;
      }
    };
  }, [scormPackage.id]);

  const handleToggleComments = async () => {
    if (!canComment) return;
    const opening = !showComments;
    setShowComments(opening);
    if (opening && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await scormService.listComments(scormPackage.id);
        setComments(res.items);
      } catch {
        toast.error(t('scorm.commentsLoadError'));
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
      const comment = await scormService.addComment(scormPackage.id, text);
      setComments(prev => [...prev, comment]);
      setCommentText('');
    } catch {
      toast.error(t('scorm.commentSendError'));
    } finally {
      setSendingComment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-7xl mx-auto flex flex-col overflow-hidden h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileArchive size={16} className="text-blue-600 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900 truncate">{title}</h2>
              <p className="text-xs text-slate-400 truncate">
                {scormPackage.launch_path || scormPackage.original_filename}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canComment && (
              <button
                type="button"
                onClick={handleToggleComments}
                className="w-8 h-8 flex items-center justify-center rounded-md transition-colors relative"
                title={t('scorm.comments')}
                aria-label={t('scorm.comments')}
                style={{
                  backgroundColor: showComments ? 'rgb(239 246 255)' : undefined,
                  color: showComments ? 'rgb(37 99 235)' : 'rgb(100 116 139)',
                }}
              >
                <MessageSquare size={15} />
                {(scormPackage.comments_count ?? 0) > 0 && !showComments && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {scormPackage.comments_count}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setFrameKey(key => key + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title={t('scorm.reloadPreview')}
              aria-label={t('scorm.reloadPreview')}
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title={t('scorm.closePreview')}
              aria-label={t('scorm.closePreview')}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body: iframe + optional comment panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* SCORM iframe */}
          <div className="flex-1 overflow-hidden bg-slate-100">
            {runtimeReady ? (
              <iframe
                key={frameKey}
                src={launchUrl}
                title={title}
                className="w-full h-full border-0 bg-white"
                allow="fullscreen"
                allowFullScreen
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Comment panel */}
          {canComment && showComments && (
            <div className="w-72 shrink-0 border-l border-slate-200 flex flex-col bg-white">
              <div className="px-4 py-3 border-b border-slate-100 shrink-0">
                <h3 className="text-sm font-semibold text-slate-800">{t('scorm.comments')}</h3>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {loadingComments ? (
                  <div className="flex justify-center py-6">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">{t('scorm.noComments')}</p>
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
                  placeholder={t('scorm.commentPlaceholder')}
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
                  title={t('scorm.sendComment')}
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
