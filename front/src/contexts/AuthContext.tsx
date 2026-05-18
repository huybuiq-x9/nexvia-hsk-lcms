import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { authService, userService } from '../services';
import { API_ROLE, type ApiUserWithRoles } from '../types/api';

interface AuthState {
  user: ApiUserWithRoles | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isExpert: boolean;
  isTeacher: boolean;
  isConverter: boolean;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }
    userService.getMe()
      .then(user => {
        setState({ user, isAuthenticated: true, isLoading: false });
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
      setState({ user, isAuthenticated: true, isLoading: false });
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
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const isAdmin = state.user?.roles.includes(API_ROLE.ADMIN) ?? false;
  const isExpert = state.user?.roles.includes(API_ROLE.EXPERT) ?? false;
  const isTeacher = state.user?.roles.includes(API_ROLE.TEACHER) ?? false;
  const isConverter = state.user?.roles.includes(API_ROLE.CONVERTER) ?? false;

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        isAdmin,
        isExpert,
        isTeacher,
        isConverter,
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
