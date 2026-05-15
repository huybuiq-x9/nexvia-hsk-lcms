import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, FileText, Layers, Trash2, Users } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import type { ApiCourseWithLessons, ApiUserWithRoles } from '../../../types/api';

interface CourseCardProps {
  course: ApiCourseWithLessons;
  expert?: ApiUserWithRoles;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

function getCourseTone(status: ApiCourseWithLessons['status']) {
  switch (status) {
    case 'published':
      return {
        accent: 'bg-emerald-500',
        icon: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        progress: 'bg-emerald-500',
        hover: 'hover:border-emerald-200 hover:shadow-emerald-100/70',
      };
    case 'ready_to_publish':
      return {
        accent: 'bg-amber-400',
        icon: 'bg-amber-50 text-amber-700 ring-amber-100',
        progress: 'bg-amber-400',
        hover: 'hover:border-amber-200 hover:shadow-amber-100/70',
      };
    case 'unpublished':
      return {
        accent: 'bg-rose-500',
        icon: 'bg-rose-50 text-rose-700 ring-rose-100',
        progress: 'bg-rose-500',
        hover: 'hover:border-rose-200 hover:shadow-rose-100/70',
      };
    case 'in_progress':
      return {
        accent: 'bg-blue-500',
        icon: 'bg-blue-50 text-blue-700 ring-blue-100',
        progress: 'bg-blue-500',
        hover: 'hover:border-blue-200 hover:shadow-blue-100/80',
      };
    default:
      return {
        accent: 'bg-slate-400',
        icon: 'bg-slate-50 text-slate-700 ring-slate-100',
        progress: 'bg-slate-400',
        hover: 'hover:border-slate-300 hover:shadow-slate-200/70',
      };
  }
}

export function CourseCard({ course, expert, onDelete, isDeleting }: CourseCardProps) {
  const { t } = useTranslation();
  const totalLessons = course.lessons.length;
  const approvedLessons = course.lessons.filter(l => l.status === 'approved').length;
  const totalSubLessons = course.lessons.reduce((acc, l) => acc + (l.sub_lessons_count ?? 0), 0);
  const progress = totalLessons > 0 ? Math.round((approvedLessons / totalLessons) * 100) : 0;
  const tone = getCourseTone(course.status);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && !isDeleting) {
      onDelete(course.id);
    }
  };

  return (
    <Link
      to={`/courses/${course.id}`}
      className={`card group relative block overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${tone.hover}`}
    >
      <span className={`absolute left-0 top-0 h-full w-1.5 ${tone.accent}`} />
      {onDelete && (
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          title={t('courses.delete')}
        >
          {isDeleting ? (
            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
        </button>
      )}

      <div className={`grid gap-4 p-5 pl-7 ${onDelete ? 'pr-12' : 'pr-5'} lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]`}>
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${tone.icon}`}>
              <BookOpen size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={course.status} type="course" />
                <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                  <Layers size={12} className="text-slate-400" />
                  {totalLessons} {t('courses.lessons')}
                </span>
              </div>
              <h3 className="mt-2 text-base font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
                {course.title}
              </h3>
              {course.description && (
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{course.description}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span className="inline-flex min-w-0 items-center gap-1.5 font-medium">
                <FileText size={13} className="shrink-0 text-slate-400" />
                <span>{approvedLessons}/{totalLessons} {t('courses.lessons')}</span>
              </span>
              <span className="font-semibold text-slate-600">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : tone.progress}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:border-l lg:border-slate-100 lg:pl-5">
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
            <FileText size={13} className="shrink-0" />
            <span>{totalSubLessons} {t('courses.subLessons')}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600 ring-1 ring-slate-100">
            <Users size={13} className="shrink-0 text-emerald-500" />
          {expert ? (
            <>
              <UserAvatar name={expert.full_name} size="sm" />
                <span className="truncate" title={`${t('roles.expert')}: ${expert.full_name}`}>
                  {expert.full_name}
                </span>
            </>
          ) : (
            <span className="text-slate-400 italic">—</span>
          )}
          </div>
        </div>
      </div>
    </Link>
  );
}
