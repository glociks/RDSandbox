import React, { useState, useEffect } from 'react';
import { Target, Maximize, Pen, Eraser, Circle, Square, CloudRain, Wind, Eye, BoxSelect, Repeat, Palette, X, Check } from 'lucide-react';
import { Button, Card, Label, Slider, VerticalSlider } from '../ui/Shared';
import { BoundaryType, ColorMap, BrushMode, BrushType } from '../../types';
import { RgbModeConfirmModal } from '../ui/RgbModeConfirmModal';

interface CanvasUIProps {
  speed: number;
  setSpeed: (v: number) => void;
  zoom: number;
  setZoom: (v: number) => void;
  offset: { x: number, y: number };
  setOffset: (v: { x: number, y: number }) => void;
  rightSidebarOffset: number;
  brushMode: BrushMode;
  setBrushMode: (v: BrushMode) => void;
  brushType: BrushType;
  setBrushType: (v: BrushType) => void;
  brushSize: number;
  setBrushSize: (v: number) => void;
  brushStrength: number;
  setBrushStrength: (v: number) => void;
  brushColor: { r: number, g: number, b: number };
  setBrushColor: (v: { r: number, g: number, b: number }) => void;
  colorMap: ColorMap;
  setColorMap: (v: ColorMap) => void;
  isRGB: boolean;
  infiniteGrid: boolean;
  setInfiniteGrid: (v: boolean) => void;
  boundaryType: BoundaryType;
  onBoundaryChange: (v: BoundaryType) => void;
  onOpenColorCustomizer: () => void;
  uiVisibility: { brushes: boolean; zoomControls: boolean; quickTheme: boolean };
  activeLinkModuleId: string | null;
  onCancelLink: () => void;
  hasMedia: boolean;
  fullColorMode?: boolean;
  setFullColorMode?: (v: boolean) => void;
  onEnsureColorHotbar?: () => void;
  isWelcomeOpen?: boolean;
}

export const CanvasUI: React.FC<CanvasUIProps> = ({
  speed, setSpeed, zoom, setZoom, offset, setOffset, rightSidebarOffset,
  brushMode, setBrushMode, brushType, setBrushType, brushSize, setBrushSize,
  brushStrength, setBrushStrength, brushColor, setBrushColor, colorMap, setColorMap, isRGB,
  infiniteGrid, setInfiniteGrid, boundaryType, onBoundaryChange, onOpenColorCustomizer,
  uiVisibility, activeLinkModuleId, onCancelLink, hasMedia,
  fullColorMode: propFullColorMode, setFullColorMode: propSetFullColorMode,
  onEnsureColorHotbar,
  isWelcomeOpen = false
}) => {
  const [internalFullColor, setInternalFullColor] = useState(false);
  const [showRgbConfirm, setShowRgbConfirm] = useState(false);
  const fullColorMode = propFullColorMode !== undefined ? propFullColorMode : internalFullColor;
  const setFullColorMode = propSetFullColorMode || setInternalFullColor;

  // Reset color button when switching back to single-channel scalar mode
  useEffect(() => {
    if (colorMap !== 'rgb') {
      setFullColorMode(false);
    }
  }, [colorMap, setFullColorMode]);

  const handleColorButtonClick = (e: React.MouseEvent) => {
    if (colorMap !== 'rgb' && !fullColorMode) {
      e.preventDefault();
      setShowRgbConfirm(true);
    } else {
      setFullColorMode(!fullColorMode);
    }
  };

  const handleConfirmRgbSwitch = () => {
    setColorMap('rgb');
    setFullColorMode(true);
    setShowRgbConfirm(false);
    onEnsureColorHotbar?.();
  };

  const getNextBoundary = (current: BoundaryType): BoundaryType => {
    if (current === 'periodic') return 'open';
    if (current === 'open') return 'closed';
    return 'periodic';
  };

  const getBoundaryIcon = (type: BoundaryType) => {
    if (type === 'periodic') return <Repeat size={14} className="ui-icon-toolbar-active" />;
    if (type === 'closed') return <Square size={14} className="ui-icon-toolbar-active" />;
    return <BoxSelect size={14} className="ui-icon-toolbar-active" />;
  };

  const getBoundaryTitle = (type: BoundaryType) => {
    if (type === 'periodic') return 'Infinite Mode (Wrap)';
    if (type === 'closed') return 'Closed Mode (Reflective Walls)';
    return 'Open Mode (Void Edges)';
  };

  const rightTopClass = hasMedia
    ? 'top-28 md:top-16 lg:top-14'
    : 'top-16 lg:top-14';

  const hexColor = `#${brushColor.r.toString(16).padStart(2, '0')}${brushColor.g.toString(16).padStart(2, '0')}${brushColor.b.toString(16).padStart(2, '0')}`;

  return (
    <>
      {/* RGB Mode Confirmation Modal */}
      <RgbModeConfirmModal
        isOpen={showRgbConfirm}
        currentColorMap={colorMap}
        onConfirm={handleConfirmRgbSwitch}
        onCancel={() => setShowRgbConfirm(false)}
      />

      {/* Link Mode Cancel Overlay */}
      {activeLinkModuleId && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in zoom-in duration-200">
          <Button
            variant="destructive"
            size="sm"
            className="shadow-xl border-red-500/50 bg-red-900/80 text-white flex gap-2 items-center px-4 py-2 rounded-full backdrop-blur-md"
            onClick={onCancelLink}
          >
            <X size={16} /> Cancel Linking
          </Button>
        </div>
      )}

      {/* Top Right Controls Group */}
      <div
        className={`fixed z-30 flex flex-row items-start gap-2 transition-all duration-300 pointer-events-none ${rightTopClass}`}
        style={{ right: `calc(${rightSidebarOffset}px + 12px)` }}
      >
        {/* Color Theme Dropdown */}
        <div className={`hidden md:flex bg-zinc-900/90 p-1.5 rounded-sm border border-zinc-800 shadow-lg backdrop-blur-sm items-center gap-1 transition-all duration-300 ease-in-out ${
          uiVisibility.quickTheme && !isWelcomeOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}>
          <div className="relative group">
            <select
              id="canvas-quick-theme-select"
              name="canvas-quick-theme-select"
              aria-label="Quick Theme Selector"
              value={colorMap}
              onChange={(e) => {
                const val = e.target.value as ColorMap;
                setColorMap(val);
                if (val === 'custom' && onOpenColorCustomizer) {
                  onOpenColorCustomizer();
                }
              }}
              className="appearance-none bg-zinc-800 text-[9px] text-zinc-300 pl-2 pr-6 py-1 rounded-sm border border-zinc-700 outline-none hover:border-indigo-500 cursor-pointer w-24"
            >
              <option value="magma">Magma</option>
              <option value="electric">Electric</option>
              <option value="bio">Bio</option>
              <option value="thermal">Thermal</option>
              <option value="rgb">RGB</option>
              <option value="custom">Custom...</option>
            </select>
            <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
              <Palette size={10} className="ui-icon-toolbar" />
            </div>
          </div>

          {colorMap === 'custom' && (
            <Button size="iconSm" variant="ghost" onClick={onOpenColorCustomizer} title="Edit Custom Theme">
              <Palette size={14} className="ui-icon-toolbar-active text-fuchsia-400" />
            </Button>
          )}
        </div>

        {/* Vertical Zoom Slider Group with Minimalistic Container and Fade Transition */}
        <div className={`ui-zoom-bar bg-zinc-900/90 p-1.5 rounded-sm border border-zinc-800 shadow-lg backdrop-blur-sm flex flex-col items-center gap-2 transition-all duration-300 ease-in-out ${
          uiVisibility.zoomControls && !isWelcomeOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}>
          <div className="p-0.5" title="Zoom Control">
            <Target size={14} className="ui-icon-toolbar" />
          </div>
          <VerticalSlider min={0.1} max={20} step={0.1} value={zoom} onChange={setZoom} />
          <span className="text-[9px] font-mono text-zinc-400 font-bold">{zoom.toFixed(1)}x</span>
          <Button variant="ghost" size="iconSm" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="mt-0.5" title="Reset View (Zoom 100% & Center)">
            <Maximize size={14} className="ui-icon-toolbar" />
          </Button>
          <div className="w-4 h-px bg-zinc-800 my-0.5" />
          <Button variant={infiniteGrid ? 'secondary' : 'ghost'} size="iconSm" onClick={() => setInfiniteGrid(!infiniteGrid)} title={infiniteGrid ? "Hide Infinite Grid" : "Show Infinite Grid"}>
            <Eye size={14} className={infiniteGrid ? "ui-icon-toolbar-active" : "ui-icon-toolbar"} />
          </Button>
          <Button variant={boundaryType !== 'periodic' ? 'secondary' : 'ghost'} size="iconSm" onClick={() => onBoundaryChange(getNextBoundary(boundaryType))} title={getBoundaryTitle(boundaryType)}>
            {getBoundaryIcon(boundaryType)}
          </Button>
        </div>
      </div>

      {/* Upgraded 2-Row Brush Hotbar with Inline Compact Color Control and Smooth Fade Transition */}
      <div
        className={`absolute bottom-[var(--brush-bar-bottom-mobile,70px)] sm:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[var(--brush-bar-width-mobile,250px)] max-w-[calc(100vw-104px)] sm:max-w-xl sm:w-auto px-0 transition-all duration-300 ease-in-out ${
          uiVisibility.brushes && !isWelcomeOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        <Card className="ui-brush-bar flex flex-col gap-1.5 sm:gap-2.5 pointer-events-auto w-full p-1.5 sm:p-2">

          {/* Row 1: Brush Modes, Shapes, and Inline Compact Color Button */}
          <div className="flex items-center flex-nowrap justify-between gap-0.5 sm:gap-1.5 w-full">
            {/* Brush Tools */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 border-r border-zinc-800/80 pr-1 sm:pr-1.5">
              <Button variant={brushMode === 'inject' ? 'primary' : 'ghost'} size="iconSm" className="w-6 h-6 sm:w-7 sm:h-7 p-0" onClick={() => setBrushMode('inject')} title="Inject Mode"><Pen size={12} className={brushMode === 'inject' ? 'ui-icon-toolbar-active' : 'ui-icon-toolbar'} /></Button>
              <Button variant={brushMode === 'remove' ? 'primary' : 'ghost'} size="iconSm" className="w-6 h-6 sm:w-7 sm:h-7 p-0" onClick={() => setBrushMode('remove')} title="Deplete Mode"><Eraser size={12} className={brushMode === 'remove' ? 'ui-icon-toolbar-active' : 'ui-icon-toolbar'} /></Button>
            </div>

            {/* Brush Shapes */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              {[
                { id: 'circle', icon: Circle, label: 'Circle' },
                { id: 'square', icon: Square, label: 'Square' },
                { id: 'gaussian', icon: CloudRain, label: 'Soft' },
                { id: 'splatter', icon: Wind, label: 'Splat' }
              ].map((b) => (
                <Button key={b.id} variant={brushType === b.id ? 'secondary' : 'ghost'} size="iconSm" className="w-6 h-6 sm:w-7 sm:h-7 p-0" onClick={() => setBrushType(b.id as any)} title={b.label}><b.icon size={12} className={brushType === b.id ? 'ui-icon-toolbar-active' : 'ui-icon-toolbar'} /></Button>
              ))}
            </div>

            {/* Inline Compact Color Control directly alongside brush shapes */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 border-l border-zinc-800/80 pl-1 sm:pl-1.5">
              <div className="relative flex items-center shrink-0">
                <button
                  type="button"
                  onClick={handleColorButtonClick}
                  className={`relative flex items-center gap-1 sm:gap-1.5 px-1 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] border transition-all shrink-0 ${
                    fullColorMode || colorMap === 'rgb'
                      ? 'bg-indigo-950/80 border-indigo-500/80 text-indigo-200 shadow-sm hover:border-indigo-400'
                      : 'bg-zinc-900 border-zinc-700/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
                  }`}
                  title={colorMap === 'rgb' ? "Click to pick brush color" : `Paint in Color (Currently ${colorMap.toUpperCase()})`}
                >
                  <div
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-white/50 shrink-0 shadow-inner"
                    style={{ backgroundColor: `rgb(${brushColor.r}, ${brushColor.g}, ${brushColor.b})` }}
                  />
                  <span className="font-medium text-[8.5px] sm:text-[9px] hidden min-[360px]:inline">Color</span>

                  {/* Native Color Picker overlaid on swatch when in RGB mode */}
                  {(fullColorMode || colorMap === 'rgb') && (
                    <input
                      type="color"
                      id="canvas-brush-color-picker"
                      name="canvas-brush-color-picker"
                      aria-label="Choose Brush Color"
                      value={hexColor}
                      onChange={(e) => {
                        const r = parseInt(e.target.value.slice(1, 3), 16);
                        const g = parseInt(e.target.value.slice(3, 5), 16);
                        const b = parseInt(e.target.value.slice(5, 7), 16);
                        setBrushColor({ r, g, b });
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      title="Choose Color"
                    />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Sliders */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2.5 px-0.5 pt-0.5">
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between items-center">
                <span className="text-[7.5px] sm:text-[8px] text-zinc-400 font-normal select-none">Size</span>
                <span className="text-[7.5px] sm:text-[8px] font-mono text-zinc-500">{brushSize}px</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={0.1}
                value={Math.sqrt((Math.max(1, Math.min(250, brushSize)) - 1) / 249) * 100}
                onChange={(t: number) => {
                  const size = Math.max(1, Math.min(250, Math.round(1 + 249 * Math.pow(t / 100, 2))));
                  setBrushSize(size);
                }}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between items-center">
                <span className="text-[7.5px] sm:text-[8px] text-zinc-400 font-normal select-none">Strength</span>
                <span className="text-[7.5px] sm:text-[8px] font-mono text-zinc-500">{brushStrength.toFixed(1)}x</span>
              </div>
              <Slider min={0.1} max={20} step={0.1} value={brushStrength} onChange={setBrushStrength} />
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};
