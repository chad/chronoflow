import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';

type SwitchData = {
  channels: number;
  mode: 'cv' | 'sequential' | 'random';
  position: number;
  smooth: number;
};

type SwitchNode = Node<SwitchData, 'switch'>;

const MODES: Array<{ value: SwitchData['mode']; label: string }> = [
  { value: 'cv', label: 'CV' },
  { value: 'sequential', label: 'SEQ' },
  { value: 'random', label: 'RND' },
];

const INPUT_COLORS = ['!bg-blue-400', '!bg-green-400', '!bg-yellow-400', '!bg-orange-400'];

export const SwitchNodeUI = memo(({ id, data, selected }: NodeProps<SwitchNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[140px] ${
        selected ? 'border-cyan-400' : 'border-indigo-500'
      }`}
    >
      {/* Input handles */}
      {Array.from({ length: data.channels }, (_, i) => (
        <ClickableHandle
          key={`input${i + 1}`}
          type="target"
          position={Position.Left}
          id={`input${i + 1}`}
          nodeId={id}
          className={`${INPUT_COLORS[i]} !w-3 !h-3`}
          title={`Input ${i + 1}`}
          style={{ top: `${20 + (i * 60) / data.channels}%` }}
        />
      ))}

      {/* CV Input */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="cv"
        nodeId={id}
        className="!bg-purple-400 !w-3 !h-3"
        title="CV Control"
        style={{ top: '70%' }}
      />

      {/* Trigger input (for sequential/random modes) */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="trigger"
        nodeId={id}
        className="!bg-red-400 !w-3 !h-3"
        title="Trigger (Seq/Rnd)"
        style={{ top: '85%' }}
      />

      <div className="text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wide">
        Switch
      </div>

      {/* Channel indicators */}
      <div className="flex gap-1 mb-2 justify-center">
        {Array.from({ length: data.channels }, (_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${
              Math.floor(data.position * data.channels) === i
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2 justify-center">
          <Knob
            label="Channels"
            value={data.channels}
            min={2}
            max={4}
            step={1}
            onChange={(v) => updateNodeParam(id, 'channels', v)}
          />
          <Knob
            label="Smooth"
            value={data.smooth}
            min={0}
            max={500}
            step={1}
            unit="ms"
            onChange={(v) => updateNodeParam(id, 'smooth', v)}
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
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {data.mode === 'cv' && (
          <div className="flex justify-center">
            <Knob
              label="Position"
              value={data.position}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateNodeParam(id, 'position', v)}
            />
          </div>
        )}
      </div>

      {/* Output */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-indigo-400 !w-3 !h-3"
        title="Output"
      />
    </div>
  );
});

SwitchNodeUI.displayName = 'SwitchNodeUI';
