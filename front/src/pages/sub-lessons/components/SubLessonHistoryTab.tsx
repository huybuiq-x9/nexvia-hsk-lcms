import { History } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useTranslation } from 'react-i18next';

export function SubLessonHistoryTab() {
  const { t } = useTranslation();

  return (
    <EmptyState
      icon={<History size={40} className="opacity-50" />}
      message={t('courses.noHistory')}
    />
  );
}
