import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SubLessonBreadcrumbProps {
  courseInfo: { id: string; title: string } | null;
  lessonInfo: { id: string; title: string } | null;
  subLessonTitle: string;
}

export function SubLessonBreadcrumb({ courseInfo, lessonInfo, subLessonTitle }: SubLessonBreadcrumbProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-500">
      <Link to="/courses" className="hover:text-slate-700 transition-colors">
        {t('subLessons.breadcrumb')}
      </Link>
      <ChevronRight size={14} />
      {courseInfo && (
        <>
          <Link
            to={`/courses/${courseInfo.id}`}
            className="hover:text-slate-700 transition-colors truncate max-w-[200px]"
          >
            {courseInfo.title}
          </Link>
          <ChevronRight size={14} />
        </>
      )}
      {lessonInfo && (
        <>
          <Link
            to={`/lessons/${lessonInfo.id}`}
            className="hover:text-slate-700 transition-colors truncate max-w-[200px]"
          >
            {lessonInfo.title}
          </Link>
          <ChevronRight size={14} />
        </>
      )}
      <span className="text-slate-800 font-medium truncate max-w-[200px]">{subLessonTitle}</span>
    </div>
  );
}
