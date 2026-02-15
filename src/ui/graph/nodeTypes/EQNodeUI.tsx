import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type EQData = {
  lowFreq: number;
  lowGain: number;
  midFreq: number;
  midGain: number;
  midQ: number;
  highFreq: number;
  highGain: number;
};

type EQNode = Node<EQData, 'eq'>;

export const EQNodeUI = memo(({ id, data, selected }: NodeProps<EQNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="eq">
      <div
        className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[220px] ${
          selected ? 'border-cyan-400' : 'border-lime-500'
        }`}
      >
        <div className="text-xs font-bold text-lime-400 mb-2 uppercase tracking-wide">
          EQ
        </div>

        {/* Low band */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Knob
            label="Lo Hz"
            value={data.lowFreq}
            min={20}
            max={500}
            step={1}
            unit="Hz"
            onChange={(v) => updateNodeParam(id, 'lowFreq', v)}
          />
          <Knob
            label="Lo dB"
            value={data.lowGain}
            min={-18}
            max={18}
            step={0.5}
            unit="dB"
            onChange={(v) => updateNodeParam(id, 'lowGain', v)}
          />
          <Knob
            label="Mid Hz"
            value={data.midFreq}
            min={200}
            max={8000}
            step={10}
            unit="Hz"
            onChange={(v) => updateNodeParam(id, 'midFreq', v)}
          />
          <Knob
            label="Mid dB"
            value={data.midGain}
            min={-18}
            max={18}
            step={0.5}
            unit="dB"
            onChange={(v) => updateNodeParam(id, 'midGain', v)}
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <Knob
            label="Mid Q"
            value={data.midQ}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(v) => updateNodeParam(id, 'midQ', v)}
          />
          <Knob
            label="Hi Hz"
            value={data.highFreq}
            min={2000}
            max={20000}
            step={100}
            unit="Hz"
            onChange={(v) => updateNodeParam(id, 'highFreq', v)}
          />
          <Knob
            label="Hi dB"
            value={data.highGain}
            min={-18}
            max={18}
            step={0.5}
            unit="dB"
            onChange={(v) => updateNodeParam(id, 'highGain', v)}
          />
        </div>

        {/* Mod inputs */}
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="lowGain_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '20%' }}
          title="Low Gain Mod"
        />
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="midFreq_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '40%' }}
          title="Mid Freq Mod"
        />
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="midGain_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '60%' }}
          title="Mid Gain Mod"
        />
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="highGain_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '80%' }}
          title="High Gain Mod"
        />

        {/* Audio input */}
        <ClickableHandle
          type="target"
          position={Position.Left}
          id="input"
          nodeId={id}
          className="!bg-lime-400 !w-3 !h-3"
        />

        {/* Audio output */}
        <ClickableHandle
          type="source"
          position={Position.Right}
          id="output"
          nodeId={id}
          className="!bg-lime-400 !w-3 !h-3"
        />
      </div>
    </NodeWrapper>
  );
});

EQNodeUI.displayName = 'EQNodeUI';
