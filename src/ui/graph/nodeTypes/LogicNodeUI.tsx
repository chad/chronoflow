import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Select } from '../../controls/Select';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type LogicData = {
  operation: string;
};

type LogicNode = Node<LogicData, 'logic'>;

export const LogicNodeUI = memo(({ id, data, selected }: NodeProps<LogicNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  const isUnary = data.operation === 'not';

  // Get operation symbol for display
  const getSymbol = (op: string): string => {
    switch (op) {
      case 'and': return '&';
      case 'or': return '|';
      case 'xor': return '^';
      case 'nand': return '!&';
      case 'nor': return '!|';
      case 'not': return '!';
      default: return '?';
    }
  };

  return (
    <NodeWrapper nodeId={id} nodeType="logic">
      <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[110px] ${
        selected ? 'border-cyan-400' : 'border-sky-500'
      }`}
    >
      {/* Input A handle */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="inputA"
        nodeId={id}
        className="!bg-sky-400 !w-3 !h-3"
        title="Input A"
        style={{ top: isUnary ? '50%' : '35%' }}
      />

      {/* Input B handle (not for NOT operation) */}
      {!isUnary && (
        <ClickableHandle
          type="target"
          position={Position.Left}
          id="inputB"
          nodeId={id}
          className="!bg-sky-300 !w-3 !h-3"
          title="Input B"
          style={{ top: '65%' }}
        />
      )}

      <div className="text-xs font-bold text-sky-400 mb-2 uppercase tracking-wide">
        Logic
      </div>

      {/* Large operation symbol */}
      <div className="text-2xl font-mono text-sky-400 text-center mb-2">
        {getSymbol(data.operation)}
      </div>

      <Select
        label=""
        value={data.operation}
        options={[
          { value: 'and', label: 'AND' },
          { value: 'or', label: 'OR' },
          { value: 'xor', label: 'XOR' },
          { value: 'nand', label: 'NAND' },
          { value: 'nor', label: 'NOR' },
          { value: 'not', label: 'NOT' },
        ]}
        onChange={(v) => updateNodeParam(id, 'operation', v)}
      />

      {/* Output handle */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-sky-400 !w-3 !h-3"
        title="Output"
      />
    </div>
    </NodeWrapper>
  );
});

LogicNodeUI.displayName = 'LogicNodeUI';
