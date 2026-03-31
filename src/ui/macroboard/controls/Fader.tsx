import { useCallback, useRef, useState, useEffect } from 'react';

interface FaderProps {
  value: number; // 0-1 normalized
  label: string;
  color: string;
  onChange: (value: number) => void;
}

export function Fader({ value, label, color, onChange }: FaderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const safeValue = Math.max(0, Math.min(1, value));

  const updateFromPointer = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const normalized = 1 - (clientY - rect.top) / rect.height;
      onChange(Math.max(0, Math.min(1, normalized)));
    },
    [onChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateFromPointer(e.clientY);
    },
    [updateFromPointer]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => updateFromPointer(e.clientY);
    const handlePointerUp = () => setIsDragging(false);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, updateFromPointer]);

  return (
    <div className="flex flex-col items-center justify-center h-full select-none gap-3 px-4 py-3">
      <div
        ref={trackRef}
        className="relative w-3 flex-1 rounded-full bg-gray-800 cursor-pointer overflow-hidden"
        style={{ touchAction: 'none', minHeight: 80 }}
        onPointerDown={handlePointerDown}
      >
        {/* Filled portion */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full transition-none"
          style={{
            height: `${safeValue * 100}%`,
            background: `linear-gradient(to top, ${color}, ${color}80)`,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
        {/* Thumb */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-7 h-3 rounded-sm bg-gray-200"
          style={{
            bottom: `calc(${safeValue * 100}% - 6px)`,
            boxShadow: `0 0 6px ${color}80`,
          }}
        />
      </div>
      <div className="text-center">
        <div className="text-xs font-mono text-gray-300">{Math.round(safeValue * 100)}</div>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color }}>
          {label}
        </span>
      </div>
    </div>
  );
}
