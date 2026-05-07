import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { formatDateShort } from '../../../utils/formatters';
import type { ApiSubLessonResponse } from '../../../types/api';

interface SubLessonHeaderProps {
  subLesson: ApiSubLessonResponse;
  lessonTitle: string | undefined;
}

export function SubLessonHeader({ subLesson, lessonTitle }: SubLessonHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <StatusBadge status={subLesson.status} type="subLesson" />
          <h1 className="text-xl font-bold text-slate-900 mt-2">{subLesson.title}</h1>
          {subLesson.description && (
            <p className="text-sm text-slate-500 mt-1">{subLesson.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
        <div>
          <div className="text-xs text-slate-400">{t('subLessons.card.parentLesson')}</div>
          <div className="text-sm font-medium text-slate-800 mt-0.5 truncate">
            {lessonTitle ?? '—'}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">{t('subLessons.card.lastUpdated')}</div>
          <div className="text-sm font-medium text-slate-800 mt-0.5">
            {formatDateShort(subLesson.updated_at)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">{t('subLessons.card.createdAt')}</div>
          <div className="text-sm font-medium text-slate-800 mt-0.5">
            {formatDateShort(subLesson.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
