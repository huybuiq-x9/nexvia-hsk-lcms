import { useTranslation } from 'react-i18next';
import type { CourseStatus, LessonStatus, SubLessonStatus } from '../../types/api';
import {
  COURSE_STATUS_COLORS,
  LESSON_STATUS_COLORS,
  SUB_LESSON_STATUS_COLORS,
} from '../../types/api';

type StatusType = 'course' | 'lesson' | 'subLesson';
type Status = CourseStatus | LessonStatus | SubLessonStatus;

interface StatusBadgeProps {
  status: Status;
  type: StatusType;
}

const COLOR_MAP: Record<StatusType, Record<string, string>> = {
  course: COURSE_STATUS_COLORS as Record<string, string>,
  lesson: LESSON_STATUS_COLORS as Record<string, string>,
  subLesson: SUB_LESSON_STATUS_COLORS as Record<string, string>,
};

const LABEL_KEY_MAP: Record<StatusType, string> = {
  course: 'courses.status',
  lesson: 'lessons.status',
  subLesson: 'subLessons.status',
};

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const { t } = useTranslation();
  const colors = COLOR_MAP[type] ?? {};
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        colors[status] ?? 'bg-slate-50 text-slate-600 border-slate-200'
      }`}
    >
      {t(`${LABEL_KEY_MAP[type]}.${status}`, { defaultValue: status })}
    </span>
  );
}
