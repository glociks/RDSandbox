import React, { useState, useEffect } from 'react';
import { Card, Label, Input, Slider, Button, Switch } from '../ui/Shared';
import { Settings2, Maximize, Palette, ShieldCheck, Pen, Gauge, Wind, Zap, Sparkles, AlertTriangle, ChevronRight } from 'lucide-react';
import { EffectInstance, RGBPostProcessingConfig, EngineMode } from '../../types';

interface Props {
  engineMode?: EngineMode;
  setEngineMode?: (m: EngineMode) => void;
  speed: number;
  setSpeed: (v: number) => void;
  gridSize: number | { width: number; height: number };
  onApplyResolution?: (width: number, height: number) => void;
  openModal?: () => void;
  colorMap: string;
  setColorMap: (v: string) => void;
  clampMode: boolean;
  setClampMode: (v: boolean) => void;
  onOpenColorCustomizer?: () => void;
  stabilityThreshold?: number;
  setStabilityThreshold?: (v: number) => void;
  fadeOutRate?: number;
  setFadeOutRate?: (v: number) => void;
  rgbPostProcessing?: RGBPostProcessingConfig;
  setRgbPostProcessing?: (cfg: RGBPostProcessingConfig | ((prev: RGBPostProcessingConfig) => RGBPostProcessingConfig)) => void;
  renderStyle?: 'pixelated' | 'smooth';
  setRenderStyle?: (v: 'pixelated' | 'smooth') => void;
  effects?: EffectInstance[];
  setEffects?: (effects: EffectInstance[]) => void;
  onRemoveEffect?: (id: string) => void;
  onToggleEffect?: (id: string) => void;
}

export const GlobalControls: React.FC<Props> = ({
  engineMode = 'gpu',
  setEngineMode,
  speed,
  setSpeed,
  gridSize,
  onApplyResolution,
  openModal,
  colorMap,
  setColorMap,
  clampMode,
  setClampMode,
  onOpenColorCustomizer,
  stabilityThreshold,
  setStabilityThreshold,
  fadeOutRate,
  setFadeOutRate,
  rgbPostProcessing,
  setRgbPostProcessing,
  renderStyle,
  setRenderStyle
}) => {
  // Resolution inputs state
  const initialW = typeof gridSize === 'number' ? gridSize : gridSize?.width ?? 512;
  const initialH = typeof gridSize === 'number' ? gridSize : gridSize?.height ?? 512;
  const [resW, setResW] = useState<number>(initialW);
  const [resH, setResH] = useState<number>(initialH);

  useEffect(() => {
    const w = typeof gridSize === 'number' ? gridSize : gridSize?.width ?? 512;
    const h = typeof gridSize === 'number' ? gridSize : gridSize?.height ?? 512;
    setResW(w);
    setResH(h);
  }, [gridSize]);

  // Engine confirmation modal state
  const [pendingEngineMode, setPendingEngineMode] = useState<EngineMode | null>(null);
  const [showEngineConfirm, setShowEngineConfirm] = useState(false);

  // Accordion states - both automatically closed by default
  const [isPostProcessingOpen, setIsPostProcessingOpen] = useState(false);
  const [isMiscOpen, setIsMiscOpen] = useState(false);

  const handleResolutionApply = () => {
    const w = Math.max(16, Math.min(4096, resW || 512));
    const h = Math.max(16, Math.min(4096, resH || 512));
    if (onApplyResolution) {
      onApplyResolution(w, h);
    } else if (openModal) {
      openModal();
    }
  };

  const handleEngineChange = (newMode: EngineMode) => {
    if (newMode !== 'gpu') {
      setPendingEngineMode(newMode);
      setShowEngineConfirm(true);
    } else {
      setEngineMode?.('gpu');
    }
  };

  const confirmEngineChange = () => {
    if (pendingEngineMode && setEngineMode) {
      setEngineMode(pendingEngineMode);
    }
    setShowEngineConfirm(false);
    setPendingEngineMode(null);
  };

  const cancelEngineChange = () => {
    setShowEngineConfirm(false);
    setPendingEngineMode(null);
  };

  const currentPP = rgbPostProcessing || {
    exposure: 1.0,
    contrast: 1.0,
    gamma: 1.0,
    saturation: 1.0,
    brightness: 0.0,
    tint: { r: 1.0, g: 1.0, b: 1.0 }
  };

  return (
    <div className="space-y-3 font-normal">
      {/* 1. Direct Resolution Inputs & Apply */}
      <div className="ui-settings-box space-y-1.5">
        <div className="flex items-center justify-between text-xs text-zinc-300 font-normal">
          <span className="flex items-center gap-1.5 font-normal">
            <Maximize size={12} className="text-zinc-400" /> Grid Resolution
          </span>
          <span className="text-[10px] text-zinc-500 font-mono font-normal">
            {initialW} × {initialH} px
          </span>
        </div>
        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex items-center gap-1 flex-1">
            <span className="text-[10px] text-zinc-500 font-normal">X:</span>
            <Input
              id="global-grid-res-w"
              name="global-grid-res-w"
              aria-label="Grid Resolution Width (X)"
              type="number"
              value={resW}
              onChange={(e: any) => setResW(Math.max(16, parseInt(e.target.value) || 16))}
              className="w-full text-right h-6 text-xs font-normal"
              step={16}
              min={16}
              max={4096}
            />
          </div>
          <div className="flex items-center gap-1 flex-1">
            <span className="text-[10px] text-zinc-500 font-normal">Y:</span>
            <Input
              id="global-grid-res-h"
              name="global-grid-res-h"
              aria-label="Grid Resolution Height (Y)"
              type="number"
              value={resH}
              onChange={(e: any) => setResH(Math.max(16, parseInt(e.target.value) || 16))}
              className="w-full text-right h-6 text-xs font-normal"
              step={16}
              min={16}
              max={4096}
            />
          </div>
          <Button
            size="xs"
            variant="secondary"
            onClick={handleResolutionApply}
            className="h-6 px-3 text-xs font-normal cursor-pointer text-zinc-200 hover:text-white"
          >
            Apply
          </Button>
        </div>
      </div>

      {/* 2. Execution Engine (Hardware WebGL2 GPU Locked) */}
      <div className="ui-settings-box space-y-1.5">
        <div className="flex justify-between items-center text-xs text-zinc-300 font-normal">
          <label htmlFor="global-execution-engine" className="flex items-center gap-1.5 font-normal cursor-pointer">
            <Zap size={12} className="text-zinc-400" /> Execution Engine
          </label>
          <span className="text-[10px] text-emerald-400 font-mono uppercase font-normal">
            GPU Active
          </span>
        </div>
        <select
          id="global-execution-engine"
          name="global-execution-engine"
          aria-label="Execution Engine"
          value="gpu"
          disabled
          className="w-full bg-zinc-900/60 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 cursor-not-allowed font-normal"
          title="Hardware WebGL2 GPU acceleration is active"
        >
          <option value="gpu">GPU (Hardware WebGL2 Acceleration - Active)</option>
        </select>
      </div>

      {/* 3. Theme & Visual Presentation */}
      <div className="ui-settings-box space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-300 font-normal">
          <label htmlFor="global-theme-colormap" className="flex items-center gap-1.5 font-normal cursor-pointer">
            <Palette size={12} className="text-zinc-400" /> Theme & Color Palette
          </label>
        </div>
        <div className="flex items-center gap-2">
          <select
            id="global-theme-colormap"
            name="global-theme-colormap"
            aria-label="Theme & Color Palette"
            className="ui-input flex-1 text-xs px-2 py-1.5 outline-none font-normal"
            value={colorMap}
            onChange={(e) => {
              const val = e.target.value;
              setColorMap(val);
              if (val === 'custom' && onOpenColorCustomizer) {
                onOpenColorCustomizer();
              }
            }}
          >
            <option value="magma">Magma (Scalar)</option>
            <option value="electric">Electric (Scalar)</option>
            <option value="bio">Bio (Scalar)</option>
            <option value="thermal">Thermal (Scalar)</option>
            <option value="rgb">RGB Multichannel</option>
            <option value="custom">Custom...</option>
          </select>
          {colorMap === 'custom' && onOpenColorCustomizer && (
            <Button size="iconSm" variant="secondary" onClick={onOpenColorCustomizer} title="Edit Custom Theme" className="cursor-pointer">
              <Pen size={12} className="text-fuchsia-400" />
            </Button>
          )}
        </div>

        {/* Render Style: Sharp / Blurry */}
        {renderStyle && setRenderStyle && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-zinc-400 font-normal">Render Texture Style</span>
            <div className="flex bg-zinc-950 rounded-sm p-0.5 border border-zinc-800">
              <button
                type="button"
                onClick={() => setRenderStyle('pixelated')}
                className={`px-2 py-0.5 text-[9px] rounded-sm transition-colors cursor-pointer font-normal ${renderStyle === 'pixelated' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Sharp
              </button>
              <button
                type="button"
                onClick={() => setRenderStyle('smooth')}
                className={`px-2 py-0.5 text-[9px] rounded-sm transition-colors cursor-pointer font-normal ${renderStyle === 'smooth' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Blurry
              </button>
            </div>
          </div>
        )}

        {/* Post-Processing & Grading Accordion (Always available, closed by default) */}
        {setRgbPostProcessing && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsPostProcessingOpen(!isPostProcessingOpen)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800/80 text-zinc-300 text-xs font-normal transition-colors cursor-pointer"            >
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-zinc-400" />
                <span className="font-normal">Post-Processing &amp; Grading</span>
              </div>
              <ChevronRight size={13} className={`sidebar-chevron-icon text-zinc-400 ${isPostProcessingOpen ? 'is-open' : 'is-closed'}`} />
            </button>

            {isPostProcessingOpen && (
              <div className="mt-1.5 p-2.5 rounded bg-zinc-950/60 border border-zinc-800 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[10px] text-zinc-400 font-normal">Color Tuning &amp; Exposure</span>
                  <button
                    type="button"
                    onClick={() => setRgbPostProcessing({
                      exposure: 1.0,
                      contrast: 1.0,
                      gamma: 1.0,
                      saturation: 1.0,
                      brightness: 0.0,
                      tint: { r: 1.0, g: 1.0, b: 1.0 }
                    })}
                    className="text-[9px] text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700/60 transition-colors cursor-pointer font-normal"
                    title="Reset color grading to defaults"
                  >
                    Reset
                  </button>
                </div>

                {/* Exposure */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-400 font-normal">Exposure</span>
                    <span className="font-mono text-zinc-300 font-normal">{(currentPP.exposure ?? 1.0).toFixed(2)}×</span>
                  </div>
                  <Slider
                    min={0.2} max={2.5} step={0.05}
                    value={currentPP.exposure ?? 1.0}
                    onChange={(v: number) => setRgbPostProcessing(prev => ({ ...prev, exposure: v }))}
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-400 font-normal">Contrast</span>
                    <span className="font-mono text-zinc-300 font-normal">{(currentPP.contrast ?? 1.0).toFixed(2)}</span>
                  </div>
                  <Slider
                    min={0.3} max={2.2} step={0.05}
                    value={currentPP.contrast ?? 1.0}
                    onChange={(v: number) => setRgbPostProcessing(prev => ({ ...prev, contrast: v }))}
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-400 font-normal">Saturation</span>
                    <span className="font-mono text-zinc-300 font-normal">{(currentPP.saturation ?? 1.0).toFixed(2)}</span>
                  </div>
                  <Slider
                    min={0.0} max={2.5} step={0.05}
                    value={currentPP.saturation ?? 1.0}
                    onChange={(v: number) => setRgbPostProcessing(prev => ({ ...prev, saturation: v }))}
                  />
                </div>

                {/* Gamma */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-400 font-normal">Gamma</span>
                    <span className="font-mono text-zinc-300 font-normal">{(currentPP.gamma ?? 1.0).toFixed(2)}</span>
                  </div>
                  <Slider
                    min={0.4} max={2.2} step={0.05}
                    value={currentPP.gamma ?? 1.0}
                    onChange={(v: number) => setRgbPostProcessing(prev => ({ ...prev, gamma: v }))}
                  />
                </div>

                {/* Brightness Lift */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-400 font-normal">Brightness Lift</span>
                    <span className="font-mono text-zinc-300 font-normal">
                      {(currentPP.brightness ?? 0.0) > 0 ? `+${(currentPP.brightness ?? 0.0).toFixed(2)}` : (currentPP.brightness ?? 0.0).toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    min={-0.4} max={0.4} step={0.02}
                    value={currentPP.brightness ?? 0.0}
                    onChange={(v: number) => setRgbPostProcessing(prev => ({ ...prev, brightness: v }))}
                  />
                </div>

                {/* RGB Color Balance Tint */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-zinc-400 font-normal">Channel Gains (R / G / B)</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-zinc-400 font-mono font-normal">R: {(currentPP.tint?.r ?? 1.0).toFixed(1)}</span>
                      <Slider
                        min={0.0} max={2.0} step={0.05}
                        value={currentPP.tint?.r ?? 1.0}
                        onChange={(v: number) => setRgbPostProcessing(prev => ({ ...prev, tint: { ...(prev.tint || { r: 1, g: 1, b: 1 }), r: v } }))}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-zinc-400 font-mono font-normal">G: {(currentPP.tint?.g ?? 1.0).toFixed(1)}</span>
                      <Slider
                        min={0.0} max={2.0} step={0.05}
                        value={currentPP.tint?.g ?? 1.0}
                        onChange={(v: number) => setRgbPostProcessing(prev => ({ ...prev, tint: { ...(prev.tint || { r: 1, g: 1, b: 1 }), g: v } }))}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-zinc-400 font-mono font-normal">B: {(currentPP.tint?.b ?? 1.0).toFixed(1)}</span>
                      <Slider
                        min={0.0} max={2.0} step={0.05}
                        value={currentPP.tint?.b ?? 1.0}
                        onChange={(v: number) => setRgbPostProcessing(prev => ({ ...prev, tint: { ...(prev.tint || { r: 1, g: 1, b: 1 }), b: v } }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Bottom Simulation MISC Settings Accordion (Automatically closed by default) */}
      <div className="ui-settings-box">
        <button
          type="button"
          onClick={() => setIsMiscOpen(!isMiscOpen)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800/80 text-zinc-300 text-xs font-normal transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <Settings2 size={12} className="text-zinc-400" />
            <span className="font-normal">Simulation MISC Settings</span>
          </div>
          <ChevronRight size={13} className={`sidebar-chevron-icon text-zinc-400 ${isMiscOpen ? 'is-open' : 'is-closed'}`} />
        </button>

        {isMiscOpen && (
          <div className="mt-1.5 p-2.5 rounded bg-zinc-950/60 border border-zinc-800 space-y-3 animate-in fade-in duration-150">
            {/* Iterations / Frame */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-300 font-normal">Iterations / Frame (Speed)</span>
                <Input
                  type="number"
                  value={speed}
                  onChange={(e: any) => setSpeed(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-12 text-right h-5.5 text-[11px] font-mono font-normal px-1"
                  step={1}
                  min={1}
                  max={100}
                />
              </div>
              <Slider min={1} max={100} step={1} value={speed} onChange={setSpeed} />
            </div>

            {/* Stability Threshold */}
            {stabilityThreshold !== undefined && setStabilityThreshold && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Gauge size={12} className="text-zinc-400" />
                    <span className="text-[11px] text-zinc-300 font-normal">Stability Threshold</span>
                  </div>
                  <Input
                    type="number"
                    value={stabilityThreshold}
                    onChange={(e: any) => setStabilityThreshold(Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                    className="w-12 text-right font-mono h-5.5 text-[11px] font-normal px-1"
                    step={0.05}
                  />
                </div>
                <Slider
                  min={0.05} max={2.0} step={0.05}
                  value={stabilityThreshold}
                  onChange={setStabilityThreshold}
                  className="flex-1"
                />
                <p className="text-[9px] text-zinc-500 leading-tight font-normal">
                  Lower = Stable (Slower). Higher = Fast (Risk of Explosion).
                </p>
              </div>
            )}

            {/* Fade Out Strength */}
            {fadeOutRate !== undefined && setFadeOutRate && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Wind size={12} className="text-zinc-400" />
                    <span className="text-[11px] text-zinc-300 font-normal">Fade Out Strength</span>
                  </div>
                  <Input
                    type="number"
                    value={fadeOutRate}
                    onChange={(e: any) => setFadeOutRate(Math.max(0.01, Math.min(1.0, parseFloat(e.target.value) || 0.1)))}
                    className="w-12 text-right font-mono h-5.5 text-[11px] font-normal px-1"
                    step={0.05}
                    min={0.01}
                    max={1.0}
                  />
                </div>
                <Slider
                  min={0.01} max={1.0} step={0.05}
                  value={fadeOutRate}
                  onChange={setFadeOutRate}
                  className="flex-1"
                />
                <p className="text-[9px] text-zinc-500 leading-tight font-normal">
                  Controls how fast dead cells and trails dissipate.
                </p>
              </div>
            )}

            {/* Clamp Mode */}
            <div className="flex items-center justify-between pt-1" title="Prevents infinite numerical blowout">
              <div className="flex items-center gap-2">
                <ShieldCheck size={13} className="text-zinc-400" />
                <span className="text-[11px] text-zinc-300 font-normal">Clamp Mode</span>
              </div>
              <Switch checked={clampMode} onCheckedChange={setClampMode} />
            </div>
          </div>
        )}
      </div>

      {/* Execution Engine Confirmation Modal */}
      {showEngineConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-sm w-full p-4 shadow-2xl space-y-3 animate-in zoom-in-95 duration-150 font-normal">
            <div className="flex items-center gap-2.5 text-amber-400 pb-1 border-b border-zinc-800">
              <AlertTriangle size={16} />
              <span className="text-xs font-normal text-zinc-100">Switch Execution Engine</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-normal">
              Switching from GPU to <strong>{pendingEngineMode?.toUpperCase()}</strong> mode runs simulation physics on the CPU. This may cause high processor load, framerate drops, or browser freezes on larger grid resolutions.
            </p>
            <p className="text-[11px] text-zinc-400 font-normal">
              Are you sure you want to proceed?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button size="xs" variant="secondary" onClick={cancelEngineChange} className="font-normal cursor-pointer">
                Cancel
              </Button>
              <Button size="xs" variant="primary" onClick={confirmEngineChange} className="bg-amber-600 hover:bg-amber-500 font-normal cursor-pointer">
                Switch to {pendingEngineMode?.toUpperCase()}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
