import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { LayoutResultNode, AggregatedEdge } from '../../utils/graphLayouts';
import { formatCurrency } from '../../utils/formatters';

/* ─────────────────────── Node Theme & Colors ─────────────────────── */
export const NODE_THEMES: Record<string, { bg: string; glow: string; border: string; icon: string; label: string }> = {
  victim:    { bg: '#1D4ED8', glow: 'rgba(59,130,246,0.6)', border: '#3B82F6', icon: 'person', label: 'Victim / Source' },
  normal:    { bg: '#15803D', glow: 'rgba(34,197,94,0.4)',  border: '#22C55E', icon: 'account_balance', label: 'Normal Account' },
  mule:      { bg: '#C2410C', glow: 'rgba(249,115,22,0.6)', border: '#F97316', icon: 'swap_horiz', label: 'Mule Account' },
  high_risk: { bg: '#B91C1C', glow: 'rgba(239,68,68,0.7)',  border: '#EF4444', icon: 'gpp_bad', label: 'High Risk' },
  suspicious:{ bg: '#B45309', glow: 'rgba(245,158,11,0.6)', border: '#F59E0B', icon: 'warning', label: 'Suspicious' },
  collector: { bg: '#7E22CE', glow: 'rgba(168,85,247,0.7)', border: '#A855F7', icon: 'hub', label: 'Collector Node' },
  frozen:    { bg: '#0E7490', glow: 'rgba(6,182,212,0.7)',  border: '#06B6D4', icon: 'ac_unit', label: 'Frozen Asset' },
};

export const BADGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  mule:        { label: 'Mule', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
  circular:    { label: 'Cycle Ring', bg: 'bg-red-50 border-red-200', text: 'text-red-700' },
  high_vel:    { label: 'High Velocity', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  rapid:       { label: 'Rapid Layering', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  collector:   { label: 'Collector Hub', bg: 'bg-violet-50 border-violet-200', text: 'text-violet-700' },
};

/* ─────────────────────── Helper: Quadratic Bezier Curve ─────────────────────── */
function getBezierControlPoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curveOffset: number = 30
) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular vector
  const nx = -dy / len;
  const ny = dx / len;
  return {
    cx: mx + nx * curveOffset,
    cy: my + ny * curveOffset,
  };
}

function getBezierPoint(
  p0: { x: number; y: number },
  p1: { x?: number; y?: number; cx?: number; cy?: number },
  p2: { x: number; y: number },
  t: number
) {
  const p1x = p1.x ?? p1.cx ?? 0;
  const p1y = p1.y ?? p1.cy ?? 0;
  const invT = 1 - t;
  const x = invT * invT * p0.x + 2 * invT * t * p1x + t * t * p2.x;
  const y = invT * invT * p0.y + 2 * invT * t * p1y + t * t * p2.y;
  return { x, y };
}

/* ─────────────────────── Props Interface ─────────────────────── */
export interface GraphCanvasProps {
  nodes: LayoutResultNode[];
  edges: AggregatedEdge[];
  selectedNode: LayoutResultNode | null;
  onSelectNode: (node: LayoutResultNode | null) => void;
  hoveredNode: LayoutResultNode | null;
  onHoverNode: (node: LayoutResultNode | null) => void;
  traceHighlight: Set<string>;
  traceActiveEdge?: { source: string; target: string } | null;
  cycles: string[][];
  highlightedCycle: string[] | null;
  onSelectCycle?: (cycle: string[]) => void;
  minAmountFilter: number;
  riskThresholdFilter: number;
  activeTypeFilters: Set<string>;
  transform: { x: number; y: number; zoom: number };
  onTransformChange: (transform: { x: number; y: number; zoom: number }) => void;
  onNodeDragEnd?: (id: string, x: number, y: number) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  hoveredNode,
  onHoverNode,
  traceHighlight,
  traceActiveEdge,
  cycles,
  highlightedCycle,
  onSelectCycle,
  minAmountFilter,
  riskThresholdFilter,
  activeTypeFilters,
  transform,
  onTransformChange,
  onNodeDragEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Sync internal positions with layout result nodes
  useEffect(() => {
    const posMap = new Map<string, { x: number; y: number }>();
    nodes.forEach(n => posMap.set(n.id, { x: n.x, y: n.y }));
    setNodePositions(posMap);
  }, [nodes]);

  // Fast node lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, LayoutResultNode>();
    nodes.forEach(n => {
      const pos = nodePositions.get(n.id) || { x: n.x, y: n.y };
      map.set(n.id, { ...n, x: pos.x, y: pos.y });
    });
    return map;
  }, [nodes, nodePositions]);

  // Connected nodes & edges for hover highlight
  const { connectedNodeIds, connectedEdgeKeys } = useMemo(() => {
    const cNodes = new Set<string>();
    const cEdges = new Set<string>();
    const active = hoveredNode || selectedNode;
    if (!active) return { connectedNodeIds: cNodes, connectedEdgeKeys: cEdges };

    cNodes.add(active.id);
    edges.forEach(e => {
      if (e.source === active.id) {
        cNodes.add(e.target);
        cEdges.add(`${e.source}->${e.target}`);
      } else if (e.target === active.id) {
        cNodes.add(e.source);
        cEdges.add(`${e.source}->${e.target}`);
      }
    });

    return { connectedNodeIds: cNodes, connectedEdgeKeys: cEdges };
  }, [hoveredNode, selectedNode, edges]);

  // Filtered nodes based on classification filter
  const visibleNodes = useMemo(() => {
    return nodes.filter(n => {
      if (activeTypeFilters.size > 0 && !activeTypeFilters.has(n.type)) return false;
      return true;
    });
  }, [nodes, activeTypeFilters]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);

  // Filtered edges based on threshold & visible nodes
  const visibleEdges = useMemo(() => {
    return edges.filter(e => {
      if (!visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target)) return false;
      if (e.totalAmount < minAmountFilter) return false;
      if (e.maxRisk < riskThresholdFilter) return false;
      return true;
    });
  }, [edges, visibleNodeIds, minAmountFilter, riskThresholdFilter]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan on background / svg click
    if ((e.target as HTMLElement).closest('.node-card')) return;
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId) {
      // Dragging a node
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - transform.x) / transform.zoom;
      const rawY = (e.clientY - rect.top - transform.y) / transform.zoom;

      setNodePositions(prev => {
        const next = new Map(prev);
        next.set(draggedNodeId, { x: rawX, y: rawY });
        return next;
      });
      return;
    }

    if (!isPanningRef.current) return;
    const newX = e.clientX - panStartRef.current.x;
    const newY = e.clientY - panStartRef.current.y;
    onTransformChange({ ...transform, x: newX, y: newY });
  };

  const handleMouseUp = () => {
    if (draggedNodeId) {
      const pos = nodePositions.get(draggedNodeId);
      if (pos && onNodeDragEnd) {
        onNodeDragEnd(draggedNodeId, pos.x, pos.y);
      }
      setDraggedNodeId(null);
    }
    isPanningRef.current = false;
  };

  // Wheel zoom centered on mouse
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const nextZoom = Math.min(Math.max(transform.zoom * zoomFactor, 0.15), 3.5);

    // Keep point under cursor invariant
    const worldX = (mouseX - transform.x) / transform.zoom;
    const worldY = (mouseY - transform.y) / transform.zoom;
    const nextX = mouseX - worldX * nextZoom;
    const nextY = mouseY - worldY * nextZoom;

    onTransformChange({ x: nextX, y: nextY, zoom: nextZoom });
  };

  /* ─────────────────────── Canvas Money Packets System (High Perf) ─────────────────────── */
  const particlesRef = useRef<Array<{
    source: string;
    target: string;
    t: number;
    speed: number;
    color: string;
    size: number;
    amount: number;
    curveOffset: number;
    isLarge: boolean;
  }>>([]);

  useEffect(() => {
    // Generate money packet particles along visible edges (budget capped for 60-120 FPS)
    const particles: typeof particlesRef.current = [];
    const maxParticles = 30;
    let budget = maxParticles;

    visibleEdges.slice(0, 20).forEach((e, idx) => {
      if (budget <= 0) return;
      const isTraced = traceHighlight.has(e.source) && traceHighlight.has(e.target);
      const isLarge = e.totalAmount >= 80000;
      const count = isTraced ? 3 : isLarge ? 2 : 1;
      
      const color = isTraced
        ? '#C084FC'
        : e.maxRisk >= 75
        ? '#EF4444'
        : e.maxRisk >= 45
        ? '#F97316'
        : isLarge
        ? '#38BDF8'
        : '#22C55E';

      const curveOffset = (idx % 2 === 0 ? 1 : -1) * (20 + (idx % 3) * 12);
      const baseSize = isLarge ? 5.5 : isTraced ? 4.5 : 3.2;

      for (let i = 0; i < count && budget > 0; i++) {
        particles.push({
          source: e.source,
          target: e.target,
          t: (i / count + Math.random() * 0.3) % 1,
          speed: isTraced ? 0.009 : isLarge ? 0.006 : 0.0035 + (e.maxRisk / 100) * 0.003,
          color,
          size: baseSize,
          amount: e.totalAmount,
          curveOffset,
          isLarge,
        });
        budget--;
      }
    });
    particlesRef.current = particles;
  }, [visibleEdges, traceHighlight]);

  useEffect(() => {
    let animId = 0;
    let running = true;

    const render = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d', { alpha: true });
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(transform.x, transform.y);
          ctx.scale(transform.zoom, transform.zoom);

          // Fast render moving money packets with high-glow aura
          for (const p of particlesRef.current) {
            const sn = nodeMap.get(p.source);
            const tn = nodeMap.get(p.target);
            if (!sn || !tn) continue;

            p.t += p.speed;
            if (p.t > 1) p.t = 0;

            const ctrl = getBezierControlPoint(sn.x, sn.y, tn.x, tn.y, p.curveOffset);
            const pt = getBezierPoint(sn, ctrl, tn, p.t);

            // Outer Aura
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, p.isLarge ? p.size * 3.2 : p.size * 2.2, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.isLarge ? 0.45 : 0.25;
            ctx.fill();

            // Inner Core Packet
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.isLarge ? '#FFFFFF' : p.color;
            ctx.globalAlpha = 0.95;
            ctx.fill();

            // Core border
            if (p.isLarge) {
              ctx.lineWidth = 1.5;
              ctx.strokeStyle = p.color;
              ctx.stroke();
            }
          }

          ctx.restore();
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      running = false;
      cancelAnimationFrame(animId);
    };
  }, [transform, nodeMap]);

  /* ─────────────────────── Minimap Calculations ─────────────────────── */
  const minimapBounds = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, minY: 0, width: 1000, height: 700 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      const pos = nodePositions.get(n.id) || { x: n.x, y: n.y };
      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.y > maxY) maxY = pos.y;
    });
    const pad = 120;
    return {
      minX: minX - pad,
      minY: minY - pad,
      width: Math.max(maxX - minX + pad * 2, 400),
      height: Math.max(maxY - minY + pad * 2, 300),
    };
  }, [nodes, nodePositions]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none bg-[#090D16] cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* ───── Background Cyber Grid ───── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.12) 0%, transparent 70%),
            linear-gradient(to right, rgba(59, 130, 246, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(59, 130, 246, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: `100% 100%, ${40 * transform.zoom}px ${40 * transform.zoom}px, ${40 * transform.zoom}px ${40 * transform.zoom}px`,
          backgroundPosition: `0 0, ${transform.x}px ${transform.y}px, ${transform.x}px ${transform.y}px`,
        }}
      />

      {/* ───── Canvas for Particle Money Packets (GPU Accelerated) ───── */}
      <canvas
        ref={canvasRef}
        width={containerRef.current?.clientWidth || 1200}
        height={containerRef.current?.clientHeight || 800}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 10 }}
      />

      {/* ───── SVG Layer (Edges, Markers, Laundering Rings) ───── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 5 }}
      >
        <defs>
          {/* Arrowhead Markers */}
          <marker id="arrow-default" markerWidth="9" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill="#475569" />
          </marker>
          <marker id="arrow-green" markerWidth="9" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill="#22C55E" />
          </marker>
          <marker id="arrow-warn" markerWidth="9" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill="#F97316" />
          </marker>
          <marker id="arrow-crit" markerWidth="11" markerHeight="8" refX="28" refY="4" orient="auto">
            <polygon points="0 0, 11 4, 0 8" fill="#EF4444" />
          </marker>
          <marker id="arrow-trace" markerWidth="12" markerHeight="9" refX="28" refY="4.5" orient="auto">
            <polygon points="0 0, 12 4.5, 0 9" fill="#A855F7" />
          </marker>

          {/* Glow Filters */}
          <filter id="glow-purple" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.zoom})`}>
          {/* 1. Laundering Ring Highlight Loop (Only render for selected or focused cycle) */}
          {cycles.length > 0 && (
            (() => {
              // Only render the highlighted cycle, or at most the 1st cycle if highlighted
              const activeCycle = highlightedCycle || (cycles.length > 0 ? cycles[0] : null);
              if (!activeCycle || activeCycle.length < 2) return null;

              const cycleNodes = activeCycle.map(id => nodeMap.get(id)).filter(Boolean) as LayoutResultNode[];
              if (cycleNodes.length < 2) return null;

              const avgX = cycleNodes.reduce((s, n) => s + n.x, 0) / cycleNodes.length;
              const avgY = cycleNodes.reduce((s, n) => s + n.y, 0) / cycleNodes.length;
              const maxDist = Math.max(...cycleNodes.map(n => Math.hypot(n.x - avgX, n.y - avgY)), 70);

              return (
                <g key="focused-cycle-ring" className="transition-opacity duration-300">
                  <circle
                    cx={avgX}
                    cy={avgY}
                    r={maxDist + 35}
                    fill="rgba(239, 68, 68, 0.04)"
                    stroke="#EF4444"
                    strokeWidth={highlightedCycle ? 2 : 1}
                    strokeDasharray="6 4"
                    strokeOpacity={0.6}
                  />
                  {highlightedCycle && (
                    <g transform={`translate(${avgX}, ${avgY - maxDist - 45})`}>
                      <rect
                        x="-70"
                        y="-10"
                        width="140"
                        height="20"
                        rx="10"
                        fill="#7F1D1D"
                        stroke="#EF4444"
                        strokeWidth="1"
                      />
                      <text
                        textAnchor="middle"
                        y="3.5"
                        fill="#FEE2E2"
                        fontSize="9"
                        fontWeight="bold"
                        letterSpacing="0.05em"
                      >
                        🚨 LAUNDERING RING
                      </text>
                    </g>
                  )}
                </g>
              );
            })()
          )}

          {/* 2. Transaction Edges (Quadratic Bezier Curves) */}
          {visibleEdges.map((e, idx) => {
            const sn = nodeMap.get(e.source);
            const tn = nodeMap.get(e.target);
            if (!sn || !tn) return null;

            const isTraced = traceHighlight.has(e.source) && traceHighlight.has(e.target);
            const isHoverConnected = connectedEdgeKeys.has(`${e.source}->${e.target}`);
            const hasFocus = hoveredNode || selectedNode;
            const isDimmed = hasFocus && !isHoverConnected && !isTraced;

            const curveOffset = (idx % 2 === 0 ? 1 : -1) * (20 + (idx % 3) * 12);
            const ctrl = getBezierControlPoint(sn.x, sn.y, tn.x, tn.y, curveOffset);
            const pathData = `M ${sn.x} ${sn.y} Q ${ctrl.cx} ${ctrl.cy} ${tn.x} ${tn.y}`;

            const strokeColor = isTraced
              ? '#A855F7'
              : isHoverConnected
              ? '#38BDF8'
              : e.maxRisk >= 75
              ? '#EF4444'
              : e.maxRisk >= 45
              ? '#F97316'
              : '#334155';

            const marker = isTraced
              ? 'url(#arrow-trace)'
              : e.maxRisk >= 75
              ? 'url(#arrow-crit)'
              : e.maxRisk >= 45
              ? 'url(#arrow-warn)'
              : 'url(#arrow-default)';

            const strokeWidth = isTraced
              ? 3.5
              : isHoverConnected
              ? 3.0
              : Math.max(1.5, Math.min(5, Math.log10(e.totalAmount + 1) * 0.8));

            // Edge label midpoint
            const midPt = getBezierPoint(sn, ctrl, tn, 0.5);

            return (
              <g key={`edge-${e.id}-${idx}`} opacity={isDimmed ? 0.15 : 1} className="transition-opacity duration-200">
                {/* Edge Glow for Traced / High Risk */}
                {(isTraced || isHoverConnected) && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isTraced ? '#A855F7' : '#38BDF8'}
                    strokeWidth={strokeWidth + 4}
                    strokeOpacity={0.4}
                    strokeLinecap="round"
                  />
                )}
                {/* Main Curved Path */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity={isTraced || isHoverConnected ? 1 : 0.75}
                  markerEnd={marker}
                />
                {/* Edge Amount Badge */}
                {(isHoverConnected || isTraced || e.maxRisk >= 70 || transform.zoom > 0.85) && (
                  <g transform={`translate(${midPt.x}, ${midPt.y - 12})`}>
                    <rect
                      x="-38"
                      y="-9"
                      width="76"
                      height="18"
                      rx="9"
                      fill="#0B0F19"
                      stroke={strokeColor}
                      strokeWidth="1"
                      strokeOpacity="0.8"
                    />
                    <text
                      textAnchor="middle"
                      y="3.5"
                      fill={isTraced ? '#E9D5FF' : '#E2E8F0'}
                      fontSize="8.5"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                    >
                      {formatCurrency(e.totalAmount)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* ───── HTML Node Overlay Layer ───── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
          transformOrigin: '0 0',
          zIndex: 20,
        }}
      >
        {visibleNodes.map(n => {
          const pos = nodePositions.get(n.id) || { x: n.x, y: n.y };
          const theme = NODE_THEMES[n.type] || NODE_THEMES.normal;
          const isSelected = selectedNode?.id === n.id;
          const isHovered = hoveredNode?.id === n.id;
          const isTraced = traceHighlight.has(n.id);
          const isConnected = connectedNodeIds.has(n.id);
          const hasFocus = hoveredNode || selectedNode;
          const isDimmed = hasFocus && !isConnected && !isTraced;

          // Detect badges
          const badges: string[] = [];
          if (n.type === 'mule' || n.is_mule) badges.push('mule');
          if (n.type === 'collector') badges.push('collector');
          if (cycles.some(c => c.includes(n.id))) badges.push('circular');
          if (n.out_degree >= 4 && (n.risk_score ?? 0) >= 50) badges.push('high_vel');

          return (
            <div
              key={n.id}
              className={`node-card absolute pointer-events-auto cursor-pointer transition-opacity duration-200 ${
                isDimmed ? 'opacity-25' : 'opacity-100'
              }`}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: isSelected ? 50 : isHovered ? 45 : isTraced ? 40 : 25,
              }}
              onMouseEnter={() => onHoverNode(n)}
              onMouseLeave={() => onHoverNode(null)}
              onClick={e => {
                e.stopPropagation();
                onSelectNode(isSelected ? null : n);
              }}
              onMouseDown={e => {
                e.stopPropagation();
                setDraggedNodeId(n.id);
                dragStartPos.current = { x: e.clientX, y: e.clientY };
              }}
            >
              {/* Pulsing Aura for Traced / High Risk Nodes */}
              {(isTraced || n.type === 'high_risk') && (
                <div
                  className="absolute inset-0 -m-3 rounded-xl animate-pulse pointer-events-none"
                  style={{
                    boxShadow: `0 0 28px 8px ${theme.glow}`,
                  }}
                />
              )}

              {/* Main Node Card Container with LOD */}
              {transform.zoom < 0.65 ? (
                <div
                  className={`relative flex items-center gap-2 rounded-full px-3 py-1.5 backdrop-blur-md transition-all duration-150 ${
                    isSelected
                      ? 'ring-2 ring-purple-400 shadow-card bg-[#0F172A]'
                      : isHovered
                      ? 'shadow-lg bg-[#1E293B]'
                      : 'bg-[#0F172A]/90 shadow-sm'
                  }`}
                  style={{
                    border: `1.5px solid ${isTraced ? '#A855F7' : isSelected ? '#38BDF8' : theme.border}`,
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-gray-900 flex-shrink-0 text-[10px]"
                    style={{ backgroundColor: theme.bg }}
                  >
                    <span className="material-symbols-outlined text-[13px]">{theme.icon}</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-900 font-mono truncate max-w-[80px]">{n.id}</span>
                </div>
              ) : (
                <div
                  className={`relative flex flex-col rounded-xl p-2.5 backdrop-blur-md transition-all duration-200 ${
                    isSelected
                      ? 'ring-2 ring-purple-400 scale-105 shadow-card bg-[#0F172A]'
                      : isHovered
                      ? 'scale-105 shadow-card bg-[#1E293B]/95'
                      : 'bg-[#0F172A]/90 shadow-lg hover:border-slate-500'
                  }`}
                  style={{
                    minWidth: '135px',
                    maxWidth: '160px',
                    border: `1.5px solid ${isTraced ? '#A855F7' : isSelected ? '#38BDF8' : theme.border}`,
                    boxShadow: isSelected || isTraced ? `0 0 20px ${theme.glow}` : undefined,
                  }}
                >
                  {/* Top Row: Icon + Classification Label */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-900 flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: theme.bg }}
                    >
                      <span className="material-symbols-outlined text-base">{theme.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-gray-900 truncate font-mono">{n.id}</p>
                      <span
                        className="text-[8px] font-bold uppercase tracking-wider block truncate"
                        style={{ color: theme.border }}
                      >
                        {theme.label.split('/')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Holder Name */}
                  {n.user_name && (
                    <p className="text-[9px] text-gray-600 font-medium truncate mb-1">
                      {n.user_name}
                    </p>
                  )}

                  {/* Balance & Risk Score */}
                  <div className="flex items-center justify-between text-[9px] pt-1 border-t border-gray-200">
                    <span className="text-gray-500 font-mono">
                      {formatCurrency(n.balance ?? 0)}
                    </span>
                    <span
                      className={`font-mono font-bold px-1.5 py-0.5 rounded text-[8px] ${
                        (n.risk_score ?? 0) >= 75
                          ? 'bg-red-500/20 text-red-400'
                          : (n.risk_score ?? 0) >= 45
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-green-50 text-green-600'
                      }`}
                    >
                      {n.risk_score ?? 0}%
                    </span>
                  </div>

                  {/* Badges */}
                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {badges.map(b => {
                        const cfg = BADGE_CONFIG[b];
                        if (!cfg) return null;
                        return (
                          <span
                            key={b}
                            className={`text-[7.5px] font-bold px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.text} leading-none`}
                          >
                            {cfg.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ───── Interactive Minimap (Bottom-Right Radar) ───── */}
      <div
        className="absolute bottom-4 right-4 w-40 h-28 bg-white border border-gray-200 rounded-xl shadow-card border border-gray-200/60 p-1.5 overflow-hidden shadow-card z-30"
      >
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
            Radar Minimap
          </span>
          <span className="text-[8px] font-mono text-gray-400">{nodes.length} N</span>
        </div>
        <div className="relative w-full h-[calc(100%-18px)] bg-slate-950/80 rounded-lg overflow-hidden border border-gray-200">
          <svg className="w-full h-full" viewBox={`${minimapBounds.minX} ${minimapBounds.minY} ${minimapBounds.width} ${minimapBounds.height}`}>
            {/* Edges in minimap */}
            {visibleEdges.map((e, i) => {
              const sn = nodeMap.get(e.source);
              const tn = nodeMap.get(e.target);
              if (!sn || !tn) return null;
              return (
                <line
                  key={`mini-e-${i}`}
                  x1={sn.x}
                  y1={sn.y}
                  x2={tn.x}
                  y2={tn.y}
                  stroke="#334155"
                  strokeWidth="2"
                  strokeOpacity="0.4"
                />
              );
            })}
            {/* Nodes in minimap */}
            {nodes.map(n => {
              const pos = nodePositions.get(n.id) || { x: n.x, y: n.y };
              const theme = NODE_THEMES[n.type] || NODE_THEMES.normal;
              const isSel = selectedNode?.id === n.id;
              return (
                <circle
                  key={`mini-${n.id}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={isSel ? 8 : 4}
                  fill={theme.border}
                />
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default GraphCanvas;
