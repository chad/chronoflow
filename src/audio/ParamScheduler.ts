// ParamScheduler - throttles param updates for performance
// Audio params are set immediately on the AudioGraph (for zero-latency sound)
// Store updates are batched and flushed at ~15Hz (for UI/persistence)

import { audioGraph } from './AudioGraph';

interface PendingUpdate {
  nodeId: string;
  param: string;
  value: number | string | boolean;
}

class ParamScheduler {
  private pending: Map<string, PendingUpdate> = new Map();
  private flushCallback: ((updates: PendingUpdate[]) => void) | null = null;
  private rafId: number | null = null;
  private lastFlush: number = 0;
  private readonly FLUSH_INTERVAL = 66; // ~15Hz

  /** Set the callback that flushes batched updates to the store */
  setFlushCallback(cb: (updates: PendingUpdate[]) => void): void {
    this.flushCallback = cb;
  }

  /** Set a param immediately on audio graph + queue store update */
  setParam(nodeId: string, param: string, value: number | string | boolean): void {
    // Immediate audio update (no latency)
    if (typeof value === 'number' || typeof value === 'string') {
      audioGraph.setNodeParam(nodeId, param, value);
    }

    // Queue store update (batched)
    const key = `${nodeId}:${param}`;
    this.pending.set(key, { nodeId, param, value });

    // Schedule flush
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  private tick = (): void => {
    this.rafId = null;
    const now = performance.now();
    if (now - this.lastFlush >= this.FLUSH_INTERVAL) {
      this.flush();
    } else {
      // Re-schedule
      this.rafId = requestAnimationFrame(this.tick);
    }
  };

  flush(): void {
    if (this.pending.size === 0) return;
    const updates = Array.from(this.pending.values());
    this.pending.clear();
    this.lastFlush = performance.now();
    if (this.flushCallback) {
      this.flushCallback(updates);
    }
  }

  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.flush();
  }
}

export const paramScheduler = new ParamScheduler();
export default paramScheduler;
