import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { courseService } from '../../services';
import { useUserCache } from '../../hooks/useUserCache';
import { LessonCard } from './components/LessonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import FilterBar from '../../components/FilterBar';
import type { ApiLessonListItem, ApiCourseWithLessons } from '../../types/api';
import type { LessonStatus } from '../../types/api';
import { LESSON_STATUSES } from '../../types/api';

const PER_PAGE = 20;

export default function LessonsPage() {
  const { t } = useTranslation();
  const { cache: userCache, loadUser } = useUserCache();

  const [lessons, setLessons] = useState<ApiLessonListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<ApiCourseWithLessons[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const isFirst = useRef(true);

  useEffect(() => {
    courseService.getCoursesForFilter().then(res => setCourses(res)).catch(() => {});
  }, []);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    setPage(1);
  }, [search, selectedCourseId, selectedStatus]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    courseService.listLessons({
      skip: (page - 1) * PER_PAGE, limit: PER_PAGE,
      search: search || undefined,
      course_id: selectedCourseId || undefined,
      status: (selectedStatus as LessonStatus) || undefined,
    }).then(res => { if (!cancelled) { setLessons(res.items); setTotal(res.total); } })
      .catch(() => { if (!cancelled) setLessons([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [page, search, selectedCourseId, selectedStatus]);

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

  const hasActiveFilters = selectedCourseId !== '' || selectedStatus !== '' || search !== '';

  const clearAllFilters = () => {
    setSearch(''); setSelectedCourseId(''); setSelectedStatus('');
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
