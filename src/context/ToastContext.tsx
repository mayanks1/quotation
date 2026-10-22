import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, Trash2, HelpCircle } from 'lucide-react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export type ToastOptions = string | { duration?: number; title?: string };

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, titleOrOptions?: ToastOptions) => void;
  success: (message: string, titleOrOptions?: ToastOptions) => void;
  error: (message: string, titleOrOptions?: ToastOptions) => void;
  warning: (message: string, titleOrOptions?: ToastOptions) => void;
  info: (message: string, titleOrOptions?: ToastOptions) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  useLockBodyScroll(Boolean(confirmDialog?.isOpen));

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', titleOrOptions?: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      let duration = type === 'error' ? 5000 : 3800;
      let title: string | undefined = undefined;

      if (typeof titleOrOptions === 'string') {
        title = titleOrOptions;
      } else if (titleOrOptions && typeof titleOrOptions === 'object') {
        if (typeof titleOrOptions.title === 'string') {
          title = titleOrOptions.title;
        }
        if (typeof titleOrOptions.duration === 'number' && titleOrOptions.duration > 0) {
          duration = titleOrOptions.duration;
        }
      }

      setToasts((prev) => [...prev, { id, message, title, type, duration }]);

      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  const success = useCallback((msg: string, opt?: ToastOptions) => showToast(msg, 'success', opt), [showToast]);
  const error = useCallback((msg: string, opt?: ToastOptions) => showToast(msg, 'error', opt), [showToast]);
  const warning = useCallback((msg: string, opt?: ToastOptions) => showToast(msg, 'warning', opt), [showToast]);
  const info = useCallback((msg: string, opt?: ToastOptions) => showToast(msg, 'info', opt), [showToast]);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirmAction = (result: boolean) => {
    if (confirmDialog) {
      confirmDialog.resolve(result);
      setConfirmDialog(null);
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, confirm }}>
      {children}

      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all animate-toast-in ${
              t.type === 'success'
                ? 'bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-950/30'
                : t.type === 'error'
                ? 'bg-slate-900/95 text-white border-rose-500/40 shadow-rose-950/30'
                : t.type === 'warning'
                ? 'bg-slate-900/95 text-white border-amber-500/40 shadow-amber-950/30'
                : 'bg-slate-900/95 text-white border-blue-500/40 shadow-blue-950/30'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' && <CheckCircle2 size={19} className="text-emerald-400" />}
              {t.type === 'error' && <AlertCircle size={19} className="text-rose-400" />}
              {t.type === 'warning' && <AlertTriangle size={19} className="text-amber-400" />}
              {t.type === 'info' && <Info size={19} className="text-blue-400" />}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {typeof t.title === 'string' && t.title && (
                <div className="text-xs font-bold tracking-tight text-white mb-0.5">{t.title}</div>
              )}
              <div className="text-xs font-medium text-slate-200 leading-snug">{t.message}</div>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 -mr-1 -mt-1"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-md w-full p-6 animate-modal-in space-y-4">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmDialog.options.variant === 'danger'
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : confirmDialog.options.variant === 'warning'
                    ? 'bg-amber-50 text-amber-600 border border-amber-200'
                    : 'bg-blue-50 text-blue-600 border border-blue-200'
                }`}
              >
                {confirmDialog.options.variant === 'danger' ? (
                  <Trash2 size={24} />
                ) : confirmDialog.options.variant === 'warning' ? (
                  <AlertTriangle size={24} />
                ) : (
                  <HelpCircle size={24} />
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {confirmDialog.options.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {confirmDialog.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleConfirmAction(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
              >
                {confirmDialog.options.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => handleConfirmAction(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
                  confirmDialog.options.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                    : confirmDialog.options.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
                }`}
              >
                {confirmDialog.options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const useConfirm = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ToastProvider');
  }
  return { confirm: context.confirm };
};
