import type { PatchNode, PatchConnection, PatchGroup } from '../patch/types';

/**
 * Detect which ports should be exposed when collapsing a group
 * Returns ports that have connections to nodes outside the group
 */
export function detectExposedPorts(
  groupNodeIds: Set<string>,
  connections: PatchConnection[]
): { inputs: { nodeId: string; port: string }[]; outputs: { nodeId: string; port: string }[] } {
  const inputs: { nodeId: string; port: string }[] = [];
  const outputs: { nodeId: string; port: string }[] = [];

  connections.forEach((conn) => {
    const fromInGroup = groupNodeIds.has(conn.from.nodeId);
    const toInGroup = groupNodeIds.has(conn.to.nodeId);

    // Connection going INTO the group from outside
    if (!fromInGroup && toInGroup) {
      // Check if we already have this input
      const exists = inputs.some(
        (i) => i.nodeId === conn.to.nodeId && i.port === conn.to.port
      );
      if (!exists) {
        inputs.push({ nodeId: conn.to.nodeId, port: conn.to.port });
      }
    }

    // Connection going OUT of the group to outside
    if (fromInGroup && !toInGroup) {
      const exists = outputs.some(
        (o) => o.nodeId === conn.from.nodeId && o.port === conn.from.port
      );
      if (!exists) {
        outputs.push({ nodeId: conn.from.nodeId, port: conn.from.port });
      }
    }
  });

  return { inputs, outputs };
}

/**
 * Calculate the center position of a group of nodes
 * Used for placing the collapsed group node
 */
export function calculateGroupCenter(
  nodeIds: string[],
  nodes: PatchNode[]
): { x: number; y: number } {
  const groupNodes = nodes.filter((n) => nodeIds.includes(n.id));
  if (groupNodes.length === 0) {
    return { x: 0, y: 0 };
  }

  const sumX = groupNodes.reduce((sum, n) => sum + n.position.x, 0);
  const sumY = groupNodes.reduce((sum, n) => sum + n.position.y, 0);

  return {
    x: sumX / groupNodes.length,
    y: sumY / groupNodes.length,
  };
}

/**
 * Get all connections that are internal to a group
 * (both endpoints are within the group)
 */
export function getInternalConnections(
  groupNodeIds: Set<string>,
  connections: PatchConnection[]
): PatchConnection[] {
  return connections.filter(
    (c) => groupNodeIds.has(c.from.nodeId) && groupNodeIds.has(c.to.nodeId)
  );
}

/**
 * Get all connections that cross the group boundary
 * (one endpoint inside, one outside)
 */
export function getExternalConnections(
  groupNodeIds: Set<string>,
  connections: PatchConnection[]
): PatchConnection[] {
  return connections.filter((c) => {
    const fromIn = groupNodeIds.has(c.from.nodeId);
    const toIn = groupNodeIds.has(c.to.nodeId);
    return fromIn !== toIn; // XOR - exactly one is in the group
  });
}

/**
 * Remap external connections to point to the collapsed group node
 * Returns new connections with group-level port references
 */
export function remapConnectionsForCollapsedGroup(
  group: PatchGroup,
  connections: PatchConnection[]
): PatchConnection[] {
  const groupNodeIds = new Set(group.nodeIds);

  return connections.map((conn) => {
    const fromInGroup = groupNodeIds.has(conn.from.nodeId);
    const toInGroup = groupNodeIds.has(conn.to.nodeId);

    // Internal connection - keep as-is (will be hidden when collapsed)
    if (fromInGroup && toInGroup) {
      return conn;
    }

    // Connection from outside into group
    if (!fromInGroup && toInGroup) {
      // Find the exposed port alias for this input
      const exposedPort = group.exposedPorts?.find(
        (p) => p.nodeId === conn.to.nodeId && p.port === conn.to.port && p.direction === 'input'
      );
      if (exposedPort) {
        return {
          ...conn,
          to: { nodeId: group.id, port: exposedPort.alias },
        };
      }
    }

    // Connection from group to outside
    if (fromInGroup && !toInGroup) {
      const exposedPort = group.exposedPorts?.find(
        (p) => p.nodeId === conn.from.nodeId && p.port === conn.from.port && p.direction === 'output'
      );
      if (exposedPort) {
        return {
          ...conn,
          from: { nodeId: group.id, port: exposedPort.alias },
        };
      }
    }

    return conn;
  });
}

/**
 * Generate a unique alias for an exposed port
 */
export function generatePortAlias(port: string, existingAliases: Set<string>): string {
  let alias = port;
  let counter = 1;

  while (existingAliases.has(alias)) {
    alias = `${port}_${counter}`;
    counter++;
  }

  return alias;
}
