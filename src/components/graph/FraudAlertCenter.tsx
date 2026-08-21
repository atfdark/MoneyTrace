import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useCriticalAlerts } from '../../hooks/useAlerts';
import { wsService } from '../../hooks/useWebSocket';

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
  alerts?: any[];
  demoMode?: boolean;
}

export const FraudAlertCenter: React.FC<FraudAlertCenterProps> = ({
  onInvestigateAccount,
  onFreezeAccount,
  alerts: propAlerts,
}) => {
  const { data: criticalData } = useCriticalAlerts(3);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [liveWebSocketAlerts, setLiveWebSocketAlerts] = useState<FraudNotification[]>([]);

  // Subscribe to real-time FRAUD_ALERT_CREATED events
  useEffect(() => {
    const unsub = wsService.subscribe('FRAUD_ALERT_CREATED', (alertData: any) => {
      const risk = Number(alertData.risk_score || 85);
      const newAlert: FraudNotification = {
        id: alertData.alert_id || `ws_alert_${Date.now()}`,
        account: alertData.account_number || alertData.account_id || 'FLAGGED_ACCOUNT',
        user_name: alertData.user_name || undefined,
        amount: Number(alertData.amount || 0),
        risk_score: risk,
        rules_triggered: Array.isArray(alertData.triggered_rules)
          ? alertData.triggered_rules
          : [alertData.alert_type || alertData.description || 'Behavioral Fraud Pattern'],
        recovery_probability: risk >= 85 ? 'LOW' : risk >= 60 ? 'MEDIUM' : 'HIGH',
        timestamp: alertData.created_at || new Date().toISOString(),
      };

      setLiveWebSocketAlerts(prev => [newAlert, ...prev.filter(a => a.id !== newAlert.id)].slice(0, 3));
    });

    return () => unsub();
  }, []);

  const activeAlerts: FraudNotification[] = useMemo(() => {
    const rawList = propAlerts || (criticalData as any)?.data || criticalData || [];
    const list = Array.isArray(rawList) ? rawList : (rawList?.items || []);

    const queryAlerts = list
      .filter((a: any) => {
        const id = String(a.id || a.alert_id || '');
        return id && !dismissedIds.has(id);
      })
      .map((a: any) => {
        const id = String(a.id || a.alert_id || `alert-${Math.random()}`);
        const risk = Number(a.risk_score || (a.severity === 'CRITICAL' ? 95 : a.severity === 'HIGH' ? 80 : 50));
        const rules = Array.isArray(a.triggered_rules)
          ? a.triggered_rules
          : Array.isArray(a.rules_triggered)
          ? a.rules_triggered
          : [a.alert_type || a.rule_name || 'Flagged Risk Telemetry'];

        const recoveryProb: 'HIGH' | 'MEDIUM' | 'LOW' =
          risk >= 85 ? 'LOW' : risk >= 60 ? 'MEDIUM' : 'HIGH';

        return {
          id,
          account: a.account_number || a.account || a.sender_account || 'ACC-LIVE',
          user_name: a.user_name || a.entity_name || undefined,
          amount: Number(a.amount || a.transaction?.amount || 0),
          risk_score: risk,
          rules_triggered: rules,
          recovery_probability: recoveryProb,
          timestamp: a.timestamp || a.created_at || new Date().toISOString(),
        };
      });

    // Merge WebSocket alerts first, then query alerts
    const all = [...liveWebSocketAlerts, ...queryAlerts];
    const uniqueMap = new Map<string, FraudNotification>();
    all.forEach(item => {
      if (!dismissedIds.has(item.id) && !uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });

    return Array.from(uniqueMap.values()).slice(0, 3);
  }, [propAlerts, criticalData, dismissedIds, liveWebSocketAlerts]);

  const dismissAlert = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    setLiveWebSocketAlerts(prev => prev.filter(a => a.id !== id));
  };

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-auto">
      {activeAlerts.map(alert => {
        const isCritical = alert.risk_score >= 80;

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
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="Dismiss alert"
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
                className="flex-1 py-1.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-[11px] rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Investigate Now
              </button>

              {onFreezeAccount && (
                <button
                  onClick={() => {
                    onFreezeAccount(alert.account);
                    dismissAlert(alert.id);
                  }}
                  className="px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-bold text-[11px] rounded-xl transition-all cursor-pointer"
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
