import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { usePatchStore } from '../../../patch/patchStore';
import type { ExposedPort } from '../../../patch/types';
import { ClickableHandle } from '../ClickableHandle';

type GroupData = {
  name: string;
  exposedPorts: ExposedPort[];
  color?: string;
};

type GroupNode = Node<GroupData, 'group'>;

export const GroupNodeUI = memo(({ id, data, selected }: NodeProps<GroupNode>) => {
  const expandGroup = usePatchStore((state) => state.expandGroup);
  const diveIntoGroup = usePatchStore((state) => state.diveIntoGroup);
  const duplicateGroup = usePatchStore((state) => state.duplicateGroup);

  // Separate input and output ports
  const inputPorts = data.exposedPorts.filter((p) => p.direction === 'input');
  const outputPorts = data.exposedPorts.filter((p) => p.direction === 'output');

  // Calculate handle positions
  const inputPositions = inputPorts.map((_, i) => ({
    top: `${((i + 1) / (inputPorts.length + 1)) * 100}%`,
  }));
  const outputPositions = outputPorts.map((_, i) => ({
    top: `${((i + 1) / (outputPorts.length + 1)) * 100}%`,
  }));

  const borderColor = data.color || '#6366f1';

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[140px] min-h-[80px] ${
        selected ? 'border-cyan-400' : ''
      }`}
      style={{ borderColor: selected ? undefined : borderColor }}
    >
      {/* Group header */}
      <div
        className="text-xs font-bold mb-2 uppercase tracking-wide"
        style={{ color: borderColor }}
      >
        {data.name}
      </div>

      {/* Group icon */}
      <div className="flex items-center justify-center mb-2">
        <svg
          className="w-8 h-8 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
          />
        </svg>
      </div>

      {/* Port labels */}
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <div className="flex flex-col gap-0.5">
          {inputPorts.map((port) => (
            <span key={port.alias} className="text-left truncate max-w-[50px]">
              {port.alias}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          {outputPorts.map((port) => (
            <span key={port.alias} className="text-right truncate max-w-[50px]">
              {port.alias}
            </span>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-2 mt-2 pt-2 border-t border-gray-700">
        <button
          onClick={(e) => {
            e.stopPropagation();
            expandGroup(id);
          }}
          className="text-[10px] text-gray-400 hover:text-white transition-colors"
          title="Expand group"
        >
          Expand
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            diveIntoGroup(id);
          }}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
          title="Edit group contents"
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Duplicate at offset position
            duplicateGroup(id, { x: 50, y: 50 });
          }}
          className="text-[10px] text-green-400 hover:text-green-300 transition-colors"
          title="Duplicate group"
        >
          Copy
        </button>
      </div>

      {/* Input handles (left side) */}
      {inputPorts.map((port, index) => (
        <ClickableHandle
          key={`in-${port.alias}`}
          type="target"
          position={Position.Left}
          id={port.alias}
          nodeId={id}
          className="!bg-indigo-400 !w-3 !h-3"
          style={{ top: inputPositions[index].top }}
          title={port.alias}
        />
      ))}

      {/* Output handles (right side) */}
      {outputPorts.map((port, index) => (
        <ClickableHandle
          key={`out-${port.alias}`}
          type="source"
          position={Position.Right}
          id={port.alias}
          nodeId={id}
          className="!bg-indigo-400 !w-3 !h-3"
          style={{ top: outputPositions[index].top }}
          title={port.alias}
        />
      ))}
    </div>
  );
});

GroupNodeUI.displayName = 'GroupNodeUI';
