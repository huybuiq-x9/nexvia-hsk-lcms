import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  UserPlus,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Plus,
} from 'lucide-react';
import { userService } from '../services';
import { useToast } from '../contexts/ToastContext';
import type { ApiUserWithRoles, ApiRole, ApiUserCreate } from '../types/api';
import { ROLE_COLORS } from '../types/api';

const PER_PAGE = 10;

const ROLES: ApiRole[] = ['admin', 'teacher', 'expert', 'converter'];

const UserModal = ({
  user,
  onClose,
  onSaved,
}: {
  user?: ApiUserWithRoles;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const { t } = useTranslation();
  const { success } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: user?.email ?? '',
    full_name: user?.full_name ?? '',
    password: '',
    roles: user?.roles ?? ([] as ApiRole[]),
    is_active: user?.is_active ?? true,
  });

  const toggleRole = (role: ApiRole) => {
    setForm(f => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.full_name || (!user && !form.password)) {
      setError(t('users.modal.validationRequired'));
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      if (user) {
        await userService.updateUser(user.id, { full_name: form.full_name, is_active: form.is_active });
        for (const role of ROLES) {
          const hasRole = user.roles.includes(role);
          const wantsRole = form.roles.includes(role);
          if (!hasRole && wantsRole) {
            await userService.assignRole(user.id, role);
          } else if (hasRole && !wantsRole) {
            await userService.revokeRole(user.id, role);
          }
        }
      } else {
        await userService.createUser({
          email: form.email,
          full_name: form.full_name,
          password: form.password,
          roles: form.roles,
        } as ApiUserCreate);
      }
      success(user ? t('users.modal.updateSuccess') : t('users.modal.createSuccess'));
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || t('users.modal.errorGeneric');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto">

        <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 bg-white">
          <h2 className="text-base font-semibold text-slate-900">
            {user ? t('users.modal.editTitle') : t('users.modal.createTitle')}
          </h2>
          <button onClick={onClose} className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="label">{t('auth.email')} <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              disabled={!!user}
              placeholder={t('auth.emailPlaceholder')}
              className={`input ${user ? 'bg-slate-50 cursor-not-allowed' : ''}`}
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="label">{t('users.modal.fullName')} <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder={t('users.modal.fullNamePlaceholder')}
              className="input"
              autoComplete="off"
              required
            />
          </div>

          {!user && (
            <div>
              <label className="label">{t('auth.password')} <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={t('users.modal.passwordPlaceholder')}
                  className="input pr-9"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {!user && (
            <div>
              <label className="label">{t('users.modal.roles')}</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ROLES.map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      form.roles.includes(role)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    {t(`roles.${role}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {user && (
            <div className="flex items-center gap-2">
              <label className="label mb-0">{t('users.modal.status')}</label>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  form.is_active ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    form.is_active ? 'translate-x-[18px]' : 'translate-x-[5px]'
                  }`}
                />
              </button>
              <span className={`text-xs font-medium ${form.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                {form.is_active ? t('users.active') : t('users.inactive')}
              </span>
            </div>
          )}

          {user && (
            <div>
              <label className="label">{t('users.modal.roles')}</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ROLES.map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      form.roles.includes(role)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    {t(`roles.${role}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : user ? t('users.modal.submitEdit') : t('users.modal.submitCreate')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DeleteModal = ({
  user,
  onClose,
  onDeleted,
}: {
  user: ApiUserWithRoles;
  onClose: () => void;
  onDeleted: () => void;
}) => {
  const { t } = useTranslation();
  const { success } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await userService.deleteUser(user.id);
      success(t('users.deleteModal.success'));
      onDeleted();
    } catch {
      // handled
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-auto">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Trash2 size={20} className="text-red-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-2">{t('users.deleteModal.title')}</h2>
          <p className="text-sm text-slate-500">
            {t('users.deleteModal.confirm', { name: user.full_name })}
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn btn-secondary flex-1 justify-center">
            {t('users.deleteModal.cancel')}
          </button>
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="btn btn-danger flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : t('users.deleteModal.confirmDelete')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState<ApiUserWithRoles[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<ApiRole | ''>('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [editUser, setEditUser] = useState<ApiUserWithRoles | undefined>();
  const [deleteUser, setDeleteUser] = useState<ApiUserWithRoles | undefined>();
  const [modalKey, setModalKey] = useState(0);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    setPage(1);
  }, [search, roleFilter]);

  useEffect(() => {
    let cancelled = false;
    userService
      .listUsers({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE, search: search || undefined, role: roleFilter || undefined })
      .then(res => { if (!cancelled) { setUsers(res.items); setTotal(res.total); } })
      .catch(() => { if (!cancelled) setUsers([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; setIsLoading(false); };
  }, [page, search, roleFilter]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">{t('users.title')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{t('users.subtitle')}</p>
        </div>
        <button
          onClick={() => { setModalKey(k => k + 1); setEditUser({} as ApiUserWithRoles); }}
          className="btn btn-primary w-full sm:w-auto flex justify-center gap-1.5"
        >
          <Plus size={15} className="sm:hidden" />
          <UserPlus size={15} className="hidden sm:block" />
          <span className="sm:hidden">{t('users.add')}</span>
          <span className="hidden sm:inline">{t('users.add')}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('users.search')}
              className="input pl-8 pr-3"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as ApiRole | '')}
            className="input sm:w-auto w-full"
          >
            <option value="">{t('users.allRoles')}</option>
            {ROLES.map(r => (
              <option key={r} value={r}>{t(`roles.${r}`)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table — desktop / card list — mobile */}
      <div className="card overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('users.columnUser')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('users.columnRoles')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('users.columnStatus')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">{t('users.columnCreatedAt')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('users.columnActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                    <div className="flex justify-center">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                    {t('users.noResults')}
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-blue-600">{user.full_name[0]?.toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{user.full_name}</p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length > 0 ? (
                          user.roles.map(role => (
                            <span
                              key={role}
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[role as ApiRole]}`}
                            >
                              {t(`roles.${role}`)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        user.is_active ? 'text-green-600' : 'text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                        {user.is_active ? t('users.active') : t('users.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">
                      {new Date(user.created_at).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditUser(user)}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          title={t('users.edit')}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteUser(user)}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title={t('users.delete')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">{t('users.noResults')}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map(user => (
                <div key={user.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">{user.full_name[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-slate-800 text-sm truncate">{user.full_name}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditUser(user)}
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            title={t('users.edit')}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteUser(user)}
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title={t('users.delete')}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {user.roles.length > 0 ? (
                          user.roles.map(role => (
                            <span
                              key={role}
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[role as ApiRole]}`}
                            >
                              {t(`roles.${role}`)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          user.is_active ? 'text-green-600' : 'text-slate-400'
                        } ml-auto`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                          {user.is_active ? t('users.active') : t('users.inactive')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-3 sm:px-4 py-3 border-t border-slate-200 flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
            <p className="text-xs text-slate-400 text-center xs:text-left">
              {t('users.showing', { from: (page - 1) * PER_PAGE + 1, to: Math.min(page * PER_PAGE, total), total })}
            </p>
            <div className="flex items-center justify-center xs:justify-end gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-slate-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
                        page === p ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {editUser !== undefined && (
        <UserModal
          key={editUser ? (editUser.id ? editUser.id : `new-${modalKey}`) : undefined}
          user={editUser?.id ? editUser : undefined}
          onClose={() => setEditUser(undefined)}
          onSaved={() => { setEditUser(undefined); setPage(1); }}
        />
      )}
      {deleteUser && (
        <DeleteModal
          user={deleteUser}
          onClose={() => setDeleteUser(undefined)}
          onDeleted={() => { setDeleteUser(undefined); setPage(1); }}
        />
      )}
    </div>
  );
}
