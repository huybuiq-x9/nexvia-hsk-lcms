import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, HelpCircle, Users, Bell, Cpu, HardDrive, Activity, Clock, Server } from 'lucide-react';
import { systemService } from '../services';
import type { ApiSystemStats } from '../types/api';

export default function DashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<ApiSystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    systemService
      .getStats()
      .then(res => { if (!cancelled) setStats(res); })
      .catch(() => { if (!cancelled) setStats(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const cards = [
    {
      labelKey: 'dashboard.courses',
      subKey: 'dashboard.active',
      icon: <BookOpen size={20} className="text-blue-600" />,
      bg: 'bg-blue-50',
      value: stats?.active_users ?? '—',
      sub: t('dashboard.active'),
    },
    {
      labelKey: 'dashboard.questions',
      subKey: 'dashboard.totalQuestions',
      icon: <HelpCircle size={20} className="text-purple-600" />,
      bg: 'bg-purple-50',
      value: stats?.total_users ?? '—',
      sub: t('dashboard.totalQuestions'),
    },
    {
      labelKey: 'dashboard.users',
      subKey: 'dashboard.activeAccounts',
      icon: <Users size={20} className="text-green-600" />,
      bg: 'bg-green-50',
      value: stats?.active_users ?? '—',
      sub: t('dashboard.activeAccounts'),
    },
    {
      labelKey: 'dashboard.notifications',
      subKey: 'dashboard.unread',
      icon: <Bell size={20} className="text-amber-600" />,
      bg: 'bg-amber-50',
      value: stats?.uptime_seconds ? formatUptime(stats.uptime_seconds) : '—',
      sub: t('dashboard.unread'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('dashboard.title')}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{t('dashboard.welcome')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.labelKey} className="card p-5 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.bg}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 leading-none">{loading ? '—' : card.value}</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">{t(card.labelKey)}</p>
              <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* System monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server size={15} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">{t('dashboard.systemMonitor')}</h2>
          </div>
          <div className="space-y-3">
            {/* CPU */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Cpu size={13} className="text-blue-500" />
                  <span className="text-xs text-slate-500">CPU</span>
                </div>
                <span className="text-xs font-medium text-slate-700">{stats ? `${stats.cpu_percent}%` : '—'}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: stats ? `${stats.cpu_percent}%` : '0%' }}
                />
              </div>
            </div>
            {/* Memory */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <HardDrive size={13} className="text-green-500" />
                  <span className="text-xs text-slate-500">Memory</span>
                </div>
                <span className="text-xs font-medium text-slate-700">
                  {stats ? `${stats.memory_used_mb} / ${stats.memory_total_mb} MB` : '—'}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: stats ? `${stats.memory_percent}%` : '0%' }}
                />
              </div>
            </div>
            {/* Disk */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Activity size={13} className="text-amber-500" />
                  <span className="text-xs text-slate-500">Disk</span>
                </div>
                <span className="text-xs font-medium text-slate-700">
                  {stats ? `${stats.disk_used_gb} / ${stats.disk_total_gb} GB` : '—'}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: stats ? `${stats.disk_percent}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* System info */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">{t('dashboard.systemInfo')}</h2>
          </div>
          <div className="space-y-3">
            {[
              { labelKey: 'dashboard.version', value: '1.0.0' },
              { labelKey: 'dashboard.status', value: stats?.cpu_percent ? t('dashboard.operational') : '—', color: 'text-green-600' },
              { labelKey: 'dashboard.activeUsers', value: stats?.active_users ?? '—' },
              { labelKey: 'dashboard.totalUsers', value: stats?.total_users ?? '—' },
              { labelKey: 'dashboard.uptime', value: stats?.uptime_seconds ? formatUptime(stats.uptime_seconds) : '—' },
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
