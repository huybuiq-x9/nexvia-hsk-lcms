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
  GripVertical,
} from 'lucide-react';
import { courseService, userService } from '../services';
import { useToast } from '../contexts/ToastContext';
import { API_ROLE, type ApiCourseCreate, type ApiCourseUpdate, type ApiUserWithRoles } from '../types/api';

interface SubLessonDraft {
  _key: string;
  _isDeleted?: boolean;
  title: string;
  description: string;
  order_index: number;
}

interface LessonDraft {
  _key: string;
  _isDeleted?: boolean;
  title: string;
  description: string;
  order_index: number;
  teacher_id: string;
  converter_id: string;
  sub_lessons: SubLessonDraft[];
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
  const [deletedLessonIds, setDeletedLessonIds] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropZoneIdx, setDropZoneIdx] = useState<number | null>(null);

  // Load all user lists
  useEffect(() => {
    Promise.all([
      userService.listUsers({ limit: 100, role: API_ROLE.EXPERT }),
      userService.listUsers({ limit: 100, role: API_ROLE.TEACHER }),
      userService.listUsers({ limit: 100, role: API_ROLE.CONVERTER }),
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
    (async () => {
      setIsLoadingCourse(true);
      try {
        const course = await courseService.getCourse(courseId);
        const lessonsWithSubLessons = await Promise.all(
          course.lessons.map(async l => {
            try {
              const fullLesson = await courseService.getLesson(l.id);
              return {
                _key: l.id,
                title: l.title,
                description: l.description ?? '',
                order_index: l.order_index,
                teacher_id: l.assigned_teacher_id ?? '',
                converter_id: l.assigned_converter_id ?? '',
                sub_lessons: fullLesson.sub_lessons.map(sl => ({
                  _key: sl.id,
                  title: sl.title,
                  description: sl.description ?? '',
                  order_index: sl.order_index,
                })),
              };
            } catch {
              return {
                _key: l.id,
                title: l.title,
                description: l.description ?? '',
                order_index: l.order_index,
                teacher_id: l.assigned_teacher_id ?? '',
                converter_id: l.assigned_converter_id ?? '',
                sub_lessons: [] as SubLessonDraft[],
              };
            }
          })
        );
        setForm({
          title: course.title,
          description: typeof course.description === 'string' ? course.description : '',
          expert_id: course.assigned_expert_id,
          lessons: lessonsWithSubLessons,
        });
      } catch {
        toastError(t('courses.modal.errorGeneric'));
        navigate('/courses');
      } finally {
        setIsLoadingCourse(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const addLesson = () => {
    setForm(f => ({
      ...f,
      lessons: [
        ...f.lessons,
        { _key: makeKey(), title: '', description: '', order_index: f.lessons.length, teacher_id: '', converter_id: '', sub_lessons: [] },
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
    // Existing lessons (UUID _key) are soft-deleted; new lessons (random _key) are removed.
    const lesson = form.lessons[idx];
    if (lesson._key.length === 36 && lesson._key.includes('-')) {
      setForm(f => ({
        ...f,
        lessons: f.lessons.map((l, i) => i === idx ? { ...l, _isDeleted: true } : l),
      }));
      setDeletedLessonIds(prev => [...prev, lesson._key]);
    } else {
      setForm(f => ({ ...f, lessons: f.lessons.filter((_, i) => i !== idx) }));
    }
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDropZoneIdx(idx);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX, y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDropZoneIdx(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragIdx === null) return;
    if (dragIdx === dropIdx || dragIdx === dropIdx - 1) {
      setDragIdx(null);
      setDropZoneIdx(null);
      return;
    }
    const reordered = [...form.lessons];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    const reindexed = reordered.map((l, i) => ({ ...l, order_index: i }));
    setForm(f => ({ ...f, lessons: reindexed }));
    setDragIdx(null);
    setDropZoneIdx(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setFormError(t('courses.modal.validationCourseName')); return; }
    if (!form.expert_id && !isEditing) { setFormError(t('courses.modal.expertRequired')); return; }
    if (!form.expert_id && isEditing) { setFormError(t('courses.modal.expertRequired')); return; }
    for (const lesson of form.lessons) {
      if (!lesson.title.trim()) { setFormError(t('courses.modal.validationLessonName')); return; }
    }

    setFormError('');
    setIsSaving(true);
    try {
      if (isEditing && courseId) {
        // Existing lessons (UUID _key, not deleted) — update; new lessons (random _key) — create.
        const visible = form.lessons.filter(l => l._isDeleted !== true);
        const existingLessons = visible.filter(l => l._key.length === 36 && l._key.includes('-'));
        const newLessons = visible.filter(l => !(l._key.length === 36 && l._key.includes('-')));

        await courseService.updateCourse(courseId, {
          title: form.title.trim(),
          description: form.description.trim() || null,
          assigned_expert_id: form.expert_id,
          lessons: [
            ...existingLessons
              .filter(l => l.title.trim())
              .map((l, idx) => ({
                id: l._key,
                title: l.title.trim(),
                description: l.description.trim() || null,
                order_index: idx,
                teacher_id: l.teacher_id || null,
                converter_id: l.converter_id || null,
              })),
            ...newLessons
              .filter(l => l.title.trim())
              .map((l, idx) => ({
                title: l.title.trim(),
                description: l.description.trim() || null,
                order_index: existingLessons.filter(x => x.title.trim()).length + idx,
                teacher_id: l.teacher_id || null,
                converter_id: l.converter_id || null,
              })),
          ],
          delete_lesson_ids: deletedLessonIds,
        } as ApiCourseUpdate);

        // Sync sub-lessons only for existing lessons that are kept
        const keptExistingLessonIds = existingLessons
          .filter(l => l.title.trim())
          .map(l => l._key);

        await Promise.all(keptExistingLessonIds.map(async lessonId => {
          const lesson = form.lessons.find(l => l._key === lessonId)!;
          const visibleSl = lesson.sub_lessons.filter(sl => !sl._isDeleted);
          const existingSl = visibleSl.filter(sl => sl._key.length === 36 && sl._key.includes('-'));
          const newSl = visibleSl.filter(sl => !(sl._key.length === 36 && sl._key.includes('-')));
          const deletedSlIds = lesson.sub_lessons
            .filter(sl => sl._isDeleted && sl._key.length === 36 && sl._key.includes('-'))
            .map(sl => sl._key);

          // Update existing, create new, batch delete
          await Promise.all([
            ...existingSl.map((sl, idx) =>
              courseService.updateSubLesson(sl._key, {
                title: sl.title.trim(),
                description: sl.description.trim() || null,
                order_index: idx,
              })
            ),
            ...newSl.map((sl, idx) =>
              courseService.createSubLesson(lessonId, {
                title: sl.title.trim(),
                description: sl.description.trim() || null,
                order_index: existingSl.length + idx,
              })
            ),
          ]);
          if (deletedSlIds.length > 0) {
            await courseService.deleteSubLessonBatch(lessonId, deletedSlIds);
          }
        }));

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

  const visibleLessons = form.lessons.filter(l => !l._isDeleted).sort((a, b) => a.order_index - b.order_index);

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
                required
              >
                <option value="">{t('courses.modal.selectExpert')}</option>
                {experts.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Lessons builder */}
        <div className="space-y-3">
          <label className="label mb-0">{t('courses.lessons')}</label>

          {visibleLessons.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg">
              <BookOpen size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{t('courses.noLessons')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('courses.create.addLessonHint')}</p>
            </div>
          ) : (
            <div>
              {/* Top drop zone */}
              <div
                onDragOver={e => handleDragOver(e, 0)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, 0)}
                className={`relative h-1 rounded-full bg-transparent transition-all duration-150 mb-1 ${
                  dropZoneIdx === 0 && dragIdx !== null && dragIdx !== 0
                    ? 'h-2 bg-blue-500'
                    : ''
                }`}
              />

              {visibleLessons.map((lesson) => {
                const actualIdx = form.lessons.indexOf(lesson);
                const isDragging = dragIdx === actualIdx;
                return (
                  <div key={lesson._key}>
                    {/* Lesson card */}
                    <div
                      draggable
                      onDragStart={e => handleDragStart(e, actualIdx)}
                      onDragOver={e => handleDragOver(e, actualIdx)}
                      onDragLeave={handleDragLeave}
                      onDrop={e => handleDrop(e, actualIdx)}
                      className={`border rounded-xl p-4 bg-slate-50 space-y-4 transition-all ${
                        isDragging ? 'opacity-40 border-slate-300' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          draggable="false"
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 shrink-0 mt-1 cursor-grab active:cursor-grabbing"
                          title={t('courses.modal.dragToReorder')}
                        >
                          <GripVertical size={14} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-3">
                          <input
                            type="text"
                            value={lesson.title}
                            onChange={e => updateLesson(actualIdx, { title: e.target.value })}
                            placeholder={t('courses.modal.lessonNamePlaceholder')}
                            className="input"
                          />
                          <textarea
                            value={lesson.description}
                            onChange={e => updateLesson(actualIdx, { description: e.target.value })}
                            placeholder={t('courses.modal.descriptionPlaceholder')}
                            className="input resize-none text-sm"
                            rows={2}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLesson(actualIdx)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors shrink-0 mt-1"
                          title={t('courses.modal.removeLesson')}
                        >
                          <X size={14} />
                        </button>
                      </div>

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
                              onChange={e => updateLesson(actualIdx, { teacher_id: e.target.value })}
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
                              onChange={e => updateLesson(actualIdx, { converter_id: e.target.value })}
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

                    {/* Gap drop zone after this lesson */}
                    <div
                      onDragOver={e => handleDragOver(e, actualIdx + 1)}
                      onDragLeave={handleDragLeave}
                      onDrop={e => handleDrop(e, actualIdx + 1)}
                      className={`relative h-1 rounded-full bg-transparent transition-all duration-150 mt-1 ${
                        dropZoneIdx === actualIdx + 1 && dragIdx !== null && dragIdx !== actualIdx + 1
                          ? 'h-2 bg-blue-500'
                          : ''
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={addLesson}
              className="w-full py-2 text-sm font-medium text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={13} />
              {t('courses.modal.addLesson')}
            </button>
          </div>
        </div>

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
