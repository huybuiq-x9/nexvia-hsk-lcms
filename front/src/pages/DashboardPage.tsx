import { BookOpen, HelpCircle, Users, Bell } from 'lucide-react';

const STATS = [
  {
    label: 'Khóa học',
    value: '—',
    sub: 'Đang hoạt động',
    icon: <BookOpen size={20} className="text-blue-600" />,
    bg: 'bg-blue-50',
  },
  {
    label: 'Ngân hàng câu hỏi',
    value: '—',
    sub: 'Tổng số câu hỏi',
    icon: <HelpCircle size={20} className="text-purple-600" />,
    bg: 'bg-purple-50',
  },
  {
    label: 'Người dùng',
    value: '—',
    sub: 'Tài khoản đã kích hoạt',
    icon: <Users size={20} className="text-green-600" />,
    bg: 'bg-green-50',
  },
  {
    label: 'Thông báo',
    value: '—',
    sub: 'Chưa đọc',
    icon: <Bell size={20} className="text-amber-600" />,
    bg: 'bg-amber-50',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Tổng quan</h1>
        <p className="text-sm text-slate-500 mt-0.5">Chào mừng bạn quay trở lại HSK LCMS.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(stat => (
          <div key={stat.label} className="card p-5 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 leading-none">{stat.value}</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">{stat.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Hoạt động gần đây</h2>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 leading-tight">Chưa có hoạt động nào.</p>
                  <p className="text-xs text-slate-400 leading-tight">—</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Thông tin hệ thống</h2>
          <div className="space-y-3">
            {[
              { label: 'Phiên bản', value: '1.0.0' },
              { label: 'Trạng thái', value: 'Đang hoạt động', color: 'text-green-600' },
              { label: 'HSK Level', value: '1 – 6' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-500">{item.label}</span>
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
