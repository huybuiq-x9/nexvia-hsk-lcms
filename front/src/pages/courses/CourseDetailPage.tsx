import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, ChevronLeft, Users, User, Pencil, FileText } from 'lucide-react';
import { courseService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useUserCache } from '../../hooks/useUserCache';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { formatDateShort } from '../../utils/formatters';
import type { ApiCourseWithLessons, ApiLessonWithSubLessons, ApiSubLessonResponse } from '../../types/api';
import { API_ROLE } from '../../types/api';

export default function CourseDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const { isAdmin, selectedRole } = useAuth();
  const { cache: userCache, loadUser } = useUserCache();

  const [course, setCourse] = useState<ApiCourseWithLessons | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openLessons, setOpenLessons] = useState<Set<string>>(new Set());
  const [lessonsData, setLessonsData] = useState<Record<string, ApiLessonWithSubLessons>>({});

  const loadLesson = useCallback(async (lessonId: string) => {
    if (lessonsData[lessonId]) return;
    const data = await courseService.getLesson(lessonId);
    setLessonsData(prev => ({ ...prev, [lessonId]: data }));
  }, [lessonsData]);

  const toggleLesson = useCallback((lessonId: string) => {
    setOpenLessons(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) { next.delete(lessonId); }
      else { next.add(lessonId); loadLesson(lessonId); }
      return next;
    });
  }, [loadLesson]);

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
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/courses')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{course.title}</h1>
            <StatusBadge status={course.status} type="course" />
          </div>
          {course.description && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{course.description}</p>}
        </div>
        {isAdmin && selectedRole === API_ROLE.ADMIN && (
          <button onClick={() => navigate(`/courses/edit/${course.id}`)} className="btn btn-primary flex items-center gap-1.5 text-sm shrink-0">
            <Pencil size={14} />{t('courses.edit')}
          </button>
        )}
      </div>

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
            <div className="text-sm font-medium text-slate-800">{formatDateShort(course.created_at)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1"><Users size={12} />{t('courses.modal.expert')}</div>
            <div className="flex items-center gap-2">
              {expert && <><UserAvatar name={expert.full_name} size="md" /><span className="text-sm text-slate-700">{expert.full_name}</span></>}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1"><Users size={12} />{t('courses.modal.teacher')}</div>
            <div className="flex flex-wrap gap-2">
              {teacherIds.length === 0 ? <span className="text-sm text-slate-400 italic">—</span> : teacherIds.map(id => id && userCache[id] && (
                <div key={id} className="flex items-center gap-1.5"><UserAvatar name={userCache[id].full_name} size="sm" /><span className="text-sm text-slate-700">{userCache[id].full_name}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{t('courses.contentTitle')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{course.lessons.length} {t('courses.lessons')} · {totalSubLessons} {t('courses.subLessons')}</p>
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
    </div>
  );
}
