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
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-md w-full glass-panel bg-[#090D18]/95 border-l border-slate-700/80 shadow-2xl p-5 flex flex-col text-white animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-rose-400 text-2xl">notifications_active</span>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Emergency Alert Drawer
              </h2>
              <p className="text-[10px] text-slate-400">Live SOC Notification & Threat Queue</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 py-3 border-b border-slate-800/80">
          {(['ALL', 'FRAUD', 'RECOVERY', 'TRANSACTIONS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Alerts & Items List */}
        <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1">
          {filter !== 'TRANSACTIONS' && rawAlerts.map((alert: any) => {
            const isCrit = alert.severity === 'CRITICAL' || alert.severity === 'critical';
            const isHigh = alert.severity === 'HIGH' || alert.severity === 'high';

            return (
              <div
                key={alert.id || alert.alert_id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isCrit
                    ? 'bg-rose-950/40 border-rose-500/50'
                    : isHigh
                    ? 'bg-amber-950/40 border-amber-500/50'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {alert.alert_id || 'ALERT'}
                  </span>
                  <span
                    className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                      isCrit
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : isHigh
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>

                <p className="text-xs font-bold text-white mt-1">{alert.alert_type || 'Suspicious Pattern'}</p>
                <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                  {alert.description}
                </p>

                <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/flow`);
                    }}
                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">route</span>
                    Trace in Graph
                  </button>

                  <button
                    onClick={() => freezeAccount(alert.account_id || 'ACC1001')}
                    className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    Freeze Node
                  </button>
                </div>
              </div>
            );
          })}

          {filter === 'TRANSACTIONS' && liveTransactions.map((tx: any, idx: number) => (
            <div
              key={tx.id || idx}
              className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-white">
                  {tx.source_name} → {tx.target_name}
                </p>
                <p className="text-[10px] font-mono text-slate-400">{tx.transaction_id}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono font-extrabold text-purple-300">{formatCurrency(tx.amount)}</p>
                <span className="text-[9px] font-mono text-slate-400">{tx.risk_score}% Risk</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmergencyAlertDrawer;
