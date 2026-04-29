import { useTranslation } from 'react-i18next';
import { BookOpen, HelpCircle, Users, Bell } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useTranslation();

  const stats = [
    {
      labelKey: 'dashboard.courses',
      subKey: 'dashboard.active',
      icon: <BookOpen size={20} className="text-blue-600" />,
      bg: 'bg-blue-50',
    },
    {
      labelKey: 'dashboard.questions',
      subKey: 'dashboard.totalQuestions',
      icon: <HelpCircle size={20} className="text-purple-600" />,
      bg: 'bg-purple-50',
    },
    {
      labelKey: 'dashboard.users',
      subKey: 'dashboard.activeAccounts',
      icon: <Users size={20} className="text-green-600" />,
      bg: 'bg-green-50',
    },
    {
      labelKey: 'dashboard.notifications',
      subKey: 'dashboard.unread',
      icon: <Bell size={20} className="text-amber-600" />,
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('dashboard.title')}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{t('dashboard.welcome')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.labelKey} className="card p-5 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 leading-none">—</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">{t(stat.labelKey)}</p>
              <p className="text-xs text-slate-400 mt-0.5">{t(stat.subKey)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">{t('dashboard.recentActivity')}</h2>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 leading-tight">{t('dashboard.noActivity')}</p>
                  <p className="text-xs text-slate-400 leading-tight">—</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">{t('dashboard.systemInfo')}</h2>
          <div className="space-y-3">
            {[
              { labelKey: 'dashboard.version', value: '1.0.0' },
              { labelKey: 'dashboard.status', value: t('dashboard.operational'), color: 'text-green-600' },
              { labelKey: 'dashboard.hskLevel', value: t('dashboard.levels') },
            ].map(item => (
              <div key={item.labelKey} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-500">{t(item.labelKey)}</span>
                <span className={`text-sm font-medium text-slate-800 ${(item as { color?: string }).color || ''}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
