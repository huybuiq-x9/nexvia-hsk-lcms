import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import client from '../../services/apiClient';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await client.post('/auth/forgot-password', { email });
    } catch {
      // always show success to prevent email enumeration
    } finally {
      setLoading(false);
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 flex items-center justify-center p-4">
        <div className="fixed right-4 top-4 z-10">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('auth.forgot.checkEmail')}</h1>
          <p className="text-sm text-slate-500 mb-6">{t('auth.forgot.emailSent')}</p>
          <Link to="/" className="btn btn-primary">{t('auth.backToLogin')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 flex items-center justify-center p-4">
      <div className="fixed right-4 top-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-md">
            <span className="text-white font-bold text-lg">NX</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t('auth.forgot.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('auth.forgot.subtitle')}</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.email')}</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="input pl-9"
                  required
                  autoFocus
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="btn btn-primary w-full justify-center py-2.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                t('auth.forgot.sendLink')
              )}
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors">
              <ArrowLeft size={14} />
              {t('auth.backToLogin')}
            </Link>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">{t('app.footer')}</p>
      </div>
    </div>
  );
}
