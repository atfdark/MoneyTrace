import React from 'react';
import { useLiveTelemetry } from '../../hooks/useWebSocket';
import { formatCurrency } from '../../utils/formatters';

export const LiveTicker: React.FC = () => {
  const { liveTransactions } = useLiveTelemetry();

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl p-2.5 shadow-card overflow-hidden flex items-center gap-3">
      {/* Live Badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] font-bold tracking-wider uppercase text-blue-700">LIVE</span>
      </div>

      {/* Ticker Content */}
      <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-3 scroll-smooth">
        {liveTransactions.length > 0 ? (
          liveTransactions.map((tx: any, idx: number) => {
            const isCrit = (tx.risk_score || 0) >= 80;
            const isHigh = (tx.risk_score || 0) >= 50;

            const pillBg = isCrit
              ? 'bg-red-50 border-red-200 text-red-700'
              : isHigh
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-gray-50 border-gray-200 text-gray-700';

            return (
              <div
                key={tx.id || idx}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] whitespace-nowrap flex-shrink-0 transition-all ${pillBg}`}
              >
                <span className="font-semibold text-gray-900">{tx.source_name || tx.source}</span>
                <span className="text-gray-400">→</span>
                <span className="font-semibold text-gray-900">{tx.target_name || tx.target}</span>
                <span className="font-mono font-bold text-blue-700 ml-0.5">
                  {formatCurrency(tx.amount)}
                </span>
                {isHigh && (
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isCrit ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {tx.risk_score}%
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex items-center gap-2 text-gray-400 text-[12px] py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>Listening for real-time transactions...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTicker;
