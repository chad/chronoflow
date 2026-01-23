// Hook to get real-time modulated values from AudioParams

import { useState, useEffect, useRef } from 'react';
import { audioGraph } from './AudioGraph';

interface ModulationInfo {
  isModulated: boolean;
  currentValue: number;
}

export function useModulationValue(
  nodeId: string,
  paramName: string,
  baseValue: number
): ModulationInfo {
  const [currentValue, setCurrentValue] = useState(baseValue);
  const [isModulated, setIsModulated] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastValueRef = useRef(baseValue);

  useEffect(() => {
    const node = audioGraph.getNode(nodeId);
    if (!node) {
      setIsModulated(false);
      return;
    }

    // Get the modulation target for this param
    const modTarget = node.getModulationTarget(`${paramName}_mod`);
    if (!modTarget) {
      setIsModulated(false);
      return;
    }

    setIsModulated(true);

    // Poll the AudioParam value at 60fps
    const pollValue = () => {
      const value = modTarget.value;

      // Only update state if value changed significantly (reduces re-renders)
      if (Math.abs(value - lastValueRef.current) > 0.001) {
        lastValueRef.current = value;
        setCurrentValue(value);
      }

      rafRef.current = requestAnimationFrame(pollValue);
    };

    rafRef.current = requestAnimationFrame(pollValue);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [nodeId, paramName, baseValue]);

  return { isModulated, currentValue };
}

// Hook to check if a param has a modulation connection in the patch
// Note: This is in a separate file to be imported from components
export function useHasModulationConnection(
  _nodeId: string,
  _paramName: string
): boolean {
  // This hook is replaced by the one in ModulatedKnob.tsx
  // to avoid circular dependency issues
  return false;
}
