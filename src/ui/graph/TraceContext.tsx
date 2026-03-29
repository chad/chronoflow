// TraceContext - shares precomputed trace node set to avoid O(N²) BFS in NodeWrapper

import { createContext, useContext } from 'react';

/** Set of node IDs in the current trace path, or null if not tracing */
const TraceContext = createContext<Set<string> | null>(null);

export const TraceProvider = TraceContext.Provider;

/** Returns the precomputed trace node set (null if not tracing) */
export function useTraceNodeIds(): Set<string> | null {
  return useContext(TraceContext);
}
