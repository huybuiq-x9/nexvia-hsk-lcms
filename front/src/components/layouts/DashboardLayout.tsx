import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  Users,
  Bell,
  ChevronLeft,
  LogOut,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS } from '../../types/api';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tổng quan', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Quản lý khóa học', to: '/courses', icon: <BookOpen size={18} /> },
  { label: 'Quản lý ngân hàng câu hỏi', to: '/question-bank', icon: <HelpCircle size={18} /> },
  { label: 'Quản lý người dùng', to: '/users', icon: <Users size={18} /> },
  { label: 'Thông báo', to: '/notifications', icon: <Bell size={18} /> },
];

function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { user, selectedRole } = useAuth();

  return (
    <aside
      className={`fixed top-0 left-0 h-full z-30 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-slate-100 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xs">HSK</span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 leading-tight">LCMS</div>
              <div className="text-[10px] text-slate-400 leading-tight">HSK Hà Nội</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center mx-auto shadow-sm">
            <span className="text-white font-bold text-xs">HSK</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors ${
            collapsed ? 'mx-auto mt-1' : ''
          }`}
          title={collapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          <ChevronLeft size={14} className={collapsed ? 'rotate-180' : ''} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      {user && (
        <div className={`border-t border-slate-100 p-3 shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
          {collapsed ? (
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600">{user.full_name[0]?.toUpperCase()}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-blue-600">{user.full_name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{user.full_name}</p>
                <p className="text-[10px] text-slate-400 truncate leading-tight">
                  {selectedRole ? ROLE_LABELS[selectedRole] : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function Header() {
  const { user, logout, selectedRole } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-1.5">
        <Shield size={14} className="text-slate-400" />
        <span className="text-xs text-slate-400">
          {selectedRole ? ROLE_LABELS[selectedRole] : 'Người dùng'}
        </span>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowDropdown(v => !v)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-600">{user?.full_name[0]?.toUpperCase()}</span>
          </div>
          <span className="text-sm font-medium text-slate-700">{user?.full_name}</span>
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="dropdown-menu z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">{user?.full_name}</p>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="dropdown-item w-full text-red-600 hover:bg-red-50"
              >
                <LogOut size={15} />
                Đăng xuất
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          collapsed ? 'ml-16' : 'ml-56'
        }`}
      >
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
