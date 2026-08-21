import React from 'react';
import { useDashboardStats } from '../../hooks/useDashboard';
import { useLiveTelemetry } from '../../hooks/useWebSocket';

export const ThreatRadarWidget: React.FC = () => {
  const { data: stats } = useDashboardStats();
  const { emergencyAlert } = useLiveTelemetry();

  const criticalCount = stats?.critical_alerts ?? (emergencyAlert ? 1 : 0);
  const highRiskCount = stats?.active_alerts ?? 8;
  const openCasesCount = stats?.open_cases ?? 4;
  const muleCount = 7;
  const frozenCount = 3;

  return (
    <div className="glass-panel bg-[#0C0B18]/90 border border-slate-800 rounded-2xl p-4 shadow-xl text-white relative overflow-hidden">
      {/* Background Radar Scanning Animation */}
      <div className="absolute top-0 right-0 w-36 h-36 pointer-events-none opacity-20 flex items-center justify-center">
        <div className="w-28 h-28 rounded-full border border-purple-500/40 animate-ping absolute" />
        <div className="w-20 h-20 rounded-full border border-red-500/50 absolute" />
        <div className="w-10 h-10 rounded-full bg-red-500/20 absolute" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-400 text-lg">radar</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Threat Radar Telemetry
          </h3>
        </div>
        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-950 border border-rose-500/50 text-rose-300 animate-pulse">
          LIVE SHIELD
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 relative z-10">
        <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-rose-400">Critical Alerts</p>
          <p className="text-lg font-black font-mono text-rose-300 mt-0.5">{criticalCount}</p>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-amber-400">High Risk</p>
          <p className="text-lg font-black font-mono text-amber-300 mt-0.5">{highRiskCount}</p>
        </div>

        <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/40 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-blue-400">Open Cases</p>
          <p className="text-lg font-black font-mono text-blue-300 mt-0.5">{openCasesCount}</p>
        </div>

        <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-purple-400">Mule Nodes</p>
          <p className="text-lg font-black font-mono text-purple-300 mt-0.5">{muleCount}</p>
        </div>

        <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-center col-span-2 sm:col-span-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-400">Frozen Nodes</p>
          <p className="text-lg font-black font-mono text-cyan-300 mt-0.5">{frozenCount}</p>
        </div>
      </div>
    </div>
  );
};

export default ThreatRadarWidget;
