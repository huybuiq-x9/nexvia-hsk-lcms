import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Users, User, UserCheck, Trash2 } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import type { ApiLessonListItem, ApiUserWithRoles } from '../../../types/api';

interface LessonCardProps {
  lesson: ApiLessonListItem;
  expert?: ApiUserWithRoles;
  teacher?: ApiUserWithRoles;
  converter?: ApiUserWithRoles;
  onDelete?: (id: string) => void;
}

export function LessonCard({ lesson, expert, teacher, converter, onDelete }: LessonCardProps) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(lesson.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Link
        to={`/lessons/${lesson.id}`}
        className="card p-5 flex items-start gap-4 hover:shadow-md transition-all group relative"
      >
        {onDelete && (
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="absolute top-3 right-3 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
            title={t('lessons.delete')}
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
          <StatusBadge status={lesson.status} type="lesson" />
        </div>
        <h3 className="font-semibold text-slate-900 mt-2 group-hover:text-blue-600 transition-colors">
          {lesson.title}
        </h3>
        {lesson.description && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-1">{lesson.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
          <span>{lesson.sub_lessons_count ?? 0} {t('subLessons.title')}</span>
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

      {showDeleteConfirm && (
        <ConfirmModal
          title={t('courses.deleteLessonModal.title')}
          message={t('courses.deleteLessonModal.confirm', { name: lesson.title })}
          confirmLabel={t('courses.deleteLessonModal.confirmDelete')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          variant="danger"
          loading={isDeleting}
          icon={<Trash2 size={20} className="text-red-500" />}
        />
      )}
    </>
  );
}
