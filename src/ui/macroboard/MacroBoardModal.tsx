import { useState, useEffect, useCallback } from 'react';
import { usePatchStore } from '../../patch/patchStore';
import { MacroBoardGrid } from './MacroBoardGrid';
import { MacroBoardControlPalette } from './MacroBoardControlPalette';
import { MacroBoardEditPanel } from './MacroBoardEditPanel';

interface MacroBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MacroBoardModal({ isOpen, onClose }: MacroBoardModalProps) {
  const [mode, setMode] = useState<'perform' | 'edit'>('perform');
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);

  const macroBoard = usePatchStore((s) => s.patch.macroBoard);
  const initMacroBoard = usePatchStore((s) => s.initMacroBoard);

  // Initialize board on first open if needed
  useEffect(() => {
    if (isOpen && !macroBoard) {
      initMacroBoard();
    }
  }, [isOpen, macroBoard, initMacroBoard]);

  // Clear selection when switching to perform mode
  useEffect(() => {
    if (mode === 'perform') setSelectedControlId(null);
  }, [mode]);

  // Escape to close, E to toggle edit
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode === 'edit') {
          setMode('perform');
        } else {
          onClose();
        }
      }
      if (e.key === 'e' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          setMode((m) => (m === 'edit' ? 'perform' : 'edit'));
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, onClose]);

  if (!isOpen || !macroBoard) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="h-10 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-fuchsia-400">Macro Board</h2>
          <span className="text-xs text-gray-500">
            {usePatchStore.getState().patch.meta.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex rounded overflow-hidden border border-gray-700">
            <button
              onClick={() => setMode('perform')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                mode === 'perform'
                  ? 'bg-fuchsia-900 text-fuchsia-300'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Perform
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                mode === 'edit'
                  ? 'bg-fuchsia-900 text-fuchsia-300'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Edit
            </button>
          </div>

          <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-800 text-gray-500 rounded border border-gray-700">E</kbd>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Content */}
      {mode === 'edit' ? (
        <div className="flex-1 flex overflow-hidden">
          <MacroBoardControlPalette board={macroBoard} />
          <MacroBoardGrid
            board={macroBoard}
            mode="edit"
            selectedControlId={selectedControlId}
            onSelectControl={setSelectedControlId}
          />
          {selectedControlId && (
            <MacroBoardEditPanel
              controlId={selectedControlId}
              onClose={() => setSelectedControlId(null)}
            />
          )}
        </div>
      ) : (
        <MacroBoardGrid
          board={macroBoard}
          mode="perform"
          selectedControlId={null}
          onSelectControl={() => {}}
        />
      )}
    </div>
  );
}
