import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type CrossfaderData = {
  position: number;
  curve: 'linear' | 'equal_power' | 'constant_power';
};

type CrossfaderNode = Node<CrossfaderData, 'crossfader'>;

const CURVES: Array<{ value: CrossfaderData['curve']; label: string }> = [
  { value: 'linear', label: 'LIN' },
  { value: 'equal_power', label: 'EP' },
  { value: 'constant_power', label: 'CP' },
];

export const CrossfaderNodeUI = memo(({ id, data, selected }: NodeProps<CrossfaderNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  // Visual crossfade indicator
  const aLevel = Math.cos(data.position * Math.PI / 2);
  const bLevel = Math.sin(data.position * Math.PI / 2);

  return (
    <NodeWrapper nodeId={id} nodeType="crossfader">
      <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[140px] ${
        selected ? 'border-cyan-400' : 'border-pink-500'
      }`}
    >
      {/* Input A */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="inputA"
        nodeId={id}
        className="!bg-blue-400 !w-3 !h-3"
        title="Input A"
        style={{ top: '25%' }}
      />

      {/* Input B */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="inputB"
        nodeId={id}
        className="!bg-orange-400 !w-3 !h-3"
        title="Input B"
        style={{ top: '50%' }}
      />

      {/* CV Input */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="cv"
        nodeId={id}
        className="!bg-green-400 !w-3 !h-3"
        title="CV Control"
        style={{ top: '75%' }}
      />

      <div className="text-xs font-bold text-pink-400 mb-2 uppercase tracking-wide">
        Crossfader
      </div>

      {/* Visual level indicators */}
      <div className="flex gap-2 mb-2 justify-center items-end h-8">
        <div className="flex flex-col items-center">
          <div
            className="w-3 bg-blue-400 rounded-t transition-all"
            style={{ height: `${aLevel * 24}px` }}
          />
          <div className="text-[8px] text-blue-300 mt-0.5">A</div>
        </div>
        <div className="flex flex-col items-center">
          <div
            className="w-3 bg-orange-400 rounded-t transition-all"
            style={{ height: `${bLevel * 24}px` }}
          />
          <div className="text-[8px] text-orange-300 mt-0.5">B</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
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

        {/* Curve selector */}
        <div className="flex gap-1 justify-center">
          {CURVES.map((c) => (
            <button
              key={c.value}
              onClick={() => updateNodeParam(id, 'curve', c.value)}
              className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${
                data.curve === c.value
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title={c.value === 'linear' ? 'Linear' : c.value === 'equal_power' ? 'Equal Power' : 'Constant Power'}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Output */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-pink-400 !w-3 !h-3"
        title="Output"
      />
    </div>
    </NodeWrapper>
  );
});

CrossfaderNodeUI.displayName = 'CrossfaderNodeUI';
