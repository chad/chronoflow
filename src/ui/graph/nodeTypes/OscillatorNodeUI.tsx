import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { ModulatedKnob } from '../../controls/ModulatedKnob';
import { Select } from '../../controls/Select';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';

const WAVEFORM_OPTIONS = [
  { value: 'sine', label: 'Sine' },
  { value: 'square', label: 'Square' },
  { value: 'sawtooth', label: 'Saw' },
  { value: 'triangle', label: 'Tri' },
];

type OscillatorData = {
  frequency: number;
  detune: number;
  waveform: string;
};

type OscillatorNode = Node<OscillatorData, 'oscillator'>;

export const OscillatorNodeUI = memo(({ id, data, selected }: NodeProps<OscillatorNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[160px] ${
        selected ? 'border-cyan-400' : 'border-orange-500'
      }`}
    >
      <div className="text-xs font-bold text-orange-400 mb-2 uppercase tracking-wide">
        Oscillator
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Select
          label="Wave"
          value={data.waveform}
          options={WAVEFORM_OPTIONS}
          onChange={(v) => updateNodeParam(id, 'waveform', v)}
        />
        <ModulatedKnob
          nodeId={id}
          paramName="frequency"
          label="Freq"
          value={data.frequency}
          min={20}
          max={20000}
          step={1}
          unit="Hz"
          logarithmic
          onChange={(v) => updateNodeParam(id, 'frequency', v)}
        />
        <ModulatedKnob
          nodeId={id}
          paramName="detune"
          label="Detune"
          value={data.detune}
          min={-100}
          max={100}
          step={1}
          unit="c"
          onChange={(v) => updateNodeParam(id, 'detune', v)}
        />
      </div>

      {/* Modulation input handles (top) */}
      <ClickableHandle
        type="target"
        position={Position.Top}
        id="freq_mod"
        nodeId={id}
        className="!bg-yellow-400 !w-2 !h-2 !-top-1"
        style={{ left: '30%' }}
        title="Frequency Mod"
      />
      <ClickableHandle
        type="target"
        position={Position.Top}
        id="detune_mod"
        nodeId={id}
        className="!bg-yellow-400 !w-2 !h-2 !-top-1"
        style={{ left: '70%' }}
        title="Detune Mod"
      />

      {/* Output handle */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-orange-400 !w-3 !h-3"
      />
    </div>
  );
});

OscillatorNodeUI.displayName = 'OscillatorNodeUI';
