import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, FileText, Trash2, User, UserCheck, Users } from 'lucide-react';
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

function getLessonTone(status: ApiLessonListItem['status']) {
  switch (status) {
    case 'approved':
      return {
        accent: 'bg-emerald-500',
        icon: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        progress: 'bg-emerald-500',
        hover: 'hover:border-emerald-200 hover:shadow-emerald-100/70',
      };
    case 'in_progress':
      return {
        accent: 'bg-blue-500',
        icon: 'bg-blue-50 text-blue-700 ring-blue-100',
        progress: 'bg-blue-500',
        hover: 'hover:border-blue-200 hover:shadow-blue-100/80',
      };
    case 'draft':
      return {
        accent: 'bg-slate-400',
        icon: 'bg-slate-50 text-slate-700 ring-slate-100',
        progress: 'bg-slate-400',
        hover: 'hover:border-slate-300 hover:shadow-slate-200/70',
      };
    default:
      return {
        accent: 'bg-amber-400',
        icon: 'bg-amber-50 text-amber-700 ring-amber-100',
        progress: 'bg-amber-400',
        hover: 'hover:border-amber-200 hover:shadow-amber-100/70',
      };
  }
}

export function LessonCard({ lesson, expert, teacher, converter, onDelete }: LessonCardProps) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const totalSubLessons = lesson.sub_lessons_count ?? 0;
  const approvedSubLessons = lesson.approved_sub_lessons_count ?? 0;
  const progress = totalSubLessons > 0 ? Math.round((approvedSubLessons / totalSubLessons) * 100) : 0;
  const tone = getLessonTone(lesson.status);
  const assignees = [
    { key: 'expert', label: t('roles.expert'), user: expert, icon: <UserCheck size={13} className="text-emerald-500" /> },
    { key: 'teacher', label: t('roles.teacher'), user: teacher, icon: <Users size={13} className="text-blue-500" /> },
    { key: 'converter', label: t('roles.converter'), user: converter, icon: <User size={13} className="text-amber-500" /> },
  ];

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
        className={`card group relative block overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${tone.hover}`}
      >
        <span className={`absolute left-0 top-0 h-full w-1.5 ${tone.accent}`} />
        {onDelete && (
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            title={t('lessons.delete')}
          >
            {isDeleting ? (
              <div className="h-4 w-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        )}

        <div className={`grid gap-4 p-5 pl-7 ${onDelete ? 'pr-12' : 'pr-5'} lg:grid-cols-[minmax(0,1fr)_minmax(230px,300px)]`}>
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${tone.icon}`}>
                <BookOpen size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={lesson.status} type="lesson" />
                  {lesson.course_title && (
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                      <FileText size={12} className="shrink-0 text-slate-400" />
                      <span className="truncate">{lesson.course_title}</span>
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
                  {lesson.title}
                </h3>
                {lesson.description && (
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{lesson.description}</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span className="inline-flex min-w-0 items-center gap-1.5 font-medium">
                  <FileText size={13} className="shrink-0 text-slate-400" />
                  <span>{approvedSubLessons}/{totalSubLessons} {t('subLessons.title')}</span>
                </span>
                <span className="font-semibold text-slate-600">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : tone.progress}`} style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:border-l lg:border-slate-100 lg:pl-5">
            {assignees.some(item => item.user) ? assignees.map(item => {
              if (!item.user) return null;
              return (
                <div key={item.key} className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600 ring-1 ring-slate-100">
                  {item.icon}
                  <UserAvatar name={item.user.full_name} size="sm" />
                  <span className="truncate" title={`${item.label}: ${item.user.full_name}`}>
                    {item.user.full_name}
                  </span>
                </div>
              );
            }) : (
              <div className="flex min-h-10 items-center rounded-lg bg-slate-50 px-3 text-xs text-slate-400 ring-1 ring-slate-100">—</div>
            )}
          </div>
        </div>

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
