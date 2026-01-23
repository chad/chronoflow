import { memo, useEffect, useState } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { audioGraph } from '../../../audio/AudioGraph';

type SequencerData = {
  bpm: number;
  steps: number;
  gate: number;
  step1: number;
  step2: number;
  step3: number;
  step4: number;
  step5: number;
  step6: number;
  step7: number;
  step8: number;
  running: boolean;
};

type SequencerNode = Node<SequencerData, 'sequencer'>;

// Convert semitone to note name
function semitoneToNote(semitone: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(semitone / 12) + 4;
  const noteIndex = ((semitone % 12) + 12) % 12;
  return `${notes[noteIndex]}${octave}`;
}

export const SequencerNodeUI = memo(({ id, data, selected }: NodeProps<SequencerNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);
  const [currentStep, setCurrentStep] = useState(0);

  // Subscribe to sequencer step changes
  useEffect(() => {
    const sequencer = audioGraph.getNode(id);
    if (sequencer && 'onStep' in sequencer) {
      (sequencer as { onStep: (cb: (step: number) => void) => void }).onStep((step) => {
        setCurrentStep(step);
      });
    }
  }, [id]);

  const stepValues = [
    data.step1, data.step2, data.step3, data.step4,
    data.step5, data.step6, data.step7, data.step8,
  ];

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[280px] ${
        selected ? 'border-cyan-400' : 'border-emerald-500'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
          Sequencer
        </div>
        <button
          onClick={() => updateNodeParam(id, 'running', !data.running)}
          className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
            data.running
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {data.running ? 'STOP' : 'PLAY'}
        </button>
      </div>

      {/* Step display */}
      <div className="flex gap-1 mb-3">
        {stepValues.slice(0, data.steps).map((value, i) => (
          <div
            key={i}
            className={`flex-1 text-center py-1 rounded text-[10px] font-mono transition-all ${
              currentStep === i && data.running
                ? 'bg-emerald-500 text-white scale-105'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {semitoneToNote(value)}
          </div>
        ))}
      </div>

      {/* Step knobs */}
      <div className="flex flex-wrap gap-1 justify-center mb-2">
        {Array.from({ length: data.steps }, (_, i) => (
          <div key={i} className="flex flex-col items-center">
            <Knob
              label={`${i + 1}`}
              value={stepValues[i]}
              min={-12}
              max={24}
              step={1}
              onChange={(v) => updateNodeParam(id, `step${i + 1}`, v)}
            />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3 justify-center pt-2 border-t border-gray-700">
        <Knob
          label="BPM"
          value={data.bpm}
          min={30}
          max={300}
          step={1}
          onChange={(v) => updateNodeParam(id, 'bpm', v)}
        />
        <Knob
          label="Steps"
          value={data.steps}
          min={1}
          max={8}
          step={1}
          onChange={(v) => updateNodeParam(id, 'steps', v)}
        />
        <Knob
          label="Gate"
          value={data.gate}
          min={0.1}
          max={1}
          step={0.05}
          onChange={(v) => updateNodeParam(id, 'gate', v)}
        />
      </div>

      {/* Output handle - triggers notes */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-emerald-400 !w-3 !h-3"
        title="Trigger Output"
      />
    </div>
  );
});

SequencerNodeUI.displayName = 'SequencerNodeUI';
