import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type KarplusStrongData = {
  frequency: number;
  damping: number;
  feedback: number;
  brightness: number;
  pluck: number;
};

type KarplusStrongNode = Node<KarplusStrongData, 'karplusstrong'>;

export const KarplusStrongNodeUI = memo(({ id, data, selected }: NodeProps<KarplusStrongNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="karplusstrong">
      <div
      className={`relative bg-gray-900 border-2 rounded-lg p-3 min-w-[180px] ${
        selected ? 'border-cyan-400' : 'border-amber-500'
      }`}
    >
      <div className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wide">
        String
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Knob
          label="Freq"
          value={data.frequency}
          min={20}
          max={2000}
          step={1}
          unit="Hz"
          onChange={(v) => updateNodeParam(id, 'frequency', v)}
        />
        <Knob
          label="Damp"
          value={data.damping}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'damping', v)}
        />
        <Knob
          label="Sustain"
          value={data.feedback}
          min={0.5}
          max={0.999}
          step={0.001}
          onChange={(v) => updateNodeParam(id, 'feedback', v)}
        />
      </div>

      <div className="flex flex-wrap gap-2 justify-center mt-2">
        <Knob
          label="Bright"
          value={data.brightness}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'brightness', v)}
        />
        <Knob
          label="Pluck"
          value={data.pluck}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'pluck', v)}
        />
      </div>

      {/* Trigger input (for sequencer) */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="trigger"
        nodeId={id}
        style={{ top: '30%' }}
        className="!bg-pink-400 !w-3 !h-3"
        title="Trigger"
      />

      {/* Frequency modulation input */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="freq_mod"
        nodeId={id}
        style={{ top: '70%' }}
        className="!bg-amber-400 !w-3 !h-3"
        title="Freq Mod"
      />

      {/* Audio output */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-amber-400 !w-3 !h-3"
        title="Audio Out"
      />
    </div>
    </NodeWrapper>
  );
});

KarplusStrongNodeUI.displayName = 'KarplusStrongNodeUI';
