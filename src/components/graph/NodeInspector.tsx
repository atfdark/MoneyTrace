import React from 'react';
import type { LayoutResultNode, AggregatedEdge } from '../../utils/graphLayouts';
import { NODE_THEMES } from './GraphCanvas';
import { formatCurrency } from '../../utils/formatters';

export interface NodeInspectorProps {
  node: LayoutResultNode | null;
  edges: AggregatedEdge[];
  onClose: () => void;
  onTraceAccount: (accountId: string) => void;
  onFocusCounterparty: (accountId: string) => void;
  onAskCopilot: (question: string) => void;
  onFreezeAccount?: (accountId: string) => void;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  node,
  edges,
  onClose,
  onTraceAccount,
  onFocusCounterparty,
  onAskCopilot,
  onFreezeAccount,
}) => {
  if (!node) return null;

  const theme = NODE_THEMES[node.type] || NODE_THEMES.normal;
  const risk = node.risk_score ?? 0;

  // Inflow edges (incoming) & Outflow edges (outgoing)
  const incomingEdges = edges.filter(e => e.target === node.id);
  const outgoingEdges = edges.filter(e => e.source === node.id);

  return (
    <div className="w-88 max-w-sm bg-white border border-gray-200 rounded-xl shadow-card border border-gray-200/60 flex flex-col shadow-card animate-in slide-in-from-right-4 duration-300 overflow-hidden">
      {/* ───── Header ───── */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-start justify-between relative">
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: theme.border }}
        />
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-900 shadow-lg flex-shrink-0"
            style={{ backgroundColor: theme.bg }}
          >
            <span className="material-symbols-outlined text-2xl">{theme.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono font-bold text-gray-900 text-sm">{node.id}</h3>
              <span
                className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border"
                style={{
                  color: theme.border,
                  borderColor: `${theme.border}60`,
                  backgroundColor: `${theme.bg}20`,
                }}
              >
                {node.type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-600 font-medium">{node.user_name || 'Anonymous Entity'}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {/* ───── Scrollable Body ───── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Risk Score Meter */}
        <div className="bg-[#0F172A] p-3 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
              Threat Assessment
            </span>
            <span
              className={`font-mono font-bold text-sm ${
                risk >= 75 ? 'text-red-400' : risk >= 40 ? 'text-orange-400' : 'text-green-400'
              }`}
            >
              {risk} / 100
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                risk >= 75
                  ? 'bg-gradient-to-r from-red-600 to-rose-500'
                  : risk >= 40
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${risk}%` }}
            />
          </div>
          <p className="text-[9px] text-gray-400 mt-1.5">
            {risk >= 75
              ? '🚨 High confidence mule or illicit fund accumulation hub.'
              : risk >= 40
              ? '⚠️ Rapid transaction velocity or structuring behavior detected.'
              : '✅ Baseline activity within normal operational parameters.'}
          </p>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#0F172A] p-2.5 rounded-xl border border-gray-200">
            <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-0.5">Current Balance</span>
            <span className="font-mono font-bold text-gray-900 text-xs">{formatCurrency(node.balance ?? 0)}</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-xl border border-gray-200">
            <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-0.5">Account Status</span>
            <span
              className={`font-mono font-bold text-xs uppercase ${
                node.status === 'frozen' ? 'text-sky-600' : 'text-green-600'
              }`}
            >
              {node.status || 'ACTIVE'}
            </span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-xl border border-gray-200">
            <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-0.5">Total Inflow</span>
            <span className="font-mono font-bold text-blue-600 text-xs">{formatCurrency(node.total_inflow)}</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-xl border border-gray-200">
            <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-0.5">Total Outflow</span>
            <span className="font-mono font-bold text-blue-600 text-xs">{formatCurrency(node.total_outflow)}</span>
          </div>
        </div>

        {/* Counterparties: Incoming Senders */}
        {incomingEdges.length > 0 && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
              Incoming Senders ({incomingEdges.length})
            </span>
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {incomingEdges.map(e => (
                <div
                  key={e.id}
                  onClick={() => onFocusCounterparty(e.source)}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#0F172A] border border-gray-200 hover:border-blue-200 cursor-pointer transition-colors"
                >
                  <span className="font-mono text-blue-600 text-[10px] truncate max-w-[100px]">{e.source}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-900 text-[10px] font-bold">{formatCurrency(e.totalAmount)}</span>
                    <span className="material-symbols-outlined text-xs text-gray-400">arrow_forward</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Counterparties: Outgoing Receivers */}
        {outgoingEdges.length > 0 && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
              Outgoing Receivers ({outgoingEdges.length})
            </span>
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {outgoingEdges.map(e => (
                <div
                  key={e.id}
                  onClick={() => onFocusCounterparty(e.target)}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#0F172A] border border-gray-200 hover:border-blue-200 cursor-pointer transition-colors"
                >
                  <span className="font-mono text-red-400 text-[10px] truncate max-w-[100px]">{e.target}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-900 text-[10px] font-bold">{formatCurrency(e.totalAmount)}</span>
                    <span className="material-symbols-outlined text-xs text-gray-400">arrow_forward</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Investigator Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => onTraceAccount(node.id)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-gray-900 font-bold rounded-xl text-xs shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-sm">route</span>
            Trace Money Trail from {node.id}
          </button>

          <button
            onClick={() => onAskCopilot(`Explain the risk factors and transaction pattern for account ${node.id} (${node.user_name || 'unnamed'})`)}
            className="w-full py-2 bg-gray-100 hover:bg-slate-700 text-blue-600 font-bold rounded-xl text-xs border border-blue-200 flex items-center justify-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-sm text-blue-600">psychology</span>
            Ask AI Copilot About Account
          </button>

          {node.status !== 'frozen' && onFreezeAccount && (
            <button
              onClick={() => onFreezeAccount(node.id)}
              className="w-full py-2 bg-sky-50 hover:bg-cyan-900/60 text-sky-600 font-bold rounded-xl text-xs border border-sky-200 flex items-center justify-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-sm text-sky-600">ac_unit</span>
              Emergency Freeze Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeInspector;
