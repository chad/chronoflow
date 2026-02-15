import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type ChorusData = {
  rate: number;
  depth: number;
  voices: number;
  spread: number;
  mix: number;
  feedback: number;
};

type ChorusNode = Node<ChorusData, 'chorus'>;

export const ChorusNodeUI = memo(({ id, data, selected }: NodeProps<ChorusNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="chorus">
      <div
        className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[180px] ${
          selected ? 'border-cyan-400' : 'border-teal-500'
        }`}
      >
        <div className="text-xs font-bold text-teal-400 mb-2 uppercase tracking-wide">
          Chorus
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob
            label="Rate"
            value={data.rate}
            min={0.1}
            max={10}
            step={0.1}
            unit="Hz"
            onChange={(v) => updateNodeParam(id, 'rate', v)}
          />
          <Knob
            label="Depth"
            value={data.depth}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'depth', v)}
          />
          <Knob
            label="Voices"
            value={data.voices}
            min={2}
            max={6}
            step={1}
            onChange={(v) => updateNodeParam(id, 'voices', v)}
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <Knob
            label="Fdbk"
            value={data.feedback}
            min={0}
            max={0.8}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'feedback', v)}
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

        {/* Mod inputs */}
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="rate_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '25%' }}
          title="Rate Mod"
        />
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="depth_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '50%' }}
          title="Depth Mod"
        />
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="mix_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '75%' }}
          title="Mix Mod"
        />

        {/* Audio input */}
        <ClickableHandle
          type="target"
          position={Position.Left}
          id="input"
          nodeId={id}
          className="!bg-teal-400 !w-3 !h-3"
        />

        {/* Audio output */}
        <ClickableHandle
          type="source"
          position={Position.Right}
          id="output"
          nodeId={id}
          className="!bg-teal-400 !w-3 !h-3"
        />
      </div>
    </NodeWrapper>
  );
});

ChorusNodeUI.displayName = 'ChorusNodeUI';
