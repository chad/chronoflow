import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type TuringMachineData = {
  probability: number;
  length: number;
  scale: number;
  locked: boolean;
};

type TuringMachineNode = Node<TuringMachineData, 'turing'>;

export const TuringMachineNodeUI = memo(({ id, data, selected }: NodeProps<TuringMachineNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="turing">
      <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[150px] ${
        selected ? 'border-cyan-400' : 'border-amber-500'
      }`}
    >
      {/* Clock input handle */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="clock"
        nodeId={id}
        className="!bg-amber-400 !w-3 !h-3"
        title="Clock In"
        style={{ top: '50%' }}
      />

      <div className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wide">
        Turing Machine
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 justify-center">
          <Knob
            label="Prob"
            value={data.locked ? 0 : data.probability}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'probability', v)}
          />
          <Knob
            label="Length"
            value={data.length}
            min={2}
            max={16}
            step={1}
            onChange={(v) => updateNodeParam(id, 'length', v)}
          />
        </div>

        <div className="flex justify-center">
          <Knob
            label="Scale"
            value={data.scale}
            min={0}
            max={5}
            step={0.1}
            onChange={(v) => updateNodeParam(id, 'scale', v)}
          />
        </div>

        <button
          onClick={() => updateNodeParam(id, 'locked', !data.locked)}
          className={`w-full py-1.5 text-xs font-medium rounded transition-colors ${
            data.locked
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          {data.locked ? 'Locked' : 'Evolving'}
        </button>
      </div>

      {/* CV Output handle */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-amber-400 !w-3 !h-3"
        title="CV Out"
        style={{ top: '40%' }}
      />

      {/* Gate Output handle */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="gate"
        nodeId={id}
        className="!bg-amber-300 !w-3 !h-3"
        title="Gate Out"
        style={{ top: '60%' }}
      />
    </div>
    </NodeWrapper>
  );
});

TuringMachineNodeUI.displayName = 'TuringMachineNodeUI';
