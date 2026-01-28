import { useEffect, useState, useRef } from 'react';
import { GraphCanvas } from './ui/graph/GraphCanvas';
import { NodePalette } from './ui/panels/NodePalette';
import { MidiPanel } from './ui/panels/MidiPanel';
import { MidiClockPanel } from './ui/panels/MidiClockPanel';
import { PatchManager } from './ui/panels/PatchManager';
import { KeyboardInput } from './ui/panels/KeyboardInput';
import { RecordingPanel } from './ui/panels/RecordingPanel';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { CommandPalette } from './ui/CommandPalette';
import { patchSyncer } from './patch/patchSyncer';
import { midiRouter } from './midi/MidiRouter';
import { usePatchStore } from './patch/patchStore';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const isAudioEnabled = usePatchStore((state) => state.isAudioEnabled);
  const setAudioEnabled = usePatchStore((state) => state.setAudioEnabled);
  const loadPatch = usePatchStore((state) => state.loadPatch);
  const audioInitializedRef = useRef(false);

  // Command palette keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleEnableAudio = async () => {
    if (audioInitializedRef.current) return;
    audioInitializedRef.current = true;
    try {
      await patchSyncer.init();
      midiRouter.init();
      setAudioEnabled(true);
      console.log('[App] Audio initialized successfully');
    } catch (err) {
      setError('Failed to initialize audio');
      console.error(err);
      audioInitializedRef.current = false;
    }
  };

  useEffect(() => {
    // Try to load saved patch
    loadPatch();
    setIsLoading(false);

    // Auto-enable audio on first user interaction (browsers require user gesture)
    // Use mouseup instead of click to avoid interfering with drag operations
    const enableOnInteraction = () => {
      // Use setTimeout to defer audio init to after current event processing
      setTimeout(() => {
        handleEnableAudio();
      }, 0);
    };

    // Only listen once
    document.addEventListener('mouseup', enableOnInteraction, { once: true });
    document.addEventListener('keydown', enableOnInteraction, { once: true });

    return () => {
      document.removeEventListener('mouseup', enableOnInteraction);
      document.removeEventListener('keydown', enableOnInteraction);
    };
  }, []);

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
          {/* Command palette button */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded border border-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-gray-700 rounded">⌘K</kbd>
          </button>

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
          <RecordingPanel />
          <MidiPanel />
          <MidiClockPanel />
          <KeyboardInput />
          <PatchManager />
        </aside>

        {/* Graph Editor */}
        <main className="flex-1">
          <ErrorBoundary>
            <GraphCanvas />
          </ErrorBoundary>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}

export default App;
