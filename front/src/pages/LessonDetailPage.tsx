import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  FileText,
  Users,
  User,
  Pencil,
  AlertCircle,
} from 'lucide-react';
import { courseService, userService } from '../services';
import { useToast } from '../contexts/ToastContext';
import type {
  ApiLessonWithSubLessons,
  ApiSubLessonResponse,
  ApiUserWithRoles,
} from '../types/api';
import { LESSON_STATUS_COLORS } from '../types/api';

// ─── Create SubLesson Modal ────────────────────────────────────────────────────

const CreateSubLessonModal = ({
  lessonId,
  lessonTitle,
  onClose,
  onCreated,
}: {
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
  onCreated: (newSubLesson: ApiSubLessonResponse) => void;
}) => {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError(t('courses.modal.validationLessonName'));
      return;
    }
    setFormError('');
    setIsSaving(true);
    try {
      const sl = await courseService.createSubLesson(lessonId, {
        title: title.trim(),
        description: description.trim() || null,
        order_index: 0,
      });
      success(t('courses.modal.createSubLessonSuccess'));
      onCreated(sl);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || t('courses.modal.errorGeneric');
      toastError(t('courses.modal.errorGeneric'), msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">{lessonTitle}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          <div>
            <label className="label">
              {t('courses.modal.subLessonName')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('courses.modal.subLessonNamePlaceholder')}
              className="input"
              autoFocus
            />
          </div>

          <div>
            <label className="label">{t('courses.modal.description') || 'Mô tả'}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('courses.modal.descriptionPlaceholder')}
              className="input resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 justify-center">
              {t('courses.modal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {isSaving
                ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : t('courses.modal.submitCreate')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── User Badge ────────────────────────────────────────────────────────────────

const UserBadge = ({ user }: { user: ApiUserWithRoles | null | undefined }) =>
  user ? (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
        <span className="text-blue-700 font-semibold text-xs">
          {user.full_name.split(' ').slice(-1)[0][0]?.toUpperCase() ?? '?'}
        </span>
      </div>
      <span className="text-sm text-slate-700">{user.full_name}</span>
    </div>
  ) : (
    <span className="text-sm text-slate-400 italic">—</span>
  );

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LessonDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lessonId } = useParams<{ lessonId: string }>();

  const [lesson, setLesson] = useState<ApiLessonWithSubLessons | null>(null);
  const [courseTitle, setCourseTitle] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userCache, setUserCache] = useState<Record<string, ApiUserWithRoles>>({});

  const loadUser = useCallback((id: string) => {
    if (!id || userCache[id]) return;
    userService.getUser(id).then(u => {
      setUserCache(c => ({ ...c, [id]: u }));
    }).catch(() => {    });
  }, [userCache]);

  const loadLesson = useCallback(async () => {
    if (!lessonId) return;
    try {
      const data = await courseService.getLesson(lessonId);
      setLesson(data);
    } catch {
      setLesson(null);
    }
  }, [lessonId]);

  useEffect(() => {
    if (!lessonId) return;
    (async () => {
      setIsLoading(true);
      try {
        await loadLesson();
      } catch {
        setLesson(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [lessonId, loadLesson]);

  useEffect(() => {
    if (!lesson?.course_id) return;
    courseService.getCourse(lesson.course_id).then(c => {
      setCourseTitle(c.title);
      setCourseId(c.id);
      loadUser(c.assigned_expert_id);
    }).catch(() => {});
    if (lesson.assigned_teacher_id) loadUser(lesson.assigned_teacher_id);
    if (lesson.assigned_converter_id) loadUser(lesson.assigned_converter_id);
  }, [lesson?.course_id, lesson?.assigned_teacher_id, lesson?.assigned_converter_id, loadUser]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p>{t('courses.modal.notFound')}</p>
        <button onClick={() => navigate(-1)} className="btn btn-secondary mt-4">{t('courses.backToList')}</button>
      </div>
    );
  }

  const teacher = lesson.assigned_teacher_id ? userCache[lesson.assigned_teacher_id] : null;
  const converter = lesson.assigned_converter_id ? userCache[lesson.assigned_converter_id] : null;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <button
          onClick={() => navigate(`/courses/${courseId}`)}
          className="hover:text-slate-700 transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={14} />
          Quay lại
        </button>
        <ChevronRight size={14} />
        <span className="truncate max-w-[200px]">{courseTitle}</span>
        <ChevronRight size={14} />
        <span className="text-slate-800 font-medium truncate max-w-[200px]">{lesson.title}</span>
      </div>

      {/* Header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${LESSON_STATUS_COLORS[lesson.status] ?? ''}`}>
              {lesson.status}
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-2">{lesson.title}</h1>
            {lesson.description && (
              <p className="text-sm text-slate-500 mt-1">{lesson.description}</p>
            )}
          </div>
          <button
            onClick={() => navigate(`/courses/edit/${courseId}`)}
            className="btn btn-secondary flex items-center gap-1.5 text-sm shrink-0"
          >
            <Pencil size={14} />
            {t('courses.edit')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-400">Số bài con</div>
            <div className="text-sm font-medium text-slate-800">{lesson.sub_lessons.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Cập nhật lần cuối</div>
            <div className="text-sm font-medium text-slate-800">
              {new Date(lesson.updated_at).toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
              })}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Ngày tạo</div>
            <div className="text-sm font-medium text-slate-800">
              {new Date(lesson.created_at).toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Assignees */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users size={14} className="text-slate-400" />
            <span className="text-xs text-slate-400">Giảng viên:</span>
            <UserBadge user={teacher} />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User size={14} className="text-slate-400" />
            <span className="text-xs text-slate-400">Converter:</span>
            <UserBadge user={converter} />
          </div>
        </div>
      </div>

      {/* Sub-lessons list */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Bài học con</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {lesson.sub_lessons.length} bài
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-1.5 text-sm"
          >
            <Plus size={14} />
            {t('courses.modal.addSubLesson')}
          </button>
        </div>

        {lesson.sub_lessons.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400 italic space-y-3">
            <FileText size={36} className="mx-auto opacity-40" />
            <p>{t('courses.noSubLessons')}</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-secondary flex items-center gap-1.5 mx-auto text-sm"
            >
              <Plus size={14} />
              Tạo bài học con đầu tiên
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {lesson.sub_lessons.map((sl, idx) => (
              <Link
                key={sl.id}
                to={`/sub-lessons/${sl.id}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-blue-50/50 transition-all group"
              >
                <span className="text-xs text-slate-400 w-5 shrink-0">{idx + 1}</span>
                <FileText size={15} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                    {sl.title}
                  </div>
                  {sl.description && (
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{sl.description}</div>
                  )}
                </div>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${LESSON_STATUS_COLORS[sl.status] ?? ''}`}>
                  {sl.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <CreateSubLessonModal
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          onClose={() => setShowCreateModal(false)}
          onCreated={(newSl) => {
            setShowCreateModal(false);
            setLesson(prev => prev ? {
              ...prev,
              sub_lessons: [...prev.sub_lessons, newSl],
            } : prev);
          }}
        />
      )}
    </div>
  );
}
