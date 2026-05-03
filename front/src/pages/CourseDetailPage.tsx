import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronDown,
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
import type { ApiCourseWithLessons, ApiLessonWithSubLessons, ApiUserWithRoles } from '../types/api';
import { COURSE_STATUS_COLORS, LESSON_STATUS_COLORS } from '../types/api';

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
  onCreated: (newSubLesson: ApiLessonWithSubLessons) => void;
}) => {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState<string>('');
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
      onClose();
      const data = await courseService.getLesson(lessonId);
      onCreated(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || t('courses.modal.errorGeneric');
      toastError(t('courses.modal.errorGeneric'), msg);
    } finally { setIsSaving(false); }
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
              value={String(description ?? '')}
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

// ─── Assign Modal ──────────────────────────────────────────────────────────────

const AssignModal = ({
  lessonId,
  currentTeacherId,
  currentConverterId,
  onClose,
  onAssigned,
}: {
  lessonId: string;
  currentTeacherId: string | null;
  currentConverterId: string | null;
  onClose: () => void;
  onAssigned: () => void;
}) => {
  const { t } = useTranslation();
  const { success } = useToast();
  const [teachers, setTeachers] = useState<ApiUserWithRoles[]>([]);
  const [converters, setConverters] = useState<ApiUserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [teacherId, setTeacherId] = useState<string>(currentTeacherId ?? '');
  const [converterId, setConverterId] = useState<string>(currentConverterId ?? '');

  useEffect(() => {
    Promise.all([
      userService.listUsers({ limit: 100, role: 'teacher' }),
      userService.listUsers({ limit: 100, role: 'converter' }),
    ]).then(([tRes, cRes]) => {
      setTeachers(tRes.items);
      setConverters(cRes.items);
    }).catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleAssign = async () => {
    setSaving(true);
    setError('');
    try {
      await courseService.assignLesson(lessonId, {
        teacher_id: teacherId || null,
        converter_id: converterId || null,
      });
      success(t('courses.modal.assignSuccess'));
      onAssigned();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || t('courses.modal.errorGeneric');
      setError(msg);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">{t('courses.modal.titleAssignUsers')}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="label">
              <span className="flex items-center gap-1">
                <Users size={12} />
                {t('courses.modal.teacher')}
              </span>
            </label>
            {isLoading
              ? <div className="h-9 bg-slate-50 rounded-md animate-pulse" />
              : (
                <select
                  value={teacherId}
                  onChange={e => setTeacherId(e.target.value)}
                  className="input"
                >
                  <option value="">{t('courses.modal.selectTeacher')}</option>
                  {teachers.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              )
            }
          </div>

          <div>
            <label className="label">
              <span className="flex items-center gap-1">
                <User size={12} />
                {t('courses.modal.converter')}
              </span>
            </label>
            {isLoading
              ? <div className="h-9 bg-slate-50 rounded-md animate-pulse" />
              : (
                <select
                  value={converterId}
                  onChange={e => setConverterId(e.target.value)}
                  className="input"
                >
                  <option value="">{t('courses.modal.selectConverter')}</option>
                  {converters.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              )
            }
          </div>
        </div>

        <div className="flex gap-3 px-4 pb-4">
          <button onClick={onClose} className="btn btn-secondary flex-1 justify-center">{t('courses.modal.cancel')}</button>
          <button
            onClick={handleAssign}
            disabled={saving}
            className="btn btn-primary flex-1 justify-center disabled:opacity-50"
          >
            {saving
              ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : t('courses.modal.submitUpdate')
            }
          </button>
        </div>
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

export default function CourseDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();

  const [course, setCourse] = useState<ApiCourseWithLessons | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openLessons, setOpenLessons] = useState<Set<string>>(new Set());
  const [assignLesson, setAssignLesson] = useState<{ id: string; teacher_id: string | null; converter_id: string | null } | null>(null);
  const [createSubLessonFor, setCreateSubLessonFor] = useState<string | null>(null);
  const [userCache, setUserCache] = useState<Record<string, ApiUserWithRoles>>({});
  const [userCacheLoading, setUserCacheLoading] = useState<Set<string>>(new Set());
  const [lessonsData, setLessonsData] = useState<Record<string, ApiLessonWithSubLessons>>({});

  const loadUser = useCallback((id: string) => {
    if (!id || userCache[id] || userCacheLoading.has(id)) return;
    setUserCacheLoading(prev => new Set([...prev, id]));
    userService.getUser(id).then(u => {
      setUserCache(c => ({ ...c, [id]: u }));
    }).catch(() => {}).finally(() => {
      setUserCacheLoading(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshLesson = useCallback(async (lessonId: string) => {
    const data = await courseService.getLesson(lessonId);
    setLessonsData(prev => ({ ...prev, [lessonId]: data }));
  }, []);

  useEffect(() => {
    if (!courseId) return;
    courseService.getCourse(courseId)
      .then(c => {
        setCourse(c);
        loadUser(c.assigned_expert_id);
        c.lessons.forEach(l => {
          if (l.assigned_teacher_id) loadUser(l.assigned_teacher_id);
          if (l.assigned_converter_id) loadUser(l.assigned_converter_id);
        });
      })
      .catch(() => { setCourse(null); })
      .finally(() => { setIsLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const toggleLesson = useCallback(async (lessonId: string) => {
    setOpenLessons(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
        if (!lessonsData[lessonId]) {
          refreshLesson(lessonId);
        }
      }
      return next;
    });
  }, [lessonsData, refreshLesson]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p>{t('courses.notFound')}</p>
        <button onClick={() => navigate('/courses')} className="btn btn-secondary mt-4">
          {t('courses.backToList')}
        </button>
      </div>
    );
  }

  const expert = userCache[course.assigned_expert_id];
  const totalSubLessons = course.lessons.reduce((acc, l) => acc + (l.sub_lessons_count ?? 0), 0);
  const teacherIds = [...new Set(course.lessons.map(l => l.assigned_teacher_id).filter(Boolean))];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/courses')}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{course.title}</h1>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${COURSE_STATUS_COLORS[course.status] ?? ''}`}>
              {course.status}
            </span>
          </div>
          {course.description && (
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{course.description}</p>
          )}
        </div>
        <button
          onClick={() => navigate(`/courses/edit/${course.id}`)}
          className="btn btn-primary flex items-center gap-1.5 text-sm shrink-0"
        >
          <Pencil size={14} />
          {t('courses.edit')}
        </button>
      </div>

      {/* Course info card */}
      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-slate-400">{t('courses.lessons')}</div>
            <div className="text-sm font-medium text-slate-800">{course.lessons.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">{t('courses.subLessons')}</div>
            <div className="text-sm font-medium text-slate-800">{totalSubLessons}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">{t('courses.columnCreatedAt')}</div>
            <div className="text-sm font-medium text-slate-800">
              {new Date(course.created_at).toLocaleDateString('vi-VN')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
              <Users size={12} />
              {t('courses.modal.expert')}
            </div>
            <UserBadge user={expert} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
              <Users size={12} />
              {t('courses.modal.teacher')}
            </div>
            <div className="flex flex-wrap gap-2">
              {teacherIds.length === 0 ? (
                <span className="text-sm text-slate-400 italic">—</span>
              ) : teacherIds.map(id => id && (
                <UserBadge key={id} user={userCache[id]} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lessons accordion */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{t('courses.contentTitle')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {course.lessons.length} {t('courses.lessons')} · {totalSubLessons} {t('courses.subLessons')}
          </p>
        </div>

        {course.lessons.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400 italic">
            {t('courses.noLessons')}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {course.lessons.map((lesson, idx) => {
              const isOpen = openLessons.has(lesson.id);
              const lessonData = lessonsData[lesson.id];
              const teacher = lesson.assigned_teacher_id ? userCache[lesson.assigned_teacher_id] : null;
              const converter = lesson.assigned_converter_id ? userCache[lesson.assigned_converter_id] : null;
              const subLessons = lessonData?.sub_lessons ?? [];

              return (
                <div key={lesson.id}>
                  {/* Lesson row */}
                  <button
                    onClick={() => toggleLesson(lesson.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    {isOpen
                      ? <ChevronDown size={16} className="text-slate-400 shrink-0" />
                      : <ChevronRight size={16} className="text-slate-400 shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800">{idx + 1}. {lesson.title}</div>
                      {lesson.description && (
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{lesson.description}</div>
                      )}
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${LESSON_STATUS_COLORS[lesson.status] ?? ''}`}>
                      {lesson.status}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">{lesson.sub_lessons_count ?? 0} {t('courses.subLessons')}</span>
                  </button>

                  {/* Sub-lessons panel */}
                  {isOpen && (
                    <div className="bg-slate-50 border-t border-slate-100">
                      {subLessons.length === 0 ? (
                        <div className="px-12 py-4 text-sm text-slate-400 italic">
                          {t('courses.noSubLessons')}
                        </div>
                      ) : (
                        subLessons.map((sl, slIdx) => (
                          <Link
                            key={sl.id}
                            to={`/sub-lessons/${sl.id}`}
                            className="flex items-center gap-3 px-5 py-3 pl-12 hover:bg-white transition-colors border-b border-slate-100 last:border-0 group cursor-pointer"
                          >
                            <span className="text-xs text-slate-400 w-5 shrink-0">{slIdx + 1}</span>
                            <FileText size={14} className="text-slate-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors truncate">
                                {sl.title}
                              </div>
                              {sl.description && (
                                <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{sl.description}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${LESSON_STATUS_COLORS[sl.status] ?? ''}`}>
                                {sl.status}
                              </span>
                            </div>
                          </Link>
                        ))
                      )}

                      {/* Lesson footer */}
                      <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Users size={11} />
                          {teacher ? <UserBadge user={teacher} /> : (
                            <span className="text-slate-400 italic">{t('courses.modal.selectTeacher')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <User size={11} />
                          {converter ? <UserBadge user={converter} /> : (
                            <span className="text-slate-400 italic">{t('courses.modal.selectConverter')}</span>
                          )}
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => setCreateSubLessonFor(lesson.id)}
                            className="px-3 py-1.5 text-xs rounded-md border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 font-medium transition-colors flex items-center gap-1.5"
                          >
                            <Plus size={12} />
                            {t('courses.modal.addSubLesson')}
                          </button>
                          <button
                            onClick={() => setAssignLesson({
                              id: lesson.id,
                              teacher_id: lesson.assigned_teacher_id,
                              converter_id: lesson.assigned_converter_id,
                            })}
                            className="px-3 py-1.5 text-xs rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
                          >
                            {t('courses.modal.titleAssignUsers')}
                          </button>
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

      {/* Assign modal */}
      {assignLesson && (
        <AssignModal
          key={assignLesson.id}
          lessonId={assignLesson.id}
          currentTeacherId={assignLesson.teacher_id}
          currentConverterId={assignLesson.converter_id}
          onClose={() => setAssignLesson(null)}
          onAssigned={() => {
            setAssignLesson(null);
            if (courseId) {
              courseService.getCourse(courseId).then(c => {
                setCourse(c);
                c.lessons.forEach(l => {
                  if (l.assigned_teacher_id) loadUser(l.assigned_teacher_id);
                  if (l.assigned_converter_id) loadUser(l.assigned_converter_id);
                });
              });
            }
          }}
        />
      )}

      {/* Create sub-lesson modal */}
      {createSubLessonFor && (
        <CreateSubLessonModal
          lessonId={createSubLessonFor}
          lessonTitle={course?.lessons.find(l => l.id === createSubLessonFor)?.title ?? ''}
          onClose={() => setCreateSubLessonFor(null)}
          onCreated={(newData) => {
            setCreateSubLessonFor(null);
            setLessonsData(prev => ({ ...prev, [createSubLessonFor]: newData }));
            setOpenLessons(prev => new Set([...prev, createSubLessonFor]));
            if (courseId) {
              courseService.getCourse(courseId).then(c => setCourse(c)).catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}
