import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';

type MacroData = {
  value: number;
  out1Min: number;
  out1Max: number;
  out2Min: number;
  out2Max: number;
  out3Min: number;
  out3Max: number;
  out4Min: number;
  out4Max: number;
  smooth: number;
};

type MacroNode = Node<MacroData, 'macro'>;

export const MacroNodeUI = memo(({ id, data, selected }: NodeProps<MacroNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  // Calculate current output values
  const v = data.value;
  const outputs = [
    data.out1Min + v * (data.out1Max - data.out1Min),
    data.out2Min + v * (data.out2Max - data.out2Min),
    data.out3Min + v * (data.out3Max - data.out3Min),
    data.out4Min + v * (data.out4Max - data.out4Min),
  ];

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[160px] ${
        selected ? 'border-cyan-400' : 'border-fuchsia-500'
      }`}
    >
      {/* CV Input handle */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className="!bg-fuchsia-400 !w-3 !h-3"
        title="CV In"
      />

      <div className="text-xs font-bold text-fuchsia-400 mb-2 uppercase tracking-wide">
        Macro
      </div>

      {/* Main value knob - larger */}
      <div className="flex justify-center mb-3">
        <Knob
          label="Value"
          value={data.value}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'value', v)}
        />
      </div>

      {/* Output range indicators */}
      <div className="grid grid-cols-4 gap-1 text-xs mb-2">
        {outputs.map((val, i) => (
          <div key={i} className="text-center">
            <div className="text-fuchsia-400 font-mono">{i + 1}</div>
            <div className="text-gray-400">{val.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Smooth control */}
      <div className="flex justify-center">
        <Knob
          label="Smooth"
          value={data.smooth}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'smooth', v)}
        />
      </div>

      {/* Output handles */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="out1"
        nodeId={id}
        className="!bg-fuchsia-400 !w-3 !h-3"
        title="Out 1"
        style={{ top: '25%' }}
      />
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="out2"
        nodeId={id}
        className="!bg-fuchsia-400 !w-3 !h-3"
        title="Out 2"
        style={{ top: '42%' }}
      />
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="out3"
        nodeId={id}
        className="!bg-fuchsia-400 !w-3 !h-3"
        title="Out 3"
        style={{ top: '58%' }}
      />
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="out4"
        nodeId={id}
        className="!bg-fuchsia-400 !w-3 !h-3"
        title="Out 4"
        style={{ top: '75%' }}
      />
    </div>
  );
});

MacroNodeUI.displayName = 'MacroNodeUI';
