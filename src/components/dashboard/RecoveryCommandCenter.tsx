import React, { useState } from 'react';
import { api } from '../../api';
import { formatCurrency } from '../../utils/formatters';
import { soundAlarm } from '../../utils/soundAlarm';

interface Props {
  caseId?: string;
  alertId?: string;
  stolenAmount?: number;
  currentHolder?: string;
  holderBank?: string;
  recoveryProbability?: number;
  status?: string;
  onFreezeSuccess?: (accountNumber: string) => void;
  onRestituteSuccess?: () => void;
}

export const RecoveryCommandCenter: React.FC<Props> = ({
  caseId,
  alertId = 'ALT2026081601',
  stolenAmount = 150000,
  currentHolder = 'ACC5008',
  holderBank = 'ICICI Bank (Bangalore)',
  recoveryProbability = 92,
  status = 'OPEN',
  onFreezeSuccess,
  onRestituteSuccess,
}) => {
  const [isFreezing, setIsFreezing] = useState(false);
  const [isRestituting, setIsRestituting] = useState(false);
  const [isFrozen, setIsFrozen] = useState(status === 'ACTION_TAKEN' || status === 'RECOVERED');
  const [isRecovered, setIsRecovered] = useState(status === 'RECOVERED');
  const [preservedAmount, setPreservedAmount] = useState<number | null>(null);

  // Sync state if status prop changes
  React.useEffect(() => {
    setIsFrozen(status === 'ACTION_TAKEN' || status === 'RECOVERED');
    setIsRecovered(status === 'RECOVERED');
  }, [status]);

  const handleExecuteFreeze = async () => {
    setIsFreezing(true);
    try {
      const res = await api.post('/recovery/action/freeze-and-protect', {
        alert_id: alertId,
        account_number: currentHolder,
        reason: `Emergency Freeze Directive issued from SOC Recovery Command Center for Alert ${alertId}`,
      });
      setIsFrozen(true);
      setPreservedAmount((res.data as any)?.balance_preserved || stolenAmount);
      soundAlarm.playSuccessChime();
      if (onFreezeSuccess) onFreezeSuccess(currentHolder);
    } catch (err) {
      console.error('Failed to freeze account:', err);
    } finally {
      setIsFreezing(false);
    }
  };

  const handleExecuteRestitution = async () => {
    if (!caseId) return;
    setIsRestituting(true);
    try {
      await api.post(`/recovery/cases/${caseId}/restitute`);
      setIsRecovered(true);
      soundAlarm.playSuccessChime();
      if (onRestituteSuccess) onRestituteSuccess();
    } catch (err) {
      console.error('Failed to restitute case:', err);
    } finally {
      setIsRestituting(false);
    }
  };

  return (
    <div className={`rounded-2xl p-5 border-2 transition-all duration-300 relative overflow-hidden shadow-elevated ${
      isRecovered 
        ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-emerald-500/80 text-white' 
        : isFrozen
        ? 'bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-blue-500/70 text-white'
        : 'bg-gradient-to-r from-red-950/90 via-slate-900 to-indigo-950/90 border-red-500/60 text-white'
    }`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Info Column */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-extrabold tracking-widest uppercase ${
              isRecovered
                ? 'bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 animate-pulse'
                : isFrozen
                ? 'bg-blue-500/30 border border-blue-500/50 text-blue-300'
                : 'bg-red-500/30 border border-red-500/50 text-red-400 animate-pulse'
            }`}>
              {isRecovered ? '🎉 100% RECOVERED' : isFrozen ? '❄️ NODE FROZEN' : '🚨 ACTIVE INCIDENT INTERCEPTOR'}
            </span>
            <span className="text-[11px] font-bold text-gray-400 font-mono">
              {caseId ? `CASE: ${caseId}` : `ALERT: ${alertId}`}
            </span>
          </div>

          <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            <span>
              {isRecovered
                ? 'WE HAVE RECOVERED: Stolen Capital Successfully Restituted'
                : isFrozen
                ? 'Holding Node Frozen — Ready for Restitution'
                : 'Critical Fund Siphon in Progress'}
            </span>
            <span className={`font-mono text-base ${isRecovered ? 'text-emerald-400' : 'text-red-400'}`}>
              ({formatCurrency(stolenAmount)})
            </span>
          </h3>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-[12px]">
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80">
              <span className="text-[10px] font-bold uppercase text-gray-400 block">Holding Node</span>
              <span className="font-mono font-extrabold text-amber-400 block mt-0.5">
                {currentHolder}
              </span>
              <span className="text-[10px] text-gray-400 truncate block">{holderBank}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80">
              <span className="text-[10px] font-bold uppercase text-gray-400 block">Recovery Window</span>
              <span className={`font-mono font-extrabold block mt-0.5 ${isRecovered ? 'text-emerald-300' : 'text-emerald-400'}`}>
                {isRecovered ? '100% Reclaimed' : `${recoveryProbability}% Likelihood`}
              </span>
              <span className="text-[10px] text-emerald-300 font-semibold">
                {isRecovered ? 'Funds Restored' : 'Active < 2h Window'}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80">
              <span className="text-[10px] font-bold uppercase text-gray-400 block">Recommended Directive</span>
              <span className={`font-bold block mt-0.5 text-[11px] ${isRecovered ? 'text-emerald-400' : 'text-red-400'}`}>
                {isRecovered ? 'Judicial Restitution Complete' : 'Section 91 CrPC Freeze'}
              </span>
              <span className="text-[10px] text-gray-400">
                {isRecovered ? 'Case Docket Closed' : 'Halts Outbound Routing'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Button Column */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-2.5 flex-shrink-0">
          {isRecovered ? (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-center space-y-1 w-full sm:w-auto">
              <div className="flex items-center justify-center gap-1.5 font-bold text-[13px]">
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                <span>FUNDS RESTITUTED</span>
              </div>
              <p className="text-[11px] font-mono text-emerald-200">
                100% Capital Restored to Victim
              </p>
            </div>
          ) : isFrozen ? (
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/50 text-blue-300 text-center space-y-0.5">
                <div className="flex items-center justify-center gap-1.5 font-bold text-[12px]">
                  <span className="material-symbols-outlined text-[16px]">ac_unit</span>
                  <span>ACCOUNT FROZEN</span>
                </div>
                <p className="text-[10px] font-mono text-blue-200">
                  Preserved: {formatCurrency(preservedAmount || stolenAmount)}
                </p>
              </div>

              {caseId && (
                <button
                  onClick={handleExecuteRestitution}
                  disabled={isRestituting}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-[12px] rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isRestituting ? 'sync' : 'savings'}
                  </span>
                  <span>{isRestituting ? 'Restituting...' : 'Restitute Funds to Victim'}</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleExecuteFreeze}
              disabled={isFreezing}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-extrabold text-[13px] rounded-xl shadow-xl shadow-red-950/80 flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:scale-[1.02] border border-red-400/40"
            >
              <span className="material-symbols-outlined text-[20px] animate-spin-slow">
                {isFreezing ? 'sync' : 'ac_unit'}
              </span>
              <span>{isFreezing ? 'Executing Directive...' : `Freeze ${currentHolder} Now`}</span>
            </button>
          )}

          <div className="flex items-center gap-2 w-full justify-end text-[11px]">
            <a
              href="/flow"
              className="text-gray-300 hover:text-white underline font-semibold flex items-center gap-1"
            >
              <span>View Money Trail Graph</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
