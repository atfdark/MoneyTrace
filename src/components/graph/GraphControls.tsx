import React from 'react';
import type { LayoutMode } from '../../utils/graphLayouts';

export interface GraphControlsProps {
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onResetView: () => void;
  onReheatPhysics?: () => void;
  minAmountFilter: number;
  onMinAmountChange: (amt: number) => void;
  riskThresholdFilter: number;
  onRiskThresholdChange: (risk: number) => void;
  activeTypeFilters: Set<string>;
  onToggleTypeFilter: (type: string) => void;
  demoMode?: boolean;
  onToggleDemoMode?: () => void;
}

const LAYOUT_OPTIONS: Array<{ id: LayoutMode; label: string; icon: string }> = [
  { id: 'force', label: 'Force Physics', icon: 'bubble_chart' },
  { id: 'hierarchical', label: 'Fund Flow DAG', icon: 'account_tree' },
  { id: 'circular', label: 'Mule Rings', icon: 'all_inclusive' },
  { id: 'clusters', label: 'Risk Clusters', icon: 'hub' },
];

const NODE_TYPES: Array<{ id: string; label: string; color: string; border: string }> = [
  { id: 'victim', label: 'Victim', color: 'text-blue-400', border: 'border-blue-500/50' },
  { id: 'normal', label: 'Normal', color: 'text-green-400', border: 'border-green-500/50' },
  { id: 'mule', label: 'Mule', color: 'text-orange-400', border: 'border-orange-500/50' },
  { id: 'high_risk', label: 'High Risk', color: 'text-red-400', border: 'border-red-500/50' },
  { id: 'collector', label: 'Collector', color: 'text-purple-400', border: 'border-purple-500/50' },
  { id: 'frozen', label: 'Frozen', color: 'text-cyan-400', border: 'border-cyan-500/50' },
];

export const GraphControls: React.FC<GraphControlsProps> = ({
  layoutMode,
  onLayoutModeChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  onResetView,
  onReheatPhysics,
  minAmountFilter,
  onMinAmountChange,
  riskThresholdFilter,
  onRiskThresholdChange,
  activeTypeFilters,
  onToggleTypeFilter,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 glass-panel rounded-2xl border border-slate-700/50 text-xs">
      {/* ───── Left: Layout Switcher ───── */}
      <div className="flex items-center gap-1.5 bg-[#0F172A] p-1 rounded-xl border border-slate-800">
        {LAYOUT_OPTIONS.map(opt => {
          const isActive = layoutMode === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onLayoutModeChange(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* ───── Middle: Type Filter Pills ───── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mr-1 hidden sm:inline">
          Filter:
        </span>
        {NODE_TYPES.map(t => {
          const isSelected = activeTypeFilters.size === 0 || activeTypeFilters.has(t.id);
          return (
            <button
              key={t.id}
              onClick={() => onToggleTypeFilter(t.id)}
              className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                isSelected
                  ? `bg-slate-800 ${t.border} ${t.color}`
                  : 'bg-transparent border-slate-800 text-slate-600 line-through'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'currentColor' }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ───── Right: Zoom, Reset & Amount Filter ───── */}
      <div className="flex items-center gap-2">
        {/* Min Amount Threshold Selector */}
        <select
          value={minAmountFilter}
          onChange={e => onMinAmountChange(Number(e.target.value))}
          className="bg-[#0F172A] border border-slate-700/60 rounded-xl px-2.5 py-1.5 text-slate-300 font-mono text-[11px] focus:outline-none focus:border-purple-500 cursor-pointer"
        >
          <option value={0}>All Amounts</option>
          <option value={5000}>≥ ₹5,000</option>
          <option value={25000}>≥ ₹25,000</option>
          <option value={50000}>≥ ₹50,000</option>
          <option value={100000}>≥ ₹100,000</option>
        </select>

        {/* Viewport Zoom / Pan Controls */}
        <div className="flex items-center bg-[#0F172A] p-0.5 rounded-xl border border-slate-800">
          <button
            onClick={onZoomIn}
            title="Zoom In"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add</span>
          </button>
          <button
            onClick={onZoomOut}
            title="Zoom Out"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">remove</span>
          </button>
          <button
            onClick={onFitView}
            title="Fit to Screen"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">fit_screen</span>
          </button>
          <button
            onClick={onResetView}
            title="Reset View"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
          </button>
          {onReheatPhysics && (
            <button
              onClick={onReheatPhysics}
              title="Re-stabilize Physics"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-purple-400 hover:bg-slate-800 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">flare</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphControls;
