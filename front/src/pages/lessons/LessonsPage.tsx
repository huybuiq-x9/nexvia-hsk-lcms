import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle, Clock, FileText } from 'lucide-react';
import { useBreadcrumbs } from '../../contexts/BreadcrumbContext';
import { courseService, userService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useUserCache } from '../../hooks/useUserCache';
import { useDebounce } from '../../hooks/useDebounce';
import { LessonCard } from './components/LessonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import FilterBar from '../../components/FilterBar';
import RoleFilterDropdown from '../../components/RoleFilterDropdown';
import type { ApiLessonListItem, ApiCourseWithLessons, ApiUserWithRoles } from '../../types/api';
import type { LessonStatus } from '../../types/api';
import { LESSON_STATUS, LESSON_STATUSES, API_ROLE } from '../../types/api';

const PER_PAGE = 20;

export default function LessonsPage() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { setPageHeader } = useBreadcrumbs();
  const { cache: userCache, loadUser } = useUserCache();

  const [lessons, setLessons] = useState<ApiLessonListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
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

  useEffect(() => {
    setPageHeader(t('lessons.title'));
    return () => setPageHeader('');
  }, [t, setPageHeader]);

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
    userService.listUsers({ roles: [API_ROLE.EXPERT], limit: 100 }).then(res => setExperts(res.items)).catch(() => {});
  };
  const loadTeachers = () => {
    if (teachers.length > 0) return;
    userService.listUsers({ roles: [API_ROLE.TEACHER], limit: 100 }).then(res => setTeachers(res.items)).catch(() => {});
  };
  const loadConverters = () => {
    if (converters.length > 0) return;
    userService.listUsers({ roles: [API_ROLE.CONVERTER], limit: 100 }).then(res => setConverters(res.items)).catch(() => {});
  };

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    setPage(1);
  }, [debouncedSearch, selectedCourseId, selectedStatus, selectedExpertIds, selectedTeacherIds, selectedConverterIds]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(async () => {
      if (cancelled) return;
      setIsLoading(true);
      try {
        const res = await courseService.listLessons({
          skip: (page - 1) * PER_PAGE, limit: PER_PAGE,
          search: debouncedSearch || undefined,
          course_id: selectedCourseId || undefined,
          status: (selectedStatus as LessonStatus) || undefined,
          expert_ids: selectedExpertIds.length > 0 ? selectedExpertIds : undefined,
          teacher_ids: selectedTeacherIds.length > 0 ? selectedTeacherIds : undefined,
          converter_ids: selectedConverterIds.length > 0 ? selectedConverterIds : undefined,
        });
        if (!cancelled) {
          setLessons(res.items);
          setTotal(res.total);
        }
      } catch {
        if (!cancelled) setLessons([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [page, debouncedSearch, selectedCourseId, selectedStatus, selectedExpertIds, selectedTeacherIds, selectedConverterIds]);

  useEffect(() => {
    lessons.forEach(l => {
      if (l.assigned_expert_id) loadUser(l.assigned_expert_id);
      if (l.assigned_teacher_id) loadUser(l.assigned_teacher_id);
      if (l.assigned_converter_id) loadUser(l.assigned_converter_id);
    });
  }, [lessons, loadUser]);

  const totalPages = Math.ceil(total / PER_PAGE);
  const approvedCount = lessons.filter(l => l.status === LESSON_STATUS.APPROVED).length;
  const inProgressCount = lessons.filter(l => l.status === LESSON_STATUS.IN_PROGRESS).length;
  const draftCount = lessons.filter(l => l.status === LESSON_STATUS.DRAFT).length;

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
      <div className="rounded-lg border border-blue-100 bg-white px-5 py-3 shadow-sm shadow-blue-100/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{isLoading ? '...' : `${total} ${t('lessons.totalLessons')}`}</p>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2.5">
              <CheckCircle size={18} className="shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <div className="text-xl font-bold leading-none text-emerald-700">{isLoading ? '—' : approvedCount}</div>
                <div className="mt-1 truncate text-xs font-medium text-emerald-700">{t('lessons.status.approved')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5">
              <Clock size={18} className="shrink-0 text-blue-600" />
              <div className="min-w-0">
                <div className="text-xl font-bold leading-none text-blue-700">{isLoading ? '—' : inProgressCount}</div>
                <div className="mt-1 truncate text-xs font-medium text-blue-700">{t('lessons.status.in_progress')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5">
              <FileText size={18} className="shrink-0 text-amber-600" />
              <div className="min-w-0">
                <div className="text-xl font-bold leading-none text-amber-700">{isLoading ? '—' : draftCount}</div>
                <div className="mt-1 truncate text-xs font-medium text-amber-700">{t('lessons.status.draft')}</div>
              </div>
            </div>
          </div>
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
        extra={isAdmin ? (
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
          <div className="card border-blue-100 p-10">
            <div className="flex items-center justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            </div>
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
              onDelete={isAdmin ? handleDeleteLesson : undefined}
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
