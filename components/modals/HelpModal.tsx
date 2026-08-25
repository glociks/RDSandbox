import React from 'react';
import { X, Sliders, Layers, Sparkles, Activity, ShieldCheck, Zap, Keyboard } from 'lucide-react';
import { Card, Button } from '../ui/Shared';
import { useModalA11y } from '../../hooks/useFocusTrap';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const containerRef = useModalA11y({ isOpen: true, onClose });

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      className="fixed inset-0 z-[200] flex items-center justify-center ui-modal-overlay backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-2xl max-h-[85vh] flex flex-col ui-modal shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 ui-modal-header border-b border-zinc-800/80 shrink-0">
          <h2 id="help-modal-title" className="text-xs font-medium uppercase tracking-wider ui-modal-title flex items-center gap-2 text-zinc-100">
            <Sparkles size={14} className="text-zinc-400" /> McRD Generator — Guide &amp; Reference
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="ui-modal-close transition-colors p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800/80 cursor-pointer"
            title="Close (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar text-xs text-zinc-300 font-light leading-relaxed">
          {/* Section 1: Modular Physics & Stacking */}
          <div className="p-3 rounded bg-zinc-900/50 border border-zinc-800/70 space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-200 font-medium text-xs">
              <Sliders size={13} className="text-zinc-400" /> 1. Modular Simulation Stack
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-light">
              McRD features a composable, multi-layer physics pipeline. Combine Mass-Conserving Reaction-Diffusion (<strong className="text-zinc-300 font-medium">U / V / W</strong> morphogens), Physarum Slime Mold agents, Continuous Lenia, Wave Inertia (SoCA), and Fluid Advection simultaneously. Drag effect cards in the left sidebar to change execution order.
            </p>
          </div>

          {/* Section 2: Seeding & Media Injection */}
          <div className="p-3 rounded bg-zinc-900/50 border border-zinc-800/70 space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-200 font-medium text-xs">
              <Layers size={13} className="text-zinc-400" /> 2. Continuous Seeding &amp; Media Feed
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-light">
              Inject procedural patterns (Perlin noise, geometric shapes, math functions) or stream live media (webcam, video, image). Continuous seeds constantly replenish morphogen concentrations and stay live even while the physics engine is paused.
            </p>
          </div>

          {/* Section 3: Parameter Modulation & Keyframes */}
          <div className="p-3 rounded bg-zinc-900/50 border border-zinc-800/70 space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-200 font-medium text-xs">
              <Activity size={13} className="text-zinc-400" /> 3. Real-Time Automation &amp; Audio Modulation
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-light">
              Open the right automation sidebar to connect LFO oscillators, ADSR envelopes, step sequencers, audio frequency reactivity, and interactive keyframe timelines to any simulation or effect parameter.
            </p>
          </div>

          {/* Section 4: Performance & Hardware Acceleration */}
          <div className="p-3 rounded bg-zinc-900/50 border border-zinc-800/70 space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-200 font-medium text-xs">
              <Zap size={13} className="text-zinc-400" /> 4. Hardware Acceleration &amp; Stability
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-light">
              Hardware WebGL2 acceleration delivers 60+ FPS on GPU VRAM. Enable <strong className="text-zinc-300 font-medium">Clamp Mode</strong> (Shield icon in top bar) to automatically stabilize numerical feedback and prevent infinite blowout.
            </p>
          </div>

          {/* Section 5: Keyboard Shortcuts */}
          <div className="p-3 rounded bg-zinc-900/50 border border-zinc-800/70 space-y-2">
            <div className="flex items-center gap-2 text-zinc-200 font-medium text-xs">
              <Keyboard size={13} className="text-zinc-400" /> Quick Shortcuts
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10.5px]">
              <div className="flex items-center justify-between bg-zinc-950/60 px-2 py-1 rounded border border-zinc-800/60">
                <span className="text-zinc-400">Play / Pause</span>
                <kbd className="font-mono text-zinc-200 bg-zinc-800 px-1 rounded text-[9.5px]">Space</kbd>
              </div>
              <div className="flex items-center justify-between bg-zinc-950/60 px-2 py-1 rounded border border-zinc-800/60">
                <span className="text-zinc-400">Step Frame</span>
                <kbd className="font-mono text-zinc-200 bg-zinc-800 px-1 rounded text-[9.5px]">.</kbd>
              </div>
              <div className="flex items-center justify-between bg-zinc-950/60 px-2 py-1 rounded border border-zinc-800/60">
                <span className="text-zinc-400">Reset Grid</span>
                <kbd className="font-mono text-zinc-200 bg-zinc-800 px-1 rounded text-[9.5px]">R</kbd>
              </div>
              <div className="flex items-center justify-between bg-zinc-950/60 px-2 py-1 rounded border border-zinc-800/60">
                <span className="text-zinc-400">Zoom Canvas</span>
                <kbd className="font-mono text-zinc-200 bg-zinc-800 px-1 rounded text-[9.5px]">Wheel</kbd>
              </div>
              <div className="flex items-center justify-between bg-zinc-950/60 px-2 py-1 rounded border border-zinc-800/60">
                <span className="text-zinc-400">Pan Canvas</span>
                <kbd className="font-mono text-zinc-200 bg-zinc-800 px-1 rounded text-[9.5px]">Middle Click</kbd>
              </div>
              <div className="flex items-center justify-between bg-zinc-950/60 px-2 py-1 rounded border border-zinc-800/60">
                <span className="text-zinc-400">Close Modals</span>
                <kbd className="font-mono text-zinc-200 bg-zinc-800 px-1 rounded text-[9.5px]">Esc</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-3 border-t border-zinc-800/80 shrink-0 bg-zinc-900/40">
          <Button size="sm" onClick={onClose} className="font-normal text-xs cursor-pointer px-4 py-1">
            Done
          </Button>
        </div>
      </Card>
    </div>
  );
};