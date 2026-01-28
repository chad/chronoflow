// useUndoRedo.ts - Hook for undo/redo actions and keyboard bindings
import { useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { usePatchStore } from './patchStore';

// Debounce timer for pausing history during rapid param updates
const PARAM_DEBOUNCE_MS = 300;

export function useUndoRedo() {
  const temporal = usePatchStore.temporal;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPaused = useRef(false);

  // Subscribe to temporal store state
  const temporalState = useSyncExternalStore(
    temporal.subscribe,
    () => temporal.getState(),
    () => temporal.getState()
  );

  const { undo, redo, pastStates, futureStates, pause, resume } = temporalState;

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  const handleUndo = useCallback(() => {
    if (canUndo) {
      undo();
    }
  }, [canUndo, undo]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      redo();
    }
  }, [canRedo, redo]);

  // Pause history tracking during rapid param changes (knob dragging)
  const pauseHistory = useCallback(() => {
    if (!isPaused.current) {
      pause();
      isPaused.current = true;
    }

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Resume after debounce period
    debounceTimer.current = setTimeout(() => {
      if (isPaused.current) {
        resume();
        isPaused.current = false;
      }
    }, PARAM_DEBOUNCE_MS);
  }, [pause, resume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Keyboard shortcuts (Cmd+Z / Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      // Also support Cmd/Ctrl + Y for redo (Windows convention)
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return {
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo,
    pauseHistory,
    historyLength: pastStates.length,
    futureLength: futureStates.length,
  };
}
