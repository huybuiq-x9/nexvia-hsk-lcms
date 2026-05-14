import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Users, User, UserCheck, Pencil, FileText, Plus, X, AlertCircle, BookOpen, GripVertical } from 'lucide-react';
import { courseService, userService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useBreadcrumbs } from '../../contexts/BreadcrumbContext';
import { useUserCache } from '../../hooks/useUserCache';
import { CollapsibleDrawer } from '../../components/ui/CollapsibleDrawer';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { formatDateShort } from '../../utils/formatters';
import type { ApiCourseUpdate, ApiCourseWithLessons, ApiLessonWithSubLessons, ApiSubLessonResponse, ApiUserWithRoles } from '../../types/api';
import { API_ROLE } from '../../types/api';

interface CourseLessonDraft {
  _key: string;
  _isDeleted?: boolean;
  title: string;
  description: string;
  order_index: number;
  teacher_id: string;
  converter_id: string;
}

function makeKey() {
  return Math.random().toString(36).slice(2, 10);
}

function isPersistedId(id: string) {
  return id.length === 36 && id.includes('-');
}

function CourseInlineEditor({
  course,
  experts,
  teachers,
  converters,
  isLoadingUsers,
  onCancel,
  onSaved,
}: {
  course: ApiCourseWithLessons;
  experts: ApiUserWithRoles[];
  teachers: ApiUserWithRoles[];
  converters: ApiUserWithRoles[];
  isLoadingUsers: boolean;
  onCancel: () => void;
  onSaved: (course: ApiCourseWithLessons) => void;
}) {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletedLessonIds, setDeletedLessonIds] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropZoneIdx, setDropZoneIdx] = useState<number | null>(null);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    expert_id: string;
    lessons: CourseLessonDraft[];
  }>(() => ({
    title: course.title,
    description: course.description ?? '',
    expert_id: course.assigned_expert_id,
    lessons: [...course.lessons]
      .sort((a, b) => a.order_index - b.order_index)
      .map(lesson => ({
        _key: lesson.id,
        title: lesson.title,
        description: lesson.description ?? '',
        order_index: lesson.order_index,
        teacher_id: lesson.assigned_teacher_id ?? '',
        converter_id: lesson.assigned_converter_id ?? '',
      } satisfies CourseLessonDraft)),
  }));

  const visibleLessons = form.lessons.filter(l => !l._isDeleted).sort((a, b) => a.order_index - b.order_index);

  const addLesson = () => {
    setForm(f => ({
      ...f,
      lessons: [
        ...f.lessons,
        {
          _key: makeKey(),
          title: '',
          description: '',
          order_index: visibleLessons.length,
          teacher_id: '',
          converter_id: '',
        },
      ],
    }));
  };

  const updateLesson = (key: string, patch: Partial<CourseLessonDraft>) => {
    setForm(f => ({ ...f, lessons: f.lessons.map(l => l._key === key ? { ...l, ...patch } : l) }));
  };

  const removeLesson = (key: string) => {
    if (isPersistedId(key)) {
      setForm(f => ({ ...f, lessons: f.lessons.map(l => l._key === key ? { ...l, _isDeleted: true } : l) }));
      setDeletedLessonIds(prev => prev.includes(key) ? prev : [...prev, key]);
    } else {
      setForm(f => ({ ...f, lessons: f.lessons.filter(l => l._key !== key) }));
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
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
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

    const reordered = [...visibleLessons];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    const reindexed = reordered.map((lesson, idx) => ({ ...lesson, order_index: idx }));
    const deleted = form.lessons.filter(lesson => lesson._isDeleted);
    setForm(f => ({ ...f, lessons: [...reindexed, ...deleted] }));
    setDragIdx(null);
    setDropZoneIdx(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError(t('courses.modal.validationCourseName'));
      return;
    }
    if (!form.expert_id) {
      setFormError(t('courses.modal.expertRequired'));
      return;
    }
    if (visibleLessons.some(lesson => !lesson.title.trim())) {
      setFormError(t('courses.modal.validationLessonName'));
      return;
    }

    setFormError('');
    setIsSaving(true);
    try {
      const existingLessons = visibleLessons.filter(l => isPersistedId(l._key));
      const newLessons = visibleLessons.filter(l => !isPersistedId(l._key));
      await courseService.updateCourse(course.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        assigned_expert_id: form.expert_id,
        lessons: [
          ...existingLessons.map((lesson, idx) => ({
            id: lesson._key,
            title: lesson.title.trim(),
            description: lesson.description.trim() || null,
            order_index: idx,
            teacher_id: lesson.teacher_id || null,
            converter_id: lesson.converter_id || null,
          })),
          ...newLessons.map((lesson, idx) => ({
            title: lesson.title.trim(),
            description: lesson.description.trim() || null,
            order_index: existingLessons.length + idx,
            teacher_id: lesson.teacher_id || null,
            converter_id: lesson.converter_id || null,
          })),
        ],
        delete_lesson_ids: deletedLessonIds,
      } as ApiCourseUpdate);

      const updated = await courseService.getCourse(course.id);
      success(t('courses.modal.updateSuccess'));
      onSaved(updated);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || t('courses.modal.errorGeneric');
      setFormError(msg);
      toastError(t('courses.modal.errorGeneric'), msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="font-semibold text-slate-900">{t('courses.modal.titleEdit')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{course.title}</p>
        </div>
      </div>

      {formError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
          <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{formError}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="label">{t('courses.modal.courseName')} <span className="text-red-500">*</span></label>
          {isLoadingUsers ? (
            <div className="h-10 bg-slate-50 rounded-md animate-pulse" />
          ) : (
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t('courses.modal.courseNamePlaceholder')} className="input" required />
          )}
        </div>
        <div>
          <label className="label">{t('courses.modal.description')}</label>
          {isLoadingUsers ? (
            <div className="h-20 bg-slate-50 rounded-md animate-pulse" />
          ) : (
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t('courses.modal.descriptionPlaceholder')} className="input resize-none" rows={3} />
          )}
        </div>
        <div>
          <label className="label">{t('courses.modal.expert')} <span className="text-red-500">*</span></label>
          {isLoadingUsers ? (
            <div className="h-10 bg-slate-50 rounded-md animate-pulse" />
          ) : (
            <select value={form.expert_id} onChange={e => setForm(f => ({ ...f, expert_id: e.target.value }))} className="input" required>
              <option value="">{t('courses.modal.selectExpert')}</option>
              {experts.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <label className="label mb-0">{t('courses.lessons')}</label>
        {visibleLessons.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg">
            <BookOpen size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">{t('courses.noLessons')}</p>
          </div>
        ) : (
          <div>
            <div onDragOver={e => handleDragOver(e, 0)} onDragLeave={handleDragLeave} onDrop={e => handleDrop(e, 0)} className="h-5 flex items-center mb-1">
              <div className={`w-full h-1 rounded-full transition-colors duration-150 ${dropZoneIdx === 0 && dragIdx !== null && dragIdx !== 0 ? 'bg-blue-500' : 'bg-transparent'}`} />
            </div>
            {visibleLessons.map((lesson, actualIdx) => {
              const isDragging = dragIdx === actualIdx;
              return (
                <div key={lesson._key}>
                  <div draggable onDragStart={e => handleDragStart(e, actualIdx)} onDragOver={e => handleDragOver(e, actualIdx)} onDragLeave={handleDragLeave} onDrop={e => handleDrop(e, actualIdx)} className={`border rounded-xl p-4 bg-slate-50 space-y-4 transition-all ${isDragging ? 'opacity-40 border-slate-300' : 'border-slate-200'}`}>
                    <div className="flex items-start gap-3">
                      <div draggable="false" className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 shrink-0 mt-1 cursor-grab active:cursor-grabbing" title={t('courses.modal.dragToReorder')}>
                        <GripVertical size={14} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <input type="text" value={lesson.title} onChange={e => updateLesson(lesson._key, { title: e.target.value })} placeholder={t('courses.modal.lessonNamePlaceholder')} className="input" />
                        <textarea value={lesson.description} onChange={e => updateLesson(lesson._key, { description: e.target.value })} placeholder={t('courses.modal.descriptionPlaceholder')} className="input resize-none text-sm" rows={2} />
                      </div>
                      <button type="button" onClick={() => removeLesson(lesson._key)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors shrink-0 mt-1" title={t('courses.modal.removeLesson')}>
                        <X size={14} />
                      </button>
                    </div>
                    <div className="pl-10 space-y-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('courses.modal.assignLabel')}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="label"><span className="flex items-center gap-1"><Users size={12} />{t('courses.modal.teacher')}</span></label>
                          <select value={lesson.teacher_id} onChange={e => updateLesson(lesson._key, { teacher_id: e.target.value })} className="input">
                            <option value="">{t('courses.modal.selectTeacher')}</option>
                            {teachers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="label"><span className="flex items-center gap-1"><User size={12} />{t('courses.modal.converter')}</span></label>
                          <select value={lesson.converter_id} onChange={e => updateLesson(lesson._key, { converter_id: e.target.value })} className="input">
                            <option value="">{t('courses.modal.selectConverter')}</option>
                            {converters.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div onDragOver={e => handleDragOver(e, actualIdx + 1)} onDragLeave={handleDragLeave} onDrop={e => handleDrop(e, actualIdx + 1)} className="h-5 flex items-center mt-1">
                    <div className={`w-full h-1 rounded-full transition-colors duration-150 ${dropZoneIdx === actualIdx + 1 && dragIdx !== null && dragIdx !== actualIdx && dragIdx !== actualIdx + 1 ? 'bg-blue-500' : 'bg-transparent'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button type="button" onClick={addLesson} className="w-full py-2 text-sm font-medium text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5">
          <Plus size={13} />{t('courses.modal.addLesson')}
        </button>
      </div>

      <div className="flex gap-3 pt-2 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="btn btn-secondary flex-1 justify-center">
          {t('courses.modal.cancel')}
        </button>
        <button type="submit" disabled={isSaving || isLoadingUsers} className="btn btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed">
          {isSaving ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('courses.modal.submitUpdate')}
        </button>
      </div>
    </form>
  );
}

export default function CourseDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const { isAdmin, selectedRole } = useAuth();
  const { cache: userCache, loadUser } = useUserCache();
  const { setBreadcrumbs } = useBreadcrumbs();

  const [course, setCourse] = useState<ApiCourseWithLessons | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [experts, setExperts] = useState<ApiUserWithRoles[]>([]);
  const [teachers, setTeachers] = useState<ApiUserWithRoles[]>([]);
  const [converters, setConverters] = useState<ApiUserWithRoles[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(isAdmin && selectedRole === API_ROLE.ADMIN);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [openLessons, setOpenLessons] = useState<Set<string>>(new Set());
  const [lessonsData, setLessonsData] = useState<Record<string, ApiLessonWithSubLessons>>({});

  const loadLesson = useCallback(async (lessonId: string) => {
    if (lessonsData[lessonId]) return;
    const data = await courseService.getLesson(lessonId);
    setLessonsData(prev => ({ ...prev, [lessonId]: data }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleLesson = useCallback((lessonId: string) => {
    setOpenLessons(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) { next.delete(lessonId); }
      else { next.add(lessonId); }
      return next;
    });
    if (!openLessons.has(lessonId)) {
      loadLesson(lessonId);
    }
  }, [loadLesson, openLessons]);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      setIsLoading(true);
      try {
        const c = await courseService.getCourse(courseId);
        setCourse(c);
        loadUser(c.assigned_expert_id);
        c.lessons.forEach(l => {
          if (l.assigned_teacher_id) loadUser(l.assigned_teacher_id);
          if (l.assigned_converter_id) loadUser(l.assigned_converter_id);
        });
      } catch { setCourse(null); }
      finally { setIsLoading(false); }
    })();
  }, [courseId, loadUser]);

  useEffect(() => {
    if (!isAdmin || selectedRole !== API_ROLE.ADMIN) return;
    let cancelled = false;

    Promise.resolve().then(async () => {
      if (cancelled) return;
      setIsLoadingUsers(true);
      try {
        const [expertRes, teacherRes, converterRes] = await Promise.all([
          userService.listUsers({ limit: 100, role: API_ROLE.EXPERT }),
          userService.listUsers({ limit: 100, role: API_ROLE.TEACHER }),
          userService.listUsers({ limit: 100, role: API_ROLE.CONVERTER }),
        ]);
        if (!cancelled) {
          setExperts(expertRes.items);
          setTeachers(teacherRes.items);
          setConverters(converterRes.items);
        }
      } catch {
        // User dropdowns remain empty; save will surface API errors if assignment is invalid.
      } finally {
        if (!cancelled) setIsLoadingUsers(false);
      }
    });

    return () => { cancelled = true; };
  }, [isAdmin, selectedRole]);

  useEffect(() => {
    if (course) {
      setBreadcrumbs([
        { label: t('nav.courses'), href: '/courses' },
        { label: course.title },
      ]);
    }
    return () => setBreadcrumbs([]);
  }, [course, setBreadcrumbs, t]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!course) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p>{t('courses.notFound')}</p>
        <button onClick={() => navigate('/courses')} className="btn btn-secondary mt-4">{t('courses.backToList')}</button>
      </div>
    );
  }

  const expert = userCache[course.assigned_expert_id];
  const totalSubLessons = course.lessons.reduce((acc, l) => acc + (l.sub_lessons_count ?? 0), 0);
  const teacherIds = [...new Set(course.lessons.map(l => l.assigned_teacher_id).filter(Boolean))];

  return (
    <div className="space-y-5">
      <CollapsibleDrawer
        isOpen={isInfoDrawerOpen}
        onToggle={() => setIsInfoDrawerOpen(open => !open)}
        openLabel="Open course information"
        closeLabel="Close course information"
      >
        <div className="p-5 space-y-5">
          <div>
            <StatusBadge status={course.status} type="course" />
            <h1 className="text-xl font-bold text-slate-900 mt-2 break-words">{course.title}</h1>
            {course.description && (
              <p className="text-sm text-slate-500 mt-1 break-words">{course.description}</p>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <div className="text-xs text-slate-400">{t('courses.lessons')}</div>
              <div className="text-sm font-medium text-slate-800 mt-0.5">{course.lessons.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">{t('courses.subLessons')}</div>
              <div className="text-sm font-medium text-slate-800 mt-0.5">{totalSubLessons}</div>
            </div>
            {course.lessons.length > 0 && (() => {
              const approved = course.lessons.filter(l => l.status === 'approved').length;
              const total = course.lessons.length;
              const pct = Math.round((approved / total) * 100);
              return (
                <div>
                  <div className="text-xs text-slate-400 mb-1.5">Progress</div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{approved}/{total} lessons approved</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
            <div>
              <div className="text-xs text-slate-400">{t('courses.columnCreatedAt')}</div>
              <div className="text-sm font-medium text-slate-800 mt-0.5">{formatDateShort(course.created_at)}</div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                <Users size={12} />
                {t('courses.modal.expert')}
              </div>
              {expert ? (
                <div className="flex items-center gap-2">
                  <UserAvatar name={expert.full_name} size="md" />
                  <span className="text-sm text-slate-700">{expert.full_name}</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 italic">—</span>
              )}
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                <Users size={12} />
                {t('courses.modal.teacher')}
              </div>
              <div className="flex flex-wrap gap-2">
                {teacherIds.length === 0 ? <span className="text-sm text-slate-400 italic">—</span> : teacherIds.map(id => id && userCache[id] && (
                  <div key={id} className="flex items-center gap-1.5">
                    <UserAvatar name={userCache[id].full_name} size="sm" />
                    <span className="text-sm text-slate-700">{userCache[id].full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CollapsibleDrawer>

      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{course.title}</h1>
            <StatusBadge status={course.status} type="course" />
          </div>
        </div>
        {isAdmin && selectedRole === API_ROLE.ADMIN && !isEditingCourse && (
          <button onClick={() => setIsEditingCourse(true)} className="btn btn-primary flex items-center gap-1.5 text-sm shrink-0">
            <Pencil size={14} />{t('courses.edit')}
          </button>
        )}
      </div>

      {isEditingCourse ? (
        <CourseInlineEditor
          key={course.id}
          course={course}
          experts={experts}
          teachers={teachers}
          converters={converters}
          isLoadingUsers={isLoadingUsers}
          onCancel={() => setIsEditingCourse(false)}
          onSaved={(updatedCourse) => {
            setCourse(updatedCourse);
            setIsEditingCourse(false);
            setLessonsData({});
            loadUser(updatedCourse.assigned_expert_id);
            updatedCourse.lessons.forEach(l => {
              if (l.assigned_teacher_id) loadUser(l.assigned_teacher_id);
              if (l.assigned_converter_id) loadUser(l.assigned_converter_id);
            });
          }}
        />
      ) : (
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{t('courses.contentTitle')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{course.lessons.length} {t('courses.lessons')} · {totalSubLessons} {t('courses.subLessons')}</p>
          {course.lessons.length > 0 && (() => {
            const approved = course.lessons.filter(l => l.status === 'approved').length;
            const total = course.lessons.length;
            const pct = Math.round((approved / total) * 100);
            return (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{approved}/{total} lessons approved</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })()}
        </div>

        {course.lessons.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400 italic">{t('courses.noLessons')}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {course.lessons.map(lesson => {
              const isOpen = openLessons.has(lesson.id);
              const subLessons = lessonsData[lesson.id]?.sub_lessons ?? [];
              const teacher = lesson.assigned_teacher_id ? userCache[lesson.assigned_teacher_id] : null;
              const converter = lesson.assigned_converter_id ? userCache[lesson.assigned_converter_id] : null;

              return (
                <div key={lesson.id}>
                  <div
                    onClick={() => navigate(`/lessons/${lesson.id}`)}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <button onClick={(e) => { e.stopPropagation(); toggleLesson(lesson.id); }} className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-100 shrink-0 transition-colors">
                      {isOpen ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-400" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-800 hover:text-blue-600 transition-colors">{lesson.title}</span>
                      {lesson.description && <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{lesson.description}</div>}
                    </div>
                    {(lesson.sub_lessons_count ?? 0) > 0 && (
                      <div className="w-20 shrink-0">
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${lesson.approved_sub_lessons_count === lesson.sub_lessons_count ? 'bg-green-500' : 'bg-blue-400'}`}
                            style={{ width: `${Math.round(((lesson.approved_sub_lessons_count ?? 0) / lesson.sub_lessons_count) * 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 text-right">{lesson.approved_sub_lessons_count ?? 0}/{lesson.sub_lessons_count}</div>
                      </div>
                    )}
                    <StatusBadge status={lesson.status} type="lesson" />
                    <span className="text-xs text-slate-400 shrink-0">{lesson.sub_lessons_count ?? 0} {t('courses.subLessons')}</span>
                  </div>

                  {isOpen && (
                    <div className="bg-slate-50 border-t border-slate-100">
                      {subLessons.length === 0 ? (
                        <div className="px-12 py-4 text-sm text-slate-400 italic">{t('courses.noSubLessons')}</div>
                      ) : (
                        subLessons.map((sl: Pick<ApiSubLessonResponse, 'id' | 'title' | 'description' | 'status'>, slIdx: number) => (
                          <div
                            key={sl.id}
                            onClick={() => navigate(`/sub-lessons/${sl.id}`)}
                            className="flex items-center gap-3 px-5 py-3 pl-14 hover:bg-white transition-colors border-b border-slate-100 last:border-0 group"
                          >
                            <span className="text-xs text-slate-400 w-5 shrink-0">{slIdx + 1}</span>
                            <FileText size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-700 group-hover:text-blue-600 font-medium transition-colors truncate">{sl.title}</div>
                              {sl.description && <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{sl.description}</div>}
                            </div>
                            <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
                            <StatusBadge status={sl.status} type="subLesson" />
                          </div>
                        ))
                      )}
                      <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <UserCheck size={11} />
                          {expert ? <><UserAvatar name={expert.full_name} size="sm" /><span>{expert.full_name}</span></> : <span className="text-slate-400 italic">—</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Users size={11} />
                          {teacher ? <><UserAvatar name={teacher.full_name} size="sm" /><span>{teacher.full_name}</span></> : <span className="text-slate-400 italic">—</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <User size={11} />
                          {converter ? <><UserAvatar name={converter.full_name} size="sm" /><span>{converter.full_name}</span></> : <span className="text-slate-400 italic">—</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
