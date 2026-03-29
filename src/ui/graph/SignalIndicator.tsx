// SignalIndicator - Shows live signal activity on nodes
// Uses AnalyserNode to detect if signal is flowing

import { useState, useEffect, useRef } from 'react';
import { audioGraph } from '../../audio/AudioGraph';

/** Tiny LED that pulses when signal flows through a node */
export function SignalLED({ nodeId }: { nodeId: string }) {
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    const node = audioGraph.getNode(nodeId);
    if (!node) return;
    const output = node.getOutputNode();
    const ctx = audioGraph.getContext();
    if (!output || !ctx) return;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;
    const data = new Float32Array(analyser.fftSize);

    try {
      output.connect(analyser);
    } catch {
      return;
    }

    // Throttle to ~10Hz (100ms) instead of 60fps — LED doesn't need high refresh
    const TICK_INTERVAL = 100;
    const tick = () => {
      const now = performance.now();
      if (now - lastTickRef.current >= TICK_INTERVAL) {
        lastTickRef.current = now;
        if (analyserRef.current) {
          analyserRef.current.getFloatTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
          }
          const rms = Math.sqrt(sum / data.length);
          setLevel(Math.min(1, rms * 5));
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        output.disconnect(analyser);
      } catch { /* ignore */ }
    };
  }, [nodeId]);

  if (level < 0.001) {
    return <div className="w-2 h-2 rounded-full bg-gray-700" title="No signal" />;
  }

  return (
    <div
      className="w-2 h-2 rounded-full transition-opacity"
      style={{
        backgroundColor: level > 0.5 ? '#f97316' : '#22c55e',
        opacity: 0.3 + level * 0.7,
        boxShadow: level > 0.3 ? `0 0 4px ${level > 0.5 ? '#f97316' : '#22c55e'}` : 'none',
      }}
      title={`Level: ${(level * 100).toFixed(0)}%`}
    />
  );
}

/** Mini oscilloscope that renders in a small canvas */
export function MiniScope({ nodeId, width = 60, height = 24 }: { nodeId: string; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const node = audioGraph.getNode(nodeId);
    if (!node) return;
    const output = node.getOutputNode();
    const ctx = audioGraph.getContext();
    if (!output || !ctx) return;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const data = new Float32Array(analyser.fftSize);

    try {
      output.connect(analyser);
    } catch {
      return;
    }

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      analyser.getFloatTimeDomainData(data);

      const drawCtx = canvas.getContext('2d');
      if (!drawCtx) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      drawCtx.clearRect(0, 0, width, height);
      drawCtx.strokeStyle = '#06b6d4';
      drawCtx.lineWidth = 1;
      drawCtx.beginPath();

      const sliceWidth = width / data.length;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i];
        const y = (1 - v) * height / 2;
        if (i === 0) drawCtx.moveTo(x, y);
        else drawCtx.lineTo(x, y);
        x += sliceWidth;
      }
      drawCtx.stroke();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        output.disconnect(analyser);
      } catch { /* ignore */ }
    };
  }, [nodeId, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded bg-gray-800/50"
      style={{ width, height }}
    />
  );
}

/** Level meter for the output node */
export function LevelMeter({ nodeId, height = 60 }: { nodeId: string; height?: number }) {
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const rafRef = useRef<number | null>(null);
  const peakDecayRef = useRef(0);

  useEffect(() => {
    const node = audioGraph.getNode(nodeId);
    if (!node) return;
    const output = node.getOutputNode();
    const ctx = audioGraph.getContext();
    if (!output || !ctx) return;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const data = new Float32Array(analyser.fftSize);

    try {
      output.connect(analyser);
    } catch {
      return;
    }

    const tick = () => {
      analyser.getFloatTimeDomainData(data);
      let maxVal = 0;
      for (let i = 0; i < data.length; i++) {
        maxVal = Math.max(maxVal, Math.abs(data[i]));
      }
      setLevel(Math.min(1, maxVal));

      // Peak hold with decay
      if (maxVal > peakDecayRef.current) {
        peakDecayRef.current = maxVal;
      } else {
        peakDecayRef.current *= 0.995;
      }
      setPeak(Math.min(1, peakDecayRef.current));

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        output.disconnect(analyser);
      } catch { /* ignore */ }
    };
  }, [nodeId]);

  const levelHeight = level * height;
  const peakY = (1 - peak) * height;
  const isClipping = peak > 0.95;

  return (
    <div className="flex gap-0.5">
      <div
        className="w-3 bg-gray-800 rounded overflow-hidden relative"
        style={{ height }}
      >
        {/* Level fill */}
        <div
          className="absolute bottom-0 w-full transition-[height] duration-[30ms]"
          style={{
            height: levelHeight,
            background: isClipping
              ? 'linear-gradient(to top, #22c55e, #eab308, #ef4444)'
              : 'linear-gradient(to top, #22c55e, #22c55e)',
          }}
        />
        {/* Peak marker */}
        <div
          className="absolute w-full h-px"
          style={{
            top: peakY,
            backgroundColor: isClipping ? '#ef4444' : '#86efac',
          }}
        />
      </div>
    </div>
  );
}
