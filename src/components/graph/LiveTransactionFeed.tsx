import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export interface LiveTxItem {
  id: string;
  source: string;
  target: string;
  source_name?: string;
  target_name?: string;
  amount: number;
  risk_score: number;
  timestamp: string;
  is_flagged?: boolean;
}

export interface LiveTransactionFeedProps {
  initialTransactions?: LiveTxItem[];
  onSelectTx?: (source: string, target: string) => void;
  demoMode?: boolean;
}

export const LiveTransactionFeed: React.FC<LiveTransactionFeedProps> = ({
  initialTransactions = [],
  onSelectTx,
}) => {
  const [feed, setFeed] = useState<LiveTxItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  // Synchronize with real graph transaction events
  useEffect(() => {
    if (!isPaused && initialTransactions && initialTransactions.length > 0) {
      setFeed(initialTransactions.slice(0, 40));
    }
  }, [initialTransactions, isPaused]);

  return (
    <div className="glass-panel rounded-2xl border border-slate-700/50 flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Live Transactions</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            {feed.length} events
          </span>
          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume stream' : 'Pause stream'}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">
              {isPaused ? 'play_arrow' : 'pause'}
            </span>
          </button>
        </div>
      </div>

      {/* Ticker Stream */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {feed.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <span className="material-symbols-outlined text-3xl block mb-2 opacity-50">receipt_long</span>
            Waiting for live transaction telemetry...
          </div>
        ) : (
          feed.map(tx => {
            const isCrit = tx.risk_score >= 80;
            const isHigh = tx.risk_score >= 50;

            return (
              <div
                key={tx.id}
                onClick={() => onSelectTx?.(tx.source, tx.target)}
                className={`group p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isCrit
                    ? 'bg-red-950/30 border-red-500/40 hover:border-red-400 hover:bg-red-950/50'
                    : isHigh
                    ? 'bg-orange-950/20 border-orange-500/30 hover:border-orange-400'
                    : 'bg-slate-900/40 border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/40'
                }`}
              >
                {/* Top Row: Amount & Risk Badge */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white font-mono group-hover:text-purple-300 transition-colors">
                    {formatCurrency(tx.amount)}
                  </span>
                  <span
                    className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      isCrit
                        ? 'bg-red-500/30 text-red-300 animate-pulse'
                        : isHigh
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {tx.risk_score}% Risk
                  </span>
                </div>

                {/* Sender -> Receiver */}
                <div className="flex items-center gap-1 text-[10px] text-slate-300 font-mono">
                  <span className="truncate max-w-[80px]" title={tx.source_name || tx.source}>
                    {tx.source_name ? tx.source_name.split(' ')[0] : tx.source}
                  </span>
                  <span className="material-symbols-outlined text-purple-400 text-xs">arrow_forward</span>
                  <span className="truncate max-w-[80px]" title={tx.target_name || tx.target}>
                    {tx.target_name ? tx.target_name.split(' ')[0] : tx.target}
                  </span>
                </div>

                {/* Footer: Time & Action Hint */}
                <div className="flex items-center justify-between mt-1 text-[8px] text-slate-500">
                  <span>{formatDate(tx.timestamp)}</span>
                  <span className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                    Focus Graph →
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LiveTransactionFeed;
