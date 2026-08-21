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
          ? 'border-l-red-500'
          : isWarning
          ? 'border-l-amber-500'
          : isSuccess
          ? 'border-l-green-500'
          : 'border-l-blue-500';

        const icon = isError
          ? 'gpp_bad'
          : isWarning
          ? 'warning'
          : isSuccess
          ? 'check_circle'
          : 'info';

        const iconColor = isError
          ? 'text-red-500'
          : isWarning
          ? 'text-amber-500'
          : isSuccess
          ? 'text-green-500'
          : 'text-blue-500';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 bg-white rounded-xl border border-gray-200 border-l-[3px] ${borderColor} shadow-elevated flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-right-4 fade-in`}
          >
            <span className={`material-symbols-outlined text-xl flex-shrink-0 mt-0.5 ${iconColor}`}>
              {icon}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 leading-snug">{toast.title}</p>
              <p className="text-[12px] text-gray-500 mt-0.5 leading-tight line-clamp-2">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Dismiss notification"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastCenter;
