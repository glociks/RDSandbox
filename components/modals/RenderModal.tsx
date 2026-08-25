import React, { useState } from 'react';
import { Card, Button, Input, Label, Slider } from '../ui/Shared';
import { Video, X, AlertTriangle } from 'lucide-react';
import { useModalA11y } from '../../hooks/useFocusTrap';

export interface RenderConfig {
  durationFrames: number;
  warmupFrames: number;
  simSpeed: number;
  fps: number;
  fileName?: string;
}

interface Props {
  initialSpeed?: number;
  onConfirm: (config: RenderConfig) => void;
  onCancel: () => void;
}

export const RenderModal: React.FC<Props> = ({ initialSpeed = 2, onConfirm, onCancel }) => {
  const [fileName, setFileName] = useState(`mcrd_render_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
  const [duration, setDuration] = useState(300);
  const [warmup, setWarmup] = useState(0);
  const [fps, setFps] = useState(30);
  const [simSpeed, setSimSpeed] = useState(() => Math.max(1, Math.min(50, Math.round((initialSpeed || 2) * (60 / 30)))));

  const containerRef = useModalA11y({ isOpen: true, onClose: onCancel });

  const handleConfirm = () => {
    onConfirm({
      durationFrames: duration,
      warmupFrames: warmup,
      simSpeed,
      fps,
      fileName: fileName.trim() || `mcrd_render_${Date.now()}`
    });
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="render-modal-title"
      className="fixed inset-0 z-[200] flex items-center justify-center ui-modal-overlay backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <Card
        className="w-full max-w-[480px] px-7 sm:px-8 py-5 space-y-4 ui-modal shadow-2xl"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between ui-modal-header pb-2 border-b border-zinc-800/80">
          <h2 id="render-modal-title" className="text-xs font-medium uppercase tracking-wider ui-modal-title flex items-center gap-2">
            <Video size={14} className="text-red-400" /> Render Video
          </h2>
          <button onClick={onCancel} aria-label="Close dialog" className="ui-modal-close text-zinc-400 hover:text-white transition-colors p-0.5 cursor-pointer" title="Close">
            <X size={15} />
          </button>
        </div>

        <div className="space-y-3">
          {/* File Name Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label htmlFor="render-file-name" className="text-[10px] text-zinc-300 font-normal">File Name</Label>
            </div>
            <div className="relative flex items-center">
              <Input
                id="render-file-name"
                name="render-file-name"
                type="text"
                aria-label="Output file name"
                value={fileName}
                onChange={(e: { target: { value: string | number } }) => setFileName(e.target.value as string)}
                placeholder="mcrd_render"
                className="w-full px-2.5 pr-12 text-xs py-1 h-7 font-mono font-normal"
              />
              <span className="absolute right-2.5 text-[10px] text-zinc-500 pointer-events-none font-mono">.mp4</span>
            </div>
          </div>

          {/* 2-Column Grid: Duration & Warmup */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] text-zinc-300 font-normal">Duration</Label>
                <span className="text-[9px] text-zinc-400 font-mono font-normal">{(duration / fps).toFixed(1)}s ({duration}f)</span>
              </div>
              <Slider min={10} max={1200} step={10} value={duration} onChange={setDuration} aria-label="Render Duration" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] text-zinc-300 font-normal">Warmup Pre-Roll</Label>
                <span className="text-[9px] text-zinc-400 font-mono font-normal">{warmup} frames</span>
              </div>
              <Slider min={0} max={300} step={10} value={warmup} onChange={setWarmup} aria-label="Warmup Pre-roll Frames" />
            </div>
          </div>

          {/* 2-Column Grid: Speed Multiplier & Framerate */}
          <div className="grid grid-cols-2 gap-3.5 items-center">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] text-zinc-300 font-normal">Simulation Speed</Label>
                <span className="text-[9px] text-zinc-400 font-mono font-normal">{simSpeed} steps/f ({simSpeed * fps} st/s)</span>
              </div>
              <Slider min={1} max={50} step={1} value={simSpeed} onChange={setSimSpeed} aria-label="Simulation Steps per Frame" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-300 font-normal">Framerate (FPS)</Label>
              <div className="flex gap-1.5">
                {[24, 30, 60].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFps(r)}
                    aria-label={`${r} Frames per Second`}
                    className={`flex-1 py-0.5 rounded text-[10px] font-normal border transition-colors cursor-pointer ${
                      fps === r
                        ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-medium shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Compact Notice */}
          <div className="bg-zinc-900/60 px-3 py-2 rounded text-[9.5px] text-zinc-400 flex gap-2 items-center border border-zinc-800/80">
            <AlertTriangle size={12} className="text-amber-500 shrink-0" />
            <span className="leading-tight font-normal">Fast offline hardware export: outputs a {(duration / fps).toFixed(1)}s MP4 video at {fps} FPS with {(simSpeed * fps).toLocaleString()} sim steps/sec.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2.5 border-t border-zinc-800/80">
          <Button size="sm" variant="secondary" onClick={onCancel} className="h-7 text-xs px-3 font-normal">
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} className="h-7 text-xs px-4 bg-red-600 hover:bg-red-500 text-white border-none shadow font-normal cursor-pointer">
            Start Render
          </Button>
        </div>
      </Card>
    </div>
  );
};
