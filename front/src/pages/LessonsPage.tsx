import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Users,
  User,
} from 'lucide-react';
import { courseService, userService } from '../services';
import FilterBar, { type FilterOption } from '../components/FilterBar';
import type { ApiLessonListItem, ApiCourseWithLessons, ApiUserWithRoles, LessonStatus } from '../types/api';
import { LESSON_STATUSES, LESSON_STATUS_COLORS } from '../types/api';

const PER_PAGE = 20;

const StatusBadge = ({ status }: { status: LessonStatus }) => (
  <span
    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
      LESSON_STATUS_COLORS[status] ?? 'bg-slate-50 text-slate-600 border-slate-200'
    }`}
  >
    {status}
  </span>
);

const UserAvatar = ({ name }: { name: string }) => {
  const initials = name
    ? name.split(' ').slice(-1)[0]?.[0]?.toUpperCase() ?? '?'
    : '?';
  return (
    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
      <span className="text-blue-700 font-semibold text-[10px]">{initials}</span>
    </div>
  );
};

export default function LessonsPage() {
  const { t } = useTranslation();

  const [lessons, setLessons] = useState<ApiLessonListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [userCache, setUserCache] = useState<Record<string, ApiUserWithRoles>>({});
  const [courses, setCourses] = useState<ApiCourseWithLessons[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const isFirst = useRef(true);

  const loadUser = useCallback((id: string) => {
    if (!id || userCache[id]) return;
    userService.getUser(id).then(u => {
      setUserCache(c => ({ ...c, [id]: u }));
    }).catch(() => {});
  }, [userCache]);

  // Load courses for dropdown
  useEffect(() => {
    courseService.getCoursesForFilter().then(res => {
      setCourses(res);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    setPage(1);
  }, [search, selectedCourseId, selectedStatus]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    courseService.listLessons({
      skip: (page - 1) * PER_PAGE,
      limit: PER_PAGE,
      search: search || undefined,
      course_id: selectedCourseId || undefined,
      status: (selectedStatus as LessonStatus) || undefined,
    }).then(res => {
      if (!cancelled) { setLessons(res.items); setTotal(res.total); }
    }).catch(() => { if (!cancelled) setLessons([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [page, search, selectedCourseId, selectedStatus]);

  useEffect(() => {
    lessons.forEach(l => {
      if (l.assigned_teacher_id) loadUser(l.assigned_teacher_id);
      if (l.assigned_converter_id) loadUser(l.assigned_converter_id);
    });
  }, [lessons, loadUser]);

  const totalPages = Math.ceil(total / PER_PAGE);

  const courseOptions: FilterOption[] = [
    { value: '', label: t('lessons.filter.allCourses') },
    ...courses.map(c => ({ value: c.id, label: c.title })),
  ];

  const statusOptions: FilterOption[] = [
    { value: '', label: t('lessons.filter.allStatuses') },
    ...LESSON_STATUSES.map(status => ({
      value: status,
      label: t(`lessons.status.${status}`),
    })),
  ];

  const hasActiveFilters = selectedCourseId !== '' || selectedStatus !== '' || search !== '';

  const clearAllFilters = () => {
    setSearch('');
    setSelectedCourseId('');
    setSelectedStatus('');
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">{t('lessons.title')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isLoading ? '...' : `${total} ${t('lessons.totalLessons')}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('lessons.search')}
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearAllFilters}
        layout="inline"
        filters={[
          {
            key: 'course',
            label: t('lessons.filter.course'),
            value: selectedCourseId,
            options: courseOptions,
            onChange: setSelectedCourseId,
          },
          {
            key: 'status',
            label: t('lessons.filter.status'),
            value: selectedStatus,
            options: statusOptions,
            onChange: setSelectedStatus,
          },
        ]}
      />

      {/* Lessons cards */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="card p-12 flex justify-center">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : lessons.length === 0 ? (
          <div className="card p-12 text-center text-slate-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('lessons.noResults')}</p>
          </div>
        ) : (
          lessons.map(lesson => {
            const teacher = lesson.assigned_teacher_id ? userCache[lesson.assigned_teacher_id] : null;
            const converter = lesson.assigned_converter_id ? userCache[lesson.assigned_converter_id] : null;

            return (
              <Link
                key={lesson.id}
                to={`/lessons/${lesson.id}`}
                className="card p-5 flex items-start gap-4 hover:shadow-md transition-all group"
              >
                <div
                  className="w-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: 'var(--color-primary, #3B82F6)',
                    minHeight: '60px',
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 flex-wrap">
                    <StatusBadge status={lesson.status} />
                  </div>
                  <h3 className="font-semibold text-slate-900 mt-2 group-hover:text-blue-600 transition-colors">
                    {lesson.title}
                  </h3>
                  {lesson.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-1">{lesson.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>{lesson.sub_lessons_count ?? 0} {t('lessons.subLessons')}</span>
                    {lesson.course_title && (
                      <span className="flex items-center gap-1">
                        <BookOpen size={11} />
                        {lesson.course_title}
                      </span>
                    )}
                  </div>
                </div>

                {/* Assignees */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {teacher && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users size={12} className="text-slate-400" />
                      <UserAvatar name={teacher.full_name} />
                      <span className="truncate max-w-[100px]">{teacher.full_name}</span>
                    </div>
                  )}
                  {converter && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <User size={12} className="text-slate-400" />
                      <UserAvatar name={converter.full_name} />
                      <span className="truncate max-w-[100px]">{converter.full_name}</span>
                    </div>
                  )}
                </div>

                <ChevronRight
                  size={18}
                  className="text-slate-300 group-hover:text-slate-500 shrink-0 mt-1 transition-colors"
                />
              </Link>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | '...')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '...'
                ? <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400">…</span>
                : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                      page === p ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                )
            )}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
