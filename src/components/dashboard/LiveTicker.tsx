import React from 'react';
import { useLiveTelemetry } from '../../hooks/useWebSocket';
import { formatCurrency } from '../../utils/formatters';

export const LiveTicker: React.FC = () => {
  const { liveTransactions } = useLiveTelemetry();

  // Fallback initial items if no live transactions yet
  const defaultItems = [
    { source_name: 'Rahul Sharma', target_name: 'Sneha Patel', amount: 2000, risk_score: 15 },
    { source_name: 'Aman Verma', target_name: 'Vikram Singh', amount: 65000, risk_score: 72 },
    { source_name: 'Sneha Patel', target_name: 'Rohit Joshi', amount: 1500, risk_score: 10 },
    { source_name: 'Priya Nair', target_name: 'Karan Malhotra', amount: 45000, risk_score: 55 },
    { source_name: 'Anita Desai', target_name: 'Rajesh Kumar', amount: 120000, risk_score: 88 },
  ];

  const items = liveTransactions.length > 0 ? liveTransactions : defaultItems;

  return (
    <div className="w-full bg-[#080D1A] border border-slate-800/90 rounded-2xl p-2.5 shadow-lg overflow-hidden flex items-center gap-3">
      {/* Live Badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-950/80 border border-purple-500/50 rounded-xl text-purple-300 flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span className="text-[10px] font-black tracking-wider uppercase font-mono">LIVE FEED</span>
      </div>

      {/* Ticker Content */}
      <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-4 scroll-smooth">
        {items.map((tx: any, idx: number) => {
          const isCrit = tx.risk_score >= 80;
          const isHigh = tx.risk_score >= 50;

          const pillBg = isCrit
            ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
            : isHigh
            ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
            : 'bg-slate-900 border-slate-800 text-slate-300';

          const dotColor = isCrit ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-emerald-500';

          return (
            <div
              key={tx.id || idx}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs whitespace-nowrap flex-shrink-0 transition-all ${pillBg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              <span className="font-bold text-white">{tx.source_name || tx.source}</span>
              <span className="text-slate-400">→</span>
              <span className="font-bold text-white">{tx.target_name || tx.target}</span>
              <span className="font-mono font-extrabold text-purple-300 ml-1">
                {formatCurrency(tx.amount)}
              </span>
              {isHigh && (
                <span className="text-[9px] font-black uppercase px-1 rounded bg-rose-500/30 text-rose-300 ml-0.5">
                  {tx.risk_score}% RISK
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveTicker;
