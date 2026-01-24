import { memo, useEffect, useState, useRef } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { audioGraph } from '../../../audio/AudioGraph';
import { parseTrackerPattern, midiToNoteName, type ParsedStep } from '../../../audio/nodes/trackerParser';

type SequencerData = {
  bpm: number;
  steps: number;
  gate: number;
  pattern: string;
  running: boolean;
  extClock: boolean;
  // Legacy support
  step1?: number;
  step2?: number;
  step3?: number;
  step4?: number;
  step5?: number;
  step6?: number;
  step7?: number;
  step8?: number;
};

type SequencerNode = Node<SequencerData, 'sequencer'>;

export const SequencerNodeUI = memo(({ id, data, selected }: NodeProps<SequencerNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);
  const [currentStep, setCurrentStep] = useState(0);
  const [patternInput, setPatternInput] = useState(data.pattern || '');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedSteps, setParsedSteps] = useState<ParsedStep[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Subscribe to sequencer step changes
  useEffect(() => {
    const sequencer = audioGraph.getNode(id);
    if (sequencer && 'onStep' in sequencer) {
      (sequencer as { onStep: (cb: (step: number) => void) => void }).onStep((step) => {
        setCurrentStep(step);
      });
    }
  }, [id]);

  // Sync pattern input from data when it changes externally
  useEffect(() => {
    if (data.pattern && data.pattern !== patternInput) {
      setPatternInput(data.pattern);
    }
  }, [data.pattern]);

  // Parse pattern on input change
  useEffect(() => {
    const { steps, errors } = parseTrackerPattern(patternInput);
    setParsedSteps(steps);
    setParseError(errors.length > 0 ? errors[0] : null);
  }, [patternInput]);

  // Auto-scroll to show current step during playback
  useEffect(() => {
    if (scrollContainerRef.current && data.running && currentStep >= 0) {
      const container = scrollContainerRef.current;
      const stepWidth = 32; // Approximate width of each step element
      const scrollTarget = currentStep * stepWidth - container.clientWidth / 2 + stepWidth / 2;
      container.scrollLeft = Math.max(0, scrollTarget);
    }
  }, [currentStep, data.running]);

  // Commit pattern on blur or Enter
  const commitPattern = () => {
    if (!parseError && patternInput !== data.pattern) {
      updateNodeParam(id, 'pattern', patternInput);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitPattern();
    }
  };

  // Get display text for a step
  const getStepDisplay = (step: ParsedStep): string => {
    if (step.type === 'note' && step.midiNote !== undefined) {
      return midiToNoteName(step.midiNote);
    }
    return '--';
  };

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[300px] max-w-[400px] ${
        selected ? 'border-cyan-400' : 'border-emerald-500'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
          Tracker Sequencer
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

      {/* Pattern text input */}
      <div className="mb-2">
        <label className="text-[10px] text-gray-400 block mb-1">Pattern:</label>
        <textarea
          value={patternInput}
          onChange={(e) => setPatternInput(e.target.value)}
          onBlur={commitPattern}
          onKeyDown={handleKeyDown}
          className={`w-full bg-gray-800 text-gray-100 text-xs font-mono p-2 rounded border resize-none h-12 ${
            parseError ? 'border-red-500' : 'border-gray-600 focus:border-emerald-500'
          } focus:outline-none`}
          placeholder="C-4 D-4 E-4 F-4 G-4 A-4 B-4 C-5"
          spellCheck={false}
        />
        {parseError && (
          <div className="text-[10px] text-red-400 mt-1">{parseError}</div>
        )}
      </div>

      {/* Step display grid - scrollable for many steps */}
      <div
        ref={scrollContainerRef}
        className="flex gap-0.5 mb-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-600"
      >
        {parsedSteps.map((step, i) => (
          <div
            key={i}
            className={`flex-shrink-0 w-7 text-center py-1 rounded text-[9px] font-mono transition-all ${
              currentStep === i && data.running
                ? 'bg-emerald-500 text-white scale-105'
                : step.type === 'note'
                ? 'bg-gray-700 text-gray-200'
                : 'bg-gray-800 text-gray-500'
            }`}
            title={step.originalToken || ''}
          >
            {getStepDisplay(step)}
          </div>
        ))}
      </div>

      {/* Step count indicator */}
      <div className="text-[10px] text-gray-500 text-center mb-2">
        {parsedSteps.length} step{parsedSteps.length !== 1 ? 's' : ''}
      </div>

      {/* Controls */}
      <div className="flex gap-3 justify-center pt-2 border-t border-gray-700">
        {!data.extClock && (
          <Knob
            label="BPM"
            value={data.bpm}
            min={20}
            max={300}
            step={1}
            onChange={(v) => updateNodeParam(id, 'bpm', v)}
          />
        )}
        <Knob
          label="Gate"
          value={data.gate}
          min={0.1}
          max={1}
          step={0.05}
          onChange={(v) => updateNodeParam(id, 'gate', v)}
        />
      </div>

      {/* Ext Clock toggle */}
      <div className="flex justify-center mt-2">
        <button
          onClick={() => updateNodeParam(id, 'extClock', !data.extClock)}
          className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
            data.extClock
              ? 'bg-orange-500 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          {data.extClock ? 'EXT CLK' : 'INT CLK'}
        </button>
      </div>

      {/* Clock input handle (left) - for external clock */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className={`!w-2.5 !h-2.5 ${data.extClock ? '!bg-orange-400' : '!bg-gray-600'}`}
        title="Clock In (enable Ext Clock mode)"
      />

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
