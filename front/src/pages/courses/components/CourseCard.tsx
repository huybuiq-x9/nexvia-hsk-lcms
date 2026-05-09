import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Users, Trash2 } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import type { ApiCourseWithLessons, ApiUserWithRoles } from '../../../types/api';

interface CourseCardProps {
  course: ApiCourseWithLessons;
  expert?: ApiUserWithRoles;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

export function CourseCard({ course, expert, onDelete, isDeleting }: CourseCardProps) {
  const { t } = useTranslation();

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
      className="card p-5 flex items-start gap-4 hover:shadow-md transition-all group relative"
    >
      {onDelete && (
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="absolute top-3 right-3 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={t('courses.delete')}
        >
          {isDeleting ? (
            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
        </button>
      )}
      <div
        className="w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: 'var(--color-primary, #3B82F6)', minHeight: '60px' }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-3 flex-wrap">
          <StatusBadge status={course.status} type="course" />
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

      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Users size={12} className="text-slate-400" />
          {expert ? (
            <>
              <UserAvatar name={expert.full_name} size="sm" />
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
}
