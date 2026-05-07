import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, BookOpen } from 'lucide-react';
import { courseService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useUserCache } from '../../hooks/useUserCache';
import { CourseCard } from './components/CourseCard';
import { EmptyState } from '../../components/ui/EmptyState';
import type { ApiCourseWithLessons } from '../../types/api';
import { API_ROLE } from '../../types/api';

const PER_PAGE = 20;

export default function CoursesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin, selectedRole } = useAuth();
  const { cache: userCache, loadUser } = useUserCache();

  const [courses, setCourses] = useState<ApiCourseWithLessons[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    setPage(1);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    courseService.listCourses({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE, search: search || undefined })
      .then(res => { if (!cancelled) { setCourses(res.items); setTotal(res.total); } })
      .catch(() => { if (!cancelled) setCourses([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [page, search]);

  useEffect(() => {
    courses.forEach(c => loadUser(c.assigned_expert_id));
  }, [courses, loadUser]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">{t('courses.title')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isLoading ? '...' : `${total} ${t('courses.totalCourses')}`}
          </p>
        </div>
        {isAdmin && selectedRole === API_ROLE.ADMIN && (
          <button onClick={() => navigate('/courses/create')} className="btn btn-primary w-full sm:w-auto flex justify-center gap-1.5">
            <Plus size={15} /><span>{t('courses.add')}</span>
          </button>
        )}
      </div>

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

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="card p-12 flex justify-center">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="card p-12">
            <EmptyState
              icon={<BookOpen size={40} />}
              message={t('courses.noResults')}
            />
          </div>
        ) : (
          courses.map(course => (
            <CourseCard key={course.id} course={course} expert={userCache[course.assigned_expert_id]} />
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
