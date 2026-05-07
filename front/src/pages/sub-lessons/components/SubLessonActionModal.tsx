import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, AlertCircle } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';

type ModalType = 'submit' | 'approve' | 'reject' | 'upload';

interface SubLessonActionModalProps {
  type: ModalType;
  onClose: () => void;
  onDone: () => void;
}

export function SubLessonActionModal({ type, onClose, onDone }: SubLessonActionModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setIsSaving(true);
    setError('');
    try {
      if (type === 'reject') {
        if (!note.trim()) {
          setError(t('courses.modal.rejectNoteRequired'));
          setIsSaving(false);
          return;
        }
      }
      toast.success(t('courses.modal.actionSuccess'));
      onDone();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? t('courses.modal.errorGeneric');
      setError(msg);
      setIsSaving(false);
    }
  };

  const titleMap: Record<ModalType, string> = {
    submit:  t('courses.modal.titleSubmit'),
    approve: t('courses.modal.titleApprove'),
    reject:  t('courses.modal.titleReject'),
    upload:  t('courses.modal.titleUploadScorm'),
  };

  const btnClassMap: Record<ModalType, string> = {
    submit:  'btn-primary',
    approve: 'btn-success',
    reject:  'btn-danger',
    upload:  'btn-info',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">{titleMap[type]}</h2>
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
            <>
              <p className="text-sm text-slate-600">{t('courses.modal.rejectDesc')}</p>
              <div>
                <label className="label">
                  {t('courses.modal.rejectNote')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder={t('courses.modal.rejectNotePlaceholder')}
                  className="input resize-none"
                  rows={3}
                />
              </div>
            </>
          )}
          {type === 'upload' && (
            <>
              <p className="text-sm text-slate-600">{t('courses.modal.uploadScormDesc')}</p>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-slate-300 transition-colors">
                <Upload size={28} className="mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-500">{t('courses.modal.dropFile')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('courses.modal.scormFormat')}</p>
              </div>
            </>
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
