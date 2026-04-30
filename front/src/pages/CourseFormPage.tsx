import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Plus,
  X,
  AlertCircle,
  BookOpen,
  User,
  Users,
} from 'lucide-react';
import { courseService, userService } from '../services';
import { useToast } from '../contexts/ToastContext';
import type { ApiCourseCreate, ApiUserWithRoles } from '../types/api';

interface LessonDraft {
  _key: string;
  title: string;
  description: string;
  order_index: number;
  teacher_id: string;
  converter_id: string;
}

function makeKey() {
  return Math.random().toString(36).slice(2, 10);
}

export default function CourseFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId?: string }>();
  const isEditing = Boolean(courseId);

  const { success, error: toastError } = useToast();

  const [experts, setExperts] = useState<ApiUserWithRoles[]>([]);
  const [teachers, setTeachers] = useState<ApiUserWithRoles[]>([]);
  const [converters, setConverters] = useState<ApiUserWithRoles[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingCourse, setIsLoadingCourse] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    expert_id: '',
    lessons: [] as LessonDraft[],
  });

  // Load all user lists
  useEffect(() => {
    Promise.all([
      userService.listUsers({ limit: 100, role: 'expert' }),
      userService.listUsers({ limit: 100, role: 'teacher' }),
      userService.listUsers({ limit: 100, role: 'converter' }),
    ]).then(([eRes, tRes, cRes]) => {
      setExperts(eRes.items);
      setTeachers(tRes.items);
      setConverters(cRes.items);
    }).catch(() => {})
      .finally(() => setIsLoadingUsers(false));
  }, []);

  // Load existing course when editing
  useEffect(() => {
    if (!courseId) return;
    courseService.getCourse(courseId)
      .then(course => {
        setForm({
          title: course.title,
          description: course.description ?? '',
          expert_id: course.assigned_expert_id,
          lessons: course.lessons.map(l => ({
            _key: l.id,
            title: l.title,
            description: l.description ?? '',
            order_index: l.order_index,
            teacher_id: l.assigned_teacher_id ?? '',
            converter_id: l.assigned_converter_id ?? '',
          })),
        });
      })
      .catch(() => {
        toastError(t('courses.modal.errorGeneric'));
        navigate('/courses');
      })
      .finally(() => setIsLoadingCourse(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const addLesson = () => {
    setForm(f => ({
      ...f,
      lessons: [
        ...f.lessons,
        { _key: makeKey(), title: '', description: '', order_index: f.lessons.length, teacher_id: '', converter_id: '' },
      ],
    }));
  };

  const updateLesson = (idx: number, patch: Partial<LessonDraft>) => {
    setForm(f => ({
      ...f,
      lessons: f.lessons.map((l, i) => i === idx ? { ...l, ...patch } : l),
    }));
  };

  const removeLesson = (idx: number) => {
    setForm(f => ({ ...f, lessons: f.lessons.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setFormError(t('courses.modal.validationCourseName')); return; }
    if (!form.expert_id && !isEditing) { setFormError(t('courses.modal.expertRequired')); return; }
    for (const lesson of form.lessons) {
      if (!lesson.title.trim()) { setFormError(t('courses.modal.validationLessonName')); return; }
    }

    setFormError('');
    setIsSaving(true);
    try {
      if (isEditing && courseId) {
        await courseService.updateCourse(courseId, {
          title: form.title.trim(),
          description: form.description.trim() || null,
        });
        success(t('courses.modal.updateSuccess'));
      } else {
        const payload: ApiCourseCreate = {
          title: form.title.trim(),
          description: form.description.trim() || null,
          assigned_expert_id: form.expert_id,
          lessons: form.lessons
            .filter(l => l.title.trim())
            .map((l, idx) => ({
              title: l.title.trim(),
              description: l.description.trim() || null,
              order_index: idx,
              teacher_id: l.teacher_id || null,
              converter_id: l.converter_id || null,
            })),
        };
        await courseService.createCourse(payload);
        success(t('courses.modal.createSuccess'));
      }
      navigate('/courses');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || t('courses.modal.errorGeneric');
      setFormError(msg);
    } finally { setIsSaving(false); }
  };

  const isLoading = isLoadingUsers || isLoadingCourse;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/courses')}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            {isEditing ? t('courses.modal.titleEdit') : t('courses.modal.titleCreate')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isEditing
              ? `${form.title || t('courses.modal.titleEdit')}`
              : t('courses.create.subtitle')
            }
          </p>
        </div>
      </div>

      {/* Form card */}
      <form onSubmit={handleSubmit} className="card p-5 sm:p-6 space-y-6">
        {formError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
            <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{formError}</p>
          </div>
        )}

        {/* Course info */}
        <div className="space-y-4">
          <div>
            <label className="label">
              {t('courses.modal.courseName')} <span className="text-red-500">*</span>
            </label>
            {isLoading ? (
              <div className="h-10 bg-slate-50 rounded-md animate-pulse" />
            ) : (
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={t('courses.modal.courseNamePlaceholder')}
                className="input"
                required
              />
            )}
          </div>

          <div>
            <label className="label">{t('courses.modal.description')}</label>
            {isLoading ? (
              <div className="h-20 bg-slate-50 rounded-md animate-pulse" />
            ) : (
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t('courses.modal.descriptionPlaceholder')}
                className="input resize-none"
                rows={3}
              />
            )}
          </div>

          <div>
            <label className="label">
              {t('courses.modal.expert')} <span className="text-red-500">*</span>
            </label>
            {isLoading ? (
              <div className="h-10 bg-slate-50 rounded-md animate-pulse" />
            ) : (
              <select
                value={form.expert_id}
                onChange={e => setForm(f => ({ ...f, expert_id: e.target.value }))}
                className="input"
                disabled={isEditing}
                required={!isEditing}
              >
                <option value="">{t('courses.modal.selectExpert')}</option>
                {experts.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            )}
            {isEditing && (
              <p className="text-xs text-slate-400 mt-1">{t('courses.create.expertLocked')}</p>
            )}
          </div>
        </div>

        {/* Lessons builder — only when creating */}
        {!isEditing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="label mb-0">{t('courses.lessons')}</label>
              <button
                type="button"
                onClick={addLesson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Plus size={13} />
                {t('courses.modal.addLesson')}
              </button>
            </div>

            {form.lessons.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg">
                <BookOpen size={28} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">{t('courses.noLessons')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('courses.create.addLessonHint')}</p>
              </div>
            )}

            {form.lessons.map((lesson, idx) => (
              <div key={lesson._key} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
                {/* Lesson header */}
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-xs font-bold text-blue-600 shrink-0 mt-1">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0 space-y-3">
                    <input
                      type="text"
                      value={lesson.title}
                      onChange={e => updateLesson(idx, { title: e.target.value })}
                      placeholder={t('courses.modal.lessonNamePlaceholder')}
                      className="input"
                    />
                    <textarea
                      value={lesson.description}
                      onChange={e => updateLesson(idx, { description: e.target.value })}
                      placeholder={t('courses.modal.descriptionPlaceholder')}
                      className="input resize-none text-sm"
                      rows={2}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLesson(idx)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors shrink-0 mt-1"
                    title={t('courses.modal.removeLesson')}
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Teacher + Converter assignment */}
                <div className="pl-10 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {t('courses.modal.assignLabel')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label">
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {t('courses.modal.teacher')}
                        </span>
                      </label>
                      <select
                        value={lesson.teacher_id}
                        onChange={e => updateLesson(idx, { teacher_id: e.target.value })}
                        className="input"
                      >
                        <option value="">{t('courses.modal.selectTeacher')}</option>
                        {teachers.map(u => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {t('courses.modal.converter')}
                        </span>
                      </label>
                      <select
                        value={lesson.converter_id}
                        onChange={e => updateLesson(idx, { converter_id: e.target.value })}
                        className="input"
                      >
                        <option value="">{t('courses.modal.selectConverter')}</option>
                        {converters.map(u => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit mode: lessons as read-only */}
        {isEditing && !isLoadingCourse && form.lessons.length > 0 && (
          <div className="space-y-2">
            <label className="label mb-0">{t('courses.lessons')} ({form.lessons.length})</label>
            <div className="space-y-2">
              {form.lessons.map((lesson, idx) => (
                <div key={lesson._key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-xs font-bold text-slate-500 shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{lesson.title}</p>
                    {lesson.description && (
                      <p className="text-xs text-slate-400 truncate">{lesson.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Users size={11} />
                      {lesson.teacher_id && teachers.find(u => u.id === lesson.teacher_id)?.full_name
                        ? teachers.find(u => u.id === lesson.teacher_id)?.full_name
                        : '—'}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <User size={11} />
                      {lesson.converter_id && converters.find(u => u.id === lesson.converter_id)?.full_name
                        ? converters.find(u => u.id === lesson.converter_id)?.full_name
                        : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">{t('courses.create.lessonsLocked')}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/courses')}
            className="btn btn-secondary flex-1 justify-center"
          >
            {t('courses.modal.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="btn btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving
              ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : isEditing
                ? t('courses.modal.submitUpdate')
                : t('courses.modal.submitCreate')
            }
          </button>
        </div>
      </form>
    </div>
  );
}
