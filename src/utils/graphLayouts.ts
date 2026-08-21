/* ─────────────────────────────────────────────────────────────
 * MoneyTrace - Multi-Mode Graph Layout Engine & Utilities
 * Physics Simulation, Hierarchical Flow, Circular Rings & Risk Clusters
 * ───────────────────────────────────────────────────────────── */

export interface RawNode {
  id: string;
  label?: string;
  user_name?: string;
  user_email?: string;
  balance?: number;
  status?: string;
  risk_score?: number;
  is_flagged?: boolean;
  is_mule?: boolean;
  type?: string;
  [key: string]: any;
}

export interface RawEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  timestamp?: string;
  risk_score?: number;
  is_flagged?: boolean;
  [key: string]: any;
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  radius?: number;
}

export interface LayoutResultNode extends RawNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: string;
  in_degree: number;
  out_degree: number;
  total_inflow: number;
  total_outflow: number;
}

export interface AggregatedEdge {
  id: string;
  source: string;
  target: string;
  totalAmount: number;
  count: number;
  maxRisk: number;
  isFlagged: boolean;
  latestTimestamp?: string;
  rawEdges: RawEdge[];
}

export type LayoutMode = 'force' | 'hierarchical' | 'circular' | 'clusters';

/* ─────────────────────── Node Classification ─────────────────────── */
export function classifyNode(
  n: RawNode,
  muleIds: Set<string> = new Set(),
  collectorIds: Set<string> = new Set()
): string {
  if (n.status === 'frozen') return 'frozen';
  if (collectorIds.has(n.id)) return 'collector';
  if (muleIds.has(n.id) || n.is_mule) return 'mule';
  const risk = n.risk_score ?? 0;
  if (risk >= 80 || n.is_flagged) return 'high_risk';
  if (risk >= 40) return 'suspicious';
  if (risk <= 15) return 'victim';
  return 'normal';
}

/* ─────────────────────── Edge Aggregator ─────────────────────── */
export function aggregateEdges(edges: RawEdge[]): AggregatedEdge[] {
  const edgeMap = new Map<string, AggregatedEdge>();

  for (const e of edges) {
    if (!e.source || !e.target) continue;
    const key = `${e.source}->${e.target}`;
    const existing = edgeMap.get(key);

    if (existing) {
      existing.totalAmount += Number(e.amount) || 0;
      existing.count += 1;
      existing.maxRisk = Math.max(existing.maxRisk, Number(e.risk_score) || 0);
      existing.isFlagged = existing.isFlagged || Boolean(e.is_flagged);
      if (e.timestamp && (!existing.latestTimestamp || e.timestamp > existing.latestTimestamp)) {
        existing.latestTimestamp = e.timestamp;
      }
      existing.rawEdges.push(e);
    } else {
      edgeMap.set(key, {
        id: e.id || `agg_${e.source}_${e.target}`,
        source: e.source,
        target: e.target,
        totalAmount: Number(e.amount) || 0,
        count: 1,
        maxRisk: Number(e.risk_score) || 0,
        isFlagged: Boolean(e.is_flagged),
        latestTimestamp: e.timestamp,
        rawEdges: [e],
      });
    }
  }

  return Array.from(edgeMap.values());
}

/* ─────────────────────── Degree & Flow Calculator ─────────────────────── */
function computeNodeStats(nodes: RawNode[], edges: RawEdge[]) {
  const inDeg = new Map<string, number>();
  const outDeg = new Map<string, number>();
  const inflow = new Map<string, number>();
  const outflow = new Map<string, number>();

  nodes.forEach(n => {
    inDeg.set(n.id, 0);
    outDeg.set(n.id, 0);
    inflow.set(n.id, 0);
    outflow.set(n.id, 0);
  });

  edges.forEach(e => {
    const amt = Number(e.amount) || 0;
    if (inDeg.has(e.target)) {
      inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
      inflow.set(e.target, (inflow.get(e.target) || 0) + amt);
    }
    if (outDeg.has(e.source)) {
      outDeg.set(e.source, (outDeg.get(e.source) || 0) + 1);
      outflow.set(e.source, (outflow.get(e.source) || 0) + amt);
    }
  });

  return { inDeg, outDeg, inflow, outflow };
}

/* ─────────────────────── 1. FORCE-DIRECTED SIMULATION ─────────────────────── */
export function layoutForceDirected(
  rawNodes: RawNode[],
  rawEdges: RawEdge[],
  w: number,
  h: number,
  iterations: number = 80
): LayoutResultNode[] {
  if (rawNodes.length === 0) return [];
  const { inDeg, outDeg, inflow, outflow } = computeNodeStats(rawNodes, rawEdges);
  const cx = w / 2;
  const cy = h / 2;

  // Node collision & repulsion constants tuned for optimal card spacing
  const count = rawNodes.length;
  const NODE_RADIUS = 110;
  const REPULSION_K = Math.max(85000, count * 3200);
  const SPRING_LENGTH = 220;
  const SPRING_K = 0.035;
  const CENTER_GRAVITY = 0.005;

  // Initial circular seeding with wide radius
  const radius = Math.max(Math.min(w, h) * 0.42, 280);
  const nodes: LayoutResultNode[] = rawNodes.map((n, i) => {
    const angle = (i / count) * Math.PI * 2;
    const jitter = (Math.random() - 0.5) * 60;
    return {
      ...n,
      x: cx + Math.cos(angle) * radius + jitter,
      y: cy + Math.sin(angle) * radius + jitter,
      vx: 0,
      vy: 0,
      type: n.type || 'normal',
      in_degree: inDeg.get(n.id) || 0,
      out_degree: outDeg.get(n.id) || 0,
      total_inflow: inflow.get(n.id) || 0,
      total_outflow: outflow.get(n.id) || 0,
    };
  });

  const nodeMap = new Map<string, LayoutResultNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const aggEdges = aggregateEdges(rawEdges);

  // Physics loop
  let alpha = 1.0;
  const alphaDecay = 1 - Math.pow(0.001, 1 / iterations);

  for (let iter = 0; iter < iterations; iter++) {
    alpha += (0 - alpha) * alphaDecay;

    // 1. Center gravity (gentle)
    for (const n of nodes) {
      n.vx += (cx - n.x) * CENTER_GRAVITY * alpha;
      n.vy += (cy - n.y) * CENTER_GRAVITY * alpha;
    }

    // 2. Repulsion & Collision avoidance between all pairs
    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        let dx = n2.x - n1.x;
        let dy = n2.y - n1.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (dist < 1) {
          dx = (Math.random() - 0.5) * 2;
          dy = (Math.random() - 0.5) * 2;
          dist = Math.sqrt(dx * dx + dy * dy) || 1;
        }

        // Coulomb repulsion
        const force = (REPULSION_K / (dist * dist)) * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        n1.vx -= fx;
        n1.vy -= fy;
        n2.vx += fx;
        n2.vy += fy;

        // Hard collision resolution
        const minDist = NODE_RADIUS * 2;
        if (dist < minDist) {
          const overlap = (minDist - dist) * 0.5;
          const pushX = (dx / dist) * overlap * 0.9;
          const pushY = (dy / dist) * overlap * 0.9;
          n1.x -= pushX;
          n1.y -= pushY;
          n2.x += pushX;
          n2.y += pushY;
        }
      }
    }

    // 3. Spring attraction along edges
    for (const edge of aggEdges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target || source.id === target.id) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Log volume weighting
      const weight = Math.log10(Math.max(edge.totalAmount, 10)) * 0.1;
      const strength = (dist - SPRING_LENGTH) * SPRING_K * (1 + weight) * alpha;

      const fx = (dx / dist) * strength;
      const fy = (dy / dist) * strength;

      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    // 4. Update positions with velocity damping
    const velocityDamping = 0.78;
    for (const n of nodes) {
      n.vx *= velocityDamping;
      n.vy *= velocityDamping;

      // Cap max velocity
      const maxV = 35 * alpha;
      const vLen = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (vLen > maxV) {
        n.vx = (n.vx / vLen) * maxV;
        n.vy = (n.vy / vLen) * maxV;
      }

      n.x += n.vx;
      n.y += n.vy;

      // Constrain inside bounds with soft wall repulsion
      const margin = 100;
      if (n.x < margin) n.vx += (margin - n.x) * 0.2;
      if (n.x > w - margin) n.vx += (w - margin - n.x) * 0.2;
      if (n.y < margin) n.vy += (margin - n.y) * 0.2;
      if (n.y > h - margin) n.vy += (h - margin - n.y) * 0.2;
    }
  }

  return nodes;
}

/* ─────────────────────── 2. HIERARCHICAL FUND FLOW (DAG) ─────────────────────── */
export function layoutHierarchical(
  rawNodes: RawNode[],
  rawEdges: RawEdge[],
  w: number,
  h: number
): LayoutResultNode[] {
  if (rawNodes.length === 0) return [];
  const { inDeg, outDeg, inflow, outflow } = computeNodeStats(rawNodes, rawEdges);

  // Adjacency graph
  const adj = new Map<string, string[]>();
  rawNodes.forEach(n => adj.set(n.id, []));
  rawEdges.forEach(e => adj.get(e.source)?.push(e.target));

  // Determine ranks:
  // Rank 0: Sources / Victims (inDeg === 0 or highest net outflow)
  // Rank 1..k: Intermediate Mules / Layering
  // Rank Max: Destination Collectors
  const ranks = new Map<string, number>();
  const visited = new Set<string>();

  // Find root nodes
  const rootNodes = rawNodes.filter(n => (inDeg.get(n.id) || 0) === 0);
  if (rootNodes.length === 0) {
    // If all have incoming edges, sort by outDeg / inDeg ratio
    const sorted = [...rawNodes].sort(
      (a, b) => (outDeg.get(b.id) || 0) - (inDeg.get(b.id) || 0) - ((outDeg.get(a.id) || 0) - (inDeg.get(a.id) || 0))
    );
    rootNodes.push(sorted[0]);
  }

  // BFS / Longest path to assign ranks
  const queue: Array<{ id: string; rank: number }> = rootNodes.map(n => ({ id: n.id, rank: 0 }));
  rootNodes.forEach(n => ranks.set(n.id, 0));

  let head = 0;
  while (head < queue.length) {
    const { id, rank } = queue[head++];
    const neighbors = adj.get(id) || [];

    for (const nextId of neighbors) {
      const currentRank = ranks.get(nextId) ?? -1;
      const nextRank = Math.min(rank + 1, 6); // Max 7 layers to avoid horizontal over-stretching
      if (nextRank > currentRank) {
        ranks.set(nextId, nextRank);
        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push({ id: nextId, rank: nextRank });
        }
      }
    }
  }

  // Assign any unvisited nodes based on their classification
  rawNodes.forEach(n => {
    if (!ranks.has(n.id)) {
      if (n.type === 'victim') ranks.set(n.id, 0);
      else if (n.type === 'collector') ranks.set(n.id, 4);
      else if (n.type === 'mule') ranks.set(n.id, 2);
      else ranks.set(n.id, 1);
    }
  });

  // Group nodes by rank
  const rankBuckets = new Map<number, string[]>();
  ranks.forEach((r, id) => {
    if (!rankBuckets.has(r)) rankBuckets.set(r, []);
    rankBuckets.get(r)!.push(id);
  });

  const sortedRanks = Array.from(rankBuckets.keys()).sort((a, b) => a - b);
  const totalRanks = sortedRanks.length;

  const padX = 140;
  const padY = 110;
  const usableW = Math.max(w - padX * 2, 700);
  const usableH = Math.max(h - padY * 2, 500);

  const positions = new Map<string, { x: number; y: number }>();

  sortedRanks.forEach((rank, colIdx) => {
    const nodeIds = rankBuckets.get(rank)!;
    const x = totalRanks > 1 ? padX + (colIdx / (totalRanks - 1)) * usableW : w / 2;

    // Distribute vertically in multi-columns if dense (avoid single vertical overlap)
    const countInRank = nodeIds.length;
    const MAX_PER_COL = 6;
    const subCols = Math.ceil(countInRank / MAX_PER_COL);
    const subColWidth = 120;

    nodeIds.forEach((id, idx) => {
      const subCol = idx % subCols;
      const row = Math.floor(idx / subCols);
      const rowsInSubCol = Math.ceil(countInRank / subCols);

      const actualX = x + (subCol - (subCols - 1) / 2) * subColWidth;
      const y = rowsInSubCol > 1 ? padY + (row / (rowsInSubCol - 1)) * usableH : h / 2;

      positions.set(id, { x: actualX, y });
    });
  });

  return rawNodes.map(n => ({
    ...n,
    x: positions.get(n.id)?.x ?? w / 2,
    y: positions.get(n.id)?.y ?? h / 2,
    vx: 0,
    vy: 0,
    type: n.type || 'normal',
    in_degree: inDeg.get(n.id) || 0,
    out_degree: outDeg.get(n.id) || 0,
    total_inflow: inflow.get(n.id) || 0,
    total_outflow: outflow.get(n.id) || 0,
  }));
}

/* ─────────────────────── 3. CIRCULAR RING LAYOUT ─────────────────────── */
export function layoutCircularRings(
  rawNodes: RawNode[],
  rawEdges: RawEdge[],
  w: number,
  h: number,
  cycles: string[][] = []
): LayoutResultNode[] {
  if (rawNodes.length === 0) return [];
  const { inDeg, outDeg, inflow, outflow } = computeNodeStats(rawNodes, rawEdges);
  const cx = w / 2;
  const cy = h / 2;

  const positions = new Map<string, { x: number; y: number }>();
  const cycleNodeIds = new Set<string>();

  // Extract unique nodes in cycles
  cycles.forEach(cycle => {
    cycle.forEach(id => cycleNodeIds.add(id));
  });

  const innerRingNodes = rawNodes.filter(n => cycleNodeIds.has(n.id) || n.is_mule || n.type === 'mule');
  const outerNodes = rawNodes.filter(n => !innerRingNodes.some(rn => rn.id === n.id));

  // 1. Inner Circle: Laundering Rings & Mule Nodes
  const innerRadius = Math.min(w, h) * 0.26;
  innerRingNodes.forEach((n, i) => {
    const angle = (i / Math.max(innerRingNodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
    positions.set(n.id, {
      x: cx + Math.cos(angle) * innerRadius,
      y: cy + Math.sin(angle) * innerRadius,
    });
  });

  // 2. Outer Circle: Sources (Victims) and Collectors / Normal accounts
  const outerRadius = Math.min(w, h) * 0.44;
  outerNodes.forEach((n, i) => {
    const angle = (i / Math.max(outerNodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
    positions.set(n.id, {
      x: cx + Math.cos(angle) * outerRadius,
      y: cy + Math.sin(angle) * outerRadius,
    });
  });

  return rawNodes.map(n => ({
    ...n,
    x: positions.get(n.id)?.x ?? cx,
    y: positions.get(n.id)?.y ?? cy,
    vx: 0,
    vy: 0,
    type: n.type || 'normal',
    in_degree: inDeg.get(n.id) || 0,
    out_degree: outDeg.get(n.id) || 0,
    total_inflow: inflow.get(n.id) || 0,
    total_outflow: outflow.get(n.id) || 0,
  }));
}

/* ─────────────────────── 4. RISK CLUSTERS LAYOUT ─────────────────────── */
export function layoutRiskClusters(
  rawNodes: RawNode[],
  rawEdges: RawEdge[],
  w: number,
  h: number
): LayoutResultNode[] {
  if (rawNodes.length === 0) return [];
  const { inDeg, outDeg, inflow, outflow } = computeNodeStats(rawNodes, rawEdges);
  const cx = w / 2;
  const cy = h / 2;

  // Group by classification
  const groups: Record<string, RawNode[]> = {
    victim: [],
    mule: [],
    collector: [],
    high_risk: [],
    suspicious: [],
    normal: [],
    frozen: [],
  };

  rawNodes.forEach(n => {
    const t = n.type || 'normal';
    if (groups[t]) groups[t].push(n);
    else groups.normal.push(n);
  });

  // Define cluster orbital centers
  const clusterCenters: Record<string, { x: number; y: number; label: string }> = {
    victim: { x: cx - w * 0.32, y: cy - h * 0.22, label: 'Victims / Sources' },
    mule: { x: cx, y: cy, label: 'Mule Layer' },
    collector: { x: cx + w * 0.32, y: cy + h * 0.22, label: 'Collector Hubs' },
    high_risk: { x: cx + w * 0.28, y: cy - h * 0.22, label: 'High Risk' },
    suspicious: { x: cx - w * 0.15, y: cy + h * 0.28, label: 'Suspicious' },
    normal: { x: cx - w * 0.32, y: cy + h * 0.22, label: 'Normal' },
    frozen: { x: cx + w * 0.15, y: cy - h * 0.28, label: 'Frozen Assets' },
  };

  const positions = new Map<string, { x: number; y: number }>();

  Object.entries(groups).forEach(([type, nodesInGroup]) => {
    if (nodesInGroup.length === 0) return;
    const center = clusterCenters[type] || { x: cx, y: cy };
    const clusterRadius = Math.max(50, Math.min(180, nodesInGroup.length * 28));

    nodesInGroup.forEach((n, i) => {
      if (nodesInGroup.length === 1) {
        positions.set(n.id, { x: center.x, y: center.y });
      } else {
        const angle = (i / nodesInGroup.length) * Math.PI * 2;
        positions.set(n.id, {
          x: center.x + Math.cos(angle) * clusterRadius,
          y: center.y + Math.sin(angle) * clusterRadius,
        });
      }
    });
  });

  return rawNodes.map(n => ({
    ...n,
    x: positions.get(n.id)?.x ?? cx,
    y: positions.get(n.id)?.y ?? cy,
    vx: 0,
    vy: 0,
    type: n.type || 'normal',
    in_degree: inDeg.get(n.id) || 0,
    out_degree: outDeg.get(n.id) || 0,
    total_inflow: inflow.get(n.id) || 0,
    total_outflow: outflow.get(n.id) || 0,
  }));
}

/* ─────────────────────── Bounding Box Calculator ─────────────────────── */
export function calculateBoundingBox(nodes: LayoutResultNode[], pad: number = 80) {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 1000, maxY: 700, width: 1000, height: 700 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  });

  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
    width: Math.max(maxX - minX + pad * 2, 400),
    height: Math.max(maxY - minY + pad * 2, 300),
  };
}
