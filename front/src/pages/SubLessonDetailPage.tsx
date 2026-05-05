import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  Check,
  Upload,
  FileText,
  HelpCircle,
  Package,
  History,
  Plus,
  AlertCircle,
  Trash2,
  Download,
  FileSpreadsheet,
  Presentation,
  File,
} from 'lucide-react';
import { courseService, documentService } from '../services';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import type {
  ApiSubLessonResponse,
  ApiDocumentWithUploader,
} from '../types/api';
import {
  API_ROLE,
  FILE_TYPE_COLORS,
  SUB_LESSON_STATUS,
  SUB_LESSON_STATUS_COLORS,
} from '../types/api';

type Tab = 'documents' | 'questions' | 'scorm' | 'history';

const WORKFLOW_STEPS = [
  { key: SUB_LESSON_STATUS.DRAFT,          label: 'Bản nháp' },
  { key: SUB_LESSON_STATUS.SUBMITTED,      label: 'Đã gửi' },
  { key: SUB_LESSON_STATUS.REVIEWING,      label: 'Kiểm duyệt' },
  { key: SUB_LESSON_STATUS.IN_CONVERSION,  label: 'Chuyển đổi' },
  { key: SUB_LESSON_STATUS.SCORM_UPLOADED, label: 'SCORM' },
  { key: SUB_LESSON_STATUS.APPROVED,       label: 'Đã duyệt' },
];

const FILE_TYPE_ICON_MAP: Record<string, React.ReactNode> = {
  pdf:  <FileText size={18} className="text-red-500" />,
  pptx: <Presentation size={18} className="text-orange-500" />,
  ppt:  <Presentation size={18} className="text-orange-500" />,
  docx: <FileText size={18} className="text-blue-500" />,
  doc:  <FileText size={18} className="text-blue-500" />,
  xlsx: <FileSpreadsheet size={18} className="text-green-600" />,
  xls:  <FileSpreadsheet size={18} className="text-green-600" />,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Action Modal ──────────────────────────────────────────────────────────────

type ModalType = 'submit' | 'approve' | 'reject' | 'upload';

const ActionModal = ({
  type,
  onClose,
  onDone,
}: {
  type: ModalType;
  subLessonId?: string;
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

// ─── Documents Tab ──────────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = ['pdf', 'pptx', 'ppt', 'docx', 'doc', 'xlsx', 'xls'];
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

const DocumentsTab = ({
  subLessonId,
  onRefresh,
  canUpload,
}: {
  subLessonId: string;
  onRefresh: () => void;
  canUpload?: boolean;
}) => {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<ApiDocumentWithUploader[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentService.listDocuments(subLessonId);
      setDocuments(res.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [subLessonId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toastError(t('documents.allowedTypes'));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toastError(t('documents.fileTooBig'));
      return;
    }
    setUploading(true);
    try {
      await documentService.uploadDocument(subLessonId, file);
      success(t('documents.uploadSuccess'));
      window.location.reload();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || t('documents.uploadError');
      toastError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await documentService.deleteDocument(deleteId);
      success(t('documents.deleteSuccess'));
      setDeleteId(null);
      loadDocuments();
      onRefresh();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || t('courses.modal.errorGeneric');
      toastError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (doc: ApiDocumentWithUploader) => {
    try {
      const url = await documentService.getDownloadUrl(doc.id);
      window.open(url, '_blank');
    } catch {
      toastError(t('courses.modal.errorGeneric'));
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
      {/* Upload area */}
      {canUpload !== false && (
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        }`}
        onDragOver={e => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ALLOWED_EXTENSIONS.map(e => `.${e}`).join(',')}
          onChange={handleInputChange}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-600 font-medium">{t('documents.uploading')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={24} className={dragActive ? 'text-blue-500' : 'text-slate-400'} />
            <p className={`text-sm font-medium ${dragActive ? 'text-blue-600' : 'text-slate-600'}`}>
              {dragActive ? t('documents.dragActive') : t('documents.dropzone')}
            </p>
            <p className="text-xs text-slate-400">{t('documents.dropzoneHint')}</p>
          </div>
        )}
      </div>
      )}

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="text-center py-10 text-slate-400 space-y-1">
          <FileText size={36} className="mx-auto opacity-40" />
          <p className="text-sm">{t('documents.noDocuments')}</p>
          <p className="text-xs">{t('documents.noDocumentsHint')}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-3 py-3 px-1 hover:bg-slate-50 rounded-lg transition-colors group"
            >
              {/* Icon */}
              <div className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${
                FILE_TYPE_COLORS[doc.file_extension] || 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                {FILE_TYPE_ICON_MAP[doc.file_extension] || <File size={18} className="text-slate-500" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{doc.original_name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>·</span>
                  <span>{formatDate(doc.created_at)}</span>
                  <span>·</span>
                  <span>{doc.uploader.full_name}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(doc)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                  title={t('documents.download')}
                >
                  <Download size={15} />
                </button>
                {canUpload !== false && (
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
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-auto p-5">
            <h3 className="text-base font-semibold text-slate-900 mb-2">{t('documents.deleteConfirm')}</h3>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDeleteId(null)} className="btn btn-secondary">{t('courses.modal.cancel')}</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn btn-danger disabled:opacity-50"
              >
                {deleting
                  ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : t('documents.delete')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'documents', label: 'Tài liệu',    icon: <FileText size={16} /> },
  { key: 'questions', label: 'Ngân hàng câu hỏi', icon: <HelpCircle size={16} /> },
  { key: 'scorm',     label: 'SCORM',        icon: <Package size={16} /> },
  { key: 'history',   label: 'Lịch sử',      icon: <History size={16} /> },
];

export default function SubLessonDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { subLessonId } = useParams<{ subLessonId: string }>();
  const { isAdmin, selectedRole } = useAuth();
  const canUploadDocuments =
    isAdmin || selectedRole === API_ROLE.TEACHER || selectedRole === API_ROLE.CONVERTER;

  const [subLesson, setSubLesson] = useState<ApiSubLessonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [modal, setModal] = useState<{ type: ModalType; show: boolean }>({ type: 'submit', show: false });
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
            <Link to={`/lessons/${lessonInfo.id}`} className="hover:text-slate-700 transition-colors truncate max-w-[200px]">
              {lessonInfo.title}
            </Link>
            <ChevronRight size={14} />
          </>
        )}
        <span className="text-slate-800 font-medium truncate max-w-[200px]">{subLesson.title}</span>
      </div>

      {/* Header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${SUB_LESSON_STATUS_COLORS[subLesson.status] ?? ''}`}>
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
            <DocumentsTab
              subLessonId={subLesson.id}
              onRefresh={loadSubLesson}
              canUpload={canUploadDocuments}
            />
          )}

          {activeTab === 'questions' && (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <HelpCircle size={40} className="mx-auto opacity-50" />
              <p className="text-sm">{t('courses.noQuestions')}</p>
              <button className="btn btn-secondary flex items-center gap-2 mx-auto">
                <Plus size={14} />
                {t('courses.createQuestion')}
              </button>
            </div>
          )}

          {activeTab === 'scorm' && (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <Package size={40} className="mx-auto opacity-50" />
              <p className="text-sm">{t('courses.noScorm')}</p>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="text-center py-12 text-slate-400">
              <History size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">{t('courses.noHistory')}</p>
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
