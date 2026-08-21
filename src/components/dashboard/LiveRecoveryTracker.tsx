import React from 'react';
import { useDashboardStats } from '../../hooks/useDashboard';
import { formatCurrency } from '../../utils/formatters';

export const LiveRecoveryTracker: React.FC = () => {
  const { data: stats } = useDashboardStats();

  const recoveryRate = stats?.recovery_rate ?? 0;
  const totalVolume = stats?.total_volume ?? 0;
  const recoveredAmount = (totalVolume * (recoveryRate / 100)) || 0;
  const atRiskAmount = Math.max(0, totalVolume - recoveredAmount);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-green-600 text-[18px]">verified_user</span>
          </div>
          <h3 className="text-[13px] font-semibold text-gray-900">Asset Recovery Tracker</h3>
        </div>
        <span className="text-[11px] font-semibold text-green-700">
          {recoveryRate > 0 ? `${recoveryRate}% Recovery Rate` : 'Monitoring'}
        </span>
      </div>

      <div className="space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
            <span className="text-[10px] font-semibold uppercase text-gray-400 block tracking-wider">Total Volume</span>
            <span className="font-mono text-[13px] font-bold text-gray-900 block mt-0.5">
              {formatCurrency(totalVolume)}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-center">
            <span className="text-[10px] font-semibold uppercase text-green-600 block tracking-wider">Preserved</span>
            <span className="font-mono text-[13px] font-bold text-green-700 block mt-0.5">
              {formatCurrency(recoveredAmount)}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-center">
            <span className="text-[10px] font-semibold uppercase text-red-600 block tracking-wider">At Risk</span>
            <span className="font-mono text-[13px] font-bold text-red-700 block mt-0.5">
              {formatCurrency(atRiskAmount)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5">
            <span>Preserved: {recoveryRate}%</span>
            <span>At Risk: {Math.max(0, 100 - recoveryRate)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="bg-green-500 h-full transition-all duration-500 rounded-l-full" style={{ width: `${recoveryRate}%` }} />
            <div className="bg-red-400 h-full transition-all duration-500 rounded-r-full" style={{ width: `${Math.max(0, 100 - recoveryRate)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveRecoveryTracker;
