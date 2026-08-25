import React, { useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Link2, Trash2, Atom, FlaskConical, Move, Compass, Wind, ArrowDown, Grid3x3, Snowflake, Footprints, Zap, Palette, Cuboid, Settings2 } from 'lucide-react';
import { Switch } from '../ui/Shared';
import { EffectControlsRenderer } from '../controls/EffectControlsRenderer';
import { SimulationParams, StabilizerConfig, EffectInstance, EffectType } from '../../types';
import { getEffectIcon } from '../../utils/effectIcons';

interface QuickAccessBarProps {
  leftOffset: number;
  activePanel: string | null;
  setActivePanel: (panel: string | null) => void;
  params: SimulationParams;
  handleParamChange: (key: keyof SimulationParams, value: any) => void;
  stabilizeConfig: StabilizerConfig;
  setStabilizeConfig: (v: StabilizerConfig) => void;
  showStabilizeConfig: boolean;
  setShowStabilizeConfig: (v: boolean) => void;
  visible: boolean;

  // Automation
  activeLinkModuleId?: string | null;
  linkedParams?: string[];
  automatedParams?: Record<string, number>;

  // Synchronization with Left Sidebar
  isSidebarOpen?: boolean;
  onSelectSection?: (sectionId: string) => void;

  // Stackable Effects
  effects?: EffectInstance[];
  onToggleEffect?: (id: string) => void;
  onRemoveEffect?: (id: string) => void;
  onEffectParamChange?: (effectId: string, paramKey: string, value: any) => void;
}

export const QuickAccessBar: React.FC<QuickAccessBarProps> = ({
  leftOffset, activePanel, setActivePanel, params, handleParamChange,
  stabilizeConfig, setStabilizeConfig, showStabilizeConfig, setShowStabilizeConfig,
  visible, activeLinkModuleId, linkedParams = [], automatedParams = {},
  isSidebarOpen = false, onSelectSection,
  effects = [], onToggleEffect, onRemoveEffect, onEffectParamChange
}) => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        setActivePanel(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setActivePanel]);

  const togglePanel = (panel: string) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const handleItemClick = (panelId: string) => {
    if (isSidebarOpen && onSelectSection) {
      onSelectSection(panelId);
      if (activePanel) setActivePanel(null);
    } else {
      togglePanel(panelId);
    }
  };

  return (
    <div
      ref={barRef}
      className={`hidden md:flex fixed flex-col z-40 items-start ui-quick-access transition-all duration-300 ease-in-out ${
        visible && isSidebarOpen ? 'sidebar-open' : ''
      } ${
        visible ? 'opacity-100 translate-y-0 pointer-events-auto is-visible' : 'opacity-0 -translate-y-2 pointer-events-none is-hidden'
      }`}
      style={{ '--sidebar-offset': `${leftOffset}px` } as React.CSSProperties}
    >
      {effects.map(effect => {
        const Icon = getEffectIcon(effect.type);
        const isOpen = activePanel === effect.id;
        const prefix = `fx_${effect.id}_`;
        const isLinked = linkedParams.some(k => k.startsWith(prefix));
        const isAutomated = Object.keys(automatedParams).some(k => k.startsWith(prefix));
        const isLinking = !!activeLinkModuleId;

        return (
          <div
            key={effect.id}
            className={`
              flex flex-col overflow-hidden backdrop-blur-md transition-all duration-200 ease-out ui-hotbar-item
              ${isOpen
                ? 'ui-hotbar-panel'
                : `w-auto ${effect.enabled ? 'active-mode' : ''}`}
            `}
          >
            {/* Header */}
            <div
              className="flex items-center ui-hotbar-item-header gap-2 select-none cursor-pointer"
              onClick={() => handleItemClick(effect.id)}
            >
              {/* Icon */}
              <div
                className={`flex items-center justify-center ui-icon-hotbar ${effect.enabled ? `ui-icon-hotbar-active effect-icon-${effect.type}` : "text-zinc-500 hover:text-zinc-300"}`}
              >
                <Icon size={14} className="ui-icon" />
              </div>

              {/* Label (Expanded Only) */}
              {isOpen && (
                <div className="flex-1 ui-hotbar-label uppercase tracking-wide truncate flex items-center gap-2">
                  {effect.name}
                  {isAutomated && <span className="text-yellow-500 text-[8px] font-mono border border-yellow-500/30 px-1 rounded">AUTO</span>}
                </div>
              )}

              {/* Spacer if collapsed */}
              {!isOpen && <div className="w-px" />}

              {/* Enable Switch or Link Button */}
              {isLinking && !isLinked ? (
                <button
                  className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-600 rounded text-[9px] hover:bg-indigo-500 hover:text-white transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleParamChange(`fx_${effect.id}` as any, 'LINK');
                  }}
                >
                  LINK
                </button>
              ) : (
                <div
                  className="flex items-center scale-90 origin-right gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isLinked && <Link2 size={10} className="text-emerald-400" />}
                  <Switch
                    checked={effect.enabled}
                    onCheckedChange={() => onToggleEffect?.(effect.id)}
                  />
                </div>
              )}

              {/* Trash button if expanded */}
              {isOpen && onRemoveEffect && (
                <button
                  type="button"
                  className="text-zinc-500 hover:text-red-400 p-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveEffect(effect.id);
                    setActivePanel(null);
                  }}
                  title="Delete effect"
                >
                  <Trash2 size={12} />
                </button>
              )}

              {/* Expand/Collapse Chevron */}
              <div className="flex items-center justify-center ui-hotbar-chevron outline-none">
                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </div>
            </div>

            {/* Expanded Body */}
            {isOpen && onEffectParamChange && (
              <div className="border-t border-zinc-800/80 max-h-[60vh] overflow-y-auto custom-scrollbar bg-zinc-950/40 p-2 transition-opacity duration-200 ease-out opacity-100 ui-hotbar-panel-body">
                <EffectControlsRenderer
                  effect={effect}
                  onParamChange={onEffectParamChange}
                  activeLinkModuleId={activeLinkModuleId}
                  linkedParams={linkedParams}
                  automatedParams={automatedParams}
                  globalParams={params}
                  stabilizeConfig={stabilizeConfig}
                  setStabilizeConfig={setStabilizeConfig}
                  showStabilizeConfig={showStabilizeConfig}
                  setShowStabilizeConfig={setShowStabilizeConfig}
                  compact={true}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
