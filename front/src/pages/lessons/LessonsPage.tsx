import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { courseService, userService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useUserCache } from '../../hooks/useUserCache';
import { LessonCard } from './components/LessonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import FilterBar from '../../components/FilterBar';
import RoleFilterDropdown from '../../components/RoleFilterDropdown';
import type { ApiLessonListItem, ApiCourseWithLessons, ApiUserWithRoles } from '../../types/api';
import type { LessonStatus } from '../../types/api';
import { LESSON_STATUSES, API_ROLE } from '../../types/api';

const PER_PAGE = 20;

export default function LessonsPage() {
  const { t } = useTranslation();
  const { isAdmin, selectedRole } = useAuth();
  const { cache: userCache, loadUser } = useUserCache();

  const [lessons, setLessons] = useState<ApiLessonListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<ApiCourseWithLessons[]>([]);
  const [experts, setExperts] = useState<ApiUserWithRoles[]>([]);
  const [teachers, setTeachers] = useState<ApiUserWithRoles[]>([]);
  const [converters, setConverters] = useState<ApiUserWithRoles[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedExpertIds, setSelectedExpertIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [selectedConverterIds, setSelectedConverterIds] = useState<string[]>([]);
  const isFirst = useRef(true);

  const handleDeleteLesson = async (lessonId: string) => {
    await courseService.deleteLesson(lessonId);
    setLessons(prev => prev.filter(l => l.id !== lessonId));
    setTotal(prev => prev - 1);
  };

  useEffect(() => {
    courseService.getCoursesForFilter().then(res => setCourses(res)).catch(() => {});
  }, []);

  const loadExperts = () => {
    if (experts.length > 0) return;
    userService.listUsers({ role: API_ROLE.EXPERT, limit: 100 }).then(res => setExperts(res.items)).catch(() => {});
  };
  const loadTeachers = () => {
    if (teachers.length > 0) return;
    userService.listUsers({ role: API_ROLE.TEACHER, limit: 100 }).then(res => setTeachers(res.items)).catch(() => {});
  };
  const loadConverters = () => {
    if (converters.length > 0) return;
    userService.listUsers({ role: API_ROLE.CONVERTER, limit: 100 }).then(res => setConverters(res.items)).catch(() => {});
  };

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    setPage(1);
  }, [search, selectedCourseId, selectedStatus, selectedExpertIds, selectedTeacherIds, selectedConverterIds]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    courseService.listLessons({
      skip: (page - 1) * PER_PAGE, limit: PER_PAGE,
      search: search || undefined,
      course_id: selectedCourseId || undefined,
      status: (selectedStatus as LessonStatus) || undefined,
      expert_ids: selectedExpertIds.length > 0 ? selectedExpertIds : undefined,
      teacher_ids: selectedTeacherIds.length > 0 ? selectedTeacherIds : undefined,
      converter_ids: selectedConverterIds.length > 0 ? selectedConverterIds : undefined,
    }).then(res => { if (!cancelled) { setLessons(res.items); setTotal(res.total); } })
      .catch(() => { if (!cancelled) setLessons([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [page, search, selectedCourseId, selectedStatus, selectedExpertIds, selectedTeacherIds, selectedConverterIds]);

  useEffect(() => {
    lessons.forEach(l => {
      if (l.assigned_expert_id) loadUser(l.assigned_expert_id);
      if (l.assigned_teacher_id) loadUser(l.assigned_teacher_id);
      if (l.assigned_converter_id) loadUser(l.assigned_converter_id);
    });
  }, [lessons, loadUser]);

  const totalPages = Math.ceil(total / PER_PAGE);

  const courseOptions = [
    { value: '', label: t('lessons.filter.allCourses') },
    ...courses.map(c => ({ value: c.id, label: c.title })),
  ];

  const statusOptions = [
    { value: '', label: t('lessons.filter.allStatuses') },
    ...LESSON_STATUSES.map(status => ({ value: status, label: t(`lessons.status.${status}`) })),
  ];

  const hasActiveFilters = selectedCourseId !== '' || selectedStatus !== '' || search !== ''
    || selectedExpertIds.length > 0 || selectedTeacherIds.length > 0 || selectedConverterIds.length > 0;

  const clearAllFilters = () => {
    setSearch(''); setSelectedCourseId(''); setSelectedStatus('');
    setSelectedExpertIds([]); setSelectedTeacherIds([]); setSelectedConverterIds([]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">{t('lessons.title')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isLoading ? '...' : `${total} ${t('lessons.totalLessons')}`}
          </p>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('lessons.search')}
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearAllFilters}
        layout="inline"
        filters={[
          { key: 'course', label: t('lessons.filter.course'), value: selectedCourseId, options: courseOptions, onChange: setSelectedCourseId },
          { key: 'status', label: t('lessons.filter.status'), value: selectedStatus, options: statusOptions, onChange: setSelectedStatus },
        ]}
        extra={isAdmin && selectedRole === API_ROLE.ADMIN ? (
          <RoleFilterDropdown
            experts={experts}
            teachers={teachers}
            converters={converters}
            selectedExpertIds={selectedExpertIds}
            selectedTeacherIds={selectedTeacherIds}
            selectedConverterIds={selectedConverterIds}
            onExpertChange={setSelectedExpertIds}
            onTeacherChange={setSelectedTeacherIds}
            onConverterChange={setSelectedConverterIds}
            onLoadExperts={loadExperts}
            onLoadTeachers={loadTeachers}
            onLoadConverters={loadConverters}
            labels={{
              expert: t('lessons.filter.expert'),
              teacher: t('lessons.filter.teacher'),
              converter: t('lessons.filter.converter'),
            }}
          />
        ) : undefined}
      />

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="card p-12 flex justify-center">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : lessons.length === 0 ? (
          <div className="card p-12">
            <EmptyState icon={<BookOpen size={40} />} message={t('lessons.noResults')} />
          </div>
        ) : (
          lessons.map(lesson => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              expert={lesson.assigned_expert_id ? userCache[lesson.assigned_expert_id] : undefined}
              teacher={lesson.assigned_teacher_id ? userCache[lesson.assigned_teacher_id] : undefined}
              converter={lesson.assigned_converter_id ? userCache[lesson.assigned_converter_id] : undefined}
              onDelete={isAdmin && selectedRole === API_ROLE.ADMIN ? handleDeleteLesson : undefined}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary px-3 py-1.5 text-sm disabled:opacity-40">←</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | '...')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
              acc.push(p); return acc;
            }, [])
            .map((p, i) =>
              p === '...' ? <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400">…</span> : (
                <button key={p} onClick={() => setPage(p as number)} className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${page === p ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{p}</button>
              )
            )
          }
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary px-3 py-1.5 text-sm disabled:opacity-40">→</button>
        </div>
      )}
    </div>
  );
}
