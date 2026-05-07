import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
        <Bell size={28} className="text-amber-500" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">{t('nav.notifications')}</h2>
      <p className="text-sm text-slate-500 max-w-sm">{t('stub.notifications')}</p>
    </div>
  );
}
