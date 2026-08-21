import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlerts } from '../../hooks/useAlerts';
import { useLiveTelemetry } from '../../hooks/useWebSocket';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface EmergencyAlertDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyAlertDrawer: React.FC<EmergencyAlertDrawerProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'FRAUD' | 'RECOVERY' | 'TRANSACTIONS'>('ALL');
  const { data: alertsData } = useAlerts({ limit: 20 });
  const { liveTransactions, freezeAccount } = useLiveTelemetry();

  if (!isOpen) return null;

  const rawAlerts = Array.isArray(alertsData) ? alertsData : (alertsData as any)?.alerts || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 transition-opacity" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white border-l border-gray-200 shadow-elevated p-5 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600 text-xl">notifications_active</span>
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-gray-900">
                Alert Center
              </h2>
              <p className="text-[11px] text-gray-500">Live threat notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 py-3 border-b border-gray-100">
          {(['ALL', 'FRAUD', 'RECOVERY', 'TRANSACTIONS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-blue-600 text-gray-900 shadow-sm'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Alerts & Items List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-4 pr-1">
          {filter !== 'TRANSACTIONS' && rawAlerts.map((alert: any) => {
            const isCrit = alert.severity === 'CRITICAL' || alert.severity === 'critical';
            const isHigh = alert.severity === 'HIGH' || alert.severity === 'high';

            return (
              <div
                key={alert.id || alert.alert_id}
                className={`p-3.5 rounded-xl bg-white border transition-all hover:shadow-card-hover ${
                  isCrit
                    ? 'border-l-[3px] border-l-red-500 border-gray-200'
                    : isHigh
                    ? 'border-l-[3px] border-l-amber-500 border-gray-200'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-semibold text-gray-400">
                    {alert.alert_id || 'ALERT'}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      isCrit
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : isHigh
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>

                <p className="text-[13px] font-semibold text-gray-900 mt-1.5">{alert.alert_type || 'Suspicious Pattern'}</p>
                <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {alert.description}
                </p>

                <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/flow`);
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">route</span>
                    Trace in Graph
                  </button>

                  <button
                    onClick={() => freezeAccount(alert.account_id || 'ACC1001')}
                    className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-gray-900 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Freeze Account
                  </button>
                </div>
              </div>
            );
          })}

          {filter === 'TRANSACTIONS' && liveTransactions.map((tx: any, idx: number) => (
            <div
              key={tx.id || idx}
              className="p-3.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between hover:shadow-card-hover transition-shadow"
            >
              <div>
                <p className="text-[13px] font-semibold text-gray-900">
                  {tx.source_name} → {tx.target_name}
                </p>
                <p className="text-[11px] font-mono text-gray-400">{tx.transaction_id}</p>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-mono font-bold text-gray-900">{formatCurrency(tx.amount)}</p>
                <span className={`text-[10px] font-semibold ${tx.risk_score >= 60 ? 'text-red-600' : 'text-gray-400'}`}>
                  {tx.risk_score}% Risk
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmergencyAlertDrawer;
