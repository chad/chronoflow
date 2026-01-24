import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { ClickableHandle } from '../ClickableHandle';

type ClockDividerData = Record<string, never>; // No params

type ClockDividerNode = Node<ClockDividerData, 'clockdiv'>;

export const ClockDividerNodeUI = memo(({ id, selected }: NodeProps<ClockDividerNode>) => {
  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[100px] ${
        selected ? 'border-cyan-400' : 'border-orange-500'
      }`}
    >
      <div className="text-xs font-bold text-orange-400 mb-2 uppercase tracking-wide">
        Clock Div
      </div>

      <div className="flex flex-col gap-1 text-xs text-gray-400">
        <div className="flex justify-between items-center">
          <span>/1</span>
          <span className="text-gray-600">every beat</span>
        </div>
        <div className="flex justify-between items-center">
          <span>/2</span>
          <span className="text-gray-600">half time</span>
        </div>
        <div className="flex justify-between items-center">
          <span>/4</span>
          <span className="text-gray-600">quarter</span>
        </div>
        <div className="flex justify-between items-center">
          <span>/8</span>
          <span className="text-gray-600">eighth</span>
        </div>
      </div>

      {/* Clock input handle (left) */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className="!bg-orange-400 !w-3 !h-3"
        title="Clock In"
      />

      {/* Division output handles (right, stacked) */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="div1"
        nodeId={id}
        className="!bg-orange-400 !w-2.5 !h-2.5"
        style={{ top: '30%' }}
        title="/1 (every beat)"
      />
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="div2"
        nodeId={id}
        className="!bg-yellow-400 !w-2.5 !h-2.5"
        style={{ top: '45%' }}
        title="/2 (every 2 beats)"
      />
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="div4"
        nodeId={id}
        className="!bg-green-400 !w-2.5 !h-2.5"
        style={{ top: '60%' }}
        title="/4 (every 4 beats)"
      />
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="div8"
        nodeId={id}
        className="!bg-blue-400 !w-2.5 !h-2.5"
        style={{ top: '75%' }}
        title="/8 (every 8 beats)"
      />
    </div>
  );
});

ClockDividerNodeUI.displayName = 'ClockDividerNodeUI';
