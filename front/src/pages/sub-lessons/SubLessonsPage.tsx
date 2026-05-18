import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle, Clock, FileText, Layers, Trash2, User, UserCheck, Users } from 'lucide-react';
import { courseService, userService } from '../../services';
import RoleFilterDropdown from '../../components/RoleFilterDropdown';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useUserCache } from '../../hooks/useUserCache';
import { useDebounce } from '../../hooks/useDebounce';
import FilterBar from '../../components/FilterBar';
import type { ApiSubLessonListItem, ApiCourseWithLessons, ApiLessonListItem, ApiUserWithRoles } from '../../types/api';
import type { SubLessonStatus } from '../../types/api';
import { SUB_LESSON_STATUS, SUB_LESSON_STATUSES, API_ROLE } from '../../types/api';

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
  <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600 ring-1 ring-slate-100">
    <span className="shrink-0">{icon}</span>
    {user ? (
      <>
        <UserAvatar name={user.full_name} size="sm" />
        <span className="truncate" title={`${label}: ${user.full_name}`}>
          {user.full_name}
        </span>
      </>
    ) : (
      <span className="truncate text-slate-400 italic">
        {isAssigned ? '...' : '—'}
      </span>
    )}
  </div>
);

function getSubLessonTone(status: ApiSubLessonListItem['status']) {
  switch (status) {
    case 'approved':
      return {
        accent: 'bg-emerald-500',
        icon: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        hover: 'hover:border-emerald-200 hover:shadow-emerald-100/70',
      };
    case 'reviewing':
      return {
        accent: 'bg-amber-400',
        icon: 'bg-amber-50 text-amber-700 ring-amber-100',
        hover: 'hover:border-amber-200 hover:shadow-amber-100/70',
      };
    case 'converting':
      return {
        accent: 'bg-violet-500',
        icon: 'bg-violet-50 text-violet-700 ring-violet-100',
        hover: 'hover:border-violet-200 hover:shadow-violet-100/70',
      };
    case 'scorm_reviewing':
      return {
        accent: 'bg-cyan-500',
        icon: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
        hover: 'hover:border-cyan-200 hover:shadow-cyan-100/70',
      };
    case 'in_progress':
      return {
        accent: 'bg-blue-500',
        icon: 'bg-blue-50 text-blue-700 ring-blue-100',
        hover: 'hover:border-blue-200 hover:shadow-blue-100/80',
      };
    default:
      return {
        accent: 'bg-slate-400',
        icon: 'bg-slate-50 text-slate-700 ring-slate-100',
        hover: 'hover:border-slate-300 hover:shadow-slate-200/70',
      };
  }
}

export default function SubLessonsPage() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { cache: userCache, loadUser } = useUserCache();

  const [subLessons, setSubLessons] = useState<ApiSubLessonListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<ApiCourseWithLessons[]>([]);
  const [lessons, setLessons] = useState<ApiLessonListItem[]>([]);
  const [experts, setExperts] = useState<ApiUserWithRoles[]>([]);
  const [teachers, setTeachers] = useState<ApiUserWithRoles[]>([]);
  const [converters, setConverters] = useState<ApiUserWithRoles[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedExpertIds, setSelectedExpertIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [selectedConverterIds, setSelectedConverterIds] = useState<string[]>([]);
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
    if (!selectedCourseId) return;
    courseService.listLessonsForFilter({ course_id: selectedCourseId })
      .then(res => setLessons(res)).catch(() => setLessons([]));
  }, [selectedCourseId]);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    setPage(1);
  }, [debouncedSearch, selectedCourseId, selectedLessonId, selectedStatus, selectedExpertIds, selectedTeacherIds, selectedConverterIds]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(async () => {
      if (cancelled) return;
      setIsLoading(true);
      try {
        const res = await courseService.listSubLessons({
          skip: (page - 1) * PER_PAGE, limit: PER_PAGE,
          search: debouncedSearch || undefined,
          course_id: selectedCourseId || undefined,
          lesson_id: selectedLessonId || undefined,
          status: (selectedStatus as SubLessonStatus) || undefined,
          expert_ids: selectedExpertIds.length > 0 ? selectedExpertIds : undefined,
          teacher_ids: selectedTeacherIds.length > 0 ? selectedTeacherIds : undefined,
          converter_ids: selectedConverterIds.length > 0 ? selectedConverterIds : undefined,
        });
        if (!cancelled) {
          setSubLessons(res.items);
          setTotal(res.total);
        }
      } catch {
        if (!cancelled) setSubLessons([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [page, debouncedSearch, selectedCourseId, selectedLessonId, selectedStatus, selectedExpertIds, selectedTeacherIds, selectedConverterIds]);

  useEffect(() => {
    subLessons.forEach(sl => {
      if (sl.assigned_expert_id) loadUser(sl.assigned_expert_id);
      if (sl.assigned_teacher_id) loadUser(sl.assigned_teacher_id);
      if (sl.assigned_converter_id) loadUser(sl.assigned_converter_id);
    });
  }, [subLessons, loadUser]);

  const totalPages = Math.ceil(total / PER_PAGE);
  const draftCount = subLessons.filter(sl => sl.status === SUB_LESSON_STATUS.DRAFT).length;
  const inProgressCount = subLessons.filter(sl => sl.status === SUB_LESSON_STATUS.IN_PROGRESS).length;
  const reviewingCount = subLessons.filter(sl => sl.status === SUB_LESSON_STATUS.REVIEWING).length;
  const convertingCount = subLessons.filter(sl => sl.status === SUB_LESSON_STATUS.CONVERTING).length;
  const scormReviewingCount = subLessons.filter(sl => sl.status === SUB_LESSON_STATUS.SCORM_REVIEWING).length;
  const approvedCount = subLessons.filter(sl => sl.status === SUB_LESSON_STATUS.APPROVED).length;

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

  const hasActiveFilters = selectedCourseId !== '' || selectedLessonId !== '' || selectedStatus !== '' || search !== ''
    || selectedExpertIds.length > 0 || selectedTeacherIds.length > 0 || selectedConverterIds.length > 0;

  const clearAllFilters = () => {
    setSearch(''); setSelectedCourseId(''); setSelectedLessonId(''); setSelectedStatus(''); setLessons([]);
    setSelectedExpertIds([]); setSelectedTeacherIds([]); setSelectedConverterIds([]);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-blue-100 bg-white px-5 py-4 shadow-sm shadow-blue-100/50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-200">
              <FileText size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">{t('subLessons.title')}</h1>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                {isLoading ? '...' : `${total} ${t('subLessons.totalSubLessons')}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap lg:justify-end">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <FileText size={15} className="shrink-0 text-slate-500" />
              <div className="min-w-0">
                <div className="text-sm font-bold leading-none text-slate-700">{isLoading ? '—' : draftCount}</div>
                <div className="mt-1 truncate text-[11px] font-medium text-slate-600">{t('subLessons.status.draft')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <Layers size={15} className="shrink-0 text-blue-600" />
              <div className="min-w-0">
                <div className="text-sm font-bold leading-none text-blue-700">{isLoading ? '—' : inProgressCount}</div>
                <div className="mt-1 truncate text-[11px] font-medium text-blue-700">{t('subLessons.status.in_progress')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
              <Clock size={15} className="shrink-0 text-amber-600" />
              <div className="min-w-0">
                <div className="text-sm font-bold leading-none text-amber-700">{isLoading ? '—' : reviewingCount}</div>
                <div className="mt-1 truncate text-[11px] font-medium text-amber-700">{t('subLessons.status.reviewing')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2">
              <Layers size={15} className="shrink-0 text-violet-600" />
              <div className="min-w-0">
                <div className="text-sm font-bold leading-none text-violet-700">{isLoading ? '—' : convertingCount}</div>
                <div className="mt-1 truncate text-[11px] font-medium text-violet-700">{t('subLessons.status.converting')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2">
              <Clock size={15} className="shrink-0 text-cyan-600" />
              <div className="min-w-0">
                <div className="text-sm font-bold leading-none text-cyan-700">{isLoading ? '—' : scormReviewingCount}</div>
                <div className="mt-1 truncate text-[11px] font-medium text-cyan-700">{t('subLessons.status.scorm_reviewing')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
              <CheckCircle size={15} className="shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <div className="text-sm font-bold leading-none text-emerald-700">{isLoading ? '—' : approvedCount}</div>
                <div className="mt-1 truncate text-[11px] font-medium text-emerald-700">{t('subLessons.status.approved')}</div>
              </div>
            </div>
          </div>
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
              expert: t('subLessons.filter.expert'),
              teacher: t('subLessons.filter.teacher'),
              converter: t('subLessons.filter.converter'),
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
        ) : subLessons.length === 0 ? (
          <div className="card p-12">
            <EmptyState icon={<FileText size={40} />} message={t('subLessons.noResults')} />
          </div>
        ) : (
          subLessons.map(sl => {
            const tone = getSubLessonTone(sl.status);
            const showDelete = isAdmin;

            return (
              <Link
                key={sl.id}
                to={`/sub-lessons/${sl.id}`}
                className={`card group relative block overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${tone.hover}`}
              >
                <span className={`absolute left-0 top-0 h-full w-1.5 ${tone.accent}`} />
                {showDelete && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm({ id: sl.id, title: sl.title }); }}
                    disabled={deletingId === sl.id}
                    className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    title={t('subLessons.delete')}
                  >
                    {deletingId === sl.id ? (
                      <div className="h-4 w-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                )}

                <div className={`grid gap-4 p-5 pl-7 ${showDelete ? 'pr-12' : 'pr-5'} lg:grid-cols-[minmax(0,1fr)_minmax(230px,300px)]`}>
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${tone.icon}`}>
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={sl.status} type="subLesson" />
                          {sl.lesson_title && (
                            <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                              <Layers size={12} className="shrink-0 text-slate-400" />
                              <span className="truncate">{sl.lesson_title}</span>
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 text-base font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
                          {sl.title}
                        </h3>
                        {sl.description && (
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{sl.description}</p>
                        )}
                        {sl.course_title && (
                          <div className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
                            <BookOpen size={13} className="shrink-0" />
                            <span className="truncate">{sl.course_title}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 lg:border-l lg:border-slate-100 lg:pl-5">
                    <ManagerRow
                      icon={<UserCheck size={13} className="text-emerald-500" />}
                      label={t('roles.expert')}
                      user={sl.assigned_expert_id ? userCache[sl.assigned_expert_id] : undefined}
                      isAssigned={Boolean(sl.assigned_expert_id)}
                    />
                    <ManagerRow
                      icon={<Users size={13} className="text-blue-500" />}
                      label={t('roles.teacher')}
                      user={sl.assigned_teacher_id ? userCache[sl.assigned_teacher_id] : undefined}
                      isAssigned={Boolean(sl.assigned_teacher_id)}
                    />
                    <ManagerRow
                      icon={<User size={13} className="text-amber-500" />}
                      label={t('roles.converter')}
                      user={sl.assigned_converter_id ? userCache[sl.assigned_converter_id] : undefined}
                      isAssigned={Boolean(sl.assigned_converter_id)}
                    />
                  </div>
                </div>
              </Link>
            );
          })
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
