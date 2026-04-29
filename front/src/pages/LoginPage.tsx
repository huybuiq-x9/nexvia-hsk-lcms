import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function LoginPage() {
  const { login, error, clearError } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    try {
      await login(email, password);
      success('Đăng nhập thành công!');
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
          <h1 className="text-2xl font-bold text-slate-900">HSK LCMS</h1>
          <p className="text-sm text-slate-500 mt-1">Đăng nhập để tiếp tục</p>
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
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearError(); }}
                  placeholder="email@hsk-lcms.vn"
                  className="input pl-9"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label">Mật khẩu</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearError(); }}
                  placeholder="Nhập mật khẩu"
                  className="input pl-9"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="btn btn-primary w-full justify-center py-2.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang đăng nhập...</>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          HSK LCMS — Learning Content Management System
        </p>
      </div>
    </div>
  );
}
