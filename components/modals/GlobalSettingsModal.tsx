import React, { useRef } from 'react';
import { X, Settings } from 'lucide-react';
import { Button } from '../ui/Shared';
import { GlobalControls } from '../controls/GlobalControls';
import { RGBPostProcessingConfig, EffectInstance, EngineMode } from '../../types';
import { useModalA11y } from '../../hooks/useFocusTrap';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  engineMode?: EngineMode;
  setEngineMode?: (m: EngineMode) => void;
  speed: number;
  setSpeed: (v: number) => void;
  gridSize: number | { width: number; height: number };
  onApplyResolution?: (width: number, height: number) => void;
  openResolutionModal?: () => void;
  colorMap: string;
  setColorMap: (v: string) => void;
  clampMode: boolean;
  setClampMode: (v: boolean) => void;
  onOpenColorCustomizer: () => void;
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

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({
  isOpen,
  onClose,
  engineMode = 'gpu',
  setEngineMode,
  speed,
  setSpeed,
  gridSize,
  onApplyResolution,
  openResolutionModal,
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
  setRenderStyle,
  effects,
  setEffects,
  onRemoveEffect,
  onToggleEffect
}) => {
  const containerRef = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-settings-title"
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center ui-modal-overlay backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="global-settings-modal-card ui-modal shadow-2xl animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between ui-modal-header pb-2 shrink-0 border-b border-zinc-800/80">
          <h2 id="global-settings-title" className="text-xs font-normal uppercase tracking-wider ui-modal-title flex items-center gap-2 text-zinc-100">
            <Settings size={14} className="text-zinc-400" /> Settings
          </h2>
          <button
            onClick={onClose}
            className="ui-modal-close transition-colors p-1 text-zinc-400 hover:text-white cursor-pointer"
            title="Close (Esc)"
            aria-label="Close settings dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="global-settings-scroll-area custom-scrollbar my-2 pr-1.5">
          <GlobalControls
            engineMode={engineMode}
            setEngineMode={setEngineMode}
            speed={speed}
            setSpeed={setSpeed}
            gridSize={gridSize}
            onApplyResolution={onApplyResolution}
            openModal={openResolutionModal || (() => {})}
            colorMap={colorMap}
            setColorMap={setColorMap}
            clampMode={clampMode}
            setClampMode={setClampMode}
            onOpenColorCustomizer={onOpenColorCustomizer}
            stabilityThreshold={stabilityThreshold}
            setStabilityThreshold={setStabilityThreshold}
            fadeOutRate={fadeOutRate}
            setFadeOutRate={setFadeOutRate}
            rgbPostProcessing={rgbPostProcessing}
            setRgbPostProcessing={setRgbPostProcessing}
            renderStyle={renderStyle}
            setRenderStyle={setRenderStyle}
            effects={effects}
            setEffects={setEffects}
            onRemoveEffect={onRemoveEffect}
            onToggleEffect={onToggleEffect}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/80 shrink-0">
          <Button size="sm" onClick={onClose} className="font-normal cursor-pointer">Done</Button>
        </div>
      </div>
    </div>
  );
};
