import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';

export interface FraudNotification {
  id: string;
  account: string;
  user_name?: string;
  amount: number;
  risk_score: number;
  rules_triggered: string[];
  recovery_probability: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: string;
}

export interface FraudAlertCenterProps {
  onInvestigateAccount: (accountId: string) => void;
  onFreezeAccount?: (accountId: string) => void;
  demoMode?: boolean;
}

export const FraudAlertCenter: React.FC<FraudAlertCenterProps> = ({
  onInvestigateAccount,
  onFreezeAccount,
  demoMode = false,
}) => {
  const [alerts, setAlerts] = useState<FraudNotification[]>([]);

  // Demo mode simulated fraud alerts
  useEffect(() => {
    if (!demoMode) return;

    const interval = setInterval(() => {
      const demoAlerts: FraudNotification[] = [
        {
          id: `ALERT_${Date.now()}`,
          account: 'ACC1005',
          user_name: 'Rahul Sharma',
          amount: 500000,
          risk_score: 95,
          rules_triggered: ['High Velocity Structuring', 'Rapid Mule Funnel', 'Geographic Hop Mismatch'],
          recovery_probability: 'LOW',
          timestamp: new Date().toISOString(),
        },
        {
          id: `ALERT_${Date.now() + 1}`,
          account: 'ACC_RING_B',
          user_name: 'Karan Verma',
          amount: 240000,
          risk_score: 88,
          rules_triggered: ['Circular Chain Participant', 'Immediate Fund Dispersion'],
          recovery_probability: 'MEDIUM',
          timestamp: new Date().toISOString(),
        },
      ];

      const newAlert = demoAlerts[Math.floor(Math.random() * demoAlerts.length)];
      setAlerts(prev => [newAlert, ...prev.slice(0, 2)]);
    }, 12000);

    return () => clearInterval(interval);
  }, [demoMode]);

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-auto">
      {alerts.map(alert => {
        const isCritical = alert.risk_score >= 90;

        return (
          <div
            key={alert.id}
            className={`p-4 rounded-2xl backdrop-blur-xl border shadow-2xl animate-in slide-in-from-right-5 duration-300 ${
              isCritical
                ? 'bg-[#180808]/95 border-red-500/80 shadow-red-950/60 ring-2 ring-red-500/50'
                : 'bg-[#1A1005]/95 border-amber-500/80 shadow-amber-950/60'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isCritical ? 'bg-red-500 animate-ping' : 'bg-amber-400'
                  }`}
                />
                <h4
                  className={`text-xs font-black uppercase tracking-wider ${
                    isCritical ? 'text-red-400' : 'text-amber-400'
                  }`}
                >
                  {isCritical ? '🚨 CRITICAL FRAUD EVENT' : '⚠️ SUSPICIOUS ACTIVITY'}
                </h4>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Account & Amount info */}
            <div className="flex items-center justify-between text-xs mb-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Flagged Account</span>
                <span className="font-mono font-bold text-white text-sm">{alert.account}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Amount At Risk</span>
                <span className="font-mono font-bold text-red-400 text-sm">{formatCurrency(alert.amount)}</span>
              </div>
            </div>

            {/* Rules Triggered */}
            <div className="mb-3 space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                Rules Triggered:
              </span>
              <div className="flex flex-wrap gap-1">
                {alert.rules_triggered.map((rule, idx) => (
                  <span
                    key={idx}
                    className="text-[8px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                  >
                    {rule}
                  </span>
                ))}
              </div>
            </div>

            {/* Recovery Status */}
            <div className="flex items-center justify-between text-[10px] mb-3 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400">Recovery Probability:</span>
              <span
                className={`font-mono font-extrabold ${
                  alert.recovery_probability === 'HIGH'
                    ? 'text-emerald-400'
                    : alert.recovery_probability === 'MEDIUM'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {alert.recovery_probability}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onInvestigateAccount(alert.account);
                  dismissAlert(alert.id);
                }}
                className="flex-1 py-1.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-[11px] rounded-xl shadow-lg transition-all"
              >
                Investigate Now
              </button>

              {onFreezeAccount && (
                <button
                  onClick={() => {
                    onFreezeAccount(alert.account);
                    dismissAlert(alert.id);
                  }}
                  className="px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-bold text-[11px] rounded-xl transition-all"
                >
                  Freeze
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FraudAlertCenter;
