// ClickableHandle - Handle that supports click-to-connect

import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useConnection } from './ConnectionContext';
import { useCallback } from 'react';
import type { MouseEvent } from 'react';

interface ClickableHandleProps {
  type: 'source' | 'target';
  position: Position;
  id: string;
  nodeId: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  isValidTarget?: boolean; // Whether this is a valid target for current connection
}

export function ClickableHandle({
  type,
  position,
  id,
  nodeId,
  className = '',
  style,
  title,
  isValidTarget = true,
}: ClickableHandleProps) {
  const { isConnecting, connectionSource, startConnection, completeConnection, cancelConnection } =
    useConnection();
  const { getNode } = useReactFlow();

  const isSelected =
    isConnecting &&
    connectionSource?.nodeId === nodeId &&
    connectionSource?.handleId === id;

  const isValidConnectionTarget =
    isConnecting &&
    connectionSource &&
    connectionSource.nodeId !== nodeId && // Can't connect to same node
    ((connectionSource.handleType === 'source' && type === 'target') ||
      (connectionSource.handleType === 'target' && type === 'source')) &&
    isValidTarget;

  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (isConnecting && connectionSource) {
        if (isValidConnectionTarget) {
          // Complete the connection
          completeConnection(nodeId, id);
        } else if (connectionSource.nodeId === nodeId && connectionSource.handleId === id) {
          // Clicking the same handle cancels
          cancelConnection();
        }
      } else {
        // Start a new connection
        const node = getNode(nodeId);
        const position = node?.position || { x: 0, y: 0 };
        startConnection({
          nodeId,
          handleId: id,
          handleType: type,
          position,
        });
      }
    },
    [
      isConnecting,
      connectionSource,
      isValidConnectionTarget,
      completeConnection,
      cancelConnection,
      startConnection,
      nodeId,
      id,
      type,
      getNode,
    ]
  );

  // Build class names
  let handleClassName = className;

  if (isSelected) {
    // Selected source - pulsing cyan
    handleClassName += ' !ring-2 !ring-cyan-400 !ring-offset-1 !ring-offset-gray-900 animate-pulse';
  } else if (isValidConnectionTarget) {
    // Valid target - green glow
    handleClassName += ' !ring-2 !ring-green-400 !ring-offset-1 !ring-offset-gray-900 !bg-green-400';
  } else if (isConnecting && !isValidConnectionTarget && connectionSource?.nodeId !== nodeId) {
    // Invalid target - dim
    handleClassName += ' !opacity-30';
  }

  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className={`${handleClassName} cursor-pointer transition-all duration-150`}
      style={style}
      title={title}
      onClick={handleClick}
    />
  );
}
