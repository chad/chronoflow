import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import type {
  Node,
  Edge,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodeTypes';
import { usePatchStore } from '../../patch/patchStore';
import type { PatchNode, PatchConnection } from '../../patch/types';

// Convert patch nodes to React Flow nodes
function patchNodesToFlowNodes(patchNodes: PatchNode[]): Node[] {
  return patchNodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.params,
    selected: false,
  }));
}

// Convert patch connections to React Flow edges
function patchConnectionsToFlowEdges(connections: PatchConnection[]): Edge[] {
  return connections.map((conn) => ({
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

  // Convert patch state to React Flow format
  const initialNodes = useMemo(() => patchNodesToFlowNodes(patch.nodes), [patch.nodes]);
  const initialEdges = useMemo(() => patchConnectionsToFlowEdges(patch.connections), [patch.connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes from patch when it changes
  useMemo(() => {
    setNodes(patchNodesToFlowNodes(patch.nodes));
  }, [patch.nodes, setNodes]);

  useMemo(() => {
    setEdges(patchConnectionsToFlowEdges(patch.connections));
  }, [patch.connections, setEdges]);

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

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[10, 10]}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
      >
        <Controls className="!bg-gray-800 !border-gray-600 !rounded-lg" />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#374151" />
      </ReactFlow>
    </div>
  );
}
