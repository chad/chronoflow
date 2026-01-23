import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { ModulatedKnob } from '../../controls/ModulatedKnob';
import { Select } from '../../controls/Select';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';

const FILTER_MODES = [
  { value: 'lowpass', label: 'LowPass' },
  { value: 'highpass', label: 'HiPass' },
  { value: 'bandpass', label: 'BandPass' },
];

type FilterData = {
  mode: string;
  cutoff: number;
  resonance: number;
};

type FilterNode = Node<FilterData, 'filter'>;

export const FilterNodeUI = memo(({ id, data, selected }: NodeProps<FilterNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[160px] ${
        selected ? 'border-cyan-400' : 'border-purple-500'
      }`}
    >
      <div className="text-xs font-bold text-purple-400 mb-2 uppercase tracking-wide">
        Filter
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Select
          label="Mode"
          value={data.mode}
          options={FILTER_MODES}
          onChange={(v) => updateNodeParam(id, 'mode', v)}
        />
        <ModulatedKnob
          nodeId={id}
          paramName="cutoff"
          label="Cutoff"
          value={data.cutoff}
          min={20}
          max={20000}
          step={1}
          unit="Hz"
          logarithmic
          onChange={(v) => updateNodeParam(id, 'cutoff', v)}
        />
        <ModulatedKnob
          nodeId={id}
          paramName="resonance"
          label="Res"
          value={data.resonance}
          min={0.1}
          max={30}
          step={0.1}
          onChange={(v) => updateNodeParam(id, 'resonance', v)}
        />
      </div>

      {/* Modulation input handles (top) */}
      <ClickableHandle
        type="target"
        position={Position.Top}
        id="cutoff_mod"
        nodeId={id}
        className="!bg-yellow-400 !w-2 !h-2 !-top-1"
        style={{ left: '30%' }}
        title="Cutoff Mod"
      />
      <ClickableHandle
        type="target"
        position={Position.Top}
        id="resonance_mod"
        nodeId={id}
        className="!bg-yellow-400 !w-2 !h-2 !-top-1"
        style={{ left: '70%' }}
        title="Resonance Mod"
      />

      {/* Audio input handle */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className="!bg-purple-400 !w-3 !h-3"
      />

      {/* Output handle */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-purple-400 !w-3 !h-3"
      />
    </div>
  );
});

FilterNodeUI.displayName = 'FilterNodeUI';
