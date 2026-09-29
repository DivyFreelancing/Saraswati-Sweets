import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, ToastType } from '../../context/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-5 h-5 text-[#2E7D4F] shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-[#B3261E] shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-[#B8781E] shrink-0" />,
    info: <Info className="w-5 h-5 text-[#8A1538] shrink-0" />,
  };

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl bg-white border border-[#E8DFD2] shadow-[0_10px_25px_-5px_rgba(31,27,22,0.15)] animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-center gap-3">
            {icons[toast.type]}
            <p className="text-sm font-medium text-[#1F1B16] leading-snug">
              {toast.message}
            </p>
          </div>

          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            aria-label="Close notification"
            className="text-[#6B6258] hover:text-[#1F1B16] p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
