import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type ClockData = {
  bpm: number;
  running: boolean;
  swing: number;
};

type ClockNode = Node<ClockData, 'clock'>;

export const ClockNodeUI = memo(({ id, data, selected }: NodeProps<ClockNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="clock">
      <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[140px] ${
        selected ? 'border-cyan-400' : 'border-red-500'
      }`}
    >
      <div className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wide">
        Clock
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3 justify-center">
          <Knob
            label="BPM"
            value={data.bpm}
            min={20}
            max={300}
            step={1}
            onChange={(v) => updateNodeParam(id, 'bpm', v)}
          />
          <Knob
            label="Swing"
            value={data.swing}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'swing', v)}
          />
        </div>

        <button
          onClick={() => updateNodeParam(id, 'running', !data.running)}
          className={`w-full py-1.5 text-xs font-medium rounded transition-colors ${
            data.running
              ? 'bg-green-600 hover:bg-green-500 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          {data.running ? 'Running' : 'Stopped'}
        </button>
      </div>

      {/* Output handle - clock trigger */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-red-400 !w-3 !h-3"
        title="Clock Out"
      />
    </div>
    </NodeWrapper>
  );
});

ClockNodeUI.displayName = 'ClockNodeUI';
