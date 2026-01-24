// ConnectionContext - Manages click-to-connect state with snap support

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface ConnectionSource {
  nodeId: string;
  handleId: string;
  handleType: 'source' | 'target';
  position: { x: number; y: number }; // For auto-pan calculation
}

interface SnapTarget {
  nodeId: string;
  handleId: string;
  distance: number;
}

interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

interface ConnectionContextType {
  // Connection state
  isConnecting: boolean;
  connectionSource: ConnectionSource | null;

  // Snap state
  snapTarget: SnapTarget | null;
  setSnapTarget: (target: SnapTarget | null) => void;

  // Viewport state (to restore after connection)
  preConnectionViewport: ViewportState | null;
  setPreConnectionViewport: (viewport: ViewportState | null) => void;

  // Actions
  startConnection: (source: ConnectionSource) => void;
  cancelConnection: () => void;
  completeConnection: (targetNodeId: string, targetHandleId: string) => void;

  // Callbacks
  onConnectionComplete?: (
    sourceNodeId: string,
    sourceHandle: string,
    targetNodeId: string,
    targetHandle: string
  ) => void;
  setOnConnectionComplete: (
    callback: (
      sourceNodeId: string,
      sourceHandle: string,
      targetNodeId: string,
      targetHandle: string
    ) => void
  ) => void;
}

const ConnectionContext = createContext<ConnectionContextType | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState<ConnectionSource | null>(null);
  const [snapTarget, setSnapTarget] = useState<SnapTarget | null>(null);
  const [preConnectionViewport, setPreConnectionViewport] = useState<ViewportState | null>(null);
  const [onConnectionComplete, setOnConnectionCompleteCallback] = useState<
    ConnectionContextType['onConnectionComplete']
  >(undefined);

  const startConnection = useCallback((source: ConnectionSource) => {
    setConnectionSource(source);
    setIsConnecting(true);
    setSnapTarget(null);
  }, []);

  const cancelConnection = useCallback(() => {
    setConnectionSource(null);
    setIsConnecting(false);
    setSnapTarget(null);
  }, []);

  const completeConnection = useCallback(
    (targetNodeId: string, targetHandleId: string) => {
      if (connectionSource && onConnectionComplete) {
        if (connectionSource.handleType === 'source') {
          // Connecting from output to input
          onConnectionComplete(
            connectionSource.nodeId,
            connectionSource.handleId,
            targetNodeId,
            targetHandleId
          );
        } else {
          // Connecting from input to output (reverse)
          onConnectionComplete(
            targetNodeId,
            targetHandleId,
            connectionSource.nodeId,
            connectionSource.handleId
          );
        }
      }
      // Clear snap target after connection
      setSnapTarget(null);
      // Don't cancel - allow multi-connect from same source
      // User can press ESC or click empty space to cancel
    },
    [connectionSource, onConnectionComplete]
  );

  const setOnConnectionComplete = useCallback(
    (
      callback: (
        sourceNodeId: string,
        sourceHandle: string,
        targetNodeId: string,
        targetHandle: string
      ) => void
    ) => {
      setOnConnectionCompleteCallback(() => callback);
    },
    []
  );

  return (
    <ConnectionContext.Provider
      value={{
        isConnecting,
        connectionSource,
        snapTarget,
        setSnapTarget,
        preConnectionViewport,
        setPreConnectionViewport,
        startConnection,
        cancelConnection,
        completeConnection,
        onConnectionComplete,
        setOnConnectionComplete,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}
