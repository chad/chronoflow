import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';

type SequenceChainData = {
  scenes: number;
  stepsPerScene: number;
  mode: 'forward' | 'reverse' | 'pingpong' | 'random';
  loop: boolean;
};

type SequenceChainNode = Node<SequenceChainData, 'sequencechain'>;

const MODES: Array<{ value: SequenceChainData['mode']; label: string }> = [
  { value: 'forward', label: 'FWD' },
  { value: 'reverse', label: 'REV' },
  { value: 'pingpong', label: 'P-P' },
  { value: 'random', label: 'RND' },
];

export const SequenceChainNodeUI = memo(({ id, data, selected }: NodeProps<SequenceChainNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[180px] ${
        selected ? 'border-cyan-400' : 'border-amber-500'
      }`}
    >
      {/* Clock input */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="clock"
        nodeId={id}
        className="!bg-amber-400 !w-3 !h-3"
        title="Clock In"
        style={{ top: '30%' }}
      />

      {/* Reset input */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="reset"
        nodeId={id}
        className="!bg-red-400 !w-3 !h-3"
        title="Reset"
        style={{ top: '70%' }}
      />

      <div className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wide">
        Scene Chain
      </div>

      {/* Scene visualization */}
      <div className="flex gap-1 mb-3 justify-center">
        {Array.from({ length: data.scenes }, (_, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded bg-gray-700 border border-amber-500/50 flex items-center justify-center text-[8px] text-amber-300"
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 justify-center">
          <Knob
            label="Scenes"
            value={data.scenes}
            min={2}
            max={8}
            step={1}
            onChange={(v) => updateNodeParam(id, 'scenes', v)}
          />
          <Knob
            label="Steps"
            value={data.stepsPerScene}
            min={1}
            max={64}
            step={1}
            onChange={(v) => updateNodeParam(id, 'stepsPerScene', v)}
          />
        </div>

        {/* Mode selector */}
        <div className="flex gap-1 justify-center">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => updateNodeParam(id, 'mode', m.value)}
              className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${
                data.mode === m.value
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Loop toggle */}
        <div className="flex justify-center">
          <button
            onClick={() => updateNodeParam(id, 'loop', !data.loop)}
            className={`px-3 py-0.5 text-[10px] font-bold rounded transition-colors ${
              data.loop
                ? 'bg-amber-500 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {data.loop ? 'LOOP' : 'ONE-SHOT'}
          </button>
        </div>
      </div>

      {/* Scene CV output */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-amber-400 !w-3 !h-3"
        title="Scene CV Out"
        style={{ top: '40%' }}
      />

      {/* Trigger output */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="trigger"
        nodeId={id}
        className="!bg-yellow-400 !w-3 !h-3"
        title="Scene Change Trigger"
        style={{ top: '60%' }}
      />
    </div>
  );
});

SequenceChainNodeUI.displayName = 'SequenceChainNodeUI';
