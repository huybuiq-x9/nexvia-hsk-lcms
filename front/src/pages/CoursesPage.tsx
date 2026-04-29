import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';

export default function CoursesPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <BookOpen size={28} className="text-blue-500" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">{t('nav.courses')}</h2>
      <p className="text-sm text-slate-500 max-w-sm">{t('stub.courses')}</p>
    </div>
  );
}
