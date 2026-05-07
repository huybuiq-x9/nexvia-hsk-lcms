import type { ReactNode } from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
  icon?: ReactNode;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel = 'common.cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  loading = false,
  icon,
}: ConfirmModalProps) {
  const variantClass = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
    default: 'btn-primary',
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-auto">
        <div className="p-6 text-center">
          {icon && (
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              {icon}
            </div>
          )}
          <h2 className="text-base font-semibold text-slate-900 mb-2">{title}</h2>
          <p className="text-sm text-slate-500">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onCancel} className="btn btn-secondary flex-1 justify-center">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`btn flex-1 justify-center disabled:opacity-50 ${variantClass}`}
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
