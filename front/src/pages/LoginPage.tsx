import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, error, clearError } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    try {
      await login(email, password);
      success(t('auth.loginSuccess'));
      navigate('/home');
    } catch {
      // error shown via AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-md">
            <span className="text-white font-bold text-lg">HSK</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t('app.brand')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('auth.loginTitle')}</p>
        </div>

        {/* Form card */}
        <div className="card p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.email')}</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearError(); }}
                  placeholder={t('auth.emailPlaceholder')}
                  className="input pl-9"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label">{t('auth.password')}</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearError(); }}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="input pl-9 pr-9"
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

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="btn btn-primary w-full justify-center py-2.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t('auth.loggingIn')}</>
              ) : (
                t('auth.login')
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          {t('app.footer')}
        </p>
      </div>
    </div>
  );
}
