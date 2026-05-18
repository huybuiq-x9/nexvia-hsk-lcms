import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, AlertCircle, CheckCircle, XCircle, PackageCheck, RotateCcw } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { courseService } from '../../../services';
import { SUB_LESSON_STATUS, SUB_LESSON_STATUSES } from '../../../types/api';
import type { SubLessonStatus } from '../../../types/api';

type ModalType = 'submit' | 'approve' | 'reject' | 'upload' | 'submit_scorm' | 'approve_scorm' | 'reject_scorm' | 'revert';

interface SubLessonActionModalProps {
  type: ModalType;
  subLessonId: string;
  currentStatus?: string;
  onClose: () => void;
  onDone: () => void;
}

export function SubLessonActionModal({ type, subLessonId, currentStatus, onClose, onDone }: SubLessonActionModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const revertableStatuses = SUB_LESSON_STATUSES.filter(s => s !== SUB_LESSON_STATUS.APPROVED && s !== currentStatus);
  const [revertTarget, setRevertTarget] = useState<SubLessonStatus>(revertableStatuses[0] ?? SUB_LESSON_STATUS.IN_PROGRESS);
  const [revertComment, setRevertComment] = useState('');

  const handleConfirm = async () => {
    setIsSaving(true);
    setError('');
    try {
      if (type === 'submit') {
        await courseService.submitSubLesson(subLessonId);
        toast.success(t('courses.modal.submitSuccess'));
        onDone();
      } else if (type === 'approve') {
        await courseService.reviewSubLesson(subLessonId, 'approve');
        toast.success(t('courses.modal.approveSuccess'));
        onDone();
      } else if (type === 'reject') {
        await courseService.reviewSubLesson(subLessonId, 'reject');
        toast.success(t('courses.modal.rejectSuccess'));
        onDone();
      } else if (type === 'submit_scorm') {
        await courseService.submitScorm(subLessonId);
        toast.success(t('courses.modal.submitScormSuccess'));
        onDone();
      } else if (type === 'approve_scorm') {
        await courseService.reviewScorm(subLessonId, 'approve_scorm');
        toast.success(t('courses.modal.approveScormSuccess'));
        onDone();
      } else if (type === 'reject_scorm') {
        await courseService.reviewScorm(subLessonId, 'reject_scorm');
        toast.success(t('courses.modal.rejectScormSuccess'));
        onDone();
      } else if (type === 'revert') {
        await courseService.revertSubLesson(subLessonId, revertTarget, revertComment || undefined);
        toast.success(t('courses.modal.revertSuccess'));
        onDone();
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? t('courses.modal.errorGeneric');
      setError(msg);
      setIsSaving(false);
    }
  };

  const titleMap: Record<ModalType, string> = {
    submit:        t('courses.modal.titleSubmit'),
    approve:       t('courses.modal.titleApprove'),
    reject:        t('courses.modal.titleReject'),
    upload:        t('courses.modal.titleUpload'),
    submit_scorm:  t('courses.modal.titleSubmitScorm'),
    approve_scorm: t('courses.modal.titleApproveScorm'),
    reject_scorm:  t('courses.modal.titleRejectScorm'),
    revert:        t('courses.modal.titleRevert'),
  };

  const iconMap: Record<ModalType, React.ReactNode> = {
    submit:        <Upload size={20} className="text-blue-600" />,
    approve:       <CheckCircle size={20} className="text-green-600" />,
    reject:        <XCircle size={20} className="text-red-600" />,
    upload:        <Upload size={20} className="text-violet-600" />,
    submit_scorm:  <PackageCheck size={20} className="text-blue-600" />,
    approve_scorm: <CheckCircle size={20} className="text-green-600" />,
    reject_scorm:  <XCircle size={20} className="text-red-600" />,
    revert:        <RotateCcw size={20} className="text-amber-600" />,
  };

  const btnClassMap: Record<ModalType, string> = {
    submit:        'btn-primary',
    approve:       'bg-green-600 hover:bg-green-700 text-white',
    reject:        'btn-danger',
    upload:        'bg-violet-600 hover:bg-violet-700 text-white',
    submit_scorm:  'btn-primary',
    approve_scorm: 'bg-green-600 hover:bg-green-700 text-white',
    reject_scorm:  'btn-danger',
    revert:        'bg-amber-600 hover:bg-amber-700 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            {iconMap[type]}
            <h2 className="text-base font-semibold text-slate-900">{titleMap[type]}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {type === 'submit' && (
            <p className="text-sm text-slate-600">{t('courses.modal.submitDesc')}</p>
          )}
          {type === 'approve' && (
            <p className="text-sm text-slate-600">{t('courses.modal.approveDesc')}</p>
          )}
          {type === 'reject' && (
            <p className="text-sm text-slate-600">{t('courses.modal.rejectDesc')}</p>
          )}
          {type === 'upload' && (
            <p className="text-sm text-slate-600">{t('courses.modal.uploadDesc')}</p>
          )}
          {type === 'submit_scorm' && (
            <p className="text-sm text-slate-600">{t('courses.modal.submitScormDesc')}</p>
          )}
          {type === 'approve_scorm' && (
            <p className="text-sm text-slate-600">{t('courses.modal.approveScormDesc')}</p>
          )}
          {type === 'reject_scorm' && (
            <p className="text-sm text-slate-600">{t('courses.modal.rejectScormDesc')}</p>
          )}
          {type === 'revert' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">{t('courses.modal.revertDesc')}</p>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('courses.modal.revertTargetLabel')}
                </label>
                <select
                  value={revertTarget}
                  onChange={e => setRevertTarget(e.target.value as SubLessonStatus)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {revertableStatuses.map(s => (
                    <option key={s} value={s}>{t(`subLessons.status.${s}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('courses.modal.revertCommentLabel')}
                </label>
                <textarea
                  value={revertComment}
                  onChange={e => setRevertComment(e.target.value)}
                  rows={3}
                  placeholder={t('courses.modal.revertCommentPlaceholder')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn btn-secondary">
              {t('courses.modal.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSaving}
              className={`btn ${btnClassMap[type]} disabled:opacity-50`}
            >
              {isSaving ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                t('courses.modal.confirm')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
