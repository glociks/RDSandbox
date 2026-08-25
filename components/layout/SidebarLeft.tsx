import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Settings2, Settings, Sprout, Sparkles, Plus, Trash2, Atom, FlaskConical, Move, Compass, Wind, ArrowDown, Grid3x3, Snowflake, Footprints, Zap, Palette, Cuboid, Link2, GripVertical, Info } from 'lucide-react';
import { Button, CollapsibleSection, Switch } from '../ui/Shared';
import { EffectControlsRenderer } from '../controls/EffectControlsRenderer';
import { AddEffectDropdown } from '../ui/AddEffectDropdown';
import { EffectInfoAccordion } from '../ui/EffectInfoAccordion';
import { AutoMarqueeText } from '../ui/AutoMarqueeText';
import { ContinuousSeedMenu } from '../seeding/ContinuousSeedMenu';
import { SimulationParams, StabilizerConfig, InitialSeedConfig, ContinuousSeed, EffectInstance, EffectType, EngineMode } from '../../types';
import { getEffectIcon } from '../../utils/effectIcons';

interface SidebarLeftProps {
  engineMode?: EngineMode;
  setEngineMode?: (m: EngineMode) => void;
  isMinimized: boolean;
  setIsMinimized: (v: boolean) => void;
  width: number;
  onWidthChange?: (w: number) => void;
  params: SimulationParams;
  handleParamChange: (key: keyof SimulationParams, value: any) => void;
  speed: number;
  setSpeed: (v: number) => void;
  gridSize: number;
  openResolutionModal: () => void;
  onOpenColorCustomizer: () => void;
  // Stabilizer
  stabilizeConfig: StabilizerConfig;
  setStabilizeConfig: (v: StabilizerConfig) => void;
  showStabilizeConfig: boolean;
  setShowStabilizeConfig: (v: boolean) => void;
  sampleData: { m: number; c: number }[];

  // Link Mode Props
  activeLinkModuleId: string | null;
  linkedParams: string[];
  automatedParams: Record<string, number>;

  // Seeding
  seedConfig: InitialSeedConfig;
  setSeedConfig: (c: InitialSeedConfig) => void;
  isMediaAttached: boolean;
  continuousSeeds: ContinuousSeed[];
  setContinuousSeeds: (s: ContinuousSeed[]) => void;
  onRemoveContinuousSeed: (id: string) => void;
  onReset: () => void;
  onLinkParam?: (key: string) => void;

  // Modular Stackable Effects
  effects: EffectInstance[];
  setEffects: (effects: EffectInstance[]) => void;
  onAddEffect: (type: EffectType) => void;
  onRemoveEffect: (id: string) => void;
  onToggleEffect: (id: string) => void;
  onEffectParamChange: (effectId: string, paramKey: string, value: any) => void;

  // Synchronization from QuickAccessBar
  targetSectionId?: string | null;
  onSectionOpened?: () => void;

  // Initial Launch Transition
  isFirstLaunchOpen?: boolean;

  // Auto-close behavior
  autoCloseAccordions?: boolean;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  engineMode,
  setEngineMode,
  isMinimized,
  setIsMinimized,
  width,
  onWidthChange,
  isFirstLaunchOpen,
  autoCloseAccordions = true,
  params,
  handleParamChange,
  speed,
  setSpeed,
  gridSize,
  openResolutionModal,
  onOpenColorCustomizer,
  stabilizeConfig,
  setStabilizeConfig,
  showStabilizeConfig,
  setShowStabilizeConfig,
  sampleData,
  activeLinkModuleId,
  linkedParams,
  automatedParams,
  seedConfig,
  setSeedConfig,
  isMediaAttached,
  continuousSeeds,
  setContinuousSeeds,
  onRemoveContinuousSeed,
  onReset,
  onLinkParam,
  effects,
  setEffects,
  onAddEffect,
  onRemoveEffect,
  onToggleEffect,
  onEffectParamChange,
  targetSectionId,
  onSectionOpened
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    seeds: false,
    effects: true
  });
  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [flashingSectionId, setFlashingSectionId] = useState<string | null>(null);

  // Drag & Drop reordering state for effects in sidebar
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const setSectionOpen = (key: string, open: boolean) => {
    setOpenSections(prev => {
      const next = { ...prev, [key]: open };
      // Mutually exclusive behavior for the 2 main accordions (seeds, effects)
      if (open && (key === 'seeds' || key === 'effects')) {
        if (key !== 'seeds') next['seeds'] = false;
        if (key !== 'effects') next['effects'] = false;
      }
      return next;
    });

    // Requirement: When a main accordion closes in left sidebar,
    // the next time it is opened, all child item accordions are closed.
    if (!open && key === 'seeds') {
      setContinuousSeeds(continuousSeeds.map(s => ({ ...s, isMinimized: true })));
    }
    if (!open && key === 'effects') {
      setOpenSections(prev => {
        const next: Record<string, boolean> = { ...prev, effects: false };
        effects.forEach(e => {
          next[e.id] = false;
        });
        return next;
      });
    }
  };

  const handleToggleEffectOpen = (effectId: string, currentIsOpen: boolean) => {
    const willOpen = !currentIsOpen;
    setOpenSections(prev => {
      const next: Record<string, boolean> = { ...prev };
      if (willOpen && autoCloseAccordions) {
        // Auto-close other effects
        effects.forEach(e => {
          if (e.id !== effectId) next[e.id] = false;
        });
      }
      next[effectId] = willOpen;
      return next;
    });
  };

  const handleAddEffectClick = (type: EffectType) => {
    if (autoCloseAccordions) {
      setOpenSections(prev => {
        const next: Record<string, boolean> = { ...prev, effects: true };
        effects.forEach(e => {
          next[e.id] = false;
        });
        return next;
      });
    }
    onAddEffect(type);
  };

  useEffect(() => {
    if (targetSectionId) {
      setOpenSections(prev => {
        const currentlyOpen = !!prev[targetSectionId];
        const nextState = !currentlyOpen;
        const next: Record<string, boolean> = {
          ...prev,
          seeds: false,
          effects: true
        };
        if (nextState && autoCloseAccordions) {
          effects.forEach(e => {
            next[e.id] = false;
          });
        }
        next[targetSectionId] = nextState;
        return next;
      });

      // Trigger one light flash on the mode card in the sidebar
      setFlashingSectionId(targetSectionId);
      const flashTimer = setTimeout(() => {
        setFlashingSectionId(null);
      }, 1000);

      setTimeout(() => {
        const el = document.getElementById(`sec-${targetSectionId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);

      onSectionOpened?.();
      return () => clearTimeout(flashTimer);
    }
  }, [targetSectionId]);

  const [openInfoEffectId, setOpenInfoEffectId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const maxWidth = typeof window !== 'undefined' ? Math.min(650, window.innerWidth - 20) : 650;
      const newWidth = Math.min(Math.max(startWidth + delta, 180), maxWidth);
      onWidthChange?.(newWidth);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStartResize = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    const startX = e.touches[0].clientX;
    const startWidth = width;

    const onTouchMove = (moveEvent: TouchEvent) => {
      const delta = moveEvent.touches[0].clientX - startX;
      const maxWidth = typeof window !== 'undefined' ? Math.min(650, window.innerWidth - 20) : 650;
      const newWidth = Math.min(Math.max(startWidth + delta, 180), maxWidth);
      onWidthChange?.(newWidth);
    };

    const onTouchEnd = () => {
      setIsDragging(false);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  };

  // Drag and drop handlers strictly applied to the effect header
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || !effects || !setEffects) return;
    if (draggedIdx === targetIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const updated = [...effects];
    const [movedItem] = updated.splice(draggedIdx, 1);
    updated.splice(targetIndex, 0, movedItem);

    setEffects(updated);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const isSeedsActive = Boolean(continuousSeeds && continuousSeeds.length > 0);
  const isEffectsActive = Boolean(effects && effects.length > 0 && effects.some(e => e.enabled));

  const isSeedsOpen = Boolean(openSections['seeds']);
  const isEffectsOpen = Boolean(openSections['effects']);

  const addEffectContainerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        className={`fixed top-0 left-0 h-full ${isMinimized ? 'z-[45]' : 'z-[55]'} flex flex-col ui-sidebar backdrop-blur-md border-r border-zinc-800 shadow-2xl overflow-hidden pointer-events-auto ${
          isDragging
            ? '!transition-none select-none'
            : isFirstLaunchOpen
              ? 'transition-[width,transform] duration-[800ms] ease-out'
              : 'transition-[width,transform] duration-300 ease-in-out'
        } ${isMinimized ? 'ui-sidebar-minimized w-[44px]' : 'w-full'}`}
        style={{
          '--sidebar-w': `${width}px`,
          width: isMinimized ? undefined : `${width}px`,
          maxWidth: isMinimized ? undefined : 'calc(100vw - 16px)'
        } as React.CSSProperties}
      >
        {/* Right Edge Resize Handle */}
        {!isMinimized && (
          <div
            className="absolute top-0 right-0 h-full cursor-col-resize ui-sidebar-resizer z-[60] select-none touch-none"
            onMouseDown={handleMouseDownResize}
            onTouchStart={handleTouchStartResize}
            title="Drag to resize sidebar"
          />
        )}

        {isMinimized ? (
          <div
            className="h-full flex flex-col items-center cursor-pointer select-none hover:bg-zinc-800/50 transition-colors group ui-sidebar-minimized-body"
            onClick={() => setIsMinimized(false)}
            title="Click to Open RDSandbox Sidebar"
          >
            {/* Top header button */}
            <div
              className="ui-sidebar-closed-header w-full flex items-center justify-center shrink-0 pt-1 cursor-pointer"
              onClick={() => setIsMinimized(false)}
            >
              <Button
                variant="ghost"
                size="iconSm"
                onClick={(e: any) => { e.stopPropagation(); setIsMinimized(false); }}
                title="Open RDSandbox Sidebar"
                className="ui-sidebar-closed-btn cursor-pointer"
              >
                <ChevronRight size={16} className="ui-sidebar-closed-icon" />
              </Button>
            </div>

            {/* Top aligned vertical title and icon */}
            <div
              className="flex-1 flex flex-col items-center justify-start pt-3 gap-3 w-full ui-sidebar-minimized-title-wrap cursor-pointer"
              onClick={() => setIsMinimized(false)}
            >
              <Settings2 size={15} className="ui-sidebar-minimized-icon group-hover:scale-110 transition-transform text-zinc-400 cursor-pointer" />
              <span className="hidden md:block ui-sidebar-vertical-title font-normal">RDSandbox</span>
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex flex-col min-w-0 overflow-hidden">

            {/* Header Toggle */}
            <div
              className="p-2 ui-sidebar-header flex items-center justify-between border-b cursor-pointer transition-colors shrink-0"
              onClick={() => setIsMinimized(true)}
            >
              <span className="font-normal text-[10px] uppercase tracking-widest ui-sidebar-title flex items-center gap-1.5 whitespace-nowrap">
                <Settings2 size={14} className="ui-icon-sidebar shrink-0" /> RDSandbox
              </span>
              <Button variant="ghost" size="iconSm" onClick={(e: any) => { e.stopPropagation(); setIsMinimized(true); }} title="Minimize Sidebar">
                <ChevronLeft size={16} className="ui-icon-sidebar" />
              </Button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
              {/* Main Accordions Container */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-2">
                {/* 1. SEEDS ACCORDION */}
                <div className={`sidebar-main-accordion ${isSeedsOpen ? 'is-open' : 'is-closed'}`}>
                  <button
                    onClick={() => setSectionOpen('seeds', !isSeedsOpen)}
                    className="sidebar-accordion-header w-full flex items-center justify-between px-3 py-2 bg-zinc-900/90 hover:bg-zinc-800/80 transition-colors shrink-0 select-none cursor-pointer border-b border-zinc-800/60 group"
                  >
                    <div className="flex items-center gap-2">
                      <Sprout size={13} className="ui-accordion-seeds-icon shrink-0" />
                      <span className="font-normal text-[11px] text-zinc-200">Seeds</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isSeedsActive && (
                        <span className="ui-active-status-dot" title="Seeds Active" />
                      )}
                      <ChevronRight size={13} className={`sidebar-chevron-icon text-zinc-400 ${isSeedsOpen ? 'is-open' : 'is-closed'}`} />
                    </div>
                  </button>

                  <div className={`sidebar-accordion-body ${isSeedsOpen ? 'is-open' : 'is-closed'}`}>
                    <div className="sidebar-accordion-inner flex-1 min-h-0 p-2 space-y-2">
                      <ContinuousSeedMenu
                        seeds={continuousSeeds}
                        setSeeds={setContinuousSeeds}
                        onRemoveContinuousSeed={onRemoveContinuousSeed}
                        activeLinkModuleId={activeLinkModuleId}
                        linkedParams={linkedParams}
                        automatedParams={automatedParams}
                        onLinkParam={onLinkParam}
                        onReset={onReset}
                        autoCloseAccordions={autoCloseAccordions}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. EFFECTS ACCORDION */}
                <div className={`sidebar-main-accordion ${isEffectsOpen ? 'is-open' : 'is-closed'}`}>
                  <button
                    onClick={() => setSectionOpen('effects', !isEffectsOpen)}
                    className="sidebar-accordion-header w-full flex items-center justify-between px-3 py-2 bg-zinc-900/90 hover:bg-zinc-800/80 transition-colors shrink-0 select-none cursor-pointer border-b border-zinc-800/60 group"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={13} className="ui-accordion-effects-icon shrink-0" />
                      <span className="font-normal text-[11px] text-zinc-200">Effects</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isEffectsActive && (
                        <span className="ui-active-status-dot" title="Effects Active" />
                      )}
                      <ChevronRight size={13} className={`sidebar-chevron-icon text-zinc-400 ${isEffectsOpen ? 'is-open' : 'is-closed'}`} />
                    </div>
                  </button>

                  <div className={`sidebar-accordion-body ${isEffectsOpen ? 'is-open' : 'is-closed'}`}>
                    <div className="sidebar-accordion-inner flex-1 min-h-0 p-2 space-y-2 relative">
                      {/* Add Effect Button & Dropdown Container */}
                      <div ref={addEffectContainerRef} className="relative pb-1 z-30">
                        <Button
                          onClick={() => setShowAddMenu(prev => !prev)}
                          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-normal ui-add-effect-btn rounded shadow-sm cursor-pointer"
                        >
                          <Plus size={14} className="text-indigo-300" /> Add Effect
                        </Button>

                        <AddEffectDropdown
                          isOpen={showAddMenu}
                          onClose={() => setShowAddMenu(false)}
                          onSelectEffect={handleAddEffectClick}
                          containerRef={addEffectContainerRef}
                        />
                      </div>

                    {/* Modular Stackable Effects List */}
                    {effects.length === 0 ? (
                      <div className="text-center py-4 px-2 border border-dashed border-zinc-800/80 rounded bg-zinc-950/30">
                        <p className="text-[11px] text-zinc-400 font-medium">No Active Effects</p>
                        <p className="text-[9px] text-zinc-500 mt-0.5">Click &quot;+ Add Effect&quot; above to stack simulation modes.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {effects.map((effect, idx) => {
                          const Icon = getEffectIcon(effect.type);
                          const isOpen = openSections[effect.id] ?? false;
                          const isLinked = linkedParams.some(k => k.startsWith(`fx_${effect.id}_`));
                          const isAutomated = Object.keys(automatedParams).some(k => k.startsWith(`fx_${effect.id}_`));
                          const isThisDragging = draggedIdx === idx;
                          const isThisDragOver = dragOverIdx === idx;

                          return (
                            <div
                              key={effect.id}
                              id={`sec-${effect.id}`}
                              onDragOver={(e) => handleDragOver(e, idx)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, idx)}
                              className={`ui-section border rounded overflow-hidden transition-all duration-150 ${isThisDragging ? 'is-dragging opacity-45' : ''} ${isThisDragOver ? 'drop-target-above' : ''} ${flashingSectionId === effect.id ? 'section-flash' : ''} ${effect.enabled ? 'border-zinc-800/90 bg-zinc-900/40' : 'border-zinc-900/60 bg-zinc-950/40 opacity-75'}`}
                            >
                              {/* Effect Header is the ONLY draggable element */}
                              <div
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragEnd={handleDragEnd}
                                className={`ui-section-draggable-header flex items-center justify-between p-2 cursor-pointer transition-colors select-none ${effect.enabled ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-900/50'}`}
                                onClick={() => handleToggleEffectOpen(effect.id, isOpen)}
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  {/* Drag grip handle */}
                                  <div
                                    className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 p-0.5 shrink-0"
                                    title="Drag header to reorder effect"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <GripVertical size={13} />
                                  </div>

                                  {/* Mode Toggle Switch */}
                                  <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center mr-0.5">
                                    <Switch
                                      checked={effect.enabled}
                                      onCheckedChange={() => onToggleEffect(effect.id)}
                                    />
                                  </div>

                                  {/* Icon */}
                                  <div className={`p-1 rounded bg-zinc-800/80 shrink-0 ${effect.enabled ? `effect-icon-${effect.type}` : 'text-zinc-500'}`}>
                                    <Icon size={12} />
                                  </div>

                                  {/* Title with speed-based ping-pong marquee on overflow */}
                                  <AutoMarqueeText
                                    text={effect.name}
                                    className={`text-[11px] font-semibold tracking-wide flex-1 min-w-0 ${effect.enabled ? 'text-zinc-200' : 'text-zinc-400'}`}
                                  />

                                  {isAutomated && (
                                    <span className="text-yellow-500 text-[8px] font-mono border border-yellow-500/30 px-1 rounded shrink-0">
                                      AUTO
                                    </span>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {/* Model Dynamics Info Button */}
                                  <button
                                    type="button"
                                    className={`p-1 rounded transition-colors ${openInfoEffectId === effect.id ? 'text-indigo-400 bg-indigo-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenInfoEffectId(openInfoEffectId === effect.id ? null : effect.id);
                                    }}
                                    title="Detailed Scientific Info & Formula"
                                  >
                                    <Info size={12} />
                                  </button>

                                  {/* Automation Link Button */}
                                  {activeLinkModuleId && (
                                    <Button
                                      size="xs"
                                      variant={isLinked ? 'primary' : 'ghost'}
                                      className="h-5 px-1.5 text-[9px] gap-1"
                                      onClick={() => handleParamChange(`fx_${effect.id}` as any, 'LINK')}
                                    >
                                      <Link2 size={10} /> Link
                                    </Button>
                                  )}

                                  {/* Red Trash Delete Button */}
                                  <button
                                    type="button"
                                    className="ui-effect-trash-btn text-zinc-500 hover:text-red-400 p-1"
                                    onClick={() => onRemoveEffect(effect.id)}
                                    title="Remove Effect"
                                  >
                                    <Trash2 size={13} />
                                  </button>

                                  {/* Expand/Collapse Chevron */}
                                  <button
                                    type="button"
                                    className="p-0.5 text-zinc-400 hover:text-white"
                                    onClick={() => handleToggleEffectOpen(effect.id, isOpen)}
                                  >
                                    <ChevronRight size={14} className={`sidebar-chevron-icon ${isOpen ? 'is-open' : 'is-closed'}`} />
                                  </button>
                                </div>
                              </div>

                              {/* Detailed Physical Info Accordion (Auto-closes on outside click) */}
                              {openInfoEffectId === effect.id && (
                                <div className="px-2">
                                  <EffectInfoAccordion
                                    type={effect.type}
                                    isOpen={openInfoEffectId === effect.id}
                                    onClose={() => setOpenInfoEffectId(null)}
                                  />
                                </div>
                              )}

                              {/* Effect Body Accordion with Smooth CSS Transition */}
                              <div className={`ui-effect-body-accordion ${isOpen ? 'is-open' : 'is-closed'}`}>
                                <div
                                  draggable={false}
                                  onDragStart={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  className="ui-effect-body-inner p-2.5 border-t border-zinc-800/80 bg-zinc-950/60"
                                >
                                  <EffectControlsRenderer
                                    effect={effect}
                                    onParamChange={onEffectParamChange}
                                    activeLinkModuleId={activeLinkModuleId}
                                    linkedParams={linkedParams}
                                    automatedParams={automatedParams}
                                    onLinkParam={onLinkParam}
                                    globalParams={params}
                                    stabilizeConfig={stabilizeConfig}
                                    setStabilizeConfig={setStabilizeConfig}
                                    showStabilizeConfig={showStabilizeConfig}
                                    setShowStabilizeConfig={setShowStabilizeConfig}
                                    compact={true}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  </>
);
};
