import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Plus,
  BookOpen,
  ChevronRight,
  Users,
} from 'lucide-react';
import { courseService, userService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import type { ApiCourseWithLessons, ApiUserWithRoles, CourseStatus } from '../types/api';
import { COURSE_STATUS_COLORS } from '../types/api';

const PER_PAGE = 20;

const StatusBadge = ({
  status,
  colors,
}: {
  status: CourseStatus;
  colors: Record<CourseStatus, string>;
}) => (
  <span
    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}
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

export default function CoursesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [courses, setCourses] = useState<ApiCourseWithLessons[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [userCache, setUserCache] = useState<Record<string, ApiUserWithRoles>>({});
  const isFirst = useRef(true);

  const loadUser = (id: string) => {
    if (!id || userCache[id]) return;
    userService.getUser(id).then(u => {
      setUserCache(c => ({ ...c, [id]: u }));
    }).catch(() => {});
  };

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    setPage(1);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    courseService.listCourses({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE, search: search || undefined })
      .then(res => {
        if (!cancelled) { setCourses(res.items); setTotal(res.total); }
      })
      .catch(() => { if (!cancelled) setCourses([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [page, search]);

  // Pre-load expert names
  useEffect(() => {
    courses.forEach(c => loadUser(c.assigned_expert_id));
  }, [courses]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">{t('courses.title')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isLoading ? '...' : `${total} ${t('courses.totalCourses')}`}
          </p>
        </div>
        {isAdmin && (
        <button
          onClick={() => navigate('/courses/create')}
          className="btn btn-primary w-full sm:w-auto flex justify-center gap-1.5"
        >
          <Plus size={15} />
          <span>{t('courses.add')}</span>
        </button>
        )}
      </div>

      {/* Search bar */}
      <div className="card p-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('courses.search')}
            className="input pl-9"
          />
        </div>
      </div>

      {/* Course cards */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="card p-12 flex justify-center">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="card p-12 text-center text-slate-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('courses.noResults')}</p>
          </div>
        ) : (
          courses.map(course => {
            const expert = userCache[course.assigned_expert_id];
            return (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="card p-5 flex items-start gap-4 hover:shadow-md transition-all group"
              >
                {/* Color bar */}
                <div
                  className="w-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: 'var(--color-primary, #3B82F6)',
                    minHeight: '60px',
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 flex-wrap">
                    <StatusBadge status={course.status} colors={COURSE_STATUS_COLORS} />
                  </div>
                  <h3 className="font-semibold text-slate-900 mt-2 group-hover:text-blue-600 transition-colors">
                    {course.title}
                  </h3>
                  {course.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-1">{course.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>{course.lessons.length} {t('courses.lessons')}</span>
                    <span>{course.lessons.reduce((acc, l) => acc + (l.sub_lessons_count ?? 0), 0)} {t('courses.subLessons')}</span>
                  </div>
                </div>

                {/* Expert */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Users size={12} className="text-slate-400" />
                    {expert ? (
                      <>
                        <UserAvatar name={expert.full_name} />
                        <span className="truncate max-w-[120px]">{expert.full_name}</span>
                      </>
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </div>
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
