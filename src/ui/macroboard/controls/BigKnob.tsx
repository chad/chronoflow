import { useCallback, useRef, useState, useEffect } from 'react';

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  if (Math.abs(endAngle - startAngle) < 0.1) return '';
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const sweep = endAngle > startAngle ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

interface BigKnobProps {
  value: number; // 0-1 normalized
  label: string;
  color: string;
  onChange: (value: number) => void;
}

export function BigKnob({ value, label, color, onChange }: BigKnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartValue = useRef(0);

  const safeValue = Math.max(0, Math.min(1, value));
  const rotation = safeValue * 270 - 135;
  const startAngle = -135;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartValue.current = safeValue;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [safeValue]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaY = dragStartY.current - e.clientY;
      const newValue = Math.max(0, Math.min(1, dragStartValue.current + deltaY / 200));
      onChange(newValue);
    };

    const handlePointerUp = () => setIsDragging(false);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, onChange]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const newValue = Math.max(0, Math.min(1, safeValue - e.deltaY / 1000));
      onChange(newValue);
    },
    [safeValue, onChange]
  );

  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const trackR = size / 2 - 10;
  const indicatorR = trackR - 8;

  return (
    <div className="flex flex-col items-center justify-center h-full select-none gap-2">
      <div
        className="relative cursor-pointer"
        style={{ width: size, height: size, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background track */}
          <path
            d={describeArc(cx, cy, trackR, -135, 135)}
            fill="none"
            stroke="#374151"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Value arc */}
          {safeValue > 0.005 && (
            <path
              d={describeArc(cx, cy, trackR, startAngle, rotation)}
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
            />
          )}
          {/* Indicator dot */}
          <circle
            cx={cx + indicatorR * Math.sin((rotation * Math.PI) / 180)}
            cy={cy - indicatorR * Math.cos((rotation * Math.PI) / 180)}
            r="5"
            fill={color}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
          {/* Center value display */}
          <text
            x={cx}
            y={cy + 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="18"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {Math.round(safeValue * 100)}
          </text>
        </svg>
      </div>
      <span className="text-sm font-medium uppercase tracking-wider" style={{ color }}>
        {label}
      </span>
    </div>
  );
}
