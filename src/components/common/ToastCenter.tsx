import React from 'react';
import { useLiveTelemetry, ToastItem } from '../../hooks/useWebSocket';

export const ToastCenter: React.FC = () => {
  const { toasts, dismissToast } = useLiveTelemetry();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-18 right-4 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';
        const isSuccess = toast.type === 'success';

        const borderColor = isError
          ? 'border-rose-500/80 bg-rose-950/90 shadow-rose-950/80'
          : isWarning
          ? 'border-amber-500/80 bg-amber-950/90 shadow-amber-950/80'
          : isSuccess
          ? 'border-emerald-500/80 bg-emerald-950/90 shadow-emerald-950/80'
          : 'border-blue-500/70 bg-[#0B132B]/95 shadow-blue-950/80';

        const icon = isError
          ? 'gpp_bad'
          : isWarning
          ? 'warning'
          : isSuccess
          ? 'check_circle'
          : 'info';

        const iconColor = isError
          ? 'text-rose-400 animate-pulse'
          : isWarning
          ? 'text-amber-400'
          : isSuccess
          ? 'text-emerald-400'
          : 'text-blue-400';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-right-4 fade-in ${borderColor}`}
          >
            <span className={`material-symbols-outlined text-xl flex-shrink-0 mt-0.5 ${iconColor}`}>
              {icon}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white leading-snug">{toast.title}</p>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-tight line-clamp-2">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Dismiss notification"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastCenter;
