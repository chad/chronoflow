import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';

type CounterData = {
  count: number;
  mode: 'up' | 'down' | 'pendulum';
  autoReset: boolean;
};

type CounterNode = Node<CounterData, 'counter'>;

const MODES: Array<{ value: CounterData['mode']; label: string }> = [
  { value: 'up', label: 'UP' },
  { value: 'down', label: 'DOWN' },
  { value: 'pendulum', label: 'PEND' },
];

export const CounterNodeUI = memo(({ id, data, selected }: NodeProps<CounterNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[140px] ${
        selected ? 'border-cyan-400' : 'border-teal-500'
      }`}
    >
      {/* Trigger input */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="trigger"
        nodeId={id}
        className="!bg-teal-400 !w-3 !h-3"
        title="Trigger In"
        style={{ top: '35%' }}
      />

      {/* Reset input */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="reset"
        nodeId={id}
        className="!bg-red-400 !w-3 !h-3"
        title="Reset"
        style={{ top: '65%' }}
      />

      <div className="text-xs font-bold text-teal-400 mb-2 uppercase tracking-wide">
        Counter
      </div>

      {/* Count display */}
      <div className="text-center mb-2">
        <div className="text-2xl font-mono font-bold text-teal-300">
          {data.count}
        </div>
        <div className="text-[9px] text-gray-500">pulses to fire</div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-center">
          <Knob
            label="Count"
            value={data.count}
            min={1}
            max={64}
            step={1}
            onChange={(v) => updateNodeParam(id, 'count', v)}
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
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Auto Reset toggle */}
        <div className="flex justify-center">
          <button
            onClick={() => updateNodeParam(id, 'autoReset', !data.autoReset)}
            className={`px-3 py-0.5 text-[10px] font-bold rounded transition-colors ${
              data.autoReset
                ? 'bg-teal-500 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {data.autoReset ? 'AUTO RESET' : 'MANUAL'}
          </button>
        </div>
      </div>

      {/* Pulse output (fires when count reached) */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-teal-400 !w-3 !h-3"
        title="Trigger Out"
        style={{ top: '35%' }}
      />

      {/* Count CV output */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="count"
        nodeId={id}
        className="!bg-teal-300 !w-3 !h-3"
        title="Count CV"
        style={{ top: '65%' }}
      />
    </div>
  );
});

CounterNodeUI.displayName = 'CounterNodeUI';
