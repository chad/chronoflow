import { useEffect, useState } from 'react';
import { GraphCanvas } from './ui/graph/GraphCanvas';
import { NodePalette } from './ui/panels/NodePalette';
import { MidiPanel } from './ui/panels/MidiPanel';
import { PatchManager } from './ui/panels/PatchManager';
import { KeyboardInput } from './ui/panels/KeyboardInput';
import { patchSyncer } from './patch/patchSyncer';
import { midiRouter } from './midi/MidiRouter';
import { usePatchStore } from './patch/patchStore';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAudioEnabled = usePatchStore((state) => state.isAudioEnabled);
  const setAudioEnabled = usePatchStore((state) => state.setAudioEnabled);
  const loadPatch = usePatchStore((state) => state.loadPatch);

  const handleEnableAudio = async () => {
    try {
      await patchSyncer.init();
      midiRouter.init();
      setAudioEnabled(true);
    } catch (err) {
      setError('Failed to initialize audio');
      console.error(err);
    }
  };

  useEffect(() => {
    // Try to load saved patch
    loadPatch();
    setIsLoading(false);
  }, [loadPatch]);

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
        <h1 className="text-lg font-bold text-cyan-400">ChronoFlow</h1>
        <div className="flex items-center gap-4">
          {!isAudioEnabled ? (
            <button
              onClick={handleEnableAudio}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
            >
              Enable Audio
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm text-gray-300">Audio Active</span>
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="bg-red-900/50 border-b border-red-700 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col gap-4 overflow-y-auto">
          <NodePalette />
          <MidiPanel />
          <KeyboardInput />
          <PatchManager />
        </aside>

        {/* Graph Editor */}
        <main className="flex-1">
          <GraphCanvas />
        </main>
      </div>
    </div>
  );
}

export default App;
