import { useCallback, useMemo, useEffect, useState } from 'react';
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
  useReactFlow,
  ReactFlowProvider,
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
import type { PatchNode, PatchConnection, PatchGroup, PatchNodeType } from '../../patch/types';
import { remapConnectionsForCollapsedGroup } from '../../layout/groupUtils';
import { ConnectionProvider, useConnection } from './ConnectionContext';
import { TraceProvider } from './TraceContext';
import { ContextMenu, type ContextMenuState } from './ContextMenu';
import { QuickAdd } from './QuickAdd';
import { hasClipboard } from '../../patch/clipboard';

// Convert patch nodes to React Flow nodes
function patchNodesToFlowNodes(
  patchNodes: PatchNode[],
  groups: PatchGroup[],
  focusedGroupId: string | null
): Node[] {
  const collapsedGroupNodeIds = new Set<string>();
  groups.forEach((g) => {
    if (g.collapsed) {
      g.nodeIds.forEach((id) => collapsedGroupNodeIds.add(id));
    }
  });

  let visibleNodes = patchNodes;
  if (focusedGroupId) {
    const focusedGroup = groups.find((g) => g.id === focusedGroupId);
    if (focusedGroup) {
      const focusedNodeIds = new Set(focusedGroup.nodeIds);
      visibleNodes = patchNodes.filter((n) => focusedNodeIds.has(n.id));
    }
  } else {
    visibleNodes = patchNodes.filter((n) => !collapsedGroupNodeIds.has(n.id));
  }

  const flowNodes: Node[] = visibleNodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: { ...node.params, _muted: node.muted, _bypassed: node.bypassed },
    selected: false,
  }));

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
  focusedGroupId: string | null,
  tracingNodeId: string | null,
  traceNodeIds: Set<string> | null
): Edge[] {
  let processedConnections = [...connections];
  groups.forEach((group) => {
    if (group.collapsed && !focusedGroupId) {
      processedConnections = remapConnectionsForCollapsedGroup(group, processedConnections);
    }
  });

  if (focusedGroupId) {
    const focusedGroup = groups.find((g) => g.id === focusedGroupId);
    if (focusedGroup) {
      const focusedNodeIds = new Set(focusedGroup.nodeIds);
      processedConnections = processedConnections.filter(
        (c) => focusedNodeIds.has(c.from.nodeId) && focusedNodeIds.has(c.to.nodeId)
      );
    }
  } else {
    const collapsedGroupNodeIds = new Set<string>();
    groups.forEach((g) => {
      if (g.collapsed) {
        g.nodeIds.forEach((id) => collapsedGroupNodeIds.add(id));
      }
    });

    processedConnections = processedConnections.filter((c) => {
      const fromInCollapsed = collapsedGroupNodeIds.has(c.from.nodeId);
      const toInCollapsed = collapsedGroupNodeIds.has(c.to.nodeId);
      return !(fromInCollapsed && toInCollapsed);
    });
  }

  return processedConnections.map((conn) => {
    // Dim edges not in trace path
    let isInTrace = true;
    if (tracingNodeId && traceNodeIds) {
      isInTrace =
        traceNodeIds.has(conn.from.nodeId) || traceNodeIds.has(conn.to.nodeId) ||
        conn.from.nodeId === tracingNodeId || conn.to.nodeId === tracingNodeId;
    }

    return {
      id: conn.id,
      source: conn.from.nodeId,
      sourceHandle: conn.from.port,
      target: conn.to.nodeId,
      targetHandle: conn.to.port,
      type: 'default',
      animated: true,
      style: {
        stroke: isInTrace ? '#06b6d4' : '#06b6d430',
        strokeWidth: isInTrace ? 2 : 1,
        transition: 'stroke 0.3s, stroke-width 0.3s',
      },
    };
  });
}

function GraphCanvasInner() {
  const patch = usePatchStore((state) => state.patch);
  const updateNodePosition = usePatchStore((state) => state.updateNodePosition);
  const addNode = usePatchStore((state) => state.addNode);
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
  const removeAllConnections = usePatchStore((state) => state.removeAllConnections);
  const toggleMute = usePatchStore((state) => state.toggleMute);
  const toggleBypass = usePatchStore((state) => state.toggleBypass);
  const copySelected = usePatchStore((state) => state.copySelected);
  const pasteAtPosition = usePatchStore((state) => state.pasteAtPosition);
  const duplicateSelected = usePatchStore((state) => state.duplicateSelected);
  const tracingNodeId = usePatchStore((state) => state.tracingNodeId);
  const setTracingNode = usePatchStore((state) => state.setTracingNode);
  const getUpstreamNodes = usePatchStore((state) => state.getUpstreamNodes);
  const getDownstreamNodes = usePatchStore((state) => state.getDownstreamNodes);

  // Context menu & quick add state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ screen: { x: number; y: number }; canvas: { x: number; y: number } } | null>(null);

  // Click-to-connect state
  const {
    isConnecting,
    connectionSource,
    cancelConnection,
    setOnConnectionComplete,
    snapTarget,
    setSnapTarget,
    preConnectionViewport,
    setPreConnectionViewport,
    completeConnection,
  } = useConnection();
  const { setCenter, getNodes, getViewport, setViewport, screenToFlowPosition } = useReactFlow();

  // Compute trace node set for edge dimming
  const traceNodeIds = useMemo(() => {
    if (!tracingNodeId) return null;
    const up = getUpstreamNodes(tracingNodeId);
    const down = getDownstreamNodes(tracingNodeId);
    return new Set([...up, ...down, tracingNodeId]);
  }, [tracingNodeId, getUpstreamNodes, getDownstreamNodes]);

  // Save viewport and auto-pan when connection mode starts
  useEffect(() => {
    if (isConnecting && connectionSource) {
      const currentViewport = getViewport();
      setPreConnectionViewport(currentViewport);

      const nodes = getNodes();
      if (nodes.length > 1) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nodes.forEach(node => {
          const x = node.position.x;
          const y = node.position.y;
          const width = node.width || 160;
          const height = node.height || 100;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x + width);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y + height);
        });
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        setCenter(centerX, centerY, { zoom: 0.8, duration: 300 });
      }
    }
  }, [isConnecting, connectionSource, getNodes, setCenter, getViewport, setPreConnectionViewport]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // ESC: cancel connection, clear tracing, close menus
      if (e.key === 'Escape') {
        if (isConnecting) {
          cancelConnection();
          if (preConnectionViewport) {
            setViewport(preConnectionViewport, { duration: 300 });
            setPreConnectionViewport(null);
          }
        }
        if (tracingNodeId) setTracingNode(null);
        setContextMenu(null);
        setQuickAdd(null);
        return;
      }

      // Cmd+C: copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();
        copySelected();
        return;
      }

      // Cmd+V: paste at viewport center
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        pasteAtPosition(center);
        return;
      }

      // Cmd+D: duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      // Cmd+A: select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedNodeIds(patch.nodes.map((n) => n.id));
        return;
      }

      // M: mute selected
      if (e.key === 'm' || e.key === 'M') {
        const id = usePatchStore.getState().selectedNodeId;
        if (id) toggleMute(id);
        return;
      }

      // B: bypass selected
      if (e.key === 'b' || e.key === 'B') {
        const id = usePatchStore.getState().selectedNodeId;
        if (id) toggleBypass(id);
        return;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isConnecting, cancelConnection, preConnectionViewport, setViewport, setPreConnectionViewport, tracingNodeId, setTracingNode, copySelected, pasteAtPosition, duplicateSelected, setSelectedNodeIds, patch.nodes, toggleMute, toggleBypass, screenToFlowPosition, getViewport]);

  // Set up connection complete callback
  useEffect(() => {
    setOnConnectionComplete((sourceNodeId, sourceHandle, targetNodeId, targetHandle) => {
      addConnection(sourceNodeId, sourceHandle, targetNodeId, targetHandle);
      if (preConnectionViewport) {
        setTimeout(() => {
          setViewport(preConnectionViewport, { duration: 300 });
          setPreConnectionViewport(null);
        }, 100);
      }
    });
  }, [setOnConnectionComplete, addConnection, preConnectionViewport, setViewport, setPreConnectionViewport]);

  // Snap target tracking — throttled with rAF to avoid layout thrashing
  useEffect(() => {
    if (!isConnecting || !connectionSource) return;

    const SNAP_DISTANCE_SQ = 50 * 50; // Compare squared distances to avoid sqrt
    let rafId: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (rafId !== null) return; // Already scheduled
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const handles = document.querySelectorAll('.react-flow__handle');
        let closest: { nodeId: string; handleId: string; distance: number } | null = null;

        handles.forEach((handle) => {
          const rect = handle.getBoundingClientRect();
          const hx = rect.left + rect.width / 2;
          const hy = rect.top + rect.height / 2;
          const dx = lastX - hx;
          const dy = lastY - hy;
          const distSq = dx * dx + dy * dy;

          const handleType = handle.classList.contains('source') ? 'source' : 'target';
          const isValidType =
            (connectionSource.handleType === 'source' && handleType === 'target') ||
            (connectionSource.handleType === 'target' && handleType === 'source');

          const nodeId = handle.getAttribute('data-nodeid');
          const handleId = handle.getAttribute('data-handleid');

          if (nodeId && handleId && nodeId !== connectionSource.nodeId && isValidType && distSq < SNAP_DISTANCE_SQ) {
            if (!closest || distSq < closest.distance) {
              closest = { nodeId, handleId, distance: distSq };
            }
          }
        });
        setSnapTarget(closest);
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isConnecting, connectionSource, setSnapTarget]);

  // Pane click: connect snap target or cancel
  const handlePaneClick = useCallback(() => {
    if (contextMenu) {
      setContextMenu(null);
      return;
    }
    if (quickAdd) {
      setQuickAdd(null);
      return;
    }
    if (isConnecting) {
      if (snapTarget) {
        completeConnection(snapTarget.nodeId, snapTarget.handleId);
      } else {
        cancelConnection();
        if (preConnectionViewport) {
          setViewport(preConnectionViewport, { duration: 300 });
          setPreConnectionViewport(null);
        }
      }
    }
    // Clear signal tracing on click
    if (tracingNodeId) setTracingNode(null);
  }, [isConnecting, snapTarget, completeConnection, cancelConnection, preConnectionViewport, setViewport, setPreConnectionViewport, contextMenu, quickAdd, tracingNodeId, setTracingNode]);

  // Double-click canvas → Quick Add popup (only on empty space)
  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // Don't trigger on nodes, handles, or other interactive elements
      const target = event.target as HTMLElement;
      if (target.closest('.react-flow__node') || target.closest('.react-flow__handle') || target.closest('.quick-add-popup')) return;

      const canvasPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setQuickAdd({
        screen: { x: event.clientX, y: event.clientY },
        canvas: canvasPos,
      });
    },
    [screenToFlowPosition]
  );

  // Right-click canvas → Context Menu (only on empty space)
  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      // Don't trigger if right-clicking on a node (that's handled by onNodeContextMenu)
      const target = event.target as HTMLElement;
      if (target.closest('.react-flow__node')) return;
      event.preventDefault();
      setContextMenu({
        type: 'canvas',
        x: event.clientX,
        y: event.clientY,
      });
    },
    []
  );

  // Right-click node → Node Context Menu
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const patchNode = patch.nodes.find((n) => n.id === node.id);
      setContextMenu({
        type: 'node',
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        nodeType: node.type,
        isMuted: patchNode?.muted,
        isBypassed: patchNode?.bypassed,
      });
    },
    [patch.nodes]
  );

  // Right-click edge → Edge Context Menu
  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setContextMenu({
        type: 'edge',
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
      });
    },
    []
  );

  // Context menu: add node at screen position → convert to canvas position
  const handleContextAddNode = useCallback(
    (type: PatchNodeType, screenPos: { x: number; y: number }) => {
      const canvasPos = screenToFlowPosition(screenPos);
      addNode(type, canvasPos);
    },
    [addNode, screenToFlowPosition]
  );

  const handleContextPaste = useCallback(
    (screenPos: { x: number; y: number }) => {
      const canvasPos = screenToFlowPosition(screenPos);
      pasteAtPosition(canvasPos);
    },
    [pasteAtPosition, screenToFlowPosition]
  );

  const handleContextSelectAll = useCallback(() => {
    setSelectedNodeIds(patch.nodes.map((n) => n.id));
  }, [setSelectedNodeIds, patch.nodes]);

  const handleContextDuplicate = useCallback(
    (id: string) => {
      selectNode(id);
      setSelectedNodeIds([id]);
      setTimeout(() => duplicateSelected(), 0);
    },
    [selectNode, setSelectedNodeIds, duplicateSelected]
  );

  const handleContextCopy = useCallback(
    (id: string) => {
      selectNode(id);
      setSelectedNodeIds([id]);
      setTimeout(() => copySelected(), 0);
    },
    [selectNode, setSelectedNodeIds, copySelected]
  );

  const handleTraceSignal = useCallback(
    (id: string) => {
      setTracingNode(tracingNodeId === id ? null : id);
    },
    [setTracingNode, tracingNodeId]
  );

  const focusedGroup = useMemo(
    () => patch.groups.find((g) => g.id === focusedGroupId),
    [patch.groups, focusedGroupId]
  );

  const initialNodes = useMemo(
    () => patchNodesToFlowNodes(patch.nodes, patch.groups, focusedGroupId),
    [patch.nodes, patch.groups, focusedGroupId]
  );
  const initialEdges = useMemo(
    () => patchConnectionsToFlowEdges(patch.connections, patch.groups, focusedGroupId, tracingNodeId, traceNodeIds),
    [patch.connections, patch.groups, focusedGroupId, tracingNodeId, traceNodeIds]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(patchNodesToFlowNodes(patch.nodes, patch.groups, focusedGroupId));
  }, [patch.nodes, patch.groups, focusedGroupId, setNodes]);

  useEffect(() => {
    setEdges(patchConnectionsToFlowEdges(patch.connections, patch.groups, focusedGroupId, tracingNodeId, traceNodeIds));
  }, [patch.connections, patch.groups, focusedGroupId, setEdges, tracingNodeId, traceNodeIds]);

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

  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      const ids = selectedNodes.map((n) => n.id);
      setSelectedNodeIds(ids);
    },
    [setSelectedNodeIds]
  );

  const handleCreateGroup = useCallback(() => {
    if (selectedNodeIds.length >= 2) {
      const nodeOnlyIds = selectedNodeIds.filter((id) => !id.startsWith('group_'));
      if (nodeOnlyIds.length >= 2) {
        const name = prompt('Enter group name:', 'New Group');
        if (name) {
          createGroup(name, nodeOnlyIds);
        }
      }
    }
  }, [selectedNodeIds, createGroup]);

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id.startsWith('group_')) {
        diveIntoGroup(node.id);
      }
    },
    [diveIntoGroup]
  );

  const activeGroups = useMemo(
    () => patch.groups.filter((g) => !g.collapsed),
    [patch.groups]
  );

  return (
    <TraceProvider value={traceNodeIds}>
    <div className="w-full h-full" onContextMenu={handleContextMenu} onDoubleClick={handlePaneDoubleClick}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[10, 10]}
        zoomOnDoubleClick={false}
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

          {tracingNodeId && (
            <button
              onClick={() => setTracingNode(null)}
              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-md border border-yellow-500 transition-colors"
            >
              ✕ Clear Trace
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
                    <button onClick={() => collapseGroup(group.id)} className="text-gray-400 hover:text-white text-xs" title="Collapse">[-]</button>
                    <button onClick={() => diveIntoGroup(group.id)} className="text-cyan-400 hover:text-cyan-300 text-xs" title="Dive In">{'[>]'}</button>
                    <button onClick={() => deleteGroup(group.id)} className="text-red-400 hover:text-red-300 text-xs" title="Delete Group">[x]</button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Breadcrumb Navigation */}
        {focusedGroupId && focusedGroup && (
          <Panel position="top-center" className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5">
            <div className="flex items-center gap-2 text-sm">
              <button onClick={exitGroup} className="text-cyan-400 hover:text-cyan-300 transition-colors">Root</button>
              <span className="text-gray-500">/</span>
              <span className="text-white font-medium">{focusedGroup.name}</span>
              <button onClick={exitGroup} className="ml-2 px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded border border-gray-600 transition-colors">Exit</button>
            </div>
          </Panel>
        )}

        {/* Connection Mode Indicator */}
        {isConnecting && (
          <Panel position="bottom-center" className={`${snapTarget ? 'bg-pink-900/90 border-pink-500' : 'bg-cyan-900/90 border-cyan-500'} border rounded-lg px-4 py-2`}>
            <div className="flex items-center gap-3 text-sm">
              <div className={`w-2 h-2 rounded-full ${snapTarget ? 'bg-pink-400' : 'bg-cyan-400'} animate-pulse`} />
              {snapTarget ? (
                <span className="text-pink-100">
                  Click to connect to <span className="font-bold">{snapTarget.nodeId}.{snapTarget.handleId}</span>
                </span>
              ) : (
                <span className="text-cyan-100">
                  Move near a target handle, or <kbd className="px-1.5 py-0.5 bg-cyan-800 rounded text-xs">ESC</kbd> to cancel
                </span>
              )}
            </div>
          </Panel>
        )}

        {/* Hint bar */}
        {!isConnecting && !focusedGroupId && !contextMenu && !quickAdd && (
          <Panel position="bottom-left" className="text-[10px] text-gray-600 flex gap-3">
            <span>Double-click: add module</span>
            <span>Right-click: menu</span>
            <span>M: mute</span>
            <span>B: bypass</span>
          </Panel>
        )}
      </ReactFlow>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          state={contextMenu}
          onClose={() => setContextMenu(null)}
          onAddNode={handleContextAddNode}
          onPaste={handleContextPaste}
          onSelectAll={handleContextSelectAll}
          onAutoLayout={autoLayoutNodes}
          onDeleteNode={removeNode}
          onDuplicateNode={handleContextDuplicate}
          onDisconnectAll={removeAllConnections}
          onToggleMute={toggleMute}
          onToggleBypass={toggleBypass}
          onCopyNode={handleContextCopy}
          onTraceSignal={handleTraceSignal}
          onDeleteEdge={removeConnection}
          hasClipboard={hasClipboard()}
        />
      )}

      {/* Quick Add (double-click canvas) */}
      {quickAdd && (
        <QuickAdd
          position={quickAdd.screen}
          canvasPosition={quickAdd.canvas}
          onAdd={(type, pos) => {
            addNode(type, pos);
            setQuickAdd(null);
          }}
          onClose={() => setQuickAdd(null)}
        />
      )}
    </div>
    </TraceProvider>
  );
}

export function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <ConnectionProvider>
        <GraphCanvasInner />
      </ConnectionProvider>
    </ReactFlowProvider>
  );
}
