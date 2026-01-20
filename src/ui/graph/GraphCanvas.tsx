import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  SelectionMode,
} from '@xyflow/react';
import type {
  Node,
  Edge,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  NodeChange,
  EdgeChange,
  OnSelectionChangeFunc,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodeTypes';
import { usePatchStore } from '../../patch/patchStore';
import type { PatchNode, PatchConnection, PatchGroup } from '../../patch/types';
import { remapConnectionsForCollapsedGroup } from '../../layout/groupUtils';

// Convert patch nodes to React Flow nodes
function patchNodesToFlowNodes(
  patchNodes: PatchNode[],
  groups: PatchGroup[],
  focusedGroupId: string | null
): Node[] {
  // Get all collapsed group node IDs
  const collapsedGroupNodeIds = new Set<string>();
  groups.forEach((g) => {
    if (g.collapsed) {
      g.nodeIds.forEach((id) => collapsedGroupNodeIds.add(id));
    }
  });

  // If focused on a group, only show nodes in that group
  let visibleNodes = patchNodes;
  if (focusedGroupId) {
    const focusedGroup = groups.find((g) => g.id === focusedGroupId);
    if (focusedGroup) {
      const focusedNodeIds = new Set(focusedGroup.nodeIds);
      visibleNodes = patchNodes.filter((n) => focusedNodeIds.has(n.id));
    }
  } else {
    // At root level, hide nodes that are in collapsed groups
    visibleNodes = patchNodes.filter((n) => !collapsedGroupNodeIds.has(n.id));
  }

  const flowNodes: Node[] = visibleNodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.params,
    selected: false,
  }));

  // Add collapsed group nodes at root level
  if (!focusedGroupId) {
    groups.forEach((group) => {
      if (group.collapsed) {
        flowNodes.push({
          id: group.id,
          type: 'group',
          position: group.collapsedPosition,
          data: {
            name: group.name,
            exposedPorts: group.exposedPorts,
            color: group.color,
          },
          selected: false,
        });
      }
    });
  }

  return flowNodes;
}

// Convert patch connections to React Flow edges
function patchConnectionsToFlowEdges(
  connections: PatchConnection[],
  groups: PatchGroup[],
  focusedGroupId: string | null
): Edge[] {
  // For collapsed groups, remap external connections
  let processedConnections = [...connections];
  groups.forEach((group) => {
    if (group.collapsed && !focusedGroupId) {
      processedConnections = remapConnectionsForCollapsedGroup(group, processedConnections);
    }
  });

  // If focused on a group, only show connections within that group
  if (focusedGroupId) {
    const focusedGroup = groups.find((g) => g.id === focusedGroupId);
    if (focusedGroup) {
      const focusedNodeIds = new Set(focusedGroup.nodeIds);
      processedConnections = processedConnections.filter(
        (c) => focusedNodeIds.has(c.from.nodeId) && focusedNodeIds.has(c.to.nodeId)
      );
    }
  } else {
    // At root level, filter out connections that are fully internal to collapsed groups
    const collapsedGroupNodeIds = new Set<string>();
    groups.forEach((g) => {
      if (g.collapsed) {
        g.nodeIds.forEach((id) => collapsedGroupNodeIds.add(id));
      }
    });

    processedConnections = processedConnections.filter((c) => {
      const fromInCollapsed = collapsedGroupNodeIds.has(c.from.nodeId);
      const toInCollapsed = collapsedGroupNodeIds.has(c.to.nodeId);
      // Keep if not both in collapsed groups (or if remapped to group node)
      return !(fromInCollapsed && toInCollapsed);
    });
  }

  return processedConnections.map((conn) => ({
    id: conn.id,
    source: conn.from.nodeId,
    sourceHandle: conn.from.port,
    target: conn.to.nodeId,
    targetHandle: conn.to.port,
    type: 'default',
    animated: true,
    style: { stroke: '#06b6d4', strokeWidth: 2 },
  }));
}

export function GraphCanvas() {
  const patch = usePatchStore((state) => state.patch);
  const updateNodePosition = usePatchStore((state) => state.updateNodePosition);
  const addConnection = usePatchStore((state) => state.addConnection);
  const removeConnection = usePatchStore((state) => state.removeConnection);
  const removeNode = usePatchStore((state) => state.removeNode);
  const selectNode = usePatchStore((state) => state.selectNode);
  const setSelectedNodeIds = usePatchStore((state) => state.setSelectedNodeIds);
  const selectedNodeIds = usePatchStore((state) => state.selectedNodeIds);
  const focusedGroupId = usePatchStore((state) => state.focusedGroupId);
  const autoLayoutNodes = usePatchStore((state) => state.autoLayoutNodes);
  const createGroup = usePatchStore((state) => state.createGroup);
  const collapseGroup = usePatchStore((state) => state.collapseGroup);
  const diveIntoGroup = usePatchStore((state) => state.diveIntoGroup);
  const exitGroup = usePatchStore((state) => state.exitGroup);
  const deleteGroup = usePatchStore((state) => state.deleteGroup);

  // Get the current focused group for breadcrumb
  const focusedGroup = useMemo(
    () => patch.groups.find((g) => g.id === focusedGroupId),
    [patch.groups, focusedGroupId]
  );

  // Convert patch state to React Flow format
  const initialNodes = useMemo(
    () => patchNodesToFlowNodes(patch.nodes, patch.groups, focusedGroupId),
    [patch.nodes, patch.groups, focusedGroupId]
  );
  const initialEdges = useMemo(
    () => patchConnectionsToFlowEdges(patch.connections, patch.groups, focusedGroupId),
    [patch.connections, patch.groups, focusedGroupId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes from patch when it changes
  useMemo(() => {
    setNodes(patchNodesToFlowNodes(patch.nodes, patch.groups, focusedGroupId));
  }, [patch.nodes, patch.groups, focusedGroupId, setNodes]);

  useMemo(() => {
    setEdges(patchConnectionsToFlowEdges(patch.connections, patch.groups, focusedGroupId));
  }, [patch.connections, patch.groups, focusedGroupId, setEdges]);

  // Handle node position changes
  const handleNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position);
        }
        if (change.type === 'remove') {
          removeNode(change.id);
        }
        if (change.type === 'select') {
          selectNode(change.selected ? change.id : null);
        }
      });
    },
    [onNodesChange, updateNodePosition, removeNode, selectNode]
  );

  // Handle edge changes
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);

      changes.forEach((change) => {
        if (change.type === 'remove') {
          removeConnection(change.id);
        }
      });
    },
    [onEdgesChange, removeConnection]
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        const id = addConnection(
          connection.source,
          connection.sourceHandle || 'output',
          connection.target,
          connection.targetHandle || 'input'
        );
        if (id) {
          setEdges((eds) =>
            addEdge(
              {
                ...connection,
                id,
                animated: true,
                style: { stroke: '#06b6d4', strokeWidth: 2 },
              },
              eds
            )
          );
        }
      }
    },
    [addConnection, setEdges]
  );

  // Handle multi-selection changes
  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      const ids = selectedNodes.map((n) => n.id);
      setSelectedNodeIds(ids);
    },
    [setSelectedNodeIds]
  );

  // Handle creating a group from selection
  const handleCreateGroup = useCallback(() => {
    if (selectedNodeIds.length >= 2) {
      // Filter out any group nodes from selection
      const nodeOnlyIds = selectedNodeIds.filter(
        (id) => !id.startsWith('group_')
      );
      if (nodeOnlyIds.length >= 2) {
        const name = prompt('Enter group name:', 'New Group');
        if (name) {
          createGroup(name, nodeOnlyIds);
        }
      }
    }
  }, [selectedNodeIds, createGroup]);

  // Handle double-click on a group node to dive in
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id.startsWith('group_')) {
        diveIntoGroup(node.id);
      }
    },
    [diveIntoGroup]
  );

  // Get non-collapsed groups for the groups panel
  const activeGroups = useMemo(
    () => patch.groups.filter((g) => !g.collapsed),
    [patch.groups]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeDoubleClick={handleNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[10, 10]}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
      >
        <Controls className="!bg-gray-800 !border-gray-600 !rounded-lg" />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#374151" />

        {/* Toolbar Panel */}
        <Panel position="top-left" className="flex gap-2">
          <button
            onClick={autoLayoutNodes}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md border border-gray-600 transition-colors"
            title="Auto Layout (arrange nodes)"
          >
            Auto Layout
          </button>

          {selectedNodeIds.length >= 2 && (
            <button
              onClick={handleCreateGroup}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-md border border-indigo-500 transition-colors"
              title="Create Group (Cmd+G)"
            >
              Create Group ({selectedNodeIds.length})
            </button>
          )}
        </Panel>

        {/* Groups Panel */}
        {activeGroups.length > 0 && !focusedGroupId && (
          <Panel position="top-right" className="bg-gray-800 border border-gray-600 rounded-lg p-2 max-w-xs">
            <div className="text-xs text-gray-400 mb-2 font-medium">Groups</div>
            <div className="space-y-1">
              {activeGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between gap-2 text-sm bg-gray-700 rounded px-2 py-1"
                >
                  <span className="text-white truncate">{group.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => collapseGroup(group.id)}
                      className="text-gray-400 hover:text-white text-xs"
                      title="Collapse"
                    >
                      [-]
                    </button>
                    <button
                      onClick={() => diveIntoGroup(group.id)}
                      className="text-cyan-400 hover:text-cyan-300 text-xs"
                      title="Dive In"
                    >
                      {'[>]'}
                    </button>
                    <button
                      onClick={() => deleteGroup(group.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                      title="Delete Group"
                    >
                      [x]
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Breadcrumb Navigation (when inside a group) */}
        {focusedGroupId && focusedGroup && (
          <Panel position="top-center" className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5">
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={exitGroup}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Root
              </button>
              <span className="text-gray-500">/</span>
              <span className="text-white font-medium">{focusedGroup.name}</span>
              <button
                onClick={exitGroup}
                className="ml-2 px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded border border-gray-600 transition-colors"
              >
                Exit
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
