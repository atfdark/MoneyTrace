import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveTelemetry } from '../../hooks/useWebSocket';
import { formatCurrency } from '../../utils/formatters';

export const EmergencyInvestigationOverlay: React.FC = () => {
  const navigate = useNavigate();
  const { emergencyAlert, acknowledgeAlert, freezeAccount, soundAlarm } = useLiveTelemetry();
  const [isFreezing, setIsFreezing] = useState(false);
  const [isFrozenSuccess, setIsFrozenSuccess] = useState(false);

  if (!emergencyAlert) return null;

  const ai = emergencyAlert.ai_summary;
  const rules = emergencyAlert.rule_breakdown?.rules_triggered || ai?.triggered_rules || ['Large Transaction', 'Velocity Attack', 'Mule Forwarding'];

  const handleFreeze = async () => {
    setIsFreezing(true);
    try {
      const acc = emergencyAlert.account_id || 'ACC1001';
      await freezeAccount(acc, `Emergency freeze on Alert ${emergencyAlert.alert_id}`);
      setIsFrozenSuccess(true);
      setTimeout(() => {
        setIsFreezing(false);
      }, 1000);
    } catch (e) {
      setIsFreezing(false);
    }
  };

  const handleInvestigate = () => {
    acknowledgeAlert();
    navigate(`/flow`);
  };

  return (
    <>
      {/* ───── Full Screen Red Pulse Vignette ───── */}
      <div className="fixed inset-0 pointer-events-none z-40 animate-pulse border-8 border-rose-600/40 shadow-[inset_0_0_100px_rgba(225,29,72,0.35)]" />

      {/* ───── Emergency Modal / Floating Bar ───── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl animate-in slide-in-from-top-6 fade-in duration-300">
        <div className="glass-panel bg-[#0B0914]/95 border-2 border-rose-500 rounded-3xl p-5 shadow-[0_0_50px_rgba(225,29,72,0.6)] backdrop-blur-2xl text-white">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-rose-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center text-white animate-bounce shadow-lg shadow-rose-900/60">
                <span className="material-symbols-outlined text-2xl">e911_emergency</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black tracking-wider uppercase animate-pulse">
                    CRITICAL ALERT
                  </span>
                  <span className="text-xs font-mono text-rose-300 font-bold">{emergencyAlert.alert_id}</span>
                </div>
                <h3 className="text-sm font-extrabold text-white mt-0.5">
                  Automated Threat Interception Directive
                </h3>
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => soundAlarm.snooze(5)}
                className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-bold flex items-center gap-1 transition-colors"
                title="Silence Siren for 5 Minutes"
              >
                <span className="material-symbols-outlined text-xs">notifications_paused</span>
                Snooze 5m
              </button>
              <button
                onClick={() => soundAlarm.setMuted(!soundAlarm.getMuted())}
                className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                title="Mute Siren"
              >
                <span className="material-symbols-outlined text-sm">
                  {soundAlarm.getMuted() ? 'volume_off' : 'volume_up'}
                </span>
              </button>
            </div>
          </div>

          {/* Alert Body */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Left: Transaction & Rules */}
            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transfer Amount</span>
                  <span className="font-mono text-xs font-bold text-rose-400">Risk: {emergencyAlert.risk_score}/100</span>
                </div>
                <p className="text-2xl font-black font-mono text-white mt-0.5">
                  {formatCurrency(emergencyAlert.amount || 85000)}
                </p>
                <p className="text-xs text-slate-300 font-medium mt-1">
                  Node <span className="font-mono text-blue-400 font-bold">{emergencyAlert.account_id || 'ACC1001'}</span>
                  {emergencyAlert.transaction_code && ` • TXN ${emergencyAlert.transaction_code}`}
                </p>
              </div>

              {/* Rules List */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Triggered Heuristics</span>
                <div className="flex flex-wrap gap-1.5">
                  {rules.map((rule: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-lg bg-rose-950/70 border border-rose-500/50 text-rose-300 text-[10px] font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[12px] text-rose-400">check</span>
                      {rule}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: AI Copilot Investigator Summary */}
            <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/40 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center gap-1.5 text-purple-400">
                  <span className="material-symbols-outlined text-sm">psychology</span>
                  <span className="text-[10px] font-black uppercase tracking-wider">AI Copilot Forensic Summary</span>
                </div>
                <p className="text-xs text-slate-200 mt-1.5 leading-relaxed">
                  {ai?.summary_text || emergencyAlert.description || 'High-velocity fund dissipation anomaly detected across layered accounts.'}
                </p>
              </div>

              <div className="pt-2 border-t border-purple-500/30 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Recommended Action:</span>
                <span className="font-bold text-amber-300 font-mono">
                  {ai?.recommended_action || 'Immediate Debit Freeze'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-rose-500/30">
            <div className="flex items-center gap-2">
              <button
                onClick={handleFreeze}
                disabled={isFreezing || isFrozenSuccess}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-900/50 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">
                  {isFrozenSuccess ? 'check_circle' : 'lock'}
                </span>
                {isFrozenSuccess ? 'Account Frozen' : isFreezing ? 'Freezing...' : 'Freeze Account'}
              </button>

              <button
                onClick={handleInvestigate}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">route</span>
                Trace Money Flow
              </button>
            </div>

            <button
              onClick={() => acknowledgeAlert()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm text-emerald-400">check</span>
              Acknowledge & Dismiss
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmergencyInvestigationOverlay;
