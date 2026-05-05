import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  Users,
  Bell,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  LogOut,
  Shield,
  Layers,
  KeyRound,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { API_ROLE } from '../../types/api';
import { userService } from '../../services';
import { LanguageSwitcher } from '../LanguageSwitcher';

interface NavSubItem {
  labelKey: string;
  to: string;
  adminOnly?: boolean;
  expertOnly?: boolean;
}

interface NavItem {
  labelKey: string;
  to: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  children?: NavSubItem[];
}

function Sidebar({
  collapsed,
  onToggle,
  sidebarWidth,
}: {
  collapsed: boolean;
  onToggle: () => void;
  sidebarWidth: number;
}) {
  const { t } = useTranslation();
  const { user, selectedRole, isAdmin, isExpert } = useAuth();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['/courses']));

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const baseNavItems: NavItem[] = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, labelKey: 'nav.dashboard' },
    {
      to: '/courses',
      icon: <BookOpen size={18} />,
      labelKey: 'nav.content',
      children: [
        { labelKey: 'nav.courses', to: '/courses', expertOnly: true },
        { labelKey: 'nav.lessons', to: '/lessons' },
        { labelKey: 'nav.subLessons', to: '/sub-lessons' },
      ],
    },
    { to: '/question-bank', icon: <HelpCircle size={18} />, labelKey: 'nav.questionBank' },
    { to: '/users', icon: <Users size={18} />, labelKey: 'nav.users', adminOnly: true },
    { to: '/notifications', icon: <Bell size={18} />, labelKey: 'nav.notifications' },
  ];

  const isTeacherConverter =
    selectedRole === API_ROLE.TEACHER || selectedRole === API_ROLE.CONVERTER;
  const navItems = baseNavItems.filter(item => {
    if (item.adminOnly) return isAdmin;
    if (isTeacherConverter) return false;
    return true;
  });

  const isActive = (to: string) => {
    return window.location.pathname === to || window.location.pathname.startsWith(to + '/');
  };

  return (
    <aside
      className="fixed top-0 left-0 h-full z-30 flex flex-col border-r border-slate-200/60 transition-all duration-200"
      style={{
        width: collapsed ? '4rem' : `${sidebarWidth}px`,
        background: 'linear-gradient(180deg, #eff6ff 0%, #dbeafe 60%, #bfdbfe 100%)',
      }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-slate-100 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xs">HSK</span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 leading-tight">{t('app.brandShort')}</div>
              <div className="text-[10px] text-slate-400 leading-tight">{t('app.brandSub')}</div>
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
          title={collapsed ? t('nav.expand') : t('nav.collapse')}
        >
          <ChevronLeft size={14} className={collapsed ? 'rotate-180' : ''} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          if (!item.children) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive: active }) =>
                  `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-100'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span>{t(item.labelKey)}</span>}
              </NavLink>
            );
          }

          const groupKey = item.to;
          const isOpen = openGroups.has(groupKey);
          const visibleChildren = item.children?.filter(c => {
            if (c.adminOnly) return isAdmin;
            if (c.expertOnly) return isExpert || isAdmin;
            return true;
          }) ?? [];
          if (visibleChildren.length === 0) return null;
          const hasActiveChild = visibleChildren.some(c => isActive(c.to));

          return (
            <div
              key={groupKey}
              onMouseEnter={() => setOpenGroups(prev => new Set([...prev, groupKey]))}
              onMouseLeave={() => {
                if (!hasActiveChild) {
                  setOpenGroups(prev => { const next = new Set(prev); next.delete(groupKey); return next; });
                }
              }}
            >
              <button
                onClick={() => toggleGroup(groupKey)}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  hasActiveChild
                    ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-100'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{t(item.labelKey)}</span>
                    {isOpen ? (
                      <ChevronDown size={14} className="shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="shrink-0" />
                    )}
                  </>
                )}
              </button>

              {!collapsed && isOpen && (
                <div className="ml-3 mt-1 space-y-0.5 pl-3">
                  {visibleChildren.map(child => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end
                      className={({ isActive: active }) =>
                        `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                          active
                            ? 'text-blue-700 bg-blue-50'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                        }`
                      }
                    >
                      <Layers size={13} className="shrink-0 opacity-60" />
                      <span>{t(child.labelKey)}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
                  {selectedRole ? t(`roles.${selectedRole}`) : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function PasswordChangeModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordMismatch'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('profile.passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      await userService.changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success(t('profile.passwordChanged'));
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || t('profile.passwordChangeFailed');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-800">{t('profile.changePassword')}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('profile.currentPassword')}</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full pr-10 pl-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                autoFocus
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('profile.newPassword')}</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full pr-10 pl-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('profile.confirmPassword')}</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full pr-10 pl-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 px-4 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? t('common.saving') + '...' : t('profile.changePassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Header() {
  const { t } = useTranslation();
  const { user, logout, selectedRole } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const closeDropdown = () => setShowDropdown(false);

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Shield size={14} className="text-slate-400" />
          <span className="text-xs text-slate-400">
            {selectedRole ? t(`roles.${selectedRole}`) : t('header.user')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />

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
              <div className="fixed inset-0 z-40" onClick={closeDropdown} />
              <div className="dropdown-menu z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">{user?.full_name}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
                <button
                  onClick={() => { closeDropdown(); setShowPasswordModal(true); }}
                  className="dropdown-item w-full text-slate-600 hover:bg-slate-50"
                >
                  <KeyRound size={15} />
                  {t('profile.changePassword')}
                </button>
                <button
                  onClick={handleLogout}
                  className="dropdown-item w-full text-red-600 hover:bg-red-50"
                >
                  <LogOut size={15} />
                  {t('header.logout')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showPasswordModal && <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />}
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(224);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    if (collapsed) return;
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const diff = e.clientX - startX.current;
    const newWidth = Math.min(Math.max(startWidth.current + diff, 160), 320);
    setSidebarWidth(newWidth);
  };

  const onMouseUp = () => {
    if (!isResizing.current) return;
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [sidebarWidth]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} sidebarWidth={sidebarWidth} />

      <div
        className="flex-1 flex flex-col transition-all duration-200"
        style={{ marginLeft: collapsed ? '4rem' : `${sidebarWidth}px` }}
      >
        {!collapsed && (
          <div
            onMouseDown={onMouseDown}
            className="absolute top-0 bottom-0 z-40 w-1 cursor-col-resize hover:bg-blue-300 active:bg-blue-400 transition-colors"
            style={{ left: collapsed ? '4rem' : `${sidebarWidth}px` }}
          />
        )}

        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
