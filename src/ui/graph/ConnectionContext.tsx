// ConnectionContext - Manages click-to-connect state

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface ConnectionSource {
  nodeId: string;
  handleId: string;
  handleType: 'source' | 'target';
  position: { x: number; y: number }; // For auto-pan calculation
}

interface ConnectionContextType {
  // Connection state
  isConnecting: boolean;
  connectionSource: ConnectionSource | null;

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
  const [onConnectionComplete, setOnConnectionCompleteCallback] = useState<
    ConnectionContextType['onConnectionComplete']
  >(undefined);

  const startConnection = useCallback((source: ConnectionSource) => {
    setConnectionSource(source);
    setIsConnecting(true);
  }, []);

  const cancelConnection = useCallback(() => {
    setConnectionSource(null);
    setIsConnecting(false);
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
