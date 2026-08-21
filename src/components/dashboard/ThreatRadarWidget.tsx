import React from 'react';
import { useDashboardStats } from '../../hooks/useDashboard';
import { useLiveTelemetry } from '../../hooks/useWebSocket';

export const ThreatRadarWidget: React.FC = () => {
  const { data: stats } = useDashboardStats();
  const { emergencyAlert } = useLiveTelemetry();

  const criticalCount = stats?.critical_alerts ?? (emergencyAlert ? 1 : 0);
  const highRiskCount = stats?.active_alerts ?? (emergencyAlert ? 1 : 0);
  const openCasesCount = stats?.open_cases ?? 0;
  const muleCount = (stats as any)?.mule_accounts ?? (stats as any)?.risky_accounts?.length ?? 0;
  const frozenCount = (stats as any)?.frozen_accounts ?? 0;

  const metrics = [
    { label: 'Critical', value: criticalCount, color: 'bg-red-50 text-red-700 border-red-200' },
    { label: 'High Risk', value: highRiskCount, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { label: 'Open Cases', value: openCasesCount, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Mule Nodes', value: muleCount, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: 'Frozen', value: frozenCount, color: 'bg-gray-50 text-gray-700 border-gray-200' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-600 text-[18px]">radar</span>
          </div>
          <h3 className="text-[13px] font-semibold text-gray-900">Threat Intelligence</h3>
        </div>
        <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Active
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className={`p-3 rounded-lg border text-center ${m.color}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{m.label}</p>
            <p className="text-xl font-bold font-mono mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThreatRadarWidget;
