import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { Select } from '../../controls/Select';
import { usePatchStore } from '../../../patch/patchStore';

const WAVEFORM_OPTIONS = [
  { value: 'sine', label: 'Sine' },
  { value: 'square', label: 'Square' },
  { value: 'sawtooth', label: 'Saw' },
  { value: 'triangle', label: 'Tri' },
];

type LFOData = {
  rate: number;
  depth: number;
  waveform: string;
};

type LFONode = Node<LFOData, 'lfo'>;

export const LFONodeUI = memo(({ id, data, selected }: NodeProps<LFONode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[140px] ${
        selected ? 'border-cyan-400' : 'border-yellow-500'
      }`}
    >
      <div className="text-xs font-bold text-yellow-400 mb-2 uppercase tracking-wide">
        LFO
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Select
          label="Wave"
          value={data.waveform}
          options={WAVEFORM_OPTIONS}
          onChange={(v) => updateNodeParam(id, 'waveform', v)}
        />
        <Knob
          label="Rate"
          value={data.rate}
          min={0.1}
          max={20}
          step={0.1}
          unit="Hz"
          onChange={(v) => updateNodeParam(id, 'rate', v)}
        />
        <Knob
          label="Depth"
          value={data.depth}
          min={0}
          max={1000}
          step={1}
          onChange={(v) => updateNodeParam(id, 'depth', v)}
        />
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!bg-yellow-400 !w-3 !h-3"
      />
    </div>
  );
});

LFONodeUI.displayName = 'LFONodeUI';
