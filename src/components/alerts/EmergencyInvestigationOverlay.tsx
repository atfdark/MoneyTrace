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
      {/* Subtle Red Border Vignette */}
      <div className="fixed inset-0 pointer-events-none z-40 border-2 border-red-300/40 rounded-none" />

      {/* Emergency Modal */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl animate-in slide-in-from-top-6 fade-in duration-300">
        <div className="bg-white border border-gray-200 border-t-[3px] border-t-red-500 rounded-xl p-5 shadow-elevated">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-2xl">e911_emergency</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold tracking-wider uppercase">
                    CRITICAL ALERT
                  </span>
                  <span className="text-[12px] font-mono text-gray-500 font-semibold">{emergencyAlert.alert_id}</span>
                </div>
                <h3 className="text-[14px] font-bold text-gray-900 mt-0.5">
                  Automated Threat Interception Directive
                </h3>
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => soundAlarm.snooze(5)}
                className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                title="Silence Siren for 5 Minutes"
              >
                <span className="material-symbols-outlined text-[14px]">notifications_paused</span>
                Snooze
              </button>
              <button
                onClick={() => soundAlarm.setMuted(!soundAlarm.getMuted())}
                className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors"
                title="Mute Siren"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {soundAlarm.getMuted() ? 'volume_off' : 'volume_up'}
                </span>
              </button>
            </div>
          </div>

          {/* Alert Body */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Left: Transaction & Rules */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Transfer Amount</span>
                  <span className="font-mono text-[12px] font-bold text-red-600">Risk: {emergencyAlert.risk_score}/100</span>
                </div>
                <p className="text-2xl font-bold font-mono text-gray-900 mt-1">
                  {formatCurrency(emergencyAlert.amount || 85000)}
                </p>
                <p className="text-[12px] text-gray-500 font-medium mt-1">
                  Account <span className="font-mono text-blue-600 font-semibold">{emergencyAlert.account_id || 'ACC1001'}</span>
                  {emergencyAlert.transaction_code && ` • TXN ${emergencyAlert.transaction_code}`}
                </p>
              </div>

              {/* Rules List */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">Triggered Rules</span>
                <div className="flex flex-wrap gap-1.5">
                  {rules.map((rule: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[12px] text-red-500">check</span>
                      {rule}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: AI Summary */}
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center gap-1.5 text-blue-700">
                  <span className="material-symbols-outlined text-[16px]">psychology</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">AI Copilot Analysis</span>
                </div>
                <p className="text-[13px] text-gray-700 mt-1.5 leading-relaxed">
                  {ai?.summary_text || emergencyAlert.description || 'High-velocity fund dissipation anomaly detected across layered accounts.'}
                </p>
              </div>

              <div className="pt-2 border-t border-blue-200 flex items-center justify-between text-[11px]">
                <span className="text-gray-500">Recommended Action:</span>
                <span className="font-bold text-amber-600 font-mono">
                  {ai?.recommended_action || 'Immediate Debit Freeze'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={handleFreeze}
                disabled={isFreezing || isFrozenSuccess}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-gray-900 font-semibold text-[13px] rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isFrozenSuccess ? 'check_circle' : 'lock'}
                </span>
                {isFrozenSuccess ? 'Account Frozen' : isFreezing ? 'Freezing...' : 'Freeze Account'}
              </button>

              <button
                onClick={handleInvestigate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-gray-900 font-semibold text-[13px] rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">route</span>
                Trace Money Flow
              </button>
            </div>

            <button
              onClick={() => acknowledgeAlert()}
              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-[13px] rounded-lg border border-gray-200 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-green-600">check</span>
              Acknowledge
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmergencyInvestigationOverlay;
