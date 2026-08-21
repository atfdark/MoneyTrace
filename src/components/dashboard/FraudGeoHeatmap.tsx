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
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-purple-600 text-[18px]">public</span>
          </div>
          <h3 className="text-[13px] font-semibold text-gray-900">Geographic Fraud Velocity</h3>
        </div>
        <span className="text-[11px] text-gray-400">Top Regional Corridors</span>
      </div>

      <div className="space-y-3">
        {cities.map((c) => {
          const barColor = c.riskTier === 'CRITICAL'
            ? 'bg-red-500'
            : c.riskTier === 'HIGH'
            ? 'bg-amber-500'
            : 'bg-blue-500';

          const badgeColor = c.riskTier === 'CRITICAL'
            ? 'text-red-700 bg-red-50 border border-red-200'
            : c.riskTier === 'HIGH'
            ? 'text-amber-700 bg-amber-50 border border-amber-200'
            : 'text-blue-700 bg-blue-50 border border-blue-200';

          return (
            <div key={c.city} className="space-y-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-gray-900">{c.city}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-400 text-[11px]">{c.count} incidents</span>
                  <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${badgeColor}`}>
                    {c.riskTier}
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full transition-all duration-500`}
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
