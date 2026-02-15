// Clipboard - copy/paste nodes with connections

import { nanoid } from 'nanoid';
import type { PatchNode, PatchConnection } from './types';

export interface ClipboardData {
  nodes: PatchNode[];
  connections: PatchConnection[];
}

let clipboard: ClipboardData | null = null;

export function copyNodes(
  nodeIds: string[],
  allNodes: PatchNode[],
  allConnections: PatchConnection[]
): void {
  const nodeIdSet = new Set(nodeIds);
  const nodes = allNodes.filter((n) => nodeIdSet.has(n.id));
  // Only copy connections that are fully internal to the selection
  const connections = allConnections.filter(
    (c) => nodeIdSet.has(c.from.nodeId) && nodeIdSet.has(c.to.nodeId)
  );
  clipboard = { nodes, connections };
}

export function pasteNodes(
  offset: { x: number; y: number }
): { nodes: PatchNode[]; connections: PatchConnection[] } | null {
  if (!clipboard || clipboard.nodes.length === 0) return null;

  const idMap = new Map<string, string>();

  // Calculate center of copied nodes
  let cx = 0, cy = 0;
  clipboard.nodes.forEach((n) => { cx += n.position.x; cy += n.position.y; });
  cx /= clipboard.nodes.length;
  cy /= clipboard.nodes.length;

  const nodes: PatchNode[] = clipboard.nodes.map((n) => {
    const newId = nanoid(8);
    idMap.set(n.id, newId);
    return {
      ...n,
      id: newId,
      position: {
        x: n.position.x - cx + offset.x,
        y: n.position.y - cy + offset.y,
      },
      // Deep-copy params
      params: { ...n.params },
    };
  });

  const connections: PatchConnection[] = clipboard.connections.map((c) => ({
    id: nanoid(8),
    from: {
      nodeId: idMap.get(c.from.nodeId) || c.from.nodeId,
      port: c.from.port,
    },
    to: {
      nodeId: idMap.get(c.to.nodeId) || c.to.nodeId,
      port: c.to.port,
    },
  }));

  return { nodes, connections };
}

export function hasClipboard(): boolean {
  return clipboard !== null && clipboard.nodes.length > 0;
}
