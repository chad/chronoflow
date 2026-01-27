import { useState, useEffect, useCallback } from 'react';
import { audioGraph } from '../../audio/AudioGraph';
import { usePatchStore } from '../../patch/patchStore';
import type { RecordingState } from '../../audio/nodes/OutputNode';

export function RecordingPanel() {
  const isAudioEnabled = usePatchStore((state) => state.isAudioEnabled);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [hasData, setHasData] = useState(false);

  // Subscribe to recording state changes
  useEffect(() => {
    const outputNode = audioGraph.getOutputNode();
    if (outputNode) {
      outputNode.setRecordingStateCallback((state) => {
        setRecordingState(state);
        if (state === 'stopped') {
          setHasData(outputNode.hasRecordedData());
        }
      });
    }
  }, [isAudioEnabled]);

  // Update duration while recording
  useEffect(() => {
    if (recordingState !== 'recording') return;

    const interval = setInterval(() => {
      const outputNode = audioGraph.getOutputNode();
      if (outputNode) {
        setDuration(outputNode.getRecordingDuration());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [recordingState]);

  const handleStartRecording = useCallback(() => {
    const outputNode = audioGraph.getOutputNode();
    if (outputNode) {
      outputNode.startRecording();
      setDuration(0);
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    const outputNode = audioGraph.getOutputNode();
    if (outputNode) {
      outputNode.stopRecording();
    }
  }, []);

  const handleDownload = useCallback(async () => {
    const outputNode = audioGraph.getOutputNode();
    if (outputNode) {
      await outputNode.downloadRecording();
    }
  }, []);

  const handleClear = useCallback(() => {
    const outputNode = audioGraph.getOutputNode();
    if (outputNode) {
      outputNode.clearRecording();
      setHasData(false);
      setDuration(0);
    }
  }, []);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isAudioEnabled) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
        <h3 className="text-sm font-bold text-gray-300 mb-2">Recording</h3>
        <p className="text-xs text-gray-500">Enable audio to record</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
      <h3 className="text-sm font-bold text-gray-300 mb-2">Recording</h3>

      {/* Recording status */}
      <div className="flex items-center gap-2 mb-3">
        {recordingState === 'recording' ? (
          <>
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-sm font-mono">{formatDuration(duration)}</span>
          </>
        ) : recordingState === 'stopped' && hasData ? (
          <>
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-green-400 text-sm">Ready to download</span>
          </>
        ) : (
          <>
            <div className="w-3 h-3 rounded-full bg-gray-600" />
            <span className="text-gray-400 text-sm">Ready</span>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        {recordingState === 'idle' && (
          <button
            onClick={handleStartRecording}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded transition-colors"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" />
            </svg>
            Record
          </button>
        )}

        {recordingState === 'recording' && (
          <button
            onClick={handleStopRecording}
            className="flex items-center gap-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs px-3 py-1.5 rounded transition-colors"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" />
            </svg>
            Stop
          </button>
        )}

        {recordingState === 'stopped' && hasData && (
          <>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            <button
              onClick={handleClear}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-3 py-1.5 rounded transition-colors"
            >
              New
            </button>
          </>
        )}
      </div>

      {/* Help text */}
      <p className="text-[10px] text-gray-500 mt-2">
        Records audio output as WebM/Opus
      </p>
    </div>
  );
}
