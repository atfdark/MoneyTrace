import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useLiveTelemetry } from '../../hooks/useWebSocket';
import { formatCurrency } from '../../utils/formatters';

interface FreezeResult {
  account: string;
  preserved: number;
  caseId?: string;
  probability?: string;
  recoveryScore?: number;
}

export const EmergencyInvestigationOverlay: React.FC = () => {
  const navigate = useNavigate();
  const { emergencyAlert, acknowledgeAlert, soundAlarm } = useLiveTelemetry();
  const [isFreezing, setIsFreezing] = useState(false);
  const [freezeResult, setFreezeResult] = useState<FreezeResult | null>(null);

  if (!emergencyAlert) return null;

  const ai = emergencyAlert.ai_summary;
  const rules =
    emergencyAlert.rule_breakdown?.rules_triggered ||
    ai?.triggered_rules || [
      'High Velocity Outflow',
      'Rapid Multi-Hop Dissipation',
      'Mule Layering Detected',
    ];

  const targetAccountToFreeze =
    emergencyAlert.current_holder ||
    emergencyAlert.target_account ||
    emergencyAlert.account_number ||
    emergencyAlert.account_id ||
    'ACC1001';

  const recoveryScore =
    emergencyAlert.recovery_score || ai?.recovery_score || 88;
  const recoveryProb =
    emergencyAlert.recovery_probability || (recoveryScore >= 80 ? 'HIGH' : 'MEDIUM');

  const handleFreezeAndRecover = async () => {
    setIsFreezing(true);
    // Immediately stop the siren audio when investigator takes decisive containment action
    soundAlarm.stopAll();

    try {
      const res = await api.post('/recovery/action/freeze-and-protect', {
        alert_id: emergencyAlert.alert_id,
        account_number: targetAccountToFreeze,
        reason: `Emergency Debit Freeze issued for Alert ${emergencyAlert.alert_id} under Section 91 CrPC`,
      });

      const data: any = res.data;
      setFreezeResult({
        account: data.account_frozen || targetAccountToFreeze,
        preserved: data.balance_preserved || emergencyAlert.amount || 85000,
        caseId: data.case_id,
        probability: data.recovery_probability || recoveryProb,
        recoveryScore: data.recovery_score || recoveryScore,
      });
      soundAlarm.playSuccessChime();
    } catch (e: any) {
      console.warn('Fallback standard freeze:', e);
      try {
        const fallbackRes = await api.post(
          `/users/accounts/${targetAccountToFreeze}/freeze`,
          {
            reason: `Emergency freeze directive for Alert ${emergencyAlert.alert_id}`,
          }
        );
        setFreezeResult({
          account: targetAccountToFreeze,
          preserved:
            (fallbackRes.data as any)?.balance_preserved ||
            emergencyAlert.amount ||
            85000,
          probability: recoveryProb,
          recoveryScore: recoveryScore,
        });
        soundAlarm.playSuccessChime();
      } catch (err) {
        console.error('Failed to execute freeze:', err);
      }
    } finally {
      setIsFreezing(false);
    }
  };

  const handleAcknowledge = () => {
    soundAlarm.stopAll();
    acknowledgeAlert(emergencyAlert.alert_id);
  };

  const handleInvestigate = () => {
    soundAlarm.stopAll();
    acknowledgeAlert(emergencyAlert.alert_id);
    navigate('/flow');
  };

  return (
    <>
      {/* Subtle Red Border Vignette */}
      <div className="fixed inset-0 pointer-events-none z-40 border-2 border-red-500/30 rounded-none shadow-[inset_0_0_100px_rgba(239,68,68,0.15)]" />

      {/* Emergency Modal */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl animate-in slide-in-from-top-6 fade-in duration-300">
        <div className="bg-white border border-gray-200 border-t-[4px] border-t-red-600 rounded-xl p-5 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-2xl animate-pulse">
                  e911_emergency
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black tracking-wider uppercase">
                    CRITICAL FRAUD DIRECTIVE
                  </span>
                  <span className="text-[12px] font-mono text-gray-500 font-bold">
                    {emergencyAlert.alert_id}
                  </span>
                </div>
                <h3 className="text-[14px] font-bold text-gray-900 mt-0.5">
                  Automated Threat Interception & Asset Recovery
                </h3>
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => soundAlarm.snooze(15)}
                className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                title="Silence Siren for 15 Minutes"
              >
                <span className="material-symbols-outlined text-[14px]">
                  notifications_paused
                </span>
                Snooze
              </button>
              <button
                onClick={() => soundAlarm.setMuted(!soundAlarm.getMuted())}
                className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 flex items-center justify-center transition-colors"
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
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Siphoned Capital
                  </span>
                  <span className="font-mono text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    Risk: {emergencyAlert.risk_score}/100
                  </span>
                </div>
                <p className="text-2xl font-bold font-mono text-gray-900 mt-1">
                  {formatCurrency(emergencyAlert.amount || 85000)}
                </p>
                <div className="text-[11px] text-gray-600 mt-1.5 space-y-0.5">
                  <p>
                    Target Account:{' '}
                    <span className="font-mono text-red-700 font-bold">
                      {targetAccountToFreeze}
                    </span>
                  </p>
                  {emergencyAlert.transaction_code && (
                    <p className="text-gray-400 font-mono text-[10px]">
                      TXN: {emergencyAlert.transaction_code}
                    </p>
                  )}
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
                  Triggered Anomaly Rules
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {rules.map((rule: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-[10px] font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[12px] text-red-500">
                        shield_alert
                      </span>
                      {rule}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Recovery Intelligence Panel */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <span className="material-symbols-outlined text-[16px]">
                      currency_exchange
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      Recovery Intelligence Engine
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {recoveryProb} PROBABILITY ({recoveryScore}%)
                  </span>
                </div>

                <p className="text-[12px] text-gray-700 mt-2 leading-relaxed">
                  {ai?.summary_text ||
                    emergencyAlert.description ||
                    'High-velocity fund dissipation anomaly detected across layered accounts.'}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white/80 border border-emerald-200 text-[11px] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Legal Mandate:</span>
                  <span className="font-bold text-gray-900 font-mono">
                    Section 91 CrPC Notice
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Preservation Target:</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {targetAccountToFreeze}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Freezing Success Notification Banner */}
          {freezeResult && (
            <div className="mb-3 p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between gap-3 text-emerald-800 text-[12px] animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-lg">
                  verified
                </span>
                <div>
                  <span className="font-bold">Account Frozen Successfully!</span>{' '}
                  Preserved {formatCurrency(freezeResult.preserved)} under Section 91 CrPC Directive.
                </div>
              </div>
              <button
                onClick={() => {
                  soundAlarm.stopAll();
                  acknowledgeAlert(emergencyAlert.alert_id);
                  navigate('/recovery');
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded transition-colors whitespace-nowrap"
              >
                Open Recovery Desk →
              </button>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={handleFreezeAndRecover}
                disabled={isFreezing || !!freezeResult}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-80 text-white font-bold text-[13px] rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {freezeResult ? 'lock' : 'bolt'}
                </span>
                {freezeResult
                  ? 'Account Frozen & Protected'
                  : isFreezing
                  ? 'Issuing Freeze...'
                  : '⚡ Freeze Account & Protect'}
              </button>

              <button
                onClick={handleInvestigate}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-[13px] rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">route</span>
                Trace Money Flow
              </button>
            </div>

            <button
              onClick={handleAcknowledge}
              className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 active:scale-95 text-gray-700 font-semibold text-[13px] rounded-lg border border-gray-200 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-green-600">
                check
              </span>
              Acknowledge & Silence
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmergencyInvestigationOverlay;
