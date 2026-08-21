import React from 'react';

interface CityHeat {
  city: string;
  count: number;
  percentage: number;
  riskTier: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export const FraudGeoHeatmap: React.FC = () => {
  const cities: CityHeat[] = [
    { city: 'Mumbai', count: 42, percentage: 85, riskTier: 'CRITICAL' },
    { city: 'Delhi NCR', count: 28, percentage: 60, riskTier: 'HIGH' },
    { city: 'Pune', count: 18, percentage: 40, riskTier: 'HIGH' },
    { city: 'Bangalore', count: 14, percentage: 30, riskTier: 'MEDIUM' },
    { city: 'Kolkata', count: 9, percentage: 20, riskTier: 'MEDIUM' },
  ];

  return (
    <div className="glass-panel bg-[#0B1020]/90 border border-slate-800 rounded-2xl p-4 shadow-xl text-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-400 text-lg">public</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Geographic Fraud Velocity
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400">Top Regional Corridors</span>
      </div>

      <div className="space-y-2.5">
        {cities.map((c) => {
          const barColor = c.riskTier === 'CRITICAL'
            ? 'from-rose-600 to-red-500'
            : c.riskTier === 'HIGH'
            ? 'from-amber-600 to-orange-500'
            : 'from-blue-600 to-cyan-500';

          const badgeColor = c.riskTier === 'CRITICAL'
            ? 'text-rose-400 bg-rose-500/20'
            : c.riskTier === 'HIGH'
            ? 'text-amber-400 bg-amber-500/20'
            : 'text-blue-400 bg-blue-500/20';

          return (
            <div key={c.city} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200">{c.city}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 text-[11px]">{c.count} Incidents</span>
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${badgeColor}`}>
                    {c.riskTier}
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
                  style={{ width: `${c.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FraudGeoHeatmap;
