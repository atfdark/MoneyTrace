import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useFlowGraphs, useFlowGraph, useSuspiciousPatterns } from '../hooks/useFlow';
import { useDashboardStats } from '../hooks/useDashboard';
import { useAlerts } from '../hooks/useAlerts';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  layoutForceDirected,
  layoutHierarchical,
  layoutCircularRings,
  layoutRiskClusters,
  classifyNode,
  aggregateEdges,
  calculateBoundingBox,
  LayoutMode,
  LayoutResultNode,
  AggregatedEdge,
  RawNode,
  RawEdge,
} from '../utils/graphLayouts';

import { GraphCanvas } from '../components/graph/GraphCanvas';
import { GraphControls } from '../components/graph/GraphControls';
import { LiveTransactionFeed } from '../components/graph/LiveTransactionFeed';
import { OnlineUsersPanel } from '../components/graph/OnlineUsersPanel';
import { NodeInspector } from '../components/graph/NodeInspector';
import { FraudAlertCenter } from '../components/graph/FraudAlertCenter';
import { TracePlayback } from '../components/graph/TracePlayback';
import { AICopilotDrawer } from '../components/graph/AICopilotDrawer';
import { wsService } from '../hooks/useWebSocket';

export const Flow: React.FC = () => {
  /* ─────────────────────── Backend Data Queries ─────────────────────── */
  const { data: networkData, isLoading: netLoading, refetch: refetchNetwork } = useFlowGraphs();
  const { data: suspiciousData } = useSuspiciousPatterns();
  const { data: dashboardStats } = useDashboardStats();
  const { data: alertsData } = useAlerts({ limit: 10 });

  // Real-time live graph re-rendering on WebSocket transaction/user events
  useEffect(() => {
    const unsubTx = wsService.subscribe('TRANSACTION_CREATED', () => {
      refetchNetwork();
    });
    const unsubUser = wsService.subscribe('USER_REGISTERED', () => {
      refetchNetwork();
    });
    return () => {
      unsubTx();
      unsubUser();
    };
  }, [refetchNetwork]);

  /* ─────────────────────── UI States ─────────────────────── */
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('force');
  const [viewMode, setViewMode] = useState<'graph' | 'timeline'>('graph');

  // Search & Trace
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [traceId, setTraceId] = useState('');
  const [tracingActive, setTracingActive] = useState(false);
  const { data: traceData, isLoading: traceLoading } = useFlowGraph(traceId, {
    enabled: !!traceId && tracingActive,
  });

  // Trace Playback States
  const [traceStep, setTraceStep] = useState(-1);
  const [traceIsPlaying, setTraceIsPlaying] = useState(false);
  const [traceHighlight, setTraceHighlight] = useState<Set<string>>(new Set());

  // Selection & Hover
  const [selectedNode, setSelectedNode] = useState<LayoutResultNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<LayoutResultNode | null>(null);
  const [highlightedCycle, setHighlightedCycle] = useState<string[] | null>(null);

  // Filters
  const [minAmountFilter, setMinAmountFilter] = useState(0);
  const [riskThresholdFilter, setRiskThresholdFilter] = useState(0);
  const [activeTypeFilters, setActiveTypeFilters] = useState<Set<string>>(new Set());

  // Copilot Drawer
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotQuestion, setCopilotQuestion] = useState('');

  // Dimensions & Viewport Transform
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 1200, h: 750 });
  const [transform, setTransform] = useState({ x: 100, y: 80, zoom: 0.85 });

  // Update container dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDims({ w: entry.contentRect.width || 1200, h: entry.contentRect.height || 750 });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ─────────────────────── Mule & Cycle Analysis ─────────────────────── */
  const muleIds = useMemo(() => {
    const data = suspiciousData as any;
    return new Set<string>((data?.mule_accounts || []).map((a: any) => a.id));
  }, [suspiciousData]);

  const collectorIds = useMemo(() => {
    const data = suspiciousData as any;
    return new Set<string>((data?.collector_accounts || []).map((a: any) => a.id));
  }, [suspiciousData]);

  const cycles: string[][] = useMemo(() => {
    const data = suspiciousData as any;
    return data?.circular_chains || [];
  }, [suspiciousData]);

  /* ─────────────────────── Raw Data Preparation ─────────────────────── */
  const rawNodes: RawNode[] = useMemo(() => {
    const net = networkData as any;
    const baseNodes = net?.nodes || [];
    return baseNodes.map((n: any) => ({
      ...n,
      type: classifyNode(n, muleIds, collectorIds),
    }));
  }, [networkData, muleIds, collectorIds]);

  const rawEdges: RawEdge[] = useMemo(() => {
    const net = networkData as any;
    return net?.edges || [];
  }, [networkData]);

  const aggregatedEdges: AggregatedEdge[] = useMemo(() => {
    return aggregateEdges(rawEdges);
  }, [rawEdges]);

  /* ─────────────────────── Layout Calculation ─────────────────────── */
  const nodes: LayoutResultNode[] = useMemo(() => {
    if (rawNodes.length === 0) return [];
    if (layoutMode === 'hierarchical') {
      return layoutHierarchical(rawNodes, rawEdges, dims.w, dims.h);
    } else if (layoutMode === 'circular') {
      return layoutCircularRings(rawNodes, rawEdges, dims.w, dims.h, cycles);
    } else if (layoutMode === 'clusters') {
      return layoutRiskClusters(rawNodes, rawEdges, dims.w, dims.h);
    } else {
      // Default: Force-Directed Simulation
      return layoutForceDirected(rawNodes, rawEdges, dims.w, dims.h, 240);
    }
  }, [rawNodes, rawEdges, layoutMode, dims, cycles]);

  // Node Map
  const nodeMap = useMemo(() => {
    const map = new Map<string, LayoutResultNode>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  /* ─────────────────────── Viewport Controls ─────────────────────── */
  const handleZoomIn = () => {
    setTransform(t => ({ ...t, zoom: Math.min(t.zoom * 1.2, 3.5) }));
  };

  const handleZoomOut = () => {
    setTransform(t => ({ ...t, zoom: Math.max(t.zoom * 0.8, 0.2) }));
  };

  const handleFitView = useCallback(() => {
    if (nodes.length === 0) return;
    const bbox = calculateBoundingBox(nodes, 100);
    const containerW = containerRef.current?.clientWidth || dims.w;
    const containerH = containerRef.current?.clientHeight || dims.h;

    const zoomX = containerW / bbox.width;
    const zoomY = containerH / bbox.height;
    const fitZoom = Math.min(Math.max(Math.min(zoomX, zoomY) * 0.85, 0.25), 1.6);

    const centerX = bbox.minX + bbox.width / 2;
    const centerY = bbox.minY + bbox.height / 2;

    const newX = containerW / 2 - centerX * fitZoom;
    const newY = containerH / 2 - centerY * fitZoom;

    setTransform({ x: newX, y: newY, zoom: fitZoom });
  }, [nodes, dims]);

  const handleResetView = () => {
    setTransform({ x: 100, y: 80, zoom: 0.85 });
  };

  // Center camera on specific node
  const focusNodeOnCanvas = useCallback((nodeId: string) => {
    const targetNode = nodeMap.get(nodeId);
    if (!targetNode) return;

    setSelectedNode(targetNode);
    const containerW = containerRef.current?.clientWidth || dims.w;
    const containerH = containerRef.current?.clientHeight || dims.h;
    const targetZoom = Math.max(transform.zoom, 1.1);

    const newX = containerW / 2 - targetNode.x * targetZoom;
    const newY = containerH / 2 - targetNode.y * targetZoom;

    setTransform({ x: newX, y: newY, zoom: targetZoom });
  }, [nodeMap, dims, transform.zoom]);

  // Initial fit on first data load
  useEffect(() => {
    if (nodes.length > 0) {
      handleFitView();
    }
  }, [nodes.length, layoutMode]);

  /* ─────────────────────── Search Suggestions ─────────────────────── */
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{ id: string; name: string; type: string; category: string }> = [];

    // Search nodes
    nodes.forEach(n => {
      if (n.id.toLowerCase().includes(q) || (n.user_name && n.user_name.toLowerCase().includes(q))) {
        results.push({
          id: n.id,
          name: n.user_name || n.id,
          type: n.type,
          category: 'Account',
        });
      }
    });

    // Search edges / transactions
    rawEdges.forEach(e => {
      if (e.id.toLowerCase().includes(q)) {
        results.push({
          id: e.id,
          name: `${e.source} → ${e.target}`,
          type: e.risk_score && e.risk_score >= 70 ? 'high_risk' : 'normal',
          category: 'Transaction',
        });
      }
    });

    return results.slice(0, 8);
  }, [searchQuery, nodes, rawEdges]);

  const handleSelectSuggestion = (s: { id: string; category: string }) => {
    setSearchDropdownOpen(false);
    if (s.category === 'Account') {
      focusNodeOnCanvas(s.id);
      setTraceId(s.id);
    } else {
      setTraceId(s.id);
      handleTraceSubmit(s.id);
    }
  };

  /* ─────────────────────── Trace Money Logic ─────────────────────── */
  const handleTraceSubmit = (targetTraceId?: string) => {
    const idToTrace = (targetTraceId || traceId || searchQuery).trim();
    if (!idToTrace) return;
    setTraceId(idToTrace);
    setTracingActive(true);
    setTraceHighlight(new Set([idToTrace]));
    setTraceStep(0);
    setTraceIsPlaying(true);
  };

  // Trace step-by-step playback & Camera Follow
  useEffect(() => {
    const trace = traceData as any;
    if (!trace?.hops || trace.hops.length === 0 || !traceIsPlaying) return;

    if (traceStep >= trace.hops.length) {
      setTraceIsPlaying(false);
      return;
    }

    const currentHop = trace.hops[traceStep];
    if (currentHop) {
      setTraceHighlight(prev => new Set([...prev, currentHop.from_account, currentHop.to_account]));

      // Camera follow to active hop receiver
      const toNode = nodeMap.get(currentHop.to_account);
      if (toNode) {
        focusNodeOnCanvas(toNode.id);
      }
    }

    const timer = setTimeout(() => {
      setTraceStep(s => s + 1);
    }, 1600);

    return () => clearTimeout(timer);
  }, [traceStep, traceIsPlaying, traceData, nodeMap, focusNodeOnCanvas]);

  const handleToggleTypeFilter = (type: string) => {
    setActiveTypeFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // Open Copilot with context
  const handleAskCopilot = (question: string) => {
    setCopilotQuestion(question);
    setCopilotOpen(true);
  };

  // Emergency Freeze Handler
  const handleEmergencyFreeze = (accountId: string) => {
    alert(`🚨 EMERGENCY ACTION: Immediate freeze order initiated for Account ${accountId}. Downstream transaction routing suspended.`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-[720px] gap-3 text-white">
      {/* ═══════════════════════════════════════════════════════════════════
          1. TOP DASHBOARD KPI ROW (Palantir / Gotham Style)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'Total Transactions',
            value: dashboardStats?.total_transactions != null
              ? dashboardStats.total_transactions.toLocaleString()
              : (rawEdges.length > 0 ? `${rawEdges.length}` : '0'),
            icon: 'sync_alt',
            color: 'text-blue-400',
            border: 'border-blue-500/20',
          },
          {
            label: 'Fraud Alerts',
            value: String(
              dashboardStats?.fraud_alerts ??
                (alertsData as any)?.total ??
                (Array.isArray(alertsData) ? alertsData.length : 0)
            ),
            icon: 'warning',
            color: 'text-amber-400',
            border: 'border-amber-500/20',
          },
          {
            label: 'Critical Alerts',
            value: String(dashboardStats?.critical_alerts ?? 0),
            icon: 'gpp_bad',
            color: 'text-red-400',
            border: 'border-red-500/20',
          },
          {
            label: 'Money At Risk',
            value: dashboardStats?.money_at_risk != null
              ? formatCurrency(dashboardStats.money_at_risk)
              : formatCurrency(0),
            icon: 'monetization_on',
            color: 'text-rose-400',
            border: 'border-rose-500/20',
          },
          {
            label: 'Recovery Rate',
            value: dashboardStats?.recovery_rate != null
              ? `${dashboardStats.recovery_rate}%`
              : '0%',
            icon: 'verified_user',
            color: 'text-emerald-400',
            border: 'border-emerald-500/20',
          },
          {
            label: 'Active Rings',
            value: `${cycles.length} Laundering Rings`,
            icon: 'all_inclusive',
            color: 'text-purple-400',
            border: 'border-purple-500/20',
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className={`glass-panel rounded-xl p-3 border ${kpi.border} flex items-center gap-3 shadow-lg relative overflow-hidden`}
          >
            <div className={`p-2 rounded-lg bg-slate-900/80 ${kpi.color}`}>
              <span className="material-symbols-outlined text-xl">{kpi.icon}</span>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-tight">
                {kpi.label}
              </p>
              <p className="font-mono text-sm font-extrabold text-white">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          2. SEARCH & FORENSICS TRACE BAR
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="glass-panel rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 border border-slate-700/50 shadow-xl relative z-40">
        {/* Search Input with Live Suggestions */}
        <div className="relative flex-1 min-w-[280px]">
          <div className="flex items-center gap-2 bg-[#0F172A] border border-slate-700/80 rounded-xl px-3 py-2 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/30 transition-all">
            <span className="material-symbols-outlined text-purple-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Search Account (ACC1001), User Name (Rahul), or TXN Hash..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setSearchDropdownOpen(true);
              }}
              onFocus={() => setSearchDropdownOpen(true)}
              onKeyDown={e => e.key === 'Enter' && handleTraceSubmit()}
              className="flex-1 bg-transparent text-white placeholder-slate-500 text-xs font-mono focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-500 hover:text-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Live Suggestions Dropdown */}
          {searchDropdownOpen && searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#090D16]/95 backdrop-blur-xl border border-purple-500/40 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in duration-200">
              <div className="p-1.5 space-y-1">
                {searchSuggestions.map(s => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSuggestion(s)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-purple-950/40 hover:border-purple-500/40 border border-transparent cursor-pointer transition-all text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-purple-400 text-sm">
                        {s.category === 'Account' ? 'account_circle' : 'receipt_long'}
                      </span>
                      <div>
                        <p className="font-mono font-bold text-white text-[11px]">{s.id}</p>
                        <p className="text-[9px] text-slate-400">{s.name}</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {s.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTraceSubmit()}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">route</span>
            Trace Money
          </button>

          {Boolean((traceData as any)?.hops && (traceData as any).hops.length > 0) && (
            <button
              onClick={() => {
                setTraceStep(0);
                setTraceIsPlaying(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-bold rounded-xl text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
            >
              <span className="material-symbols-outlined text-base">play_arrow</span>
              Animate Trail
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#0F172A] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'graph'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🔗 Network
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'timeline'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⏱ Timeline
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          3. GRAPH CONTROLS TOOLBAR
      ═══════════════════════════════════════════════════════════════════ */}
      <GraphControls
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onResetView={handleResetView}
        onReheatPhysics={() => {
          // Re-trigger layout
          setLayoutMode(m => (m === 'force' ? 'clusters' : 'force'));
          setTimeout(() => setLayoutMode('force'), 50);
        }}
        minAmountFilter={minAmountFilter}
        onMinAmountChange={setMinAmountFilter}
        riskThresholdFilter={riskThresholdFilter}
        onRiskThresholdChange={setRiskThresholdFilter}
        activeTypeFilters={activeTypeFilters}
        onToggleTypeFilter={handleToggleTypeFilter}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          4. MAIN WORKSPACE (Graph Canvas + Sidebars)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0 gap-3 relative">
        {/* Central Graph Panel */}
        <div
          ref={containerRef}
          className="flex-1 glass-panel rounded-2xl overflow-hidden border border-slate-700/50 relative shadow-2xl"
        >
          {netLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <span className="material-symbols-outlined text-purple-400 text-6xl animate-spin block mb-3">
                  sync
                </span>
                <p className="text-slate-400 text-sm font-mono">
                  Loading Cyber Financial Graph Telemetry...
                </p>
              </div>
            </div>
          ) : viewMode === 'graph' ? (
            <>
              {/* Interactive SVG + Canvas Renderer */}
              <GraphCanvas
                nodes={nodes}
                edges={aggregatedEdges}
                selectedNode={selectedNode}
                onSelectNode={setSelectedNode}
                hoveredNode={hoveredNode}
                onHoverNode={setHoveredNode}
                traceHighlight={traceHighlight}
                cycles={cycles}
                highlightedCycle={highlightedCycle}
                onSelectCycle={setHighlightedCycle}
                minAmountFilter={minAmountFilter}
                riskThresholdFilter={riskThresholdFilter}
                activeTypeFilters={activeTypeFilters}
                transform={transform}
                onTransformChange={setTransform}
              />

              {/* Money Trace Playback Controller Bar */}
              <TracePlayback
                traceData={traceData as any}
                currentHopIndex={traceStep}
                isPlaying={traceIsPlaying}
                onPlayToggle={() => setTraceIsPlaying(!traceIsPlaying)}
                onStepForward={() => setTraceStep(s => Math.min(s + 1, ((traceData as any)?.hops?.length ?? 1) - 1))}
                onStepBackward={() => setTraceStep(s => Math.max(s - 1, 0))}
                onSeekHop={setTraceStep}
                onCloseTrace={() => {
                  setTracingActive(false);
                  setTraceIsPlaying(false);
                  setTraceHighlight(new Set());
                }}
              />
            </>
          ) : (
            /* Timeline View */
            <div className="p-6 overflow-auto h-full space-y-6">
              {(traceData as any)?.hops?.length ? (
                <div className="max-w-2xl mx-auto space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400">
                    Chronological Fund Hop Sequence
                  </h3>
                  {(traceData as any).hops.map((hop: any, i: number) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl glass-panel border border-slate-700/50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center font-mono font-bold text-white text-xs">
                          #{hop.hop_number}
                        </span>
                        <div>
                          <p className="font-mono text-sm text-white">
                            <span className="text-blue-400">{hop.from_account}</span> →{' '}
                            <span className="text-red-400">{hop.to_account}</span>
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">TXN: {hop.transaction_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-white">{formatCurrency(hop.amount)}</p>
                        <p className="text-[10px] text-slate-400">{formatDate(hop.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  Search a Transaction ID or Account above to inspect timeline hops.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ───── Right Side Investigation Panels ───── */}
        <div className="w-84 flex flex-col gap-3 flex-shrink-0 overflow-hidden hidden xl:flex">
          {/* Selected Node Inspector (If node clicked) */}
          {selectedNode ? (
            <NodeInspector
              node={selectedNode}
              edges={aggregatedEdges}
              onClose={() => setSelectedNode(null)}
              onTraceAccount={handleTraceSubmit}
              onFocusCounterparty={focusNodeOnCanvas}
              onAskCopilot={handleAskCopilot}
              onFreezeAccount={handleEmergencyFreeze}
            />
          ) : (
            /* Live Transaction Feed */
            <div className="flex-1 min-h-0">
              <LiveTransactionFeed
                initialTransactions={rawEdges.slice(0, 30).map(e => ({
                  id: e.id,
                  source: e.source,
                  target: e.target,
                  amount: e.amount,
                  risk_score: e.risk_score || 20,
                  timestamp: e.timestamp || new Date().toISOString(),
                }))}
                onSelectTx={(source, target) => {
                  focusNodeOnCanvas(source);
                  setTraceHighlight(new Set([source, target]));
                }}
              />
            </div>
          )}

          {/* Active Online Investigators */}
          <OnlineUsersPanel />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          5. FLOATING FRAUD ALERT CENTER & AI COPILOT BUTTON
      ═══════════════════════════════════════════════════════════════════ */}
      <FraudAlertCenter
        onInvestigateAccount={focusNodeOnCanvas}
        onFreezeAccount={handleEmergencyFreeze}
      />

      {/* Floating "Ask Copilot" Button */}
      <button
        onClick={() => setCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-2xl shadow-purple-900/60 flex items-center gap-2.5 border border-purple-400/40 hover:scale-105 transition-all cursor-pointer"
      >
        <span className="material-symbols-outlined text-xl">psychology</span>
        <span className="text-xs uppercase tracking-wider font-extrabold">Ask Copilot</span>
      </button>

      {/* AI Copilot Slide-over Drawer */}
      <AICopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        initialQuestion={copilotQuestion}
        selectedAccountId={selectedNode?.id}
      />
    </div>
  );
};

export default Flow;