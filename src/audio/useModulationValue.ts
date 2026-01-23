// Hook to simulate and visualize modulation from LFOs and ADSRs

import { useState, useEffect, useRef, useCallback } from 'react';
import { audioGraph } from './AudioGraph';
import { usePatchStore } from '../patch/patchStore';

interface ModulationInfo {
  isModulated: boolean;
  modulatedValue: number;
}

// Simulate waveform value based on time and waveform type
function getWaveformValue(phase: number, waveform: string): number {
  switch (waveform) {
    case 'sine':
      return Math.sin(phase * 2 * Math.PI);
    case 'square':
      return phase < 0.5 ? 1 : -1;
    case 'sawtooth':
      return 2 * (phase - Math.floor(phase + 0.5));
    case 'triangle':
      return 4 * Math.abs(phase - Math.floor(phase + 0.75) + 0.25) - 1;
    default:
      return Math.sin(phase * 2 * Math.PI);
  }
}

export function useModulationValue(
  nodeId: string,
  paramName: string,
  baseValue: number
): ModulationInfo {
  const [modulatedValue, setModulatedValue] = useState(baseValue);
  const [isModulated, setIsModulated] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());

  // Get connections and nodes from patch store
  const connections = usePatchStore((state) => state.patch.connections);
  const nodes = usePatchStore((state) => state.patch.nodes);

  // Find if this param has a modulation connection
  const modConnection = connections.find(
    (c) => c.to.nodeId === nodeId && c.to.port === `${paramName}_mod`
  );

  // Get the source node (LFO or ADSR)
  const sourceNode = modConnection
    ? nodes.find((n) => n.id === modConnection.from.nodeId)
    : null;

  const simulateModulation = useCallback(() => {
    if (!sourceNode) {
      setIsModulated(false);
      setModulatedValue(baseValue);
      return;
    }

    setIsModulated(true);

    const animate = () => {
      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000; // seconds

      let modValue = baseValue;

      if (sourceNode.type === 'lfo') {
        // LFO modulation - continuous oscillation
        const rate = (sourceNode.params.rate as number) || 1;
        const depth = (sourceNode.params.depth as number) || 100;
        const waveform = (sourceNode.params.waveform as string) || 'sine';

        const phase = (elapsed * rate) % 1;
        const waveValue = getWaveformValue(phase, waveform);
        modValue = baseValue + waveValue * depth;
      } else if (sourceNode.type === 'adsr') {
        // ADSR modulation - check if any voices are active
        const voiceAllocator = audioGraph.getVoiceAllocator();
        const activeCount = voiceAllocator?.getActiveVoiceCount() || 0;

        if (activeCount > 0) {
          // Simplified ADSR visualization - ramp up then sustain
          const attack = (sourceNode.params.attack as number) || 0.01;
          const decay = (sourceNode.params.decay as number) || 0.1;
          const sustain = (sourceNode.params.sustain as number) || 0.7;

          // Get time since last note (simplified - use modulo for demo)
          const cycleTime = attack + decay + 0.5; // Attack + decay + some sustain time
          const t = elapsed % cycleTime;

          let envelope = 0;
          if (t < attack) {
            // Attack phase
            envelope = t / attack;
          } else if (t < attack + decay) {
            // Decay phase
            const decayProgress = (t - attack) / decay;
            envelope = 1 - (1 - sustain) * decayProgress;
          } else {
            // Sustain phase
            envelope = sustain;
          }

          // ADSR typically modulates gain (0-1 range)
          modValue = envelope;
        } else {
          modValue = 0;
        }
      }

      setModulatedValue(modValue);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [sourceNode, baseValue]);

  useEffect(() => {
    const cleanup = simulateModulation();
    return cleanup;
  }, [simulateModulation]);

  return { isModulated, modulatedValue };
}
