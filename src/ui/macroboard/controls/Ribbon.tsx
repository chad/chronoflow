import { useCallback, useRef, useState, useEffect } from 'react';

interface RibbonProps {
  value: number; // 0-1
  label: string;
  color: string;
  springBack: boolean;
  centerValue: number;
  onChange: (value: number) => void;
  onRelease: () => void;
}

export function Ribbon({ value, label, color, springBack, centerValue, onChange, onRelease }: RibbonProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const safeValue = Math.max(0, Math.min(1, value));

  const updateFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      onChange(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
    },
    [onChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateFromPointer(e.clientX);
    },
    [updateFromPointer]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => updateFromPointer(e.clientX);
    const handlePointerUp = () => {
      setIsDragging(false);
      if (springBack) onRelease();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, updateFromPointer, springBack, onRelease]);

  return (
    <div className="flex flex-col justify-center h-full select-none gap-2 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color }}>
          {label}
        </span>
        <span className="text-xs font-mono text-gray-400">{Math.round(safeValue * 100)}</span>
      </div>
      <div
        ref={trackRef}
        className="relative h-8 rounded-full bg-gray-800 cursor-pointer overflow-hidden border border-gray-700"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
      >
        {/* Center mark for spring-back */}
        {springBack && (
          <div
            className="absolute top-0 bottom-0 w-px bg-gray-500"
            style={{ left: `${centerValue * 100}%` }}
          />
        )}

        {/* Fill from center (spring-back) or from left */}
        {springBack ? (
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: `${Math.min(safeValue, centerValue) * 100}%`,
              width: `${Math.abs(safeValue - centerValue) * 100}%`,
              background: color,
              opacity: 0.4,
            }}
          />
        ) : (
          <div
            className="absolute top-0 bottom-0 left-0"
            style={{
              width: `${safeValue * 100}%`,
              background: `linear-gradient(to right, ${color}40, ${color}80)`,
            }}
          />
        )}

        {/* Position indicator */}
        <div
          className="absolute top-0 bottom-0 w-2 -translate-x-1/2 rounded-full"
          style={{
            left: `${safeValue * 100}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}80`,
          }}
        />
      </div>
    </div>
  );
}
