import { useTranslation } from 'react-i18next';
import { Send, CheckCircle, XCircle, UploadCloud, User, UserCheck, Users, PackageCheck, PackageX } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { CollapsibleDrawer } from '../../../components/ui/CollapsibleDrawer';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { formatDate, formatDateShort } from '../../../utils/formatters';
import type { ApiReviewLog, ApiSubLessonResponse, ApiUserWithRoles } from '../../../types/api';

interface SubLessonHeaderProps {
  canSubmitForReview?: boolean;
  canReview?: boolean;
  canSubmitScorm?: boolean;
  canReviewScorm?: boolean;
  onSubmit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onSubmitScorm?: () => void;
  onApproveScorm?: () => void;
  onRejectScorm?: () => void;
}

export function SubLessonHeader({
  canSubmitForReview,
  canReview,
  canSubmitScorm,
  canReviewScorm,
  onSubmit,
  onApprove,
  onReject,
  onSubmitScorm,
  onApproveScorm,
  onRejectScorm,
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
            className="btn btn-primary flex items-center gap-1 text-xs py-1.5 px-2.5"
          >
            <Send size={12} />
            {t('subLessons.actions.submitForReview')}
          </button>
        )}
        {canReview && (
          <>
            <button
              onClick={onReject}
              className="btn flex items-center gap-1 text-xs border border-red-200 text-red-600 hover:bg-red-50 py-1.5 px-2.5"
            >
              <XCircle size={12} />
              {t('subLessons.actions.reject')}
            </button>
            <button
              onClick={onApprove}
              className="btn flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white border-0 py-1.5 px-2.5"
            >
              <CheckCircle size={12} />
              {t('subLessons.actions.approve')}
            </button>
          </>
        )}
        {canSubmitScorm && (
          <button
            onClick={onSubmitScorm}
            className="btn btn-primary flex items-center gap-1 text-xs py-1.5 px-2.5"
          >
            <PackageCheck size={12} />
            {t('subLessons.actions.submitScorm')}
          </button>
        )}
        {canReviewScorm && (
          <>
            <button
              onClick={onRejectScorm}
              className="btn flex items-center gap-1 text-xs border border-red-200 text-red-600 hover:bg-red-50 py-1.5 px-2.5"
            >
              <XCircle size={12} />
              {t('subLessons.actions.rejectScorm')}
            </button>
            <button
              onClick={onApproveScorm}
              className="btn flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white border-0 py-1.5 px-2.5"
            >
              <CheckCircle size={12} />
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
  expert,
  teacher,
  converter,
  hasExpert,
  hasTeacher,
  hasConverter,
  reviewLogs,
  isOpen,
  onToggle,
}: {
  subLesson: ApiSubLessonResponse;
  lessonTitle: string | undefined;
  expert?: ApiUserWithRoles;
  teacher?: ApiUserWithRoles;
  converter?: ApiUserWithRoles;
  hasExpert?: boolean;
  hasTeacher?: boolean;
  hasConverter?: boolean;
  reviewLogs: ApiReviewLog[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const getReviewLogLabel = (log: ApiReviewLog) => {
    if (log.action === 'approve') return t('subLessons.reviewLog.approveContent');
    if (log.action === 'reject') return t('subLessons.reviewLog.rejectContent');
    if (log.action === 'upload_document') return t('subLessons.reviewLog.uploadDocument');
    if (log.action === 'reupload_document') return t('subLessons.reviewLog.reuploadDocument');
    if (log.action === 'upload_scorm') return t('subLessons.reviewLog.upload_scorm');
    if (log.action === 'reupload_scorm') return t('subLessons.reviewLog.reupload_scorm');
    if (log.action === 'submit_scorm') return t('subLessons.reviewLog.submit_scorm');
    if (log.action === 'approve_scorm') return t('subLessons.reviewLog.approve_scorm');
    if (log.action === 'reject_scorm') return t('subLessons.reviewLog.reject_scorm');
    return t(`subLessons.reviewLog.${log.action}`);
  };

  const renderUser = (user: ApiUserWithRoles | undefined, isAssigned: boolean | undefined) =>
    user ? (
      <div className="flex items-center gap-2">
        <UserAvatar name={user.full_name} size="sm" />
        <span className="text-sm text-slate-700">{user.full_name}</span>
      </div>
    ) : (
      <span className="text-sm text-slate-400 italic">{isAssigned ? '...' : '—'}</span>
    );

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

        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <UserCheck size={14} />
              <span>{t('roles.expert')}</span>
            </div>
            {renderUser(expert, hasExpert)}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Users size={14} />
              <span>{t('roles.teacher')}</span>
            </div>
            {renderUser(teacher, hasTeacher)}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <User size={14} />
              <span>{t('roles.converter')}</span>
            </div>
            {renderUser(converter, hasConverter)}
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="text-sm font-semibold text-slate-900">
            {t('subLessons.reviewLog.title')}
          </div>
          {reviewLogs.length === 0 ? (
            <div className="rounded border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-400">
              {t('subLessons.reviewLog.empty')}
            </div>
          ) : (
            <div className="space-y-3">
              {reviewLogs.map((log) => {
                const isReject = log.action === 'reject' || log.action === 'reject_scorm';
                const isApprove = log.action === 'approve' || log.action === 'approve_scorm';
                const isUpload = log.action === 'upload_document' || log.action === 'reupload_document' || log.action === 'upload_scorm' || log.action === 'reupload_scorm';
                const isScormSubmit = log.action === 'submit_scorm';
                const isScormApprove = log.action === 'approve_scorm';
                const isScormReject = log.action === 'reject_scorm';
                const iconClass = isReject
                  ? 'bg-red-50 text-red-600'
                  : isApprove
                    ? 'bg-green-50 text-green-600'
                    : isUpload
                      ? 'bg-purple-50 text-purple-600'
                      : isScormSubmit
                        ? 'bg-cyan-50 text-cyan-600'
                        : 'bg-blue-50 text-blue-600';

                return (
                  <div key={log.id} className="flex gap-3">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
                      {isScormReject ? <PackageX size={15} /> : isScormApprove ? <PackageCheck size={15} /> : isScormSubmit ? <PackageCheck size={15} /> : isReject ? <XCircle size={15} /> : isApprove ? <CheckCircle size={15} /> : isUpload ? <UploadCloud size={15} /> : <Send size={15} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800">{getReviewLogLabel(log)}</div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {formatDate(log.created_at)} · {log.actor?.full_name ?? t('subLessons.reviewLog.unknownActor')}
                      </div>
                      {log.from_status && log.to_status && log.from_status !== log.to_status && (
                        <div className="mt-1 text-xs text-slate-500">
                          {t(`subLessons.status.${log.from_status}`)} → {t(`subLessons.status.${log.to_status}`)}
                        </div>
                      )}
                      {log.comment && (
                        <div className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600 break-words">
                          {log.comment}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </CollapsibleDrawer>
  );
}
