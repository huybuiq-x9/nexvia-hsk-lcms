import { useTranslation } from 'react-i18next';
import { HelpCircle, Plus } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';

export function SubLessonQuestionsTab() {
  const { t } = useTranslation();

  return (
    <EmptyState
      icon={<HelpCircle size={40} className="opacity-50" />}
      message={t('courses.noQuestions')}
      action={
        <button className="btn btn-secondary flex items-center gap-2 mx-auto">
          <Plus size={14} />
          {t('courses.createQuestion')}
        </button>
      }
    />
  );
}
