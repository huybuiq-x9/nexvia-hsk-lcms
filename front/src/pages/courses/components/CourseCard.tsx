import { Link } from 'react-router-dom';
import { ChevronRight, Users } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import type { ApiCourseWithLessons, ApiUserWithRoles } from '../../../types/api';

interface CourseCardProps {
  course: ApiCourseWithLessons;
  expert?: ApiUserWithRoles;
}

export function CourseCard({ course, expert }: CourseCardProps) {
  return (
    <Link
      to={`/courses/${course.id}`}
      className="card p-5 flex items-start gap-4 hover:shadow-md transition-all group"
    >
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
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span>{course.lessons.length} bài học</span>
              <span>{course.lessons.reduce((acc, l) => acc + (l.sub_lessons_count ?? 0), 0)} bài học con</span>
            </div>
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
