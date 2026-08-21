import React from 'react';
import { formatCurrency } from '../../utils/formatters';

export const LiveRecoveryTracker: React.FC = () => {
  const caseId = 'REC202608168920';
  const amountLost = 100000;
  const amountRecovered = 68000;
  const amountRemaining = 32000;
  const recoveryProbability = 78;

  return (
    <div className="glass-panel bg-[#0B1020]/90 border border-slate-800 rounded-2xl p-4 shadow-xl text-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400 text-lg">verified_user</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Active Asset Recovery Tracker
          </h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-purple-300">{caseId}</span>
      </div>

      <div className="space-y-3">
        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <span className="text-[9px] font-bold uppercase text-slate-400 block">Total Stolen</span>
            <span className="font-mono text-xs font-bold text-rose-400">
              {formatCurrency(amountLost)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <span className="text-[9px] font-bold uppercase text-slate-400 block">Preserved</span>
            <span className="font-mono text-xs font-bold text-emerald-400">
              {formatCurrency(amountRecovered)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <span className="text-[9px] font-bold uppercase text-slate-400 block">Feasibility</span>
            <span className="font-mono text-xs font-bold text-purple-300">
              {recoveryProbability}% HIGH
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>Preserved: 68%</span>
            <span>At Risk: 32%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: '68%' }} />
            <div className="bg-rose-500/80 h-full transition-all duration-500" style={{ width: '32%' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveRecoveryTracker;
