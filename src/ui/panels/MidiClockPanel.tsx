import { useState, useEffect, useCallback } from 'react';
import { midiClock, type ClockMode, type ClockState } from '../../midi/MidiClock';
import { midiEngine } from '../../midi/MidiEngine';
import { usePatchStore } from '../../patch/patchStore';

export function MidiClockPanel() {
  const isAudioEnabled = usePatchStore((state) => state.isAudioEnabled);
  const [mode, setMode] = useState<ClockMode>('off');
  const [state, setState] = useState<ClockState>('stopped');
  const [bpm, setBpm] = useState(120);
  const [hasOutput, setHasOutput] = useState(false);
  const [hasInput, setHasInput] = useState(false);

  // Check for MIDI devices
  useEffect(() => {
    const checkDevices = () => {
      setHasOutput(midiEngine.getOutputs().length > 0);
      setHasInput(midiEngine.getInputs().length > 0);
    };

    checkDevices();
    const unsubscribe = midiEngine.onStateChange(checkDevices);
    return () => unsubscribe();
  }, []);

  // Subscribe to clock state changes
  useEffect(() => {
    const unsubscribe = midiClock.onStateChange((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  // Update BPM display in follower mode
  useEffect(() => {
    if (mode !== 'follower') return;

    const interval = setInterval(() => {
      setBpm(midiClock.getBpm());
    }, 500);

    return () => clearInterval(interval);
  }, [mode]);

  const handleModeChange = useCallback((newMode: ClockMode) => {
    midiClock.setMode(newMode);
    setMode(newMode);

    if (newMode === 'off') {
      setState('stopped');
    }
  }, []);

  const handleBpmChange = useCallback((value: number) => {
    setBpm(value);
    midiClock.setBpm(value);
  }, []);

  const handleStart = useCallback(() => {
    midiClock.start();
  }, []);

  const handleStop = useCallback(() => {
    midiClock.stop();
  }, []);

  if (!isAudioEnabled) {
    return null;
  }

  // Don't show if no MIDI devices
  if (!hasOutput && !hasInput) {
    return null;
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
      <h3 className="text-sm font-bold text-gray-300 mb-2">MIDI Clock Sync</h3>

      {/* Mode Selection */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => handleModeChange('off')}
          className={`flex-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${
            mode === 'off'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Off
        </button>
        <button
          onClick={() => handleModeChange('master')}
          disabled={!hasOutput}
          className={`flex-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${
            mode === 'master'
              ? 'bg-orange-600 text-white'
              : hasOutput
              ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
          title={hasOutput ? 'Send clock to other devices' : 'No MIDI output device'}
        >
          Master
        </button>
        <button
          onClick={() => handleModeChange('follower')}
          disabled={!hasInput}
          className={`flex-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${
            mode === 'follower'
              ? 'bg-cyan-600 text-white'
              : hasInput
              ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
          title={hasInput ? 'Receive clock from other devices' : 'No MIDI input device'}
        >
          Follower
        </button>
      </div>

      {/* Master Mode Controls */}
      {mode === 'master' && (
        <div className="space-y-2">
          {/* BPM Control */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-gray-400 w-8">BPM</label>
            <input
              type="number"
              value={bpm}
              onChange={(e) => handleBpmChange(Number(e.target.value))}
              min={20}
              max={300}
              className="flex-1 bg-gray-800 text-gray-100 text-xs px-2 py-1 rounded border border-gray-600 focus:border-orange-500 focus:outline-none w-16"
            />
          </div>

          {/* Transport Controls */}
          <div className="flex gap-2">
            {state === 'stopped' ? (
              <button
                onClick={handleStart}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Start
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
                Stop
              </button>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 text-[10px]">
            <div className={`w-2 h-2 rounded-full ${state === 'running' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-gray-400">
              {state === 'running' ? `Sending clock at ${bpm} BPM` : 'Stopped'}
            </span>
          </div>
        </div>
      )}

      {/* Follower Mode Display */}
      {mode === 'follower' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px]">
            <div className={`w-2 h-2 rounded-full ${state === 'running' ? 'bg-cyan-400 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-gray-400">
              {state === 'running' ? `Receiving clock (~${bpm} BPM)` : 'Waiting for clock...'}
            </span>
          </div>
          <p className="text-[10px] text-gray-500">
            Enable "Ext Clock" on sequencers to sync
          </p>
        </div>
      )}

      {/* Help text for off mode */}
      {mode === 'off' && (
        <p className="text-[10px] text-gray-500">
          Sync multiple browsers via MIDI clock
        </p>
      )}
    </div>
  );
}
