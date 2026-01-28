import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';

type EuclideanData = {
  steps: number;
  hits: number;
  rotation: number;
  running: boolean;
};

type EuclideanNode = Node<EuclideanData, 'euclidean'>;

export const EuclideanNodeUI = memo(({ id, data, selected }: NodeProps<EuclideanNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  // Generate visual pattern display
  const generatePattern = (steps: number, hits: number, rotation: number): boolean[] => {
    if (hits >= steps) return new Array(steps).fill(true);
    if (hits <= 0) return new Array(steps).fill(false);

    // Simplified Euclidean pattern for display
    const pattern: boolean[] = new Array(steps).fill(false);
    for (let i = 0; i < hits; i++) {
      const pos = Math.floor((i * steps) / hits);
      pattern[pos] = true;
    }

    // Apply rotation
    const rotated = [
      ...pattern.slice(rotation % steps),
      ...pattern.slice(0, rotation % steps),
    ];
    return rotated;
  };

  const pattern = generatePattern(data.steps, data.hits, data.rotation);

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[160px] ${
        selected ? 'border-cyan-400' : 'border-purple-500'
      }`}
    >
      {/* Clock input handle */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="clock"
        nodeId={id}
        className="!bg-purple-400 !w-3 !h-3"
        title="Clock In"
        style={{ top: '50%' }}
      />

      <div className="text-xs font-bold text-purple-400 mb-2 uppercase tracking-wide">
        Euclidean
      </div>

      {/* Pattern visualization */}
      <div className="flex gap-0.5 mb-3 justify-center flex-wrap max-w-[140px]">
        {pattern.map((hit, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-sm ${
              hit ? 'bg-purple-400' : 'bg-gray-700'
            }`}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 justify-center">
          <Knob
            label="Steps"
            value={data.steps}
            min={1}
            max={32}
            step={1}
            onChange={(v) => updateNodeParam(id, 'steps', v)}
          />
          <Knob
            label="Hits"
            value={data.hits}
            min={0}
            max={data.steps}
            step={1}
            onChange={(v) => updateNodeParam(id, 'hits', v)}
          />
        </div>
        <div className="flex justify-center">
          <Knob
            label="Rotate"
            value={data.rotation}
            min={0}
            max={Math.max(0, data.steps - 1)}
            step={1}
            onChange={(v) => updateNodeParam(id, 'rotation', v)}
          />
        </div>
      </div>

      {/* Output handle */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-purple-400 !w-3 !h-3"
        title="Trigger Out"
      />
    </div>
  );
});

EuclideanNodeUI.displayName = 'EuclideanNodeUI';
