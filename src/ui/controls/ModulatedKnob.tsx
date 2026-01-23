// ModulatedKnob - Knob with real-time modulation visualization

import { Knob } from './Knob';
import { useModulationValue } from '../../audio/useModulationValue';

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
  const { modulatedValue, isModulated } = useModulationValue(nodeId, paramName, value);

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
      isModulated={isModulated}
      modulatedValue={isModulated ? modulatedValue : undefined}
    />
  );
}
