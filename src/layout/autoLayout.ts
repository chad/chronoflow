import dagre from '@dagrejs/dagre';
import type { PatchNode, PatchConnection } from '../patch/types';

interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;      // Horizontal spacing between ranks
  nodeSep?: number;      // Vertical spacing between nodes in same rank
  direction?: 'LR' | 'TB'; // Left-to-right or top-to-bottom
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  nodeWidth: 180,
  nodeHeight: 160,
  rankSep: 80,
  nodeSep: 40,
  direction: 'LR',
};

// Node types that are typically sources (no audio input)
const SOURCE_TYPES = new Set(['oscillator', 'lfo', 'adsr']);

// Node types that should be at the end
const SINK_TYPES = new Set(['output']);

/**
 * Check if a connection is a modulation connection (excluded from layout ranking)
 * Modulation connections go to *_mod ports
 */
function isModulationConnection(conn: PatchConnection): boolean {
  return conn.to.port.endsWith('_mod');
}

/**
 * Compute auto-layout positions for nodes using dagre
 */
export function computeAutoLayout(
  nodes: PatchNode[],
  connections: PatchConnection[],
  options: LayoutOptions = {}
): Map<string, { x: number; y: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Create a new dagre graph
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSep,
    nodesep: opts.nodeSep,
    marginx: 50,
    marginy: 50,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to the graph
  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: opts.nodeWidth,
      height: opts.nodeHeight,
    });
  });

  // Add edges (only non-modulation connections for ranking)
  // Modulation connections don't affect the layout hierarchy
  connections.forEach((conn) => {
    if (!isModulationConnection(conn)) {
      g.setEdge(conn.from.nodeId, conn.to.nodeId);
    }
  });

  // Run the layout algorithm
  dagre.layout(g);

  // Extract positions
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node) => {
    const nodeWithPosition = g.node(node.id);
    if (nodeWithPosition) {
      // Dagre returns center positions, convert to top-left for React Flow
      positions.set(node.id, {
        x: nodeWithPosition.x - opts.nodeWidth / 2,
        y: nodeWithPosition.y - opts.nodeHeight / 2,
      });
    }
  });

  return positions;
}

/**
 * Get the natural rank/order of a node type for layout purposes
 * Lower numbers = further left in LR layout
 */
export function getNodeTypeRank(type: string): number {
  if (SOURCE_TYPES.has(type)) return 0;
  if (SINK_TYPES.has(type)) return 100;
  return 50; // Processing nodes in the middle
}

/**
 * Check if a node has any input connections (audio or modulation)
 */
export function hasInputConnections(
  nodeId: string,
  connections: PatchConnection[]
): boolean {
  return connections.some((c) => c.to.nodeId === nodeId);
}

/**
 * Check if a node has any output connections
 */
export function hasOutputConnections(
  nodeId: string,
  connections: PatchConnection[]
): boolean {
  return connections.some((c) => c.from.nodeId === nodeId);
}
