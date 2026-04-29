import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const success = useCallback((title: string, msg?: string) => addToast('success', title, msg), [addToast]);
  const error = useCallback((title: string, msg?: string) => addToast('error', title, msg), [addToast]);
  const info = useCallback((title: string, msg?: string) => addToast('info', title, msg), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={id => setToasts(prev => prev.filter(x => x.id !== id))} />)}
      </div>
    </ToastContext.Provider>
  );
}

const ICONS = {
  success: <CheckCircle2 size={18} className="text-green-600 shrink-0" />,
  error:   <XCircle    size={18} className="text-red-600   shrink-0" />,
  info:    <Info        size={18} className="text-blue-600  shrink-0" />,
};
const STYLES = {
  success: 'bg-green-50 border-green-200',
  error:   'bg-red-50   border-red-200',
  info:    'bg-blue-50  border-blue-200',
};
const TITLE_COLORS = { success: 'text-green-900', error: 'text-red-900', info: 'text-blue-900' };
const MSG_COLORS  = { success: 'text-green-700', error: 'text-red-700', info: 'text-blue-700' };

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg min-w-72 max-w-sm ${STYLES[toast.type]}`}
      style={{ animation: 'slideInRight 0.25s ease-out' }}
    >
      {ICONS[toast.type]}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${TITLE_COLORS[toast.type]}`}>{toast.title}</p>
        {toast.message && <p className={`text-xs mt-0.5 ${MSG_COLORS[toast.type]}`}>{toast.message}</p>}
      </div>
      <button onClick={() => onDismiss(toast.id)} className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/5">
        <X size={14} className="text-slate-400" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
