// ModulatedKnob - Knob with real-time modulation visualization

import { useMemo } from 'react';
import { Knob } from './Knob';
import { useModulationValue } from '../../audio/useModulationValue';
import { usePatchStore } from '../../patch/patchStore';

interface ModulatedKnobProps {
  nodeId: string;
  paramName: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  onChange: (value: number) => void;
  logarithmic?: boolean;
}

export function ModulatedKnob({
  nodeId,
  paramName,
  value,
  min,
  max,
  step,
  label,
  unit,
  onChange,
  logarithmic,
}: ModulatedKnobProps) {
  const connections = usePatchStore((state) => state.patch.connections);

  const hasModConnection = useMemo(() => {
    const modPort = `${paramName}_mod`;
    return connections.some(
      (c) => c.to.nodeId === nodeId && c.to.port === modPort
    );
  }, [connections, nodeId, paramName]);

  const { currentValue, isModulated } = useModulationValue(nodeId, paramName, value);

  return (
    <Knob
      value={value}
      min={min}
      max={max}
      step={step}
      label={label}
      unit={unit}
      onChange={onChange}
      logarithmic={logarithmic}
      isModulated={hasModConnection && isModulated}
      modulatedValue={hasModConnection ? currentValue : undefined}
    />
  );
}
