import { useCallback } from 'react';

interface PerformButtonProps {
  pressed: boolean;
  mode: 'momentary' | 'toggle';
  label: string;
  color: string;
  onPress: () => void;
  onRelease: () => void;
}

export function PerformButton({ pressed, mode, label, color, onPress, onRelease }: PerformButtonProps) {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (mode === 'momentary') {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
      onPress();
    },
    [mode, onPress]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (mode === 'momentary') {
        onRelease();
      }
    },
    [mode, onRelease]
  );

  return (
    <div className="flex items-center justify-center h-full p-3 select-none">
      <button
        className="w-full h-full rounded-xl font-bold uppercase tracking-wider text-sm transition-all duration-75 border-2"
        style={{
          touchAction: 'none',
          background: pressed
            ? `linear-gradient(135deg, ${color}, ${color}cc)`
            : '#1f2937',
          borderColor: pressed ? color : '#4b5563',
          color: pressed ? '#fff' : '#9ca3af',
          boxShadow: pressed
            ? `0 0 20px ${color}60, inset 0 2px 4px rgba(0,0,0,0.3)`
            : 'inset 0 -2px 4px rgba(0,0,0,0.3)',
          transform: pressed ? 'scale(0.97)' : 'scale(1)',
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {label}
      </button>
    </div>
  );
}
