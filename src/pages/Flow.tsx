import React, { useState, useRef, useEffect } from 'react';
import { useFlowGraphs, useFlowGraph } from '../hooks/useFlow';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatCurrency, formatAddress, formatDate } from '../utils/formatters';

export const Flow: React.FC = () => {
  const { data: graphs, isLoading: graphsLoading, error: graphsError, refetch } = useFlowGraphs();
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'table' | 'timeline'>('graph');
  const [layout, setLayout] = useState<'hierarchical' | 'force' | 'circular'>('hierarchical');
  const [showControls, setShowControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: graphData, isLoading: graphLoading } = useFlowGraph(selectedGraphId || '', {
    enabled: !!selectedGraphId,
  });

  // Mock graph data for visualization
  const mockNodes = [
    { id: '1', label: '0x742d...', type: 'wallet', risk: 85, x: 100, y: 100 },
    { id: '2', label: '0x1a2b...', type: 'exchange', risk: 20, x: 300, y: 100 },
    { id: '3', label: '0x3c4d...', type: 'mixer', risk: 95, x: 500, y: 100 },
    { id: '4', label: '0x5e6f...', type: 'wallet', risk: 60, x: 200, y: 250 },
    { id: '5', label: '0x7g8h...', type: 'wallet', risk: 30, x: 400, y: 250 },
    { id: '6', label: '0x9i0j...', type: 'darknet', risk: 100, x: 600, y: 250 },
  ];

  const mockEdges = [
    { from: '1', to: '2', amount: 15000, currency: 'USDT', timestamp: '2024-01-15' },
    { from: '2', to: '3', amount: 14500, currency: 'USDT', timestamp: '2024-01-15' },
    { from: '3', to: '4', amount: 5000, currency: 'USDT', timestamp: '2024-01-16' },
    { from: '3', to: '5', amount: 4500, currency: 'USDT', timestamp: '2024-01-16' },
    { from: '3', to: '6', amount: 5000, currency: 'USDT', timestamp: '2024-01-16' },
  ];

  const getRiskColor = (risk: number) => {
    if (risk >= 80) return 'text-error';
    if (risk >= 60) return 'text-warning';
    if (risk >= 40) return 'text-secondary';
    return 'text-success';
  };

  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      wallet: 'bg-blue-500',
      exchange: 'bg-green-500',
      mixer: 'bg-purple-500',
      darknet: 'bg-red-500',
      contract: 'bg-orange-500',
      bridge: 'bg-cyan-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      wallet: 'account_balance_wallet',
      exchange: 'account_balance',
      mixer: 'blur_on',
      darknet: 'dark_mode',
      contract: 'integration_instructions',
      bridge: 'swap_horiz',
    };
    return icons[type] || 'help';
  };

  return (
    <div className="space-y-6 animate-in fade-in h-[calc(100vh-200px)] min-h-[600px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Money Flow</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Visualize transaction networks and fund flows
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 glass-panel border border-outline-variant/50 rounded-lg font-body-sm text-body-sm text-on-surface hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[18px] align-middle">filter_list</span>
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg font-body-sm text-body-sm font-medium hover:bg-secondary-container/80 transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="hidden sm:inline">New Graph</span>
          </button>
        </div>
      </div>

      {/* Graph Selector & Controls */}
      <div className="glass-panel rounded-xl p-4 border border-outline-variant/20">
        <div className="flex flex-wrap items-center gap-4">
          {/* Graph Selector */}
          <div className="flex-1 min-w-[280px]">
            <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">Select Graph</label>
            <select
              value={selectedGraphId || ''}
              onChange={(e) => setSelectedGraphId(e.target.value || null)}
              className="w-full bg-surface-container border border-outline-variant/50 rounded-lg py-2 px-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
            >
              <option value="">Choose a flow graph...</option>
              {graphs?.graphs?.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.node_count} nodes, {g.edge_count} edges)
                </option>
              ))}
              <option value="new" className="text-secondary">+ Create New Graph</option>
            </select>
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1">
            {(['graph', 'table', 'timeline'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md font-label-caps text-label-caps transition-all ${
                  viewMode === mode
                    ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Layout (Graph view only) */}
          {viewMode === 'graph' && (
            <div className="flex items-center gap-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant">Layout:</label>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as any)}
                className="bg-surface-container border border-outline-variant/50 rounded-lg py-1.5 px-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
              >
                <option value="hierarchical">Hierarchical</option>
                <option value="force">Force Directed</option>
                <option value="circular">Circular</option>
              </select>
            </div>
          )}

          {/* Controls Toggle */}
          <button
            onClick={() => setShowControls(!showControls)}
            className={`p-2 rounded-lg transition-colors ${showControls ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            aria-label={showControls ? 'Hide controls' : 'Show controls'}
          >
            <span className="material-symbols-outlined text-[20px]">{showControls ? 'control_camera' : 'control_camera_off'}</span>
          </button>
        </div>
      </div>

      {/* Main Visualization Area */}
      <div className="glass-panel rounded-xl overflow-hidden flex-1 min-h-0" style={{ minHeight: '500px' }}>
        {viewMode === 'graph' && (
          <div className="relative h-full" ref={containerRef}>
            {/* Graph Canvas */}
            <div className="absolute inset-0 bg-background" style={{ zIndex: 1 }}>
              {/* Edges */}
              <svg className="absolute inset-0" style={{ pointerEvents: 'none' }}>
                {mockEdges.map((edge, i) => {
                  const fromNode = mockNodes.find(n => n.id === edge.from);
                  const toNode = mockNodes.find(n => n.id === edge.to);
                  if (!fromNode || !toNode) return null;

                  const midX = (fromNode.x + toNode.x) / 2;
                  const midY = (fromNode.y + toNode.y) / 2;

                  return (
                    <g key={i}>
                      <path
                        d={`M${fromNode.x} ${fromNode.y} Q${midX} ${midY - 50} ${toNode.x} ${toNode.y}`}
                        stroke="#E8EAF6"
                        strokeWidth="2"
                        fill="none"
                        markerEnd="url(#arrowhead)"
                      />
                      {/* Amount label */}
                      <text x={midX} y={midY - 60} textAnchor="middle" className="font-body-xs text-body-xs text-on-surface-variant">
                        {formatCurrency(edge.amount)} {edge.currency}
                      </text>
                      <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill="#E8EAF6" />
                        </marker>
                      </defs>
                    </g>
                  );
                })}
              </svg>

              {/* Nodes */}
              {mockNodes.map((node) => (
                <div
                  key={node.id}
                  className="absolute cursor-pointer transition-all duration-200"
                  style={{
                    left: node.x - 60,
                    top: node.y - 40,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                  }}
                  onClick={() => console.log('Node clicked:', node)}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-lg ${getNodeColor(node.type)}`}>
                      <span className="material-symbols-outlined text-on-primary text-[24px]">{getTypeIcon(node.type)}</span>
                    </div>
                    <div className="bg-surface-container/90 backdrop-blur-sm px-2 py-1 rounded-lg text-center min-w-[100px] shadow">
                      <p className="font-mono text-body-xs text-on-surface truncate max-w-[90px]">{node.label}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${getRiskColor(node.risk)}`} />
                        <span className={`font-body-xs text-body-xs font-medium ${getRiskColor(node.risk)}`}>{node.risk}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Legend */}
              <div className="absolute bottom-4 left-4 glass-panel rounded-lg p-3 shadow-lg" style={{ zIndex: 20 }}>
                <p className="font-label-caps text-label-caps text-on-surface mb-2">Node Types</p>
                <div className="flex flex-col gap-1">
                  {['wallet', 'exchange', 'mixer', 'darknet', 'contract', 'bridge'].map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${getNodeColor(type)}`} />
                      <span className="font-body-xs text-body-xs text-on-surface capitalize">{type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Controls Overlay */}
            {showControls && (
              <div className="absolute top-4 right-4 glass-panel rounded-lg p-3 shadow-lg flex flex-col gap-2" style={{ zIndex: 15 }}>
                <button className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors" title="Zoom In">
                  <span className="material-symbols-outlined text-[20px]">zoom_in</span>
                </button>
                <button className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors" title="Zoom Out">
                  <span className="material-symbols-outlined text-[20px]">zoom_out</span>
                </button>
                <button className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors" title="Fit View">
                  <span className="material-symbols-outlined text-[20px]">fit_screen</span>
                </button>
                <button className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors" title="Reset">
                  <span className="material-symbols-outlined text-[20px]">refresh</span>
                </button>
              </div>
            )}
          </div>
        )}

        {viewMode === 'table' && (
          <div className="overflow-auto h-full">
            <table className="w-full">
              <thead className="sticky top-0 bg-surface-container/50">
                <tr className="text-left text-on-surface-variant">
                  <th className="p-4 font-label-caps text-label-caps">From</th>
                  <th className="p-4 font-label-caps text-label-caps">To</th>
                  <th className="p-4 font-label-caps text-label-caps">Amount</th>
                  <th className="p-4 font-label-caps text-label-caps">Currency</th>
                  <th className="p-4 font-label-caps text-label-caps">Time</th>
                  <th className="p-4 font-label-caps text-label-caps">Risk</th>
                </tr>
              </thead>
              <tbody>
                {mockEdges.map((edge, i) => {
                  const fromNode = mockNodes.find(n => n.id === edge.from);
                  const toNode = mockNodes.find(n => n.id === edge.to);
                  return (
                    <tr key={i} className="border-t border-outline-variant/20 hover:bg-surface-container/50">
                      <td className="p-4 font-mono text-body-sm text-on-surface-variant">{formatAddress(edge.from)}</td>
                      <td className="p-4 font-mono text-body-sm text-on-surface-variant">{formatAddress(edge.to)}</td>
                      <td className="p-4 font-body-md text-body-md text-on-surface tabular-nums">{formatCurrency(edge.amount)}</td>
                      <td className="p-4 font-body-sm text-body-sm text-on-surface">{edge.currency}</td>
                      <td className="p-4 font-body-sm text-body-sm text-on-surface-variant">{formatDate(edge.timestamp, 'short')}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-warning" />
                          <span className="font-body-xs text-body-xs text-warning">High</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'timeline' && (
          <div className="p-6 overflow-auto h-full">
            <div className="space-y-4">
              {mockEdges.map((edge, i) => {
                const fromNode = mockNodes.find(n => n.id === edge.from);
                const toNode = mockNodes.find(n => n.id === edge.to);
                return (
                  <div key={i} className="flex gap-4 glass-panel rounded-xl p-4 border border-outline-variant/20">
                    <div className="flex-shrink-0 w-24 text-center">
                      <div className="w-2 h-20 bg-secondary rounded-full mx-auto relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-secondary rounded-full -translate-y-1/2" />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-secondary rounded-full translate-y-1/2" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">{formatDate(edge.timestamp, 'time')}</span>
                        <span className="font-label-caps text-label-caps bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded">TRANSFER</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-body-sm text-on-surface-variant">{fromNode?.label}</span>
                        <span className="material-symbols-outlined text-secondary text-[18px]">arrow_forward</span>
                        <span className="font-mono text-body-sm text-on-surface-variant">{toNode?.label}</span>
                        <span className="font-body-md text-body-md text-on-surface font-medium ml-2">{formatCurrency(edge.amount)} {edge.currency}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-32 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="w-2 h-2 rounded-full bg-warning" />
                        <span className="font-body-xs text-body-xs text-warning">High Risk</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!selectedGraphId && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <span className="material-symbols-outlined text-outline-variant text-[64px] block mb-4">account_tree</span>
              <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2">Select a Flow Graph</h3>
              <p className="font-body-md text-on-surface-variant mb-6">Choose a graph from the dropdown to visualize money flows</p>
              <button className="px-6 py-3 bg-secondary-container text-on-secondary-container rounded-lg font-body-md font-medium hover:bg-secondary-container/80 transition-colors flex items-center gap-2 mx-auto">
                <span className="material-symbols-outlined text-[20px]">add</span>
                Create New Graph
              </button>
            </div>
          </div>
        )}
      </div>

      {graphsError && (
        <div className="glass-panel rounded-xl p-6 text-center">
          <span className="material-symbols-outlined text-error text-[48px] block mb-2">error</span>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-1">Failed to load graphs</h3>
          <p className="font-body-md text-on-surface-variant mb-4">{graphsError}</p>
          <button onClick={() => refetch()} className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg font-body-sm font-medium hover:bg-secondary-container/80 transition-colors">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default Flow;