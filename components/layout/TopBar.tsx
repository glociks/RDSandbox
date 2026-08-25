import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, RotateCcw, FastForward, ChevronDown, ChevronRight, Maximize, Eye, Scaling, LayoutTemplate, PenTool, Video, Info, Save, Upload, Download, Check, Trash2, X, Menu, FolderOpen, Image as ImageIcon, Camera, FileText, HelpCircle, Palette, ShieldCheck, Shield, Link, Settings, Sparkles, Minimize2 } from 'lucide-react';
import { Button, Card, Input } from '../ui/Shared';
import { ClickOutside } from '../ui/ClickOutside';
import { AutomationModule, BoundaryType, MediaConfig, SimulationParams, InitialSeedConfig, StabilizerConfig, ContinuousSeed, SceneState, EffectInstance, PresetData, CustomColorConfig, ReliefLightingConfig } from '../../types';
import { REGIME_PRESETS } from '../../constants';
import { FileDropdown } from './FileDropdown';
import { MediaControls } from './MediaControls';
import { ResetAllConfirmModal } from '../ui/ResetAllConfirmModal';

interface TopBarProps {
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;
  onStep: () => void;
  onReset: () => void;
  // Menus
  onViewMenuClick: () => void;
  onModesMenuClick: () => void;
  showViewMenu: boolean;
  showModesMenu: boolean;
  // File props
  showFileMenu: boolean;
  onFileMenuToggle: (v: boolean) => void;
  fileDropdownProps: any;

  closeAllMenus: () => void;
  // View Controls
  setZoom: (v: number) => void;
  setOffset: (v: { x: number, y: number }) => void;
  infiniteGrid: boolean;
  setInfiniteGrid: (v: boolean) => void;
  // Grid/Boundaries
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  onCustomGridClick: () => void;
  boundaryType: BoundaryType;
  onBoundaryChange: (v: BoundaryType) => void;
  // Other
  onHelpClick?: () => void;
  onAboutClick?: () => void;
  onRerunIntro?: () => void;
  onUISettingsClick?: () => void;
  showFps: boolean;
  onToggleFps: () => void;
  clampMode: boolean;
  setClampMode: (v: boolean) => void;
  mediaConfig: MediaConfig | null;
  setMediaConfig: (c: MediaConfig | null) => void;
  onDetachImage: () => void;
  onRenderVideo: () => void;
  onImportWebcam: () => void;
  onShareLink?: () => void;
  onOpenGlobalSettings?: () => void;

  uiVisibility: { quickAccess: boolean; brushes: boolean; zoomControls: boolean; quickTheme: boolean; autoCloseAccordions?: boolean };
  setUiVisibility: (v: any) => void;
  isFirstLaunchOpen?: boolean;
  // Presets
  onApplyPreset?: (data: { params: SimulationParams, seedConfig?: InitialSeedConfig, stabilizeConfig?: StabilizerConfig, automation?: AutomationModule[] }) => void;
  onRequestPresetLoad?: (preset: PresetData) => void;
  automationModules: AutomationModule[];
  setAutomationModules: (m: AutomationModule[]) => void;
  // Automation Link Support
  activeLinkModuleId: string | null;
  onLinkMediaParam: (key: string) => void;
  linkedParams: string[];
  automatedParams: Record<string, number>;
  params: SimulationParams;
  effects?: EffectInstance[];
  seedConfig: InitialSeedConfig;
  setSeedConfig: (c: InitialSeedConfig) => void;
  stabilizeConfig: StabilizerConfig;
  setStabilizeConfig: (c: StabilizerConfig) => void;
  continuousSeeds?: ContinuousSeed[];
  onResetAll?: () => void;
  customColorConfig?: CustomColorConfig;
  reliefLighting?: ReliefLightingConfig;
}

export const TopBar: React.FC<TopBarProps> = ({
  isRunning, setIsRunning, onStep, onReset,
  showViewMenu, onViewMenuClick, showModesMenu, onModesMenuClick,
  showFileMenu, onFileMenuToggle, fileDropdownProps,
  closeAllMenus,
  setZoom, setOffset, infiniteGrid, setInfiniteGrid, leftSidebarWidth, rightSidebarWidth, onCustomGridClick,
  onHelpClick, onAboutClick, onRerunIntro, showFps, onToggleFps,
  clampMode, setClampMode, mediaConfig, setMediaConfig, onDetachImage, onRenderVideo, onImportWebcam, onShareLink,
  onOpenGlobalSettings,
  uiVisibility, setUiVisibility, onRequestPresetLoad,
  isFirstLaunchOpen,
  activeLinkModuleId, onLinkMediaParam, linkedParams, automatedParams, params, effects,
  seedConfig, stabilizeConfig,
  automationModules, continuousSeeds, onResetAll,
  customColorConfig, reliefLighting
}) => {
  const [fps, setFps] = useState(0);
  const [userPresets, setUserPresets] = useState<PresetData[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportName, setExportName] = useState('');

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, preset: any, isUser: boolean } | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false);

  // Mobile sub-menu toggles
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  // Hidden file inputs refs for Mobile Menu
  const mobileSceneInput = useRef<HTMLInputElement>(null);
  const mobileImgInput = useRef<HTMLInputElement>(null);
  const mobileVidInput = useRef<HTMLInputElement>(null);
  const mobilePresetInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('mcrd_global_presets');
    if (saved) {
      try {
        setUserPresets(JSON.parse(saved));
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (!showFps) return;
    let frameCount = 0;
    let lastTime = performance.now();
    const loop = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
      requestAnimationFrame(loop);
    };
    const id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [showFps]);

  const canRender = mediaConfig?.type !== 'webcam';

  // --- Preset Actions ---

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: PresetData = {
      name: newPresetName.trim(),
      desc: "User saved preset",
      params: { ...params },
      effects: effects ? effects.map(e => ({ ...e, params: { ...e.params } })) : [],
      seedConfig: { ...seedConfig },
      stabilizeConfig: { ...stabilizeConfig },
      automation: automationModules.map(m => ({ ...m, targets: [...m.targets] })),
      continuousSeeds: continuousSeeds ? continuousSeeds.map(s => ({ ...s })) : [],
      customColorConfig,
      reliefLighting
    };

    const updated = [...userPresets.filter(p => p.name !== newPreset.name), newPreset];
    setUserPresets(updated);
    localStorage.setItem('mcrd_global_presets', JSON.stringify(updated));
    setNewPresetName('');
    setShowSaveModal(false);
  };

  const requestPresetLoad = (preset: PresetData) => {
    if (onRequestPresetLoad) {
      onRequestPresetLoad(preset);
      closeAllMenus();
      setShowMobileMenu(false);
    }
  };

  const handleImportPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        requestPresetLoad(data);
      } catch (err) {
        console.error("Failed to import preset", err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportCurrent = () => {
    setExportName(`Preset_${new Date().toISOString().slice(0, 10)}`);
    setShowExportModal(true);
  };

  const executeExport = () => {
    const finalName = exportName.trim() || "Untitled";
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      name: finalName,
      desc: "Exported from McRD Generator",
      params: params,
      effects: effects,
      seedConfig: seedConfig,
      stabilizeConfig: stabilizeConfig,
      automation: automationModules,
      continuousSeeds: continuousSeeds,
      customColorConfig: customColorConfig,
      reliefLighting: reliefLighting
    }));
    triggerDownload(dataStr, `${finalName.replace(/\s+/g, '_')}.json`);
    setShowExportModal(false);
  };

  const handleExportPreset = (preset: any) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(preset));
    triggerDownload(dataStr, `${preset.name.replace(/\s+/g, '_')}.json`);
    setContextMenu(null);
  };

  const handleDeletePreset = (presetName: string) => {
    const updated = userPresets.filter(p => p.name !== presetName);
    setUserPresets(updated);
    localStorage.setItem('mcrd_global_presets', JSON.stringify(updated));
    setContextMenu(null);
  };

  const triggerDownload = (url: string, name: string) => {
    const dl = document.createElement('a');
    dl.setAttribute("href", url);
    dl.setAttribute("download", name);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  };

  const handleContextMenu = (e: React.MouseEvent, preset: any, isUser: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, preset, isUser });
  };

  const toggleMobileSub = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMobileExpanded(mobileExpanded === id ? null : id);
  };

  return (
    <div className="ui-topbar flex items-center z-40 fixed top-0 left-0 right-0 justify-between">

      {/* Hidden Mobile Inputs (Must persist for onChange to fire) */}
      <input id="mobile-scene-input" name="mobile-scene-input" aria-label="Open Scene JSON" ref={mobileSceneInput} type="file" className="hidden" accept=".json" onChange={(e) => { fileDropdownProps?.onOpenScene?.(e); setShowMobileMenu(false); }} />
      <input id="mobile-img-input" name="mobile-img-input" aria-label="Import Image" ref={mobileImgInput} type="file" className="hidden" accept="image/*" onChange={(e) => { fileDropdownProps?.onImportImage?.(e); setShowMobileMenu(false); }} />
      <input id="mobile-vid-input" name="mobile-vid-input" aria-label="Import Video" ref={mobileVidInput} type="file" className="hidden" accept="video/*" onChange={(e) => { fileDropdownProps?.onImportVideo?.(e); setShowMobileMenu(false); }} />
      <input id="mobile-preset-input" name="mobile-preset-input" aria-label="Import Preset" ref={mobilePresetInput} type="file" className="hidden" accept=".json" onChange={(e) => { handleImportPreset(e); setShowMobileMenu(false); }} />

      <div
        className={`flex items-center gap-2 relative z-50 ml-[var(--topbar-left-margin-mobile,var(--sidebar-closed-width-mobile,44px))] lg:ml-[var(--tb-left)] ${
          isFirstLaunchOpen
            ? 'transition-all duration-[800ms] ease-out'
            : 'transition-all duration-300'
        }`}
        style={{ '--tb-left': `${leftSidebarWidth}px` } as React.CSSProperties}
      >
        {/* Mobile/Tablet Hamburger */}
        <ClickOutside onClickOutside={() => setShowMobileMenu(false)} className="lg:hidden relative">
          <Button variant="ghost" size="iconSm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowMobileMenu(!showMobileMenu); }} className="ui-hamburger-btn">
            <Menu size={18} className="ui-hamburger-icon" />
          </Button>
          {showMobileMenu && (
            <div className="absolute top-full left-0 mt-2 z-[100] space-y-1 overflow-y-auto custom-scrollbar ui-mobile-menu">
              {/* File Section */}
              <button className="ui-mobile-menu-item w-full text-left flex items-center justify-between cursor-pointer" onClick={(e) => toggleMobileSub(e, 'file')}>
                <span className="flex items-center gap-2"><FileText size={12} /> File</span>
                {mobileExpanded === 'file' ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              </button>
              {mobileExpanded === 'file' && (
                <div className="ui-mobile-menu-sub pl-3 space-y-0.5 pb-1">
                  <button className="ui-mobile-menu-sub-item w-full text-left flex items-center gap-2 cursor-pointer text-zinc-200" onClick={(e) => { e.stopPropagation(); fileDropdownProps?.onExportSnapshot?.(); setShowMobileMenu(false); }}>
                    <Download size={12} className="text-zinc-400" /> Save Snapshot as Image
                  </button>

                  <div className="ui-mobile-menu-divider h-px my-1" />

                  <button onClick={(e) => { e.stopPropagation(); setShowSaveModal(true); setShowMobileMenu(false); }} className="ui-mobile-menu-sub-item w-full text-left flex items-center gap-2 cursor-pointer text-zinc-300">
                    <Save size={12} className="text-zinc-400" /> Save Current Preset...
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); mobilePresetInput.current?.click(); }} className="ui-mobile-menu-sub-item w-full text-left flex items-center gap-2 cursor-pointer text-zinc-300">
                    <Upload size={12} className="text-zinc-400" /> Import Preset...
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleExportCurrent(); setShowMobileMenu(false); }} className="ui-mobile-menu-sub-item w-full text-left flex items-center gap-2 cursor-pointer text-zinc-300">
                    <Download size={12} className="text-zinc-400" /> Export Current Preset...
                  </button>
                  {onShareLink && (
                    <button onClick={(e) => { e.stopPropagation(); onShareLink(); setShowMobileMenu(false); }} className="ui-mobile-menu-sub-item w-full text-left flex items-center gap-2 cursor-pointer !text-emerald-400">
                      <Link size={12} className="text-emerald-400" /> Share as Link
                    </button>
                  )}

                  <div className="ui-mobile-menu-divider h-px my-1" />

                  {onOpenGlobalSettings && (
                    <button onClick={(e) => { e.stopPropagation(); onOpenGlobalSettings(); setShowMobileMenu(false); }} className="ui-mobile-menu-sub-item w-full text-left flex items-center gap-2 cursor-pointer text-zinc-300">
                      <Settings size={12} className="text-zinc-400" /> Settings
                    </button>
                  )}
                </div>
              )}

              {/* Presets Section */}
              <button className="ui-mobile-menu-item w-full text-left flex items-center justify-between cursor-pointer" onClick={(e) => toggleMobileSub(e, 'presets')}>
                <span className="flex items-center gap-2"><LayoutTemplate size={12} /> Presets</span>
                {mobileExpanded === 'presets' ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              </button>
              {mobileExpanded === 'presets' && (
                <div className="ui-mobile-menu-sub pl-3 space-y-0.5 pb-1">
                  <button onClick={(e) => { e.stopPropagation(); setShowSaveModal(true); setShowMobileMenu(false); }} className="ui-mobile-menu-sub-item w-full text-left flex items-center gap-2 cursor-pointer text-zinc-300">
                    <Save size={12} className="text-zinc-400" /> Save Current Preset...
                  </button>
                  {onShareLink && (
                    <button onClick={(e) => { e.stopPropagation(); onShareLink(); setShowMobileMenu(false); }} className="ui-mobile-menu-sub-item w-full text-left flex items-center gap-2 cursor-pointer !text-emerald-400">
                      <Link size={12} className="text-emerald-400" /> Share as Link...
                    </button>
                  )}
                  {onResetAll && (
                    <button onClick={(e) => { e.stopPropagation(); setShowResetAllConfirm(true); setShowMobileMenu(false); }} className="ui-mobile-menu-sub-item w-full text-left flex items-center gap-2 cursor-pointer !text-amber-400">
                      <RotateCcw size={12} className="text-amber-400" /> Reset All
                    </button>
                  )}

                  <div className="ui-mobile-menu-divider h-px my-1" />

                  <div className="ui-topbar-dropdown-header">Default Presets</div>
                  {REGIME_PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); requestPresetLoad(preset); setShowMobileMenu(false); }}
                      className="ui-preset-dropdown-item group"
                    >
                      <div className="ui-preset-dropdown-title">{preset.name}</div>
                      {preset.desc && <div className="ui-preset-dropdown-desc">{preset.desc}</div>}
                    </button>
                  ))}

                  {userPresets.length > 0 && (
                    <>
                      <div className="ui-mobile-menu-divider h-px my-1" />
                      <div className="ui-topbar-dropdown-header">User Presets</div>
                      {userPresets.map((preset, i) => (
                        <button
                          key={`m-user-${i}`}
                          onClick={(e) => { e.stopPropagation(); requestPresetLoad(preset); setShowMobileMenu(false); }}
                          className="ui-preset-dropdown-item group"
                        >
                          <div className="ui-preset-dropdown-title !text-emerald-300 group-hover:!text-emerald-200">{preset.name}</div>
                          {preset.desc && <div className="ui-preset-dropdown-desc">{preset.desc}</div>}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* View Section */}
              <button className="ui-mobile-menu-item w-full text-left flex items-center justify-between cursor-pointer" onClick={(e) => toggleMobileSub(e, 'view')}>
                <span className="flex items-center gap-2"><Eye size={12} /> View</span>
                {mobileExpanded === 'view' ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              </button>
              {mobileExpanded === 'view' && (
                <div className="ui-mobile-menu-sub pl-3 space-y-0.5 pb-1">
                  <div className="px-2 py-1 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Tools & Overlays</div>
                  <button className="ui-mobile-menu-sub-item w-full flex items-center justify-between cursor-pointer" onClick={() => setUiVisibility({ ...uiVisibility, quickAccess: !uiVisibility.quickAccess })}>
                    <span className="flex items-center gap-2"><LayoutTemplate size={12} /> Quick Access Bar</span> {uiVisibility.quickAccess && <Check size={11} className="text-zinc-300" />}
                  </button>
                  <button className="ui-mobile-menu-sub-item w-full flex items-center justify-between cursor-pointer" onClick={() => setUiVisibility({ ...uiVisibility, brushes: !uiVisibility.brushes })}>
                    <span className="flex items-center gap-2"><PenTool size={12} /> Brush Toolbar</span> {uiVisibility.brushes && <Check size={11} className="text-zinc-300" />}
                  </button>
                  <button className="ui-mobile-menu-sub-item w-full flex items-center justify-between cursor-pointer" onClick={() => setUiVisibility({ ...uiVisibility, zoomControls: !uiVisibility.zoomControls })}>
                    <span className="flex items-center gap-2"><Maximize size={12} /> Zoom Controls</span> {uiVisibility.zoomControls && <Check size={11} className="text-zinc-300" />}
                  </button>
                  <button className="ui-mobile-menu-sub-item w-full flex items-center justify-between cursor-pointer" onClick={() => setUiVisibility({ ...uiVisibility, quickTheme: !uiVisibility.quickTheme })}>
                    <span className="flex items-center gap-2"><Palette size={12} /> Quick Theme</span> {uiVisibility.quickTheme && <Check size={11} className="text-zinc-300" />}
                  </button>
                  <button className="ui-mobile-menu-sub-item w-full flex items-center justify-between cursor-pointer" onClick={() => setUiVisibility({ ...uiVisibility, autoCloseAccordions: !uiVisibility.autoCloseAccordions })}>
                    <span className="flex items-center gap-2"><Minimize2 size={12} /> Auto-Close Accordions</span> {uiVisibility.autoCloseAccordions && <Check size={11} className="text-zinc-300" />}
                  </button>

                  <div className="ui-mobile-menu-divider h-px my-1" />

                  <button className="ui-mobile-menu-sub-item w-full flex items-center gap-2 cursor-pointer text-zinc-300" onClick={(e) => { e.stopPropagation(); onCustomGridClick(); setShowMobileMenu(false); }}>
                    <Scaling size={12} className="text-zinc-400" /> Grid Resolution...
                  </button>
                  <button className="ui-mobile-menu-sub-item w-full flex items-center gap-2 cursor-pointer text-zinc-300" onClick={(e) => { e.stopPropagation(); setZoom(1); setOffset({ x: 0, y: 0 }); setShowMobileMenu(false); }}>
                    <Maximize size={12} className="text-zinc-400" /> Reset Viewport
                  </button>
                  <button className="ui-mobile-menu-sub-item w-full flex items-center gap-2 cursor-pointer text-zinc-300" onClick={(e) => { e.stopPropagation(); setInfiniteGrid(!infiniteGrid); setShowMobileMenu(false); }}>
                    <Eye size={12} className="text-zinc-400" /> {infiniteGrid ? 'Hide' : 'Show'} Infinite Grid
                  </button>
                  <button className="ui-mobile-menu-sub-item w-full flex items-center gap-2 cursor-pointer text-zinc-300" onClick={(e) => { e.stopPropagation(); onToggleFps(); setShowMobileMenu(false); }}>
                    <span className="text-zinc-400 text-[10px]">FPS</span> Show FPS ({showFps ? 'On' : 'Off'})
                  </button>

                  <div className="ui-mobile-menu-divider h-px my-1" />

                  <button className="ui-mobile-menu-sub-item w-full flex items-center gap-2 cursor-pointer !text-zinc-300" onClick={(e) => { e.stopPropagation(); onHelpClick?.(); setShowMobileMenu(false); }}>
                    <HelpCircle size={12} className="text-zinc-400" /> Help Manual
                  </button>
                  <button className="ui-mobile-menu-sub-item w-full flex items-center gap-2 cursor-pointer !text-indigo-300" onClick={(e) => { e.stopPropagation(); onRerunIntro?.(); setShowMobileMenu(false); }}>
                    <Sparkles size={12} className="text-indigo-400" /> Rerun Intro
                  </button>
                </div>
              )}
            </div>
          )}
        </ClickOutside>

        {/* Desktop Menu Group */}
        <div className="hidden lg:flex items-center gap-2">
          <FileDropdown
            side="top"
            isOpen={showFileMenu}
            onToggle={onFileMenuToggle}
            onExportSnapshot={fileDropdownProps?.onExportSnapshot || (() => {})}
            onSavePreset={() => setShowSaveModal(true)}
            onImportPreset={handleImportPreset}
            onExportPreset={handleExportCurrent}
            onShareLink={onShareLink}
            onOpenGlobalSettings={onOpenGlobalSettings}
            {...fileDropdownProps}
          />

          <div className="relative">
            <ClickOutside onClickOutside={() => showModesMenu && onModesMenuClick()}>
              <Button variant="ghost" size="xs" onClick={(e: any) => { e.stopPropagation(); onModesMenuClick(); }} className="gap-1 text-zinc-400 hover:text-zinc-200">
                Presets <ChevronDown size={10} />
              </Button>
              {showModesMenu && (
                <div className="ui-topbar-dropdown absolute top-full left-0 mt-1 w-64 z-[100] max-h-96 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
                  {/* Actions */}
                  <button
                    onClick={() => { setShowSaveModal(true); closeAllMenus(); }}
                    className="ui-topbar-dropdown-item text-zinc-300"
                  >
                    <Save size={12} className="text-zinc-400" /> Save Current Preset...
                  </button>
                  {onShareLink && (
                    <button
                      onClick={() => { onShareLink(); closeAllMenus(); }}
                      className="ui-topbar-dropdown-item !text-emerald-400"
                    >
                      <Link size={12} /> Share as Link...
                    </button>
                  )}
                  {onResetAll && (
                    <button
                      onClick={() => { setShowResetAllConfirm(true); closeAllMenus(); }}
                      className="ui-topbar-dropdown-item !text-amber-400"
                    >
                      <RotateCcw size={12} /> Reset All
                    </button>
                  )}

                  <div className="ui-topbar-dropdown-divider" />

                  {/* Defaults */}
                  <div className="ui-topbar-dropdown-header">Default Presets</div>
                  {REGIME_PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => requestPresetLoad(preset)}
                      onContextMenu={(e) => handleContextMenu(e, preset, false)}
                      className="ui-preset-dropdown-item group"
                    >
                      <div className="ui-preset-dropdown-title">{preset.name}</div>
                      <div className="ui-preset-dropdown-desc">{preset.desc}</div>
                    </button>
                  ))}

                  {/* User Presets */}
                  {userPresets.length > 0 && (
                    <>
                      <div className="ui-topbar-dropdown-divider" />
                      <div className="ui-topbar-dropdown-header">User Presets</div>
                      {userPresets.map((preset, i) => (
                        <button
                          key={`user-${i}`}
                          onClick={() => requestPresetLoad(preset)}
                          onContextMenu={(e) => handleContextMenu(e, preset, true)}
                          className="ui-preset-dropdown-item group"
                        >
                          <div className="ui-preset-dropdown-title !text-emerald-300 group-hover:!text-emerald-200">{preset.name}</div>
                          {Array.isArray(preset.automation) && preset.automation.length > 0 && (
                            <div className="text-[8px] text-indigo-400 flex items-center gap-0.5 mt-0.5">⚡ {preset.automation.length} automation</div>
                          )}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </ClickOutside>
          </div>

          <div className="relative">
            <ClickOutside onClickOutside={() => showViewMenu && onViewMenuClick()}>
              <Button variant="ghost" size="xs" onClick={(e: any) => { e.stopPropagation(); onViewMenuClick(); }} className="gap-1 text-zinc-400 hover:text-zinc-200">
                View <ChevronDown size={10} />
              </Button>
              {showViewMenu && (
                <div className="ui-topbar-dropdown absolute top-full left-0 mt-1 w-56 z-[100] space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="ui-topbar-dropdown-header">Tools & Overlays</div>

                  <button className="ui-topbar-dropdown-item justify-between" onClick={() => setUiVisibility({ ...uiVisibility, quickAccess: !uiVisibility.quickAccess })}>
                    <span className="flex items-center gap-2"><LayoutTemplate size={12} /> Quick Access Bar</span>
                    {uiVisibility.quickAccess && <Check size={11} className="text-zinc-300" />}
                  </button>

                  <button className="ui-topbar-dropdown-item justify-between" onClick={() => setUiVisibility({ ...uiVisibility, brushes: !uiVisibility.brushes })}>
                    <span className="flex items-center gap-2"><PenTool size={12} /> Brush Toolbar</span>
                    {uiVisibility.brushes && <Check size={11} className="text-zinc-300" />}
                  </button>

                  <button className="ui-topbar-dropdown-item justify-between" onClick={() => setUiVisibility({ ...uiVisibility, zoomControls: !uiVisibility.zoomControls })}>
                    <span className="flex items-center gap-2"><Maximize size={12} /> Zoom Controls</span>
                    {uiVisibility.zoomControls && <Check size={11} className="text-zinc-300" />}
                  </button>

                  <button className="ui-topbar-dropdown-item justify-between" onClick={() => setUiVisibility({ ...uiVisibility, quickTheme: !uiVisibility.quickTheme })}>
                    <span className="flex items-center gap-2"><Palette size={12} /> Quick Theme</span>
                    {uiVisibility.quickTheme && <Check size={11} className="text-zinc-300" />}
                  </button>

                  <button className="ui-topbar-dropdown-item justify-between" onClick={() => setUiVisibility({ ...uiVisibility, autoCloseAccordions: !uiVisibility.autoCloseAccordions })}>
                    <span className="flex items-center gap-2"><Minimize2 size={12} /> Auto-Close Accordions</span>
                    {uiVisibility.autoCloseAccordions && <Check size={11} className="text-zinc-300" />}
                  </button>

                  <div className="ui-topbar-dropdown-divider" />

                  <button className="ui-topbar-dropdown-item" onClick={() => { onCustomGridClick(); closeAllMenus(); }}>
                    <Scaling size={12} className="text-zinc-400" /> Grid Resolution...
                  </button>
                  <button className="ui-topbar-dropdown-item" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); closeAllMenus(); }}>
                    <Maximize size={12} className="text-zinc-400" /> Reset Viewport
                  </button>
                  <button className="ui-topbar-dropdown-item" onClick={() => { setInfiniteGrid(!infiniteGrid); closeAllMenus(); }}>
                    <Eye size={12} className="text-zinc-400" /> {infiniteGrid ? 'Hide' : 'Show'} Infinite Grid
                  </button>
                  <button className="ui-topbar-dropdown-item" onClick={() => { onToggleFps(); closeAllMenus(); }}>
                    <span className="text-zinc-400 text-[10px]">FPS</span> Show FPS ({showFps ? 'On' : 'Off'})
                  </button>
                  <div className="ui-topbar-dropdown-divider" />
                  <button className="ui-topbar-dropdown-item !text-zinc-300" onClick={() => { onHelpClick?.(); closeAllMenus(); }}>
                    <HelpCircle size={12} className="text-zinc-400" /> Help Manual
                  </button>
                  <button className="ui-topbar-dropdown-item !text-indigo-300" onClick={() => { onRerunIntro?.(); closeAllMenus(); }}>
                    <Sparkles size={12} className="text-indigo-400" /> Rerun Intro
                  </button>
                </div>
              )}
            </ClickOutside>
          </div>
        </div>
      </div>

      {/* Center Controls - Positioned at top-0 for all views */}
      <div className="absolute top-0 inset-x-0 flex justify-center pt-1.5 pointer-events-none z-[55]">
        <div className={`pointer-events-auto flex items-center gap-2 p-1 bg-zinc-900/50 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none rounded border border-zinc-800 lg:border-none ${mediaConfig ? 'flex-col lg:flex-row' : 'flex-row'}`}>

          {mediaConfig && (
            <div className="flex-shrink-0">
              <MediaControls
                mediaConfig={mediaConfig}
                setMediaConfig={setMediaConfig}
                onDetach={onDetachImage}
                activeLinkModuleId={activeLinkModuleId}
                onLinkOpacity={() => onLinkMediaParam('mediaOpacity')}
                isOpacityLinked={linkedParams.includes('mediaOpacity')}
                automatedOpacity={automatedParams['mediaOpacity']}
              />
            </div>
          )}

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Sim Controls */}
            <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-sm border border-zinc-800 shadow-inner">
              <Button variant={isRunning ? "secondary" : "primary"} size="iconSm" onClick={() => setIsRunning(!isRunning)}>
                {isRunning ? <Pause size={14} /> : <Play size={14} />}
              </Button>
              <Button variant="ghost" size="iconSm" onClick={onStep} title="Next Frame"><FastForward size={14} /></Button>
              <div className="w-px h-4 bg-zinc-800 mx-0.5"></div>
              <Button variant="ghost" size="iconSm" onClick={() => onReset()} title="Reset Simulation"><RotateCcw size={14} /></Button>
              <div className="w-px h-4 bg-zinc-800 mx-0.5"></div>
              <Button variant="ghost" size="iconSm" onClick={onRenderVideo} title={canRender ? "Render Video" : "Render Disabled (Webcam)"} disabled={!canRender}><Video size={14} className={!canRender ? "opacity-30" : ""} /></Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end transition-all duration-300 relative z-50 mr-[var(--topbar-right-margin-mobile,var(--sidebar-closed-width-mobile,44px))] lg:mr-[var(--tb-right)]" style={{ '--tb-right': `${rightSidebarWidth}px` } as React.CSSProperties}>
        {showFps && <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900/50 px-1.5 py-0.5 rounded border border-zinc-800">{fps} FPS</span>}
      </div>

      {/* Save Preset Modal - Portaled to avoid clipping/positioning issues and remove backdrop blur */}
      {showSaveModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 pointer-events-auto">
          <Card className="w-72 p-3 space-y-3 bg-zinc-900 border-zinc-700 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase">Save Preset</span>
              <button onClick={() => setShowSaveModal(false)} className="text-zinc-500 hover:text-white"><X size={14} /></button>
            </div>

            <Input
              autoFocus
              type="text"
              value={newPresetName}
              onChange={(e: any) => setNewPresetName(e.target.value)}
              placeholder="Preset Name..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
            />

            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="secondary" onClick={() => setShowSaveModal(false)} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={handleSavePreset} disabled={!newPresetName.trim()} className="flex-1">Save</Button>
            </div>
          </Card>
        </div>,
        document.body
      )}

      {/* Export Preset Modal */}
      {showExportModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 pointer-events-auto">
          <Card className="w-72 p-3 space-y-3 bg-zinc-900 border-zinc-700 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase">Export Preset</span>
              <button onClick={() => setShowExportModal(false)} className="text-zinc-500 hover:text-white"><X size={14} /></button>
            </div>

            <div className="space-y-1">
              <Input
                autoFocus
                type="text"
                value={exportName}
                onChange={(e: any) => setExportName(e.target.value)}
                placeholder="Preset Name..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
              />
              <p className="text-[9px] text-zinc-500">Will be saved as .json file including current parameters and seed config.</p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="secondary" onClick={() => setShowExportModal(false)} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={executeExport} disabled={!exportName.trim()} className="flex-1">Download</Button>
            </div>
          </Card>
        </div>,
        document.body
      )}

      {/* Context Menu for Presets */}
      {contextMenu && createPortal(
        <ClickOutside onClickOutside={() => setContextMenu(null)} className="fixed z-[200] w-32 bg-zinc-900 border border-zinc-700 shadow-xl rounded-sm p-1 flex flex-col gap-0.5" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <div className="px-2 py-1 text-[9px] text-zinc-500 font-bold border-b border-zinc-800 mb-1 truncate">
            {contextMenu.preset.name}
          </div>
          <button
            onClick={() => handleExportPreset(contextMenu.preset)}
            className="w-full text-left px-2 py-1 hover:bg-zinc-800 rounded-sm text-[10px] flex items-center gap-2 text-zinc-300"
          >
            <Download size={10} /> Export File
          </button>
          {contextMenu.isUser && (
            <button
              onClick={() => handleDeletePreset(contextMenu.preset.name)}
              className="w-full text-left px-2 py-1 hover:bg-red-900/20 rounded-sm text-[10px] flex items-center gap-2 text-red-400"
            >
              <Trash2 size={10} /> Delete
            </button>
          )}
        </ClickOutside>,
        document.body
      )}

      {/* Reset All Confirmation Modal */}
      <ResetAllConfirmModal
        isOpen={showResetAllConfirm}
        onConfirm={() => {
          setShowResetAllConfirm(false);
          onResetAll?.();
        }}
        onCancel={() => setShowResetAllConfirm(false)}
      />

    </div>
  );
};
