import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export interface TraceHop {
  hop_number: number;
  from_account: string;
  to_account: string;
  transaction_id: string;
  amount: number;
  timestamp: string;
  risk_score?: number;
}

export interface TraceData {
  source_account: string;
  money_path: string[];
  current_holder: string;
  total_hops: number;
  initial_amount: number;
  remaining_amount: number;
  hops: TraceHop[];
}

export interface TracePlaybackProps {
  traceData: TraceData | null;
  currentHopIndex: number;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSeekHop: (index: number) => void;
  onCloseTrace: () => void;
}

export const TracePlayback: React.FC<TracePlaybackProps> = ({
  traceData,
  currentHopIndex,
  isPlaying,
  onPlayToggle,
  onStepForward,
  onStepBackward,
  onSeekHop,
  onCloseTrace,
}) => {
  if (!traceData || !traceData.hops || traceData.hops.length === 0) return null;

  const currentHop = currentHopIndex >= 0 && currentHopIndex < traceData.hops.length
    ? traceData.hops[currentHopIndex]
    : null;

  return (
    <div className="absolute bottom-6 left-6 right-6 z-40 bg-white border border-gray-200 rounded-xl shadow-card border border-blue-200 p-4 shadow-card animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* ───── Left: Playback Controls & Hop Step Indicator ───── */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#0F172A] rounded-xl p-1 border border-gray-200">
            <button
              onClick={onStepBackward}
              disabled={currentHopIndex <= 0}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500"
              title="Previous Hop"
            >
              <span className="material-symbols-outlined text-lg">skip_previous</span>
            </button>
            <button
              onClick={onPlayToggle}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-gray-900 rounded-lg font-bold flex items-center gap-1.5 shadow-sm text-xs"
            >
              <span className="material-symbols-outlined text-base">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button
              onClick={onStepForward}
              disabled={currentHopIndex >= traceData.hops.length - 1}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500"
              title="Next Hop"
            >
              <span className="material-symbols-outlined text-lg">skip_next</span>
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Money Trail Camera Follow
              </span>
              <span className="text-[10px] font-mono bg-purple-500/20 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                Hop {currentHopIndex >= 0 ? currentHopIndex + 1 : 0} of {traceData.total_hops}
              </span>
            </div>
            <p className="text-[10px] text-gray-500">
              Source: <span className="text-blue-600 font-mono font-bold">{traceData.source_account}</span> → Current: <span className="text-red-400 font-mono font-bold">{traceData.current_holder}</span>
            </p>
          </div>
        </div>

        {/* ───── Middle: Active Hop Telemetry ───── */}
        {currentHop ? (
          <div className="flex items-center gap-4 bg-[#0F172A]/80 px-4 py-2 rounded-xl border border-gray-200 text-xs">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block">Transfer Amount</span>
              <span className="font-mono font-bold text-gray-900 text-sm">
                {formatCurrency(currentHop.amount)}
              </span>
            </div>
            <div className="h-6 w-px bg-gray-100" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-blue-600 font-bold">{currentHop.from_account}</span>
              <span className="material-symbols-outlined text-blue-600 text-sm animate-pulse">arrow_forward</span>
              <span className="font-mono text-red-400 font-bold">{currentHop.to_account}</span>
            </div>
            {currentHop.risk_score != null && (
              <span
                className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                  currentHop.risk_score >= 70 ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                }`}
              >
                {currentHop.risk_score}% Risk
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">
            Press Play to animate funds traversing through intermediary mule hops
          </div>
        )}

        {/* ───── Right: Hop Timeline Dots & Close ───── */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#0F172A] p-1.5 rounded-xl border border-gray-200">
            {traceData.hops.map((h, i) => {
              const isPassed = i <= currentHopIndex;
              const isCurrent = i === currentHopIndex;

              return (
                <button
                  key={i}
                  onClick={() => onSeekHop(i)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold font-mono transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-gray-900 scale-110 ring-2 ring-purple-400'
                      : isPassed
                      ? 'bg-purple-950 text-blue-600 border border-purple-800'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  title={`Hop ${h.hop_number}: ${h.from_account} → ${h.to_account}`}
                >
                  {h.hop_number}
                </button>
              );
            })}
          </div>

          <button
            onClick={onCloseTrace}
            className="text-gray-500 hover:text-gray-900 p-1.5 rounded-xl hover:bg-gray-50 transition-colors"
            title="Exit Trace Mode"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TracePlayback;
