import { Package } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useTranslation } from 'react-i18next';

export function SubLessonScormTab() {
  const { t } = useTranslation();

  return (
    <EmptyState
      icon={<Package size={40} className="opacity-50" />}
      message={t('courses.noScorm')}
    />
  );
}
