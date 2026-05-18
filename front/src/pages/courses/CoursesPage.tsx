import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle, Clock, FileText, Plus, Trash2 } from 'lucide-react';
import { courseService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useUserCache } from '../../hooks/useUserCache';
import { useDebounce } from '../../hooks/useDebounce';
import { useBreadcrumbs } from '../../contexts/BreadcrumbContext';
import { CourseCard } from './components/CourseCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import FilterBar from '../../components/FilterBar';
import type { ApiCourseWithLessons } from '../../types/api';
import { COURSE_STATUS } from '../../types/api';

const PER_PAGE = 20;

export default function CoursesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { setPageHeader } = useBreadcrumbs();
  const { cache: userCache, loadUser } = useUserCache();

  const [courses, setCourses] = useState<ApiCourseWithLessons[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    setPageHeader(t('courses.title'));
    return () => setPageHeader('');
  }, [t, setPageHeader]);

  const handleDeleteCourse = async () => {
    if (!deleteConfirm) return;
    setDeletingId(deleteConfirm.id);
    try {
      await courseService.deleteCourse(deleteConfirm.id);
      setCourses(prev => prev.filter(c => c.id !== deleteConfirm.id));
      setTotal(prev => prev - 1);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete course:', err);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(async () => {
      if (cancelled) return;
      setIsLoading(true);
      try {
        const res = await courseService.listCourses({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE, search: debouncedSearch || undefined });
        if (!cancelled) {
          setCourses(res.items);
          setTotal(res.total);
        }
      } catch {
        if (!cancelled) setCourses([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [page, debouncedSearch]);

  useEffect(() => {
    courses.forEach(c => loadUser(c.assigned_expert_id));
  }, [courses, loadUser]);

  const totalPages = Math.ceil(total / PER_PAGE);
  const publishedCount = courses.filter(c => c.status === COURSE_STATUS.PUBLISHED).length;
  const inProgressCount = courses.filter(c => c.status === COURSE_STATUS.IN_PROGRESS).length;
  const draftCount = courses.filter(c => c.status === COURSE_STATUS.DRAFT).length;
  const hasActiveFilters = search !== '';
  const clearAllFilters = () => setSearch('');

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-blue-100 bg-white px-5 py-3 shadow-sm shadow-blue-100/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{isLoading ? '...' : `${total} ${t('courses.totalCourses')}`}</p>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2.5">
              <CheckCircle size={18} className="shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <div className="text-xl font-bold leading-none text-emerald-700">{isLoading ? '—' : publishedCount}</div>
                <div className="mt-1 truncate text-xs font-medium text-emerald-700">{t('courses.status.published')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5">
              <Clock size={18} className="shrink-0 text-blue-600" />
              <div className="min-w-0">
                <div className="text-xl font-bold leading-none text-blue-700">{isLoading ? '—' : inProgressCount}</div>
                <div className="mt-1 truncate text-xs font-medium text-blue-700">{t('courses.status.in_progress')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
              <FileText size={18} className="shrink-0 text-slate-600" />
              <div className="min-w-0">
                <div className="text-xl font-bold leading-none text-slate-700">{isLoading ? '—' : draftCount}</div>
                <div className="mt-1 truncate text-xs font-medium text-slate-700">{t('courses.status.draft')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('courses.search')}
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearAllFilters}
        layout="inline"
        filters={[]}
        extra={isAdmin ? (
          <button onClick={() => navigate('/courses/create')} className="btn btn-primary h-11 w-full justify-center gap-1.5 sm:w-auto">
            <Plus size={15} /><span>{t('courses.add')}</span>
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="card border-blue-100 p-10">
            <div className="flex items-center justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            </div>
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
            <CourseCard
              key={course.id}
              course={course}
              expert={userCache[course.assigned_expert_id]}
              onDelete={isAdmin ? (id) => setDeleteConfirm({ id, title: course.title }) : undefined}
              isDeleting={deletingId === course.id}
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

      {deleteConfirm && (
        <ConfirmModal
          title={t('courses.deleteModal.title')}
          message={t('courses.deleteModal.confirm', { name: deleteConfirm.title })}
          confirmLabel={t('courses.deleteModal.confirmDelete')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleDeleteCourse}
          onCancel={() => setDeleteConfirm(null)}
          variant="danger"
          loading={deletingId !== null}
          icon={<Trash2 size={20} className="text-red-500" />}
        />
      )}
    </div>
  );
}
