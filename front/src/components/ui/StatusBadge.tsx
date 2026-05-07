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

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const colors = COLOR_MAP[type] ?? {};
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
        colors[status] ?? 'bg-slate-50 text-slate-600 border-slate-200'
      }`}
    >
      {status}
    </span>
  );
}
