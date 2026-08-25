
import React, { useRef, useEffect } from 'react';

interface ScopeProps {
  type: 'lfo' | 'sequencer' | 'audio';
  config: any;
  value: number; // The current output value to display
  time: number; // Current sim time
}

export const Scope: React.FC<ScopeProps> = ({ type, config, value, time }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    // Push new value
    historyRef.current.push(value);
    if (historyRef.current.length > cvs.width) historyRef.current.shift();

    // Draw
    ctx.fillStyle = '#18181b'; // zinc-950
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // Draw Grid
    ctx.strokeStyle = '#27272a';
    ctx.beginPath();
    ctx.moveTo(0, cvs.height / 2); ctx.lineTo(cvs.width, cvs.height / 2);
    ctx.stroke();

    // Draw Wave
    ctx.strokeStyle = '#10b981'; // emerald-500
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const h = cvs.height;
    // Normalize display based on expected range
    // LFO is -1 to 1. Audio is 0 to 1.
    const range = type === 'audio' ? 1.0 : 2.0;
    // Audio is 0..1, LFO is -1..1 centered at 0
    const offset = type === 'audio' ? 0 : 0;

    for (let i = 0; i < historyRef.current.length; i++) {
      const val = historyRef.current[i];
      // Map value to Y. 
      // LFO: -1 -> h, 1 -> 0
      // Audio: 0 -> h, 1 -> 0
      let norm = 0;
      if (type === 'audio') {
        norm = 1 - Math.min(1, Math.max(0, val));
      } else {
        norm = 1 - (val + 1) / 2;
      }

      const y = norm * h;
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.stroke();

    // Draw Head
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    const lastVal = historyRef.current[historyRef.current.length - 1] || 0;
    let lastNorm = type === 'audio' ? 1 - lastVal : 1 - (lastVal + 1) / 2;
    ctx.arc(historyRef.current.length - 1, lastNorm * h, 2, 0, Math.PI * 2);
    ctx.fill();

  }, [value]);

  return (
    <canvas ref={canvasRef} width={120} height={32} className="w-full h-8 bg-zinc-950 rounded-sm border border-zinc-800/50" />
  );
};
