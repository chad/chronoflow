import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { Select } from '../../controls/Select';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

const WAVEFORM_OPTIONS = [
  { value: 'sine', label: 'Sine' },
  { value: 'square', label: 'Square' },
  { value: 'sawtooth', label: 'Saw' },
  { value: 'triangle', label: 'Tri' },
];

type RingModData = {
  carrierFreq: number;
  carrierType: string;
  mix: number;
};

type RingModNode = Node<RingModData, 'ringmod'>;

export const RingModNodeUI = memo(({ id, data, selected }: NodeProps<RingModNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="ringmod">
      <div
      className={`relative bg-gray-900 border-2 rounded-lg p-3 min-w-[150px] ${
        selected ? 'border-cyan-400' : 'border-fuchsia-500'
      }`}
    >
      <div className="text-xs font-bold text-fuchsia-400 mb-2 uppercase tracking-wide">
        Ring Mod
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Select
          label="Wave"
          value={data.carrierType}
          options={WAVEFORM_OPTIONS}
          onChange={(v) => updateNodeParam(id, 'carrierType', v)}
        />
        <Knob
          label="Freq"
          value={data.carrierFreq}
          min={20}
          max={2000}
          step={1}
          unit="Hz"
          logarithmic
          onChange={(v) => updateNodeParam(id, 'carrierFreq', v)}
        />
        <Knob
          label="Mix"
          value={data.mix}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'mix', v)}
        />
      </div>

      {/* Carrier frequency modulation */}
      <ClickableHandle
        type="target"
        position={Position.Top}
        id="freq_mod"
        nodeId={id}
        className="!bg-yellow-400 !w-2 !h-2 !-top-1"
        title="Carrier Freq Mod"
      />

      {/* Audio input (signal to modulate) */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className="!bg-fuchsia-400 !w-3 !h-3"
        style={{ top: '40%' }}
        title="Signal In"
      />

      {/* External carrier input */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="carrier"
        nodeId={id}
        className="!bg-fuchsia-300 !w-2 !h-2"
        style={{ top: '70%' }}
        title="External Carrier"
      />

      {/* Audio output */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-fuchsia-400 !w-3 !h-3"
      />
    </div>
    </NodeWrapper>
  );
});

RingModNodeUI.displayName = 'RingModNodeUI';
