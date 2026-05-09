import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FileText, ChevronRight, BookOpen, Layers, User, UserCheck, Users, Trash2 } from 'lucide-react';
import { courseService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useUserCache } from '../../hooks/useUserCache';
import FilterBar from '../../components/FilterBar';
import type { ApiSubLessonListItem, ApiCourseWithLessons, ApiLessonListItem, ApiUserWithRoles } from '../../types/api';
import type { SubLessonStatus } from '../../types/api';
import { SUB_LESSON_STATUSES, API_ROLE } from '../../types/api';

const PER_PAGE = 20;

const ManagerRow = ({
  icon,
  label,
  user,
  isAssigned,
}: {
  icon: ReactNode;
  label: string;
  user?: ApiUserWithRoles;
  isAssigned: boolean;
}) => (
  <div className="flex items-center gap-1.5 text-xs text-slate-500">
    <span className="text-slate-400">{icon}</span>
    {user ? (
      <>
        <UserAvatar name={user.full_name} size="sm" />
        <span className="truncate max-w-[110px]" title={`${label}: ${user.full_name}`}>
          {user.full_name}
        </span>
      </>
    ) : (
      <span className="truncate max-w-[110px] text-slate-400 italic">
        {isAssigned ? '...' : '—'}
      </span>
    )}
  </div>
);

export default function SubLessonsPage() {
  const { t } = useTranslation();
  const { isAdmin, selectedRole } = useAuth();
  const { cache: userCache, loadUser } = useUserCache();

  const [subLessons, setSubLessons] = useState<ApiSubLessonListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<ApiCourseWithLessons[]>([]);
  const [lessons, setLessons] = useState<ApiLessonListItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const isFirst = useRef(true);

  const handleDeleteSubLesson = async () => {
    if (!deleteConfirm) return;
    setDeletingId(deleteConfirm.id);
    try {
      await courseService.deleteSubLesson(deleteConfirm.id);
      setSubLessons(prev => prev.filter(sl => sl.id !== deleteConfirm.id));
      setTotal(prev => prev - 1);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete sub-lesson:', err);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    courseService.getCoursesForFilter().then(res => setCourses(res)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;
    courseService.listLessonsForFilter({ course_id: selectedCourseId })
      .then(res => setLessons(res)).catch(() => setLessons([]));
  }, [selectedCourseId]);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    setPage(1);
  }, [search, selectedCourseId, selectedLessonId, selectedStatus]);

  useEffect(() => {
    async function fetchSubLessons() {
      setIsLoading(true);
      try {
        const res = await courseService.listSubLessons({
          skip: (page - 1) * PER_PAGE, limit: PER_PAGE,
          search: search || undefined,
          course_id: selectedCourseId || undefined,
          lesson_id: selectedLessonId || undefined,
          status: (selectedStatus as SubLessonStatus) || undefined,
        });
        setSubLessons(res.items);
        setTotal(res.total);
      } catch { setSubLessons([]); }
      finally { setIsLoading(false); }
    }
    void fetchSubLessons();
  }, [page, search, selectedCourseId, selectedLessonId, selectedStatus]);

  useEffect(() => {
    subLessons.forEach(sl => {
      if (sl.assigned_expert_id) loadUser(sl.assigned_expert_id);
      if (sl.assigned_teacher_id) loadUser(sl.assigned_teacher_id);
      if (sl.assigned_converter_id) loadUser(sl.assigned_converter_id);
    });
  }, [subLessons, loadUser]);

  const totalPages = Math.ceil(total / PER_PAGE);

  const courseOptions = [
    { value: '', label: t('subLessons.filter.allCourses') },
    ...courses.map(c => ({ value: c.id, label: c.title })),
  ];

  const lessonOptions = [
    { value: '', label: t('subLessons.filter.allLessons') },
    ...lessons.map(l => ({ value: l.id, label: l.title })),
  ];

  const statusOptions = [
    { value: '', label: t('subLessons.filter.allStatuses') },
    ...SUB_LESSON_STATUSES.map(status => ({ value: status, label: t(`subLessons.status.${status}`) })),
  ];

  const hasActiveFilters = selectedCourseId !== '' || selectedLessonId !== '' || selectedStatus !== '' || search !== '';

  const clearAllFilters = () => {
    setSearch(''); setSelectedCourseId(''); setSelectedLessonId(''); setSelectedStatus(''); setLessons([]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">{t('subLessons.title')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isLoading ? '...' : `${total} ${t('subLessons.totalSubLessons')}`}
          </p>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('subLessons.search')}
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearAllFilters}
        layout="inline"
        filters={[
          { key: 'course', label: t('subLessons.filter.course'), value: selectedCourseId, options: courseOptions, onChange: (val: string) => { setSelectedCourseId(val); setSelectedLessonId(''); setLessons([]); } },
          { key: 'lesson', label: t('subLessons.filter.lesson'), value: selectedLessonId, options: lessonOptions, onChange: setSelectedLessonId },
          { key: 'status', label: t('subLessons.filter.status'), value: selectedStatus, options: statusOptions, onChange: setSelectedStatus },
        ]}
      />

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="card p-12 flex justify-center">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : subLessons.length === 0 ? (
          <div className="card p-12">
            <EmptyState icon={<FileText size={40} />} message={t('subLessons.noResults')} />
          </div>
        ) : (
          subLessons.map(sl => (
            <Link
              key={sl.id}
              to={`/sub-lessons/${sl.id}`}
              className="card p-5 flex items-start gap-4 hover:shadow-md transition-all group relative"
            >
              {isAdmin && selectedRole === API_ROLE.ADMIN && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm({ id: sl.id, title: sl.title }); }}
                  disabled={deletingId === sl.id}
                  className="absolute top-3 right-3 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
                  title={t('subLessons.delete')}
                >
                  {deletingId === sl.id ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              )}
              <div
                className="w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--color-primary, #3B82F6)', minHeight: '50px' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 flex-wrap">
                  <StatusBadge status={sl.status} type="subLesson" />
                </div>
                <h3 className="font-semibold text-slate-900 mt-2 group-hover:text-blue-600 transition-colors">
                  {sl.title}
                </h3>
                {sl.description && (
                  <p className="text-sm text-slate-500 mt-1 line-clamp-1">{sl.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                  {sl.lesson_title && (
                    <span className="flex items-center gap-1"><Layers size={11} />{sl.lesson_title}</span>
                  )}
                  {sl.course_title && (
                    <span className="flex items-center gap-1"><BookOpen size={11} />{sl.course_title}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <ManagerRow
                  icon={<UserCheck size={12} />}
                  label={t('roles.expert')}
                  user={sl.assigned_expert_id ? userCache[sl.assigned_expert_id] : undefined}
                  isAssigned={Boolean(sl.assigned_expert_id)}
                />
                <ManagerRow
                  icon={<Users size={12} />}
                  label={t('roles.teacher')}
                  user={sl.assigned_teacher_id ? userCache[sl.assigned_teacher_id] : undefined}
                  isAssigned={Boolean(sl.assigned_teacher_id)}
                />
                <ManagerRow
                  icon={<User size={12} />}
                  label={t('roles.converter')}
                  user={sl.assigned_converter_id ? userCache[sl.assigned_converter_id] : undefined}
                  isAssigned={Boolean(sl.assigned_converter_id)}
                />
              </div>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 shrink-0 mt-1 transition-colors" />
            </Link>
          ))
        )}
      </div>

      {deleteConfirm && (
        <ConfirmModal
          title={t('subLessons.deleteModal.title')}
          message={t('subLessons.deleteModal.confirm', { name: deleteConfirm.title })}
          confirmLabel={t('subLessons.deleteModal.confirmDelete')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleDeleteSubLesson}
          onCancel={() => setDeleteConfirm(null)}
          variant="danger"
          loading={deletingId !== null}
          icon={<Trash2 size={20} className="text-red-500" />}
        />
      )}

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
