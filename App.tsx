import React, { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { useMedia } from './hooks/useMedia';
import { useSimulation } from './hooks/useSimulation';
import { useRenderer } from './hooks/useRenderer';
import Visualizer from './components/Visualizer';
import { TopBar } from './components/layout/TopBar';
import { SidebarLeft } from './components/layout/SidebarLeft';
import { SidebarRight } from './components/layout/SidebarRight';
import { QuickAccessBar } from './components/layout/QuickAccessBar';
import { CanvasUI } from './components/layout/CanvasUI';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Button } from './components/ui/Shared';
import { EyeOff, X } from 'lucide-react';
import {
  CustomColorConfig,
  UITheme,
  AutomationModule,
  SceneState,
  SimulationParams,
  ContinuousSeed,
  EffectType,
  EffectInstance,
  PresetData,
  FileDropdownProps,
  SerializableContinuousSeed,
  InitialSeedConfig
} from './types';
import {
  DEFAULT_PARAMS,
  getDefaultEffects,
  createDefaultEffect,
  convertParamsToEffects,
  getDefaultInitialSeeds,
  getRandomLaunchColorConfig
} from './constants';
import { encodeSceneStateToUrl, decodeSceneStateFromUrl } from './utils/urlSerialization';
import { generateId } from './utils/idGenerator';
import { applyPresetDirectly, applyPresetWithSettings, PresetLoadSettings } from './utils/presetLoader';
import { UIProvider, useUIState } from './context/AppStateContext';
import { BrushProvider, useBrush } from './context/BrushContext';
import { ViewportProvider, useViewport } from './context/ViewportContext';
import { AutomationLinkProvider, useAutomationLink } from './context/AutomationContext';

import { WelcomeModal } from './components/modals/WelcomeModal';

// Lazy-loaded Modals for Code Splitting & Sub-500kB Initial Bundle
const PresetLoadModal = lazy(() => import('./components/modals/PresetLoadModal').then(m => ({ default: m.PresetLoadModal })));
const CustomResolutionModal = lazy(() => import('./components/modals/CustomResolutionModal').then(m => ({ default: m.CustomResolutionModal })));
const ColorCustomizerModal = lazy(() => import('./components/modals/ColorCustomizerModal').then(m => ({ default: m.ColorCustomizerModal })));
const HelpModal = lazy(() => import('./components/modals/HelpModal').then(m => ({ default: m.HelpModal })));
const UISettingsModal = lazy(() => import('./components/modals/UISettingsModal').then(m => ({ default: m.UISettingsModal })));
const ShareLinkModal = lazy(() => import('./components/modals/ShareLinkModal').then(m => ({ default: m.ShareLinkModal })));
const RenderModal = lazy(() => import('./components/modals/RenderModal').then(m => ({ default: m.RenderModal })));
const MediaImportModal = lazy(() => import('./components/modals/MediaImportModal').then(m => ({ default: m.MediaImportModal })));
const WebcamImportModal = lazy(() => import('./components/modals/WebcamImportModal').then(m => ({ default: m.WebcamImportModal })));
const GlobalSettingsModal = lazy(() => import('./components/modals/GlobalSettingsModal').then(m => ({ default: m.GlobalSettingsModal })));

const LEFT_SIDEBAR_MIN = 44;
const RIGHT_SIDEBAR_MIN = 44;

function MainAppContent() {
  const { state: ui, dispatch: uiDispatch, openModal, closeModal } = useUIState();
  const { brushMode, setBrushMode, brushType, setBrushType, brushSize, setBrushSize, brushColor, setBrushColor, fullColorMode, setFullColorMode } = useBrush();
  const { zoom, setZoom, offset, setOffset, infiniteGrid, setInfiniteGrid } = useViewport();
  const { activeLinkModuleId, setActiveLinkModuleId, linkedParams } = useAutomationLink();

  const { mediaConfig, setMediaConfig, mediaConfigRef, detachMedia, extractFrame } = useMedia();

  const [continuousSeeds, setContinuousSeeds] = useState<ContinuousSeed[]>(getDefaultInitialSeeds);
  const continuousSeedsRef = useRef<ContinuousSeed[]>(continuousSeeds);
  useEffect(() => { continuousSeedsRef.current = continuousSeeds; }, [continuousSeeds]);

  const [customColorConfig, setCustomColorConfig] = useState<CustomColorConfig>(getRandomLaunchColorConfig);
  const customColorConfigRef = useRef<CustomColorConfig>(customColorConfig);
  useEffect(() => { customColorConfigRef.current = customColorConfig; }, [customColorConfig]);

  const {
    engineMode, setEngineMode,
    params, setParams,
    effects, setEffects,
    gridSize, setGridSize,
    speed, setSpeed,
    isRunning, setIsRunning,
    automationModules, setAutomationModules,
    stabilizeConfig, setStabilizeConfig,
    moduleOutputs, targetOutputs, automatedParams,
    sampleData,
    solver,
    gpuSolver,
    visualizerRef,
    loop, requestRef, reset, simTimeRef, paramsRef, effectsRef, engineModeRef, stepManual, perturb,
    seedConfig, setSeedConfig, seedConfigRef
  } = useSimulation(mediaConfigRef, extractFrame, continuousSeedsRef, customColorConfigRef);

  const {
    isRendering, renderProgress, showRenderModal, setShowRenderModal, startRender, cancelRender
  } = useRenderer(
    solver,
    gpuSolver,
    visualizerRef,
    mediaConfigRef,
    paramsRef,
    effectsRef,
    automationModules,
    extractFrame,
    setIsRunning,
    simTimeRef,
    seedConfigRef,
    continuousSeedsRef,
    engineModeRef,
    customColorConfigRef
  );

  // Modular Stackable Effects Handlers
  const handleAddEffect = useCallback((type: EffectType) => {
    const newEffect = createDefaultEffect(type);
    setEffects(prev => [...prev, newEffect]);
  }, [setEffects]);

  const handleRemoveEffect = useCallback((id: string) => {
    setEffects(prev => prev.filter(e => e.id !== id));
    setAutomationModules(mods => mods.map(m => ({
      ...m,
      targets: m.targets.filter(t => !t.paramKey.startsWith(`fx_${id}_`))
    })));
  }, [setEffects, setAutomationModules]);

  const handleToggleEffect = useCallback((id: string) => {
    setEffects(prev => prev.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e));
  }, [setEffects]);

  const handleEffectParamChange = useCallback((effectId: string, paramKey: string, value: any) => {
    if (activeLinkModuleId && value === 'LINK') {
      const fullKey = `fx_${effectId}_${paramKey}`;
      setAutomationModules(mods => mods.map(m => {
        if (m.id === activeLinkModuleId && !m.targets.find(t => t.paramKey === fullKey)) {
          return { ...m, targets: [...m.targets, { id: generateId('mod_target'), paramKey: fullKey, gain: 1.0, offset: 0 }] };
        }
        return m;
      }));
      setActiveLinkModuleId(null);
      return;
    }
    setEffects(prev => prev.map(e => e.id === effectId ? {
      ...e,
      params: { ...e.params, [paramKey]: value }
    } : e));
  }, [activeLinkModuleId, setEffects, setAutomationModules, setActiveLinkModuleId]);

  const handleParamChange = useCallback((key: keyof SimulationParams, value: any) => {
    if (activeLinkModuleId && value === 'LINK') {
      setAutomationModules(mods => mods.map(m => {
        if (m.id === activeLinkModuleId && !m.targets.find(t => t.paramKey === key)) {
          return { ...m, targets: [...m.targets, { id: generateId('mod_target'), paramKey: key, gain: 1.0, offset: 0 }] };
        }
        return m;
      }));
      setActiveLinkModuleId(null);
      return;
    }
    setParams(prev => {
      if (key === 'colorMap' && value === 'rgb' && prev.colorMap !== 'rgb') {
        if (solver && typeof solver.bakeColorMapToRGB === 'function') {
          solver.bakeColorMapToRGB(prev.colorMap, customColorConfigRef.current);
        }
        if (gpuSolver && typeof gpuSolver.bakeColorMapToRGB === 'function') {
          gpuSolver.bakeColorMapToRGB(prev.colorMap, customColorConfigRef.current);
        }
      }
      return { ...prev, [key]: value };
    });
    if (key === 'colorMap') {
      if (value === 'custom') openModal('colorCustomizer');
      if (value !== 'rgb') setFullColorMode(false);
      else setFullColorMode(true);
      if (!ui.openModals.globalSettings) {
        uiDispatch({ type: 'SET_UI_VISIBILITY', visibility: { quickTheme: true } });
      }
    }
  }, [activeLinkModuleId, setParams, setAutomationModules, setActiveLinkModuleId, openModal, setFullColorMode, solver, gpuSolver, ui.openModals.globalSettings, uiDispatch]);

  // URL Hash Preset Loader Logic
  useEffect(() => {
    const handleHash = async () => {
      const hash = window.location.hash;
      if (hash && (hash.startsWith('#/preset=') || hash.startsWith('#preset='))) {
        try {
          const encoded = hash.startsWith('#/preset=')
            ? hash.substring('#/preset='.length)
            : hash.substring('#preset='.length);
          const loadedState = await decodeSceneStateFromUrl(encoded);
          if (loadedState.params) setParams(loadedState.params);
          if (loadedState.effects) {
            setEffects(loadedState.effects);
          } else if (loadedState.params) {
            setEffects(convertParamsToEffects(loadedState.params, loadedState.stabilizer));
          }
          if (loadedState.seedConfig) setSeedConfig(loadedState.seedConfig);
          if (loadedState.stabilizer) setStabilizeConfig(loadedState.stabilizer);
          if (loadedState.gridSize) setGridSize(loadedState.gridSize);
          if (loadedState.automation) setAutomationModules(loadedState.automation);
          if (loadedState.customColorConfig) setCustomColorConfig(loadedState.customColorConfig);
          if (loadedState.reliefLighting) handleParamChange('reliefLighting', loadedState.reliefLighting);
          let seedsToApply = getDefaultInitialSeeds();
          if (Array.isArray(loadedState.continuousSeeds) && loadedState.continuousSeeds.length > 0) {
            seedsToApply = loadedState.continuousSeeds;
          } else if (loadedState.seedConfig) {
            seedsToApply = [{
              id: generateId('cseed_url'),
              name: 'Initial Seed',
              type: loadedState.seedConfig.type || 'perlin',
              enabled: true,
              isMinimized: false,
              opacity: 1.0,
              blendMode: 'add',
              x: 0,
              y: 0,
              scaleX: 1.0,
              scaleY: 1.0,
              rotation: 0,
              blendIf: { enabled: false, points: [{ pos: 0, val: 0, id: '1' }, { pos: 1, val: 1, id: '2' }], smoothness: 0.1 },
              isStartingSeed: true,
              seedConfig: loadedState.seedConfig
            }];
          }
          setContinuousSeeds(seedsToApply);
          if (continuousSeedsRef) continuousSeedsRef.current = seedsToApply;
          if (paramsRef && loadedState.params) paramsRef.current = loadedState.params;

          window.history.replaceState(null, '', window.location.pathname);
          reset(seedsToApply, loadedState.params);
        } catch (err) {
          console.error("Failed to load preset from URL", err);
        }
      }
    };
    handleHash();
  }, [setParams, setEffects, setSeedConfig, setStabilizeConfig, setGridSize, setAutomationModules, setContinuousSeeds, reset, handleParamChange, continuousSeedsRef, paramsRef]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', ui.uiTheme.accentColor);
  }, [ui.uiTheme]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop, requestRef]);

  useEffect(() => {
    if (activeLinkModuleId && window.innerWidth < 768) {
      uiDispatch({ type: 'SET_RIGHT_SIDEBAR_OPEN', open: false });
    }
  }, [activeLinkModuleId, uiDispatch]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!document.hasFocus()) return;
      const target = e.target as HTMLElement;
      const isTextInput = target && (
        (target.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button', 'submit', 'color', 'file'].includes(((target as HTMLInputElement).type || '').toLowerCase())) ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true'
      );
      if (isTextInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning(prev => !prev);
      } else if (e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        reset();
      } else if (e.code === 'KeyH') {
        e.preventDefault();
        uiDispatch({
          type: 'SET_HIDE_UI',
          hide: (prev: boolean) => {
            if (!prev) {
              uiDispatch({ type: 'SET_SHOW_HIDE_HINT', show: true });
              setTimeout(() => uiDispatch({ type: 'SET_SHOW_HIDE_HINT', show: false }), 5000);
            }
            return !prev;
          }
        });
      }
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [reset, setIsRunning, uiDispatch]);

  const handleMediaParamLink = useCallback((paramKey: string) => {
    if (activeLinkModuleId) {
      setAutomationModules(mods => mods.map(m => {
        if (m.id === activeLinkModuleId && !m.targets.find(t => t.paramKey === paramKey)) {
          return { ...m, targets: [...m.targets, { id: generateId('mod_target'), paramKey, gain: 1.0, offset: 0 }] };
        }
        return m;
      }));
      setActiveLinkModuleId(null);
    }
  }, [activeLinkModuleId, setAutomationModules, setActiveLinkModuleId]);

  const handleDetachMedia = () => {
    setAutomationModules(mods => mods.map(m => ({
      ...m,
      targets: m.targets.filter(t => t.paramKey !== 'mediaOpacity')
    })));
    detachMedia();
    reset();
  };

  const handleRemoveContinuousSeed = useCallback((seedId: string) => {
    setAutomationModules(mods => mods.map(m => ({
      ...m,
      targets: m.targets.filter(t => !t.paramKey.startsWith(`cseed_${seedId}_`))
    })));
    setContinuousSeeds(prev => prev.filter(s => s.id !== seedId));
  }, [setAutomationModules, setContinuousSeeds]);

  const getSerializableSeeds = (): SerializableContinuousSeed[] => {
    return continuousSeeds.map(seed => {
      if (seed.mediaConfig) {
        const { element, ...restConfig } = seed.mediaConfig;
        return { ...seed, mediaConfig: restConfig };
      }
      return seed;
    });
  };

  const saveScene = () => {
    const scene: SceneState = {
      params,
      effects,
      automation: automationModules,
      stabilizer: stabilizeConfig,
      gridSize,
      seedConfig,
      continuousSeeds: getSerializableSeeds() as ContinuousSeed[]
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scene));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `mcrd_scene_${Date.now()}.json`);
    dl.click(); dl.remove();
  };

  const handleShareLink = async () => {
    try {
      const scene: SceneState = {
        params,
        effects,
        automation: automationModules,
        stabilizer: stabilizeConfig,
        gridSize,
        seedConfig,
        continuousSeeds: getSerializableSeeds() as ContinuousSeed[],
        customColorConfig: customColorConfigRef.current,
        reliefLighting: params.reliefLighting
      };
      const encoded = await encodeSceneStateToUrl(scene);
      const url = `${window.location.origin}${window.location.pathname}#/preset=${encoded}`;
      uiDispatch({ type: 'SET_SHARE_LINK', url });
      openModal('shareLink');
    } catch (err) {
      console.error("Failed to generate share link", err);
      alert("Failed to generate link due to invalid data.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, mode: 'image' | 'video' | 'json' | 'scene') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (mode === 'image' || mode === 'video') {
      setIsRunning(false);
      uiDispatch({ type: 'SET_PENDING_MEDIA', src: URL.createObjectURL(file), mediaType: mode === 'video' ? 'video' : 'image' });
      openModal('mediaImport');
    } else if (mode === 'json' || mode === 'scene') {
      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          const data = JSON.parse(re.target?.result as string) as SceneState;
          uiDispatch({ type: 'SET_PENDING_PRESET', data });
          openModal('presetLoad');
        } catch { alert("Invalid Preset File"); }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
    uiDispatch({ type: 'SET_ACTIVE_MENU', menu: null });
  };

  const handleImportConfirm = (w: number, h: number, k: boolean, e: HTMLImageElement | HTMLVideoElement) => {
    setIsRunning(false);
    setGridSize({ width: w, height: h });
    setMediaConfig({ type: ui.pendingMediaType, element: e, opacity: 0.5, playbackSpeed: 1, keepAspect: k, seedOnReset: true });
    handleParamChange('colorMap', 'rgb');

    setTimeout(() => { reset(); }, 50);
    closeModal('mediaImport');
    uiDispatch({ type: 'SET_PENDING_MEDIA', src: null });
  };

  const handleWebcamConfirm = (w: number, h: number, k: boolean, e: HTMLVideoElement) => {
    setIsRunning(false);
    setGridSize({ width: w, height: h });
    setMediaConfig({ type: 'webcam', element: e, opacity: 0.5, playbackSpeed: 1, keepAspect: k, seedOnReset: false });
    handleParamChange('colorMap', 'rgb');

    const newWebcamSeed: ContinuousSeed = {
      id: generateId('cseed_webcam'),
      name: 'Live Webcam',
      type: 'webcam',
      enabled: true,
      isMinimized: false,
      opacity: 1.0,
      blendMode: 'replace',
      x: 0,
      y: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      rotation: 0,
      blendIf: { enabled: false, points: [{ pos: 0, val: 0, id: '1' }, { pos: 1, val: 1, id: '2' }], smoothness: 0.1 },
      mediaConfig: { type: 'webcam', element: e, opacity: 1.0, playbackSpeed: 1.0, keepAspect: k, seedOnReset: false },
      isStartingSeed: false
    };
    setContinuousSeeds(prev => [...prev.filter(s => s.type !== 'webcam'), newWebcamSeed]);

    setTimeout(() => { reset(); }, 50);
    closeModal('webcamImport');
  };

  const fileDropdownProps: FileDropdownProps = {
    onSaveScene: saveScene,
    onOpenScene: (e) => handleFileSelect(e, 'scene'),
    onImportImage: (e) => handleFileSelect(e, 'image'),
    onImportVideo: (e) => handleFileSelect(e, 'video'),
    onImportWebcam: () => { setIsRunning(false); openModal('webcamImport'); },
    onImportPreset: (e) => handleFileSelect(e, 'json'),
    onExportSnapshot: () => {
      if (visualizerRef.current) {
        const url = visualizerRef.current.getCanvasDataURL();
        const dl = document.createElement('a'); dl.setAttribute("href", url); dl.setAttribute("download", `mcrd_snap_${Date.now()}.png`); dl.click(); dl.remove();
      }
    }
  };

  const presetTarget = {
    setParams: (p: SimulationParams | ((prev: SimulationParams) => SimulationParams)) => {
      if (typeof p === 'function') {
        setParams(prev => {
          const next = p(prev);
          paramsRef.current = next;
          return next;
        });
      } else {
        paramsRef.current = p;
        setParams(p);
      }
    },
    setEffects: (e: EffectInstance[] | ((prev: EffectInstance[]) => EffectInstance[])) => {
      if (typeof e === 'function') {
        setEffects(prev => {
          const next = e(prev);
          effectsRef.current = next;
          return next;
        });
      } else {
        effectsRef.current = e;
        setEffects(e);
      }
    },
    setSeedConfig: (sc: InitialSeedConfig) => {
      seedConfigRef.current = sc;
      setSeedConfig(sc);
    },
    setStabilizeConfig,
    setCustomColorConfig: (c: CustomColorConfig) => {
      customColorConfigRef.current = c;
      setCustomColorConfig(c);
    },
    setGridSize,
    setContinuousSeeds: (s: ContinuousSeed[] | ((prev: ContinuousSeed[]) => ContinuousSeed[])) => {
      if (typeof s === 'function') {
        setContinuousSeeds(prev => {
          const next = s(prev);
          continuousSeedsRef.current = next;
          return next;
        });
      } else {
        continuousSeedsRef.current = s;
        setContinuousSeeds(s);
      }
    },
    setAutomationModules,
    solver,
    handleParamChange,
    reset
  };

  const handleResetAll = () => {
    const defaultEffects = getDefaultEffects();
    const defaultSeeds = getDefaultInitialSeeds();
    const defaultColors = getRandomLaunchColorConfig();

    paramsRef.current = { ...DEFAULT_PARAMS };
    effectsRef.current = defaultEffects;
    continuousSeedsRef.current = defaultSeeds;
    customColorConfigRef.current = defaultColors;

    setParams({ ...DEFAULT_PARAMS });
    setEffects(defaultEffects);
    setContinuousSeeds(defaultSeeds);
    setCustomColorConfig(defaultColors);
    setSeedConfig(defaultSeeds[0]?.seedConfig || {
      type: 'random',
      intensity: 1.0,
      seedTarget: { u: 0.1, v: 0.9, w: 0 },
      randomThreshold: 0.005,
      perlinScale: 20,
      perlinThreshold: 0.5,
      perlinOctaves: 2,
      perlinSeed: 0,
      perlinGradient: false,
      gridSpacingX: 20,
      gridSpacingY: 20,
      gridDotSize: 2,
      gridOffset: false,
      shapeType: 'circle',
      shapeMode: 'scatter',
      shapeCount: 5,
      shapeSize: 10,
      shapeHollow: false,
      shapePosX: 0.5,
      shapePosY: 0.5,
      mathExpression: 'Math.sin(x*0.1)*Math.cos(y*0.1) > 0',
      textString: 'McRD',
      textSize: 40,
      textPosX: 0.5,
      textPosY: 0.5
    });
    setStabilizeConfig({
      enabled: false, targetDensity: 6.0, strength: 1.0,
      adjustKOff: true, adjustKRec: true, adjustKOn: false, adjustFeed: false
    });
    setAutomationModules([]);
    setZoom(1.0);
    setOffset({ x: 0, y: 0 });
    detachMedia();
    reset();
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none relative">
      {/* UI Hide Hint */}
      {ui.showHideHint && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-zinc-900/90 border border-zinc-700 px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs text-zinc-200 pointer-events-none animate-in fade-in zoom-in duration-200">
          <EyeOff size={14} className="text-indigo-400" />
          <span>Press <strong>H</strong> to restore the user interface</span>
        </div>
      )}

      {/* Welcome Intro Modal (Synchronously rendered to prevent initial UI flash) */}
      {ui.openModals.splash && (
        <WelcomeModal
          isOpen={ui.openModals.splash}
          onSelectPreset={(preset) => applyPresetDirectly(preset, presetTarget)}
          onStartClosing={() => {
            if (typeof window !== 'undefined' && window.innerWidth >= 768) {
              uiDispatch({ type: 'SET_SIDEBAR_MINIMIZED', minimized: false });
            }
          }}
          onClose={() => {
            closeModal('splash');
            if (typeof window !== 'undefined' && window.innerWidth >= 768) {
              uiDispatch({ type: 'SET_SIDEBAR_MINIMIZED', minimized: false });
            }
            setTimeout(() => {
              uiDispatch({ type: 'SET_FIRST_LAUNCH_OPEN', open: false });
            }, 1000);
          }}
        />
      )}

      {/* Lazy Modals Suspense Boundary */}
      <Suspense fallback={null}>

        {/* Preset Loader Resolution Modal */}
        {ui.openModals.presetLoad && ui.pendingPresetData && (
          <PresetLoadModal
            preset={ui.pendingPresetData}
            onConfirm={(settings: PresetLoadSettings) => {
              if (ui.pendingPresetData) {
                applyPresetWithSettings(ui.pendingPresetData, settings, presetTarget);
              }
              closeModal('presetLoad');
              uiDispatch({ type: 'SET_PENDING_PRESET', data: null });
            }}
            onCancel={() => {
              closeModal('presetLoad');
              uiDispatch({ type: 'SET_PENDING_PRESET', data: null });
            }}
          />
        )}

        {/* Custom Grid Resolution Modal */}
        {ui.openModals.customGrid && (
          <CustomResolutionModal
            currentWidth={gridSize.width}
            currentHeight={gridSize.height}
            onApply={(w, h) => {
              setGridSize({ width: w, height: h });
              setTimeout(() => reset(), 50);
            }}
            onClose={() => closeModal('customGrid')}
          />
        )}

        {/* Custom Color Palette Editor Modal */}
        {ui.openModals.colorCustomizer && (
          <ColorCustomizerModal
            config={customColorConfig}
            onApply={(newConfig) => {
              setCustomColorConfig(newConfig);
              handleParamChange('colorMap', 'custom');
              closeModal('colorCustomizer');
            }}
            onClose={() => closeModal('colorCustomizer')}
          />
        )}

        {/* Help Modal */}
        {ui.openModals.help && <HelpModal onClose={() => closeModal('help')} />}

        {/* UI Settings Theme Modal */}
        {ui.openModals.uiSettings && (
          <UISettingsModal
            currentTheme={ui.uiTheme}
            onApply={(theme: UITheme) => uiDispatch({ type: 'SET_UI_THEME', theme })}
            onClose={() => closeModal('uiSettings')}
          />
        )}

        {/* Share Preset Link Modal */}
        {ui.openModals.shareLink && (
          <ShareLinkModal
            url={ui.generatedShareLink}
            onClose={() => closeModal('shareLink')}
          />
        )}

        {/* Video Exporter Modal */}
        {showRenderModal && (
          <RenderModal
            initialSpeed={speed}
            onConfirm={startRender}
            onCancel={() => setShowRenderModal(false)}
          />
        )}

        {/* Media Import Panel */}
        {ui.openModals.mediaImport && ui.pendingMediaSrc && (
          <MediaImportModal
            mediaSrc={ui.pendingMediaSrc}
            mediaType={ui.pendingMediaType}
            onConfirm={handleImportConfirm}
            onCancel={() => {
              closeModal('mediaImport');
              uiDispatch({ type: 'SET_PENDING_MEDIA', src: null });
            }}
          />
        )}

        {/* Webcam Configuration Panel */}
        {ui.openModals.webcamImport && (
          <WebcamImportModal
            onConfirm={handleWebcamConfirm}
            onCancel={() => closeModal('webcamImport')}
          />
        )}

        {/* Global Settings Center Modal */}
        <GlobalSettingsModal
          isOpen={ui.openModals.globalSettings}
          onClose={() => closeModal('globalSettings')}
          engineMode={engineMode}
          setEngineMode={setEngineMode}
          speed={speed}
          setSpeed={setSpeed}
          gridSize={gridSize}
          onApplyResolution={(w, h) => {
            setGridSize({ width: w, height: h });
            setTimeout(() => reset(), 50);
          }}
          openResolutionModal={() => openModal('customGrid')}
          colorMap={params.colorMap}
          setColorMap={(v) => handleParamChange('colorMap', v)}
          clampMode={params.clampMode}
          setClampMode={(v) => handleParamChange('clampMode', v)}
          onOpenColorCustomizer={() => openModal('colorCustomizer')}
          stabilityThreshold={params.stabilityThreshold}
          setStabilityThreshold={(v) => handleParamChange('stabilityThreshold', v)}
          fadeOutRate={params.fadeOutRate ?? 0.8}
          setFadeOutRate={(v) => handleParamChange('fadeOutRate', v)}
          rgbPostProcessing={params.rgbPostProcessing}
          setRgbPostProcessing={(cfg) => {
            const nextVal = typeof cfg === 'function' ? cfg(params.rgbPostProcessing || { exposure: 1, contrast: 1, gamma: 1, saturation: 1, brightness: 0, tint: { r: 1, g: 1, b: 1 } }) : cfg;
            handleParamChange('rgbPostProcessing', nextVal);
          }}
          renderStyle={params.renderStyle}
          setRenderStyle={(v) => handleParamChange('renderStyle', v)}
          effects={effects}
          setEffects={setEffects}
          onRemoveEffect={handleRemoveEffect}
          onToggleEffect={handleToggleEffect}
        />
      </Suspense>

      {/* Video Rendering Overlay */}
      {isRendering && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex flex-col items-center justify-center pointer-events-auto cursor-wait">
          <div className="text-2xl font-bold text-white mb-2 animate-pulse">Rendering Video...</div>
          <div className="text-sm text-zinc-400 font-mono">Frame: {renderProgress.current} / {renderProgress.total}</div>
          <div className="mt-4 w-64 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-600 transition-all duration-100"
              style={{ width: `${Math.max(0, (renderProgress.current / (renderProgress.total || 1)) * 100)}%` }}
            />
          </div>
          <div className="mt-6">
            <Button variant="destructive" onClick={cancelRender} className="flex gap-2 items-center">
              <X size={14} /> Cancel Rendering
            </Button>
          </div>
        </div>
      )}

      {/* Left controls sidebar */}
      {!ui.hideUI && (
        <SidebarLeft
          engineMode={engineMode}
          setEngineMode={setEngineMode}
          isMinimized={ui.isSidebarMinimized}
          setIsMinimized={(min) => uiDispatch({ type: 'SET_SIDEBAR_MINIMIZED', minimized: min })}
          isFirstLaunchOpen={ui.isFirstLaunchOpen}
          width={ui.isSidebarMinimized ? LEFT_SIDEBAR_MIN : ui.leftSidebarWidth}
          onWidthChange={(w) => uiDispatch({ type: 'SET_LEFT_SIDEBAR_WIDTH', width: w })}
          params={params}
          handleParamChange={handleParamChange}
          speed={speed}
          setSpeed={setSpeed}
          gridSize={gridSize.width}
          openResolutionModal={() => openModal('customGrid')}
          stabilizeConfig={stabilizeConfig}
          setStabilizeConfig={setStabilizeConfig}
          showStabilizeConfig={ui.openModals.stabilizeConfig}
          setShowStabilizeConfig={(show) => show ? openModal('stabilizeConfig') : closeModal('stabilizeConfig')}
          sampleData={sampleData}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={linkedParams}
          automatedParams={automatedParams}
          seedConfig={seedConfig}
          setSeedConfig={setSeedConfig}
          isMediaAttached={!!mediaConfig}
          continuousSeeds={continuousSeeds}
          setContinuousSeeds={setContinuousSeeds}
          onRemoveContinuousSeed={handleRemoveContinuousSeed}
          onReset={reset}
          onOpenColorCustomizer={() => openModal('colorCustomizer')}
          onLinkParam={handleMediaParamLink}
          effects={effects}
          setEffects={setEffects}
          onAddEffect={handleAddEffect}
          onRemoveEffect={handleRemoveEffect}
          onToggleEffect={handleToggleEffect}
          onEffectParamChange={handleEffectParamChange}
          targetSectionId={ui.targetSidebarSection}
          onSectionOpened={() => uiDispatch({ type: 'SET_TARGET_SECTION', sectionId: null })}
          autoCloseAccordions={ui.uiVisibility.autoCloseAccordions}
        />
      )}

      {/* Floating parameter overlay (Quick Access / Mode Hotbar) */}
      {!ui.hideUI && (
        <QuickAccessBar
          leftOffset={ui.isSidebarMinimized ? LEFT_SIDEBAR_MIN : ui.leftSidebarWidth}
          activePanel={ui.activeFloatingPanel}
          setActivePanel={(p) => uiDispatch({ type: 'SET_FLOATING_PANEL', panelId: p })}
          params={params}
          handleParamChange={handleParamChange}
          stabilizeConfig={stabilizeConfig}
          setStabilizeConfig={setStabilizeConfig}
          showStabilizeConfig={ui.openModals.stabilizeConfig}
          setShowStabilizeConfig={(show) => show ? openModal('stabilizeConfig') : closeModal('stabilizeConfig')}
          visible={ui.uiVisibility.quickAccess}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={linkedParams}
          automatedParams={automatedParams}
          isSidebarOpen={!ui.isSidebarMinimized}
          onSelectSection={(secId) => uiDispatch({ type: 'SET_TARGET_SECTION', sectionId: secId })}
          effects={effects}
          onToggleEffect={handleToggleEffect}
          onRemoveEffect={handleRemoveEffect}
          onEffectParamChange={handleEffectParamChange}
        />
      )}

      {/* Automation controller sidebar */}
      {!ui.hideUI && (
        <SidebarRight
          isOpen={ui.isRightSidebarOpen}
          setIsOpen={(open) => uiDispatch({ type: 'SET_RIGHT_SIDEBAR_OPEN', open })}
          width={ui.isRightSidebarOpen ? ui.rightSidebarWidth : RIGHT_SIDEBAR_MIN}
          onWidthChange={(w) => uiDispatch({ type: 'SET_RIGHT_SIDEBAR_WIDTH', width: w })}
          modules={automationModules}
          setModules={setAutomationModules}
          activeLinkModuleId={activeLinkModuleId}
          setActiveLinkModuleId={setActiveLinkModuleId}
          moduleOutputs={moduleOutputs}
          targetOutputs={targetOutputs}
          simTime={simTimeRef.current}
        />
      )}

      {/* Central Viewport Area */}
      <div className="relative flex-1 h-full overflow-hidden bg-black">
        {/* Top Navbar */}
        {!ui.hideUI && (
          <TopBar
            isRunning={isRunning}
            setIsRunning={setIsRunning}
            onStep={stepManual}
            onReset={reset}
            showViewMenu={ui.activeMenu === 'view'}
            onViewMenuClick={() => uiDispatch({ type: 'SET_ACTIVE_MENU', menu: ui.activeMenu === 'view' ? null : 'view' })}
            showModesMenu={ui.activeMenu === 'modes'}
            onModesMenuClick={() => uiDispatch({ type: 'SET_ACTIVE_MENU', menu: ui.activeMenu === 'modes' ? null : 'modes' })}
            showFileMenu={ui.activeMenu === 'file-top'}
            onFileMenuToggle={(v) => uiDispatch({ type: 'SET_ACTIVE_MENU', menu: v ? 'file-top' : null })}
            fileDropdownProps={fileDropdownProps}
            closeAllMenus={() => uiDispatch({ type: 'SET_ACTIVE_MENU', menu: null })}
            setZoom={setZoom}
            setOffset={setOffset}
            infiniteGrid={infiniteGrid}
            setInfiniteGrid={setInfiniteGrid}
            leftSidebarWidth={ui.isSidebarMinimized ? LEFT_SIDEBAR_MIN : ui.leftSidebarWidth}
            rightSidebarWidth={ui.isRightSidebarOpen ? ui.rightSidebarWidth : RIGHT_SIDEBAR_MIN}
            onCustomGridClick={() => openModal('customGrid')}
            boundaryType={params.boundaryType}
            onBoundaryChange={(v) => handleParamChange('boundaryType', v)}
            onHelpClick={() => openModal('help')}
            onAboutClick={() => { setIsRunning(true); openModal('splash'); }}
            onRerunIntro={() => { setIsRunning(true); openModal('splash'); }}
            onUISettingsClick={() => openModal('uiSettings')}
            showFps={ui.showFps}
            onToggleFps={() => uiDispatch({ type: 'SET_SHOW_FPS', show: !ui.showFps })}
            clampMode={params.clampMode}
            setClampMode={(v) => handleParamChange('clampMode', v)}
            mediaConfig={mediaConfig}
            setMediaConfig={setMediaConfig}
            onDetachImage={handleDetachMedia}
            onRenderVideo={() => setShowRenderModal(true)}
            onImportWebcam={() => { setIsRunning(false); openModal('webcamImport'); }}
            onShareLink={handleShareLink}
            onOpenGlobalSettings={() => openModal('globalSettings')}
            uiVisibility={ui.uiVisibility}
            setUiVisibility={(v) => uiDispatch({ type: 'SET_UI_VISIBILITY', visibility: v })}
            isFirstLaunchOpen={ui.isFirstLaunchOpen}
            onRequestPresetLoad={(p: PresetData) => {
              uiDispatch({ type: 'SET_PENDING_PRESET', data: p as SceneState });
              openModal('presetLoad');
            }}
            automationModules={automationModules}
            setAutomationModules={setAutomationModules}
            activeLinkModuleId={activeLinkModuleId}
            onLinkMediaParam={handleMediaParamLink}
            linkedParams={linkedParams}
            automatedParams={automatedParams}
            params={params}
            effects={effects}
            seedConfig={seedConfig}
            setSeedConfig={setSeedConfig}
            stabilizeConfig={stabilizeConfig}
            setStabilizeConfig={setStabilizeConfig}
            continuousSeeds={continuousSeeds}
            onResetAll={handleResetAll}
            customColorConfig={customColorConfig}
            reliefLighting={params.reliefLighting}
          />
        )}

        {/* Canvas Toolbar panel overlay */}
        {!ui.hideUI && (
          <CanvasUI
            speed={speed}
            setSpeed={setSpeed}
            zoom={zoom}
            setZoom={setZoom}
            offset={offset}
            setOffset={setOffset}
            rightSidebarOffset={ui.isRightSidebarOpen ? ui.rightSidebarWidth : RIGHT_SIDEBAR_MIN}
            brushMode={brushMode}
            setBrushMode={setBrushMode}
            brushType={brushType}
            setBrushType={setBrushType}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            brushStrength={params.brushStrength}
            setBrushStrength={(v) => handleParamChange('brushStrength', v)}
            brushColor={brushColor}
            setBrushColor={setBrushColor}
            colorMap={params.colorMap}
            setColorMap={(v) => handleParamChange('colorMap', v)}
            isRGB={params.colorMap === 'rgb'}
            infiniteGrid={infiniteGrid}
            setInfiniteGrid={setInfiniteGrid}
            boundaryType={params.boundaryType}
            onBoundaryChange={(v) => handleParamChange('boundaryType', v)}
            onOpenColorCustomizer={() => openModal('colorCustomizer')}
            uiVisibility={ui.uiVisibility}
            activeLinkModuleId={activeLinkModuleId}
            onCancelLink={() => setActiveLinkModuleId(null)}
            hasMedia={!!mediaConfig}
            fullColorMode={fullColorMode}
            setFullColorMode={setFullColorMode}
            onEnsureColorHotbar={() => uiDispatch({ type: 'SET_UI_VISIBILITY', visibility: { quickTheme: true } })}
            isWelcomeOpen={ui.openModals.splash}
          />
        )}

        {/* Interactive WebGL/Canvas Viewport */}
        <div className="absolute inset-0 z-0">
          <Visualizer
            ref={visualizerRef}
            solver={solver}
            gpuSolver={gpuSolver}
            engineMode={engineMode}
            isRunning={isRunning}
            width={gridSize.width}
            height={gridSize.height}
            colorMap={params.colorMap}
            customColorConfig={customColorConfig}
            rgbPostProcessing={params.rgbPostProcessing}
            reliefLighting={params.reliefLighting}
            onInteract={(x, y) => perturb(
              x, y, params.brushStrength, brushSize, brushMode, brushType,
              (fullColorMode || params.colorMap === 'rgb') ? brushColor : undefined,
              infiniteGrid ? 'periodic' : params.boundaryType
            )}
            offset={offset}
            setOffset={setOffset}
            zoom={zoom}
            setZoom={setZoom}
            infiniteGrid={infiniteGrid}
            renderStyle={params.renderStyle}
          />
        </div>
      </div>
    </div>
  );
}

function AppWithProviders() {
  const [dummyModules] = useState<AutomationModule[]>([]);

  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <UIProvider>
        <BrushProvider>
          <ViewportProvider>
            <AutomationLinkProvider modules={dummyModules}>
              <MainAppContent />
            </AutomationLinkProvider>
          </ViewportProvider>
        </BrushProvider>
      </UIProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  return <AppWithProviders />;
}
