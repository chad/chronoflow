import { useEffect, useState, useRef } from 'react';
import { GraphCanvas } from './ui/graph/GraphCanvas';
import { NodePalette } from './ui/panels/NodePalette';
import { MidiPanel } from './ui/panels/MidiPanel';
import { MidiClockPanel } from './ui/panels/MidiClockPanel';
import { PatchManager } from './ui/panels/PatchManager';
import { KeyboardInput } from './ui/panels/KeyboardInput';
import { RecordingPanel } from './ui/panels/RecordingPanel';
import { PianoKeyboard } from './ui/panels/PianoKeyboard';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { CommandPalette } from './ui/CommandPalette';
import { MacroBoardModal } from './ui/macroboard/MacroBoardModal';
import { patchSyncer } from './patch/patchSyncer';
import { midiRouter } from './midi/MidiRouter';
import { usePatchStore } from './patch/patchStore';
import { useUndoRedo } from './patch/useUndoRedo';
import { useAuthStore } from './atproto/authStore';
import { AuthButton } from './ui/components/AuthButton';
import { CommunityBrowser } from './ui/panels/CommunityBrowser';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isPianoCollapsed, setIsPianoCollapsed] = useState(true);
  const [isMacroBoardOpen, setIsMacroBoardOpen] = useState(false);
  const isAudioEnabled = usePatchStore((state) => state.isAudioEnabled);
  const setAudioEnabled = usePatchStore((state) => state.setAudioEnabled);
  const loadPatch = usePatchStore((state) => state.loadPatch);
  const audioInitializedRef = useRef(false);

  const { canUndo, canRedo, undo, redo } = useUndoRedo();
  const initAuth = useAuthStore((state) => state.init);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Command palette keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      }
      // Toggle piano with P key (when not in input)
      if (e.key === 'p' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          setIsPianoCollapsed((c) => !c);
        }
      }
      // Toggle macro board with M key (when not in input)
      if (e.key === 'm' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          setIsMacroBoardOpen((open) => !open);
        }
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
    loadPatch();
    setIsLoading(false);

    const enableOnInteraction = () => {
      setTimeout(() => {
        handleEnableAudio();
      }, 0);
    };

    document.addEventListener('mouseup', enableOnInteraction, { once: true });
    document.addEventListener('keydown', enableOnInteraction, { once: true });
    document.addEventListener('touchstart', enableOnInteraction, { once: true });

    return () => {
      document.removeEventListener('mouseup', enableOnInteraction);
      document.removeEventListener('keydown', enableOnInteraction);
      document.removeEventListener('touchstart', enableOnInteraction);
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
        <h1 className="text-lg font-bold text-cyan-400">Mosh</h1>
        <div className="flex items-center gap-4">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 text-sm rounded border border-gray-700 transition-colors"
              title="Undo (⌘Z)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 text-sm rounded border border-gray-700 transition-colors"
              title="Redo (⌘⇧Z)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>

          {/* Manual link */}
          <a
            href="https://mosh-manual.miren.club/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded border border-gray-700 transition-colors"
            title="Open Manual"
          >
            📖
          </a>

          <AuthButton />

          {/* Command palette */}
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

          {/* Macro Board toggle */}
          <button
            onClick={() => setIsMacroBoardOpen(true)}
            className={`px-2 py-1.5 text-sm rounded border transition-colors ${
              isMacroBoardOpen
                ? 'bg-fuchsia-900 hover:bg-fuchsia-800 text-fuchsia-300 border-fuchsia-700'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border-gray-700'
            }`}
            title="Macro Board (M)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>

          {/* Piano toggle */}
          <button
            onClick={() => setIsPianoCollapsed((c) => !c)}
            className={`px-2 py-1.5 text-sm rounded border transition-colors ${
              isPianoCollapsed
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-400 border-gray-700'
                : 'bg-cyan-900 hover:bg-cyan-800 text-cyan-300 border-cyan-700'
            }`}
            title="Toggle Piano (P)"
          >
            🎹
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
          <CommunityBrowser />
        </aside>

        {/* Graph Editor */}
        <main className="flex-1 flex flex-col">
          <div className="flex-1">
            <ErrorBoundary>
              <GraphCanvas />
            </ErrorBoundary>
          </div>

          {/* Piano Keyboard (docked at bottom) */}
          <PianoKeyboard
            isCollapsed={isPianoCollapsed}
            onToggleCollapse={() => setIsPianoCollapsed((c) => !c)}
          />
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Macro Board */}
      <MacroBoardModal
        isOpen={isMacroBoardOpen}
        onClose={() => setIsMacroBoardOpen(false)}
      />
    </div>
  );
}

export default App;
