import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { authService, userService } from '../services';
import { API_ROLE, type ApiRole, type ApiUserWithRoles } from '../types/api';

interface AuthState {
  user: ApiUserWithRoles | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectRole: (role: ApiRole) => void;
  selectedRole: ApiRole | null;
  isAdmin: boolean;
  isExpert: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [selectedRole, setSelectedRole] = useState<ApiRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }
    userService.getMe()
      .then(user => {
        const primary = (user.roles[0] as ApiRole) || null;
        setState({ user, isAuthenticated: true, isLoading: false });
        setSelectedRole(primary);
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setState(s => ({ ...s, isLoading: false }));
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const { user, tokens } = await authService.login(email, password);
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
      const primary = (user.roles[0] as ApiRole) || null;
      setState({ user, isAuthenticated: true, isLoading: false });
      setSelectedRole(primary);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || t('auth.loginFailed');
      setError(msg);
      throw new Error(msg);
    }
  }, [t]);

  const logout = useCallback(async () => {
    try {
      const rt = localStorage.getItem('refresh_token');
      await authService.logout(rt ?? undefined);
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setState({ user: null, isAuthenticated: false, isLoading: false });
      setSelectedRole(null);
    }
  }, []);

  const selectRole = useCallback((role: ApiRole) => setSelectedRole(role), []);
  const clearError = useCallback(() => setError(null), []);

  const isAdmin = state.user?.roles.includes(API_ROLE.ADMIN) ?? false;
  const isExpert = state.user?.roles.includes(API_ROLE.EXPERT) ?? false;

  return (
    <AuthContext.Provider
      value={{
        ...state,
        selectedRole,
        login,
        logout,
        selectRole,
        isAdmin,
        isExpert,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
