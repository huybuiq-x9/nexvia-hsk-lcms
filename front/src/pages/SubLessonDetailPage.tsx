import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Send,
  Check,
  XCircle,
  Upload,
  Eye,
  FileText,
  HelpCircle,
  Package,
  History,
  Plus,
  AlertCircle,
  X,
} from 'lucide-react';
import { courseService, userService } from '../services';
import { useToast } from '../contexts/ToastContext';
import type { ApiSubLessonResponse } from '../types/api';
import { LESSON_STATUS_COLORS } from '../types/api';

type Tab = 'documents' | 'questions' | 'scorm' | 'history';

const SUBLESSON_STATUS_COLORS: Record<string, string> = {
  draft:            'bg-slate-50 text-slate-600 border-slate-200',
  in_progress:      'bg-blue-50 text-blue-700 border-blue-200',
  submitted:        'bg-amber-50 text-amber-700 border-amber-200',
  reviewing:       'bg-orange-50 text-orange-700 border-orange-200',
  in_conversion:   'bg-violet-50 text-violet-700 border-violet-200',
  scorm_uploaded:  'bg-violet-50 text-violet-700 border-violet-200',
  scorm_reviewing: 'bg-orange-50 text-orange-700 border-orange-200',
  approved:        'bg-green-50 text-green-700 border-green-200',
  published:       'bg-green-50 text-green-700 border-green-200',
};

const WORKFLOW_STEPS = [
  { key: 'draft',          label: 'Bản nháp' },
  { key: 'submitted',      label: 'Đã gửi' },
  { key: 'reviewing',      label: 'Kiểm duyệt' },
  { key: 'in_conversion',  label: 'Chuyển đổi' },
  { key: 'scorm_uploaded', label: 'SCORM' },
  { key: 'approved',       label: 'Đã duyệt' },
];

// ─── Action Modal ──────────────────────────────────────────────────────────────

type ModalType = 'submit' | 'approve' | 'reject' | 'upload';

const ActionModal = ({
  type,
  subLessonId,
  onClose,
  onDone,
}: {
  type: ModalType;
  subLessonId: string;
  onClose: () => void;
  onDone: (newStatus?: string) => void;
}) => {
  const { t } = useTranslation();
  const { success } = useToast();
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setIsSaving(true);
    setError('');
    try {
      if (type === 'reject') {
        if (!note.trim()) { setError(t('courses.modal.rejectNoteRequired')); setIsSaving(false); return; }
      }
      // TODO: call backend API when endpoints are available
      success(t('courses.modal.actionSuccess') || 'Action completed');
      onDone();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || t('courses.modal.errorGeneric');
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
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 text-lg leading-none">×</button>
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
                <label className="label">{t('courses.modal.rejectNote')} <span className="text-red-500">*</span></label>
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
            <button onClick={onClose} className="btn btn-secondary">{t('courses.modal.cancel')}</button>
            <button onClick={handleConfirm} disabled={isSaving} className={`btn ${btnClassMap[type]} disabled:opacity-50`}>
              {isSaving
                ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : t('courses.modal.confirm')
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Workflow Stepper ──────────────────────────────────────────────────────────

const WorkflowStepper = ({ currentStatus }: { currentStatus: string }) => {
  const currentIdx = WORKFLOW_STEPS.findIndex(s => s.key === currentStatus);

  return (
    <div className="card p-4">
      <div className="flex items-center overflow-x-auto gap-1">
        {WORKFLOW_STEPS.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isFuture = idx > currentIdx;
          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isDone ? 'bg-green-500 text-white' :
                  isCurrent ? 'bg-blue-600 text-white' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {isDone ? <Check size={13} /> : idx + 1}
                </div>
                <span className={`text-[10px] mt-1 whitespace-nowrap ${
                  isCurrent ? 'text-blue-600 font-semibold' :
                  isFuture ? 'text-slate-400' : 'text-slate-600'
                }`}>{step.label}</span>
              </div>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <div className={`w-8 sm:w-16 h-0.5 mx-1 ${
                  idx < currentIdx ? 'bg-green-400' : 'bg-slate-100'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'documents',  label: 'Tài liệu',       icon: <FileText size={16} /> },
  { key: 'questions',   label: 'Ngân hàng câu hỏi', icon: <HelpCircle size={16} /> },
  { key: 'scorm',       label: 'SCORM',          icon: <Package size={16} /> },
  { key: 'history',     label: 'Lịch sử',         icon: <History size={16} /> },
];

export default function SubLessonDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { subLessonId } = useParams<{ subLessonId: string }>();

  const [subLesson, setSubLesson] = useState<ApiSubLessonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [modal, setModal] = useState<{ type: ModalType; show: boolean }>({ type: 'submit', show: false });
  const [teacher, setTeacher] = useState<string | null>(null);
  const [lessonInfo, setLessonInfo] = useState<{ id: string; title: string; course_id: string } | null>(null);
  const [courseInfo, setCourseInfo] = useState<{ id: string; title: string } | null>(null);

  const loadSubLesson = useCallback(async () => {
    if (!subLessonId) return;
    try {
      const sl = await courseService.getSubLesson(subLessonId);
      setSubLesson(sl);
    } catch {
      setSubLesson(null);
    }
  }, [subLessonId]);

  useEffect(() => {
    if (!subLessonId) return;
    setIsLoading(true);
    loadSubLesson()
      .catch(() => { setSubLesson(null); })
      .finally(() => { setIsLoading(false); });
  }, [subLessonId, loadSubLesson]);

  // When subLesson loads, get parent lesson info
  useEffect(() => {
    if (!subLesson?.lesson_id) return;
    courseService.getLesson(subLesson.lesson_id).then(lesson => {
      setLessonInfo({ id: lesson.id, title: lesson.title, course_id: lesson.course_id });
      courseService.getCourse(lesson.course_id).then(course => {
        setCourseInfo({ id: course.id, title: course.title });
      }).catch(() => {});
    }).catch(() => {});
  }, [subLesson?.lesson_id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!subLesson) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p>{t('courses.modal.notFound')}</p>
        <button onClick={() => navigate(-1)} className="btn btn-secondary mt-4">{t('courses.backToList')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <Link to="/courses" className="hover:text-slate-700 transition-colors">Khóa học</Link>
        <ChevronRight size={14} />
        {courseInfo && (
          <>
            <Link to={`/courses/${courseInfo.id}`} className="hover:text-slate-700 transition-colors truncate max-w-[200px]">
              {courseInfo.title}
            </Link>
            <ChevronRight size={14} />
          </>
        )}
        {lessonInfo && (
          <>
            <span className="truncate max-w-[200px]">{lessonInfo.title}</span>
            <ChevronRight size={14} />
          </>
        )}
        <span className="text-slate-800 font-medium truncate max-w-[200px]">{subLesson.title}</span>
      </div>

      {/* Header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${SUBLESSON_STATUS_COLORS[subLesson.status] ?? ''}`}>
              {subLesson.status}
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-2">{subLesson.title}</h1>
            {subLesson.description && (
              <p className="text-sm text-slate-500 mt-1">{subLesson.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-400">Bài học cha</div>
            <div className="text-sm font-medium text-slate-800 mt-0.5 truncate">
              {lessonInfo?.title ?? '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Cập nhật lần cuối</div>
            <div className="text-sm font-medium text-slate-800 mt-0.5">
              {new Date(subLesson.updated_at).toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
              })}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Ngày tạo</div>
            <div className="text-sm font-medium text-slate-800 mt-0.5">
              {new Date(subLesson.created_at).toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow stepper */}
      <WorkflowStepper currentStatus={subLesson.status} />

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'documents' && (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <FileText size={40} className="mx-auto opacity-50" />
              <p className="text-sm">{t('courses.modal.noDocuments')}</p>
              <button className="btn btn-secondary flex items-center gap-2 mx-auto">
                <Upload size={14} />
                {t('courses.modal.uploadDocument')}
              </button>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <HelpCircle size={40} className="mx-auto opacity-50" />
              <p className="text-sm">{t('courses.modal.noQuestions')}</p>
              <button className="btn btn-secondary flex items-center gap-2 mx-auto">
                <Plus size={14} />
                {t('courses.modal.createQuestion')}
              </button>
            </div>
          )}

          {activeTab === 'scorm' && (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <Package size={40} className="mx-auto opacity-50" />
              <p className="text-sm">{t('courses.modal.noScorm')}</p>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="text-center py-12 text-slate-400">
              <History size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">{t('courses.modal.noHistory')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action modal */}
      {modal.show && (
        <ActionModal
          type={modal.type}
          subLessonId={subLesson.id}
          onClose={() => setModal(m => ({ ...m, show: false }))}
          onDone={() => {
            setModal(m => ({ ...m, show: false }));
            loadSubLesson();
          }}
        />
      )}
    </div>
  );
}
