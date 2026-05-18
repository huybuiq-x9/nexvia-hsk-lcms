import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  HelpCircle,
  Users,
  Bell,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  LogOut,
  Layers,
  KeyRound,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useBreadcrumbs } from '../../contexts/BreadcrumbContext';
import { API_ROLE, type ApiRole } from '../../types/api';
import { userService } from '../../services';
import { LanguageSwitcher } from '../LanguageSwitcher';

interface NavSubItem {
  labelKey: string;
  to: string;
  icon: React.ReactNode;
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

const ROLE_ICON_COLOR: Record<ApiRole, string> = {
  [API_ROLE.ADMIN]:     'bg-blue-600',
  [API_ROLE.EXPERT]:    'bg-purple-600',
  [API_ROLE.TEACHER]:   'bg-emerald-600',
  [API_ROLE.CONVERTER]: 'bg-cyan-600',
};

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
  const { user, isAdmin, isExpert } = useAuth();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['/courses']));

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
        { labelKey: 'nav.courses', to: '/courses', icon: <BookOpen size={14} />, expertOnly: true },
        { labelKey: 'nav.lessons', to: '/lessons', icon: <FileText size={14} /> },
        { labelKey: 'nav.subLessons', to: '/sub-lessons', icon: <Layers size={14} /> },
      ],
    },
    { to: '/question-bank', icon: <HelpCircle size={18} />, labelKey: 'nav.questionBank' },
    { to: '/users', icon: <Users size={18} />, labelKey: 'nav.users', adminOnly: true },
    { to: '/notifications', icon: <Bell size={18} />, labelKey: 'nav.notifications' },
  ];

  const { isTeacher, isConverter } = useAuth();
  const isOnlyTeacherConverter =
    !isAdmin && !isExpert && (isTeacher || isConverter);
  const navItems = baseNavItems.filter(item => {
    if (item.adminOnly) return isAdmin;
    if (isOnlyTeacherConverter) return item.to === '/dashboard' || item.to === '/courses';
    return true;
  });

  const isActive = (to: string) =>
    window.location.pathname === to || window.location.pathname.startsWith(to + '/');

  const userRoles = (user?.roles ?? []) as ApiRole[];

  return (
    <aside
      className="fixed top-0 left-0 h-full z-30 flex flex-col border-r border-blue-200/60 transition-all duration-200"
      style={{
        width: collapsed ? '4rem' : `${sidebarWidth}px`,
        background: 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 60%, #93c5fd 100%)',
      }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-blue-200/60 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
              <span className="text-white font-bold text-xs">NX</span>
            </div>
            <div className="text-sm font-bold text-blue-900 leading-tight">{t('app.brand')}</div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center mx-auto shadow-sm shadow-blue-200">
            <span className="text-white font-bold text-xs">NX</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded flex items-center justify-center hover:bg-blue-200/50 text-blue-400 hover:text-blue-700 transition-colors ${collapsed ? 'mx-auto mt-1' : ''}`}
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
                  `relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-white/70 text-blue-700 shadow-sm shadow-blue-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                {({ isActive: active }) => (
                  <>
                    {active && !collapsed && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-blue-500" />
                    )}
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && <span>{t(item.labelKey)}</span>}
                  </>
                )}
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
            <div key={groupKey}>
              <button
                onClick={() => toggleGroup(groupKey)}
                className={`relative w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  hasActiveChild
                    ? 'bg-white/70 text-blue-700 shadow-sm shadow-blue-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                {hasActiveChild && !collapsed && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-blue-500" />
                )}
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{t(item.labelKey)}</span>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                    />
                  </>
                )}
              </button>

              {!collapsed && isOpen && (
                <div className="mt-0.5 ml-3 pl-3 border-l-2 border-blue-200 space-y-0.5">
                  {visibleChildren.map(child => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end
                      className={({ isActive: active }) =>
                        `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                          active
                            ? 'text-blue-700 bg-white/70'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                        }`
                      }
                    >
                      {({ isActive: active }) => (
                        <>
                          <span className={`shrink-0 transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                            {child.icon}
                          </span>
                          <span>{t(child.labelKey)}</span>
                        </>
                      )}
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
        <div className="border-t border-blue-200/60 p-3 shrink-0 space-y-2">
          {/* Roles display */}
          {!collapsed && userRoles.length > 0 && (
            <div className="flex flex-wrap gap-1 px-1">
              {userRoles.map(role => (
                <span
                  key={role}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${ROLE_ICON_COLOR[role]}`}
                >
                  {t(`roles.${role}`)}
                </span>
              ))}
            </div>
          )}

          {/* User info */}
          {collapsed ? (
            <div className="flex justify-center">
              <div
                className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shadow-sm"
                title={user.full_name}
              >
                <span className="text-xs font-bold text-blue-600">{user.full_name[0]?.toUpperCase()}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-blue-600">
                  {user.full_name[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{user.full_name}</p>
                <p className="text-[10px] text-slate-500 truncate leading-tight">{user.email}</p>
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
  const { user, logout } = useAuth();
  const { breadcrumbs, pageTitle, pageSubtitle } = useBreadcrumbs();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const closeDropdown = () => setShowDropdown(false);

  return (
    <header className="sticky top-0 z-20 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {pageTitle ? (
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate leading-none">{pageTitle}</h1>
            {pageSubtitle && (
              <span className="text-xs text-slate-400 truncate hidden sm:block">{pageSubtitle}</span>
            )}
          </div>
        ) : breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 text-sm text-slate-500 overflow-hidden">
            {breadcrumbs.map((item, idx) => (
              <span key={idx} className="flex items-center gap-1.5 shrink-0">
                {idx > 0 && <ChevronRight size={14} className="text-slate-300" />}
                {item.href ? (
                  <a
                    href={item.href}
                    onClick={(e) => { e.preventDefault(); navigate(item.href!); }}
                    className="hover:text-slate-700 transition-colors truncate max-w-[180px]"
                    title={item.label}
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className="text-slate-700 font-medium truncate max-w-[180px]" title={item.label}>
                    {item.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
      </div>

      <div className="flex items-center gap-2 shrink-0">
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
        <main className="flex-1 overflow-auto bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_50%,#f7fbf8_100%)] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
