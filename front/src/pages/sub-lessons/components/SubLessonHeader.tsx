import { useTranslation } from 'react-i18next';
import { Send, CheckCircle, XCircle } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { CollapsibleDrawer } from '../../../components/ui/CollapsibleDrawer';
import { formatDateShort } from '../../../utils/formatters';
import type { ApiSubLessonResponse } from '../../../types/api';

interface SubLessonHeaderProps {
  canSubmitForReview?: boolean;
  canReview?: boolean;
  canReviewScorm?: boolean;
  canSubmitScorm?: boolean;
  onSubmit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onApproveScorm?: () => void;
  onRejectScorm?: () => void;
  onSubmitScorm?: () => void;
}

export function SubLessonHeader({
  canSubmitForReview,
  canReview,
  canReviewScorm,
  canSubmitScorm,
  onSubmit,
  onApprove,
  onReject,
  onApproveScorm,
  onRejectScorm,
  onSubmitScorm,
}: SubLessonHeaderProps) {
  const { t } = useTranslation();
  const hasActions = canSubmitForReview || canReview || canSubmitScorm || canReviewScorm;

  if (!hasActions) return null;

  return (
    <div className="flex justify-end">
      <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end">
        {canSubmitForReview && (
          <button
            onClick={onSubmit}
            className="btn btn-primary flex items-center gap-1.5 text-sm"
          >
            <Send size={14} />
            {t('subLessons.actions.submitForReview')}
          </button>
        )}
        {canReview && (
          <>
            <button
              onClick={onReject}
              className="btn flex items-center gap-1.5 text-sm border border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle size={14} />
              {t('subLessons.actions.reject')}
            </button>
            <button
              onClick={onApprove}
              className="btn flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-700 text-white border-0"
            >
              <CheckCircle size={14} />
              {t('subLessons.actions.approve')}
            </button>
          </>
        )}
        {canSubmitScorm && (
          <button
            onClick={onSubmitScorm}
            className="btn btn-primary flex items-center gap-1.5 text-sm"
          >
            <Send size={14} />
            {t('subLessons.actions.submitScorm')}
          </button>
        )}
        {canReviewScorm && (
          <>
            <button
              onClick={onRejectScorm}
              className="btn flex items-center gap-1.5 text-sm border border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle size={14} />
              {t('subLessons.actions.rejectScorm')}
            </button>
            <button
              onClick={onApproveScorm}
              className="btn flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-700 text-white border-0"
            >
              <CheckCircle size={14} />
              {t('subLessons.actions.approveScorm')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function SubLessonInfoDrawer({
  subLesson,
  lessonTitle,
  isOpen,
  onToggle,
}: {
  subLesson: ApiSubLessonResponse;
  lessonTitle: string | undefined;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();

  return (
    <CollapsibleDrawer
      isOpen={isOpen}
      onToggle={onToggle}
      openLabel="Open sub-lesson information"
      closeLabel="Close sub-lesson information"
    >
      <div className="p-5 space-y-5">
        <div>
          <StatusBadge status={subLesson.status} type="subLesson" />
          <h1 className="text-xl font-bold text-slate-900 mt-2 break-words">{subLesson.title}</h1>
          {subLesson.description && (
            <p className="text-sm text-slate-500 mt-1 break-words">{subLesson.description}</p>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-400">{t('subLessons.card.parentLesson')}</div>
            <div className="text-sm font-medium text-slate-800 mt-0.5 break-words">
              {lessonTitle ?? '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">{t('subLessons.card.lastUpdated')}</div>
            <div className="text-sm font-medium text-slate-800 mt-0.5">
              {formatDateShort(subLesson.updated_at)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">{t('subLessons.card.createdAt')}</div>
            <div className="text-sm font-medium text-slate-800 mt-0.5">
              {formatDateShort(subLesson.created_at)}
            </div>
          </div>
        </div>
      </div>
    </CollapsibleDrawer>
  );
}
