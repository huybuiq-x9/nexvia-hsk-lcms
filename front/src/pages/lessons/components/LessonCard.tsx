import { Link } from 'react-router-dom';
import { ChevronRight, Users, User, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import type { ApiLessonListItem, ApiUserWithRoles } from '../../../types/api';

interface LessonCardProps {
  lesson: ApiLessonListItem;
  expert?: ApiUserWithRoles;
  teacher?: ApiUserWithRoles;
  converter?: ApiUserWithRoles;
}

export function LessonCard({ lesson, expert, teacher, converter }: LessonCardProps) {
  const { t } = useTranslation();

  return (
    <Link
      to={`/lessons/${lesson.id}`}
      className="card p-5 flex items-start gap-4 hover:shadow-md transition-all group"
    >
      <div
        className="w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: 'var(--color-primary, #3B82F6)', minHeight: '60px' }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-3 flex-wrap">
          <StatusBadge status={lesson.status} type="lesson" />
        </div>
        <h3 className="font-semibold text-slate-900 mt-2 group-hover:text-blue-600 transition-colors">
          {lesson.title}
        </h3>
        {lesson.description && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-1">{lesson.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
          <span>{lesson.sub_lessons_count ?? 0} bài học con</span>
          {lesson.course_title && (
            <span className="flex items-center gap-1">
              <span>{lesson.course_title}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        {expert && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <UserCheck size={12} className="text-slate-400" />
            <UserAvatar name={expert.full_name} size="sm" />
            <span className="truncate max-w-[100px]" title={`${t('roles.expert')}: ${expert.full_name}`}>
              {expert.full_name}
            </span>
          </div>
        )}
        {teacher && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Users size={12} className="text-slate-400" />
            <UserAvatar name={teacher.full_name} size="sm" />
            <span className="truncate max-w-[100px]" title={`${t('roles.teacher')}: ${teacher.full_name}`}>
              {teacher.full_name}
            </span>
          </div>
        )}
        {converter && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <User size={12} className="text-slate-400" />
            <UserAvatar name={converter.full_name} size="sm" />
            <span className="truncate max-w-[100px]" title={`${t('roles.converter')}: ${converter.full_name}`}>
              {converter.full_name}
            </span>
          </div>
        )}
      </div>

      <ChevronRight
        size={18}
        className="text-slate-300 group-hover:text-slate-500 shrink-0 mt-1 transition-colors"
      />
    </Link>
  );
}
