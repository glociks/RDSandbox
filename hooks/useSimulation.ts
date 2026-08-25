/**
 * Simulation Lifecycle Hook.
 *
 * Coordinates physics simulation loops across WebGL2 GPU, multi-threaded Web Workers,
 * and CPU fallback solvers with real-time modulation evaluation and layer compositing.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { McRDSolver } from '../utils/solver';
import { GPUSimulationEngine } from '../utils/gpuSolver';
import { SimulationParams, AutomationModule, StabilizerConfig, GridDimensions, InitialSeedConfig, ContinuousSeed, ContinuousSeedData, EffectInstance, EngineMode, CustomColorConfig } from '../types';
import { DEFAULT_PARAMS, getDefaultEffects, getDefaultInitialSeeds } from '../constants';
import { processAutomation } from '../utils/automation';
import { VisualizerHandle } from '../components/Visualizer';
import { generateSeed } from '../utils/seeding';
import { applyContinuousSeeds, resetAlifeEngines } from '../utils/physics';
import { useLatestRef } from './useLatestRef';
import { injectContinuousSeedsToGPU, applyPendingBrushesToGPU, PendingBrush } from '../utils/gpuSeedInjection';

export function getInitialScreenResolution(): GridDimensions {
    if (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerHeight > 0) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const maxDim = Math.max(w, h);
        const scale = maxDim > 1500 ? (1500 / maxDim) : 1.0;
        const targetW = Math.round(w * scale);
        const targetH = Math.round(h * scale);
        const evenW = targetW % 2 === 0 ? targetW : targetW + 1;
        const evenH = targetH % 2 === 0 ? targetH : targetH + 1;
        return { width: Math.max(100, evenW), height: Math.max(100, evenH) };
    }
    return { width: 400, height: 400 };
}

export function getInitialLaunchSeedConfig(): InitialSeedConfig {
    return {
        type: 'perlin',
        intensity: 1.0,
        seedTarget: { u: 0.1, v: 0.9, w: 0.0 },
        randomThreshold: 0.005,
        perlinScale: 20,
        perlinThreshold: 0.45,
        perlinOctaves: 4,
        perlinSeed: Math.floor(Math.random() * 10000),
        perlinGradient: false,
        gridSpacingX: 20,
        gridSpacingY: 20,
        gridDotSize: 2,
        gridOffset: false,
        shapeType: 'circle',
        shapeMode: 'single',
        shapeCount: 1,
        shapeSize: 20,
        shapeHollow: false,
        shapePosX: 0.5,
        shapePosY: 0.5,
        mathExpression: 'Math.sin(x*0.1)*Math.cos(y*0.1) > 0',
        textString: 'McRD',
        textSize: 40,
        textPosX: 0.5,
        textPosY: 0.5
    };
}

export function useSimulation(
    mediaConfigRef: React.MutableRefObject<any>,
    extractFrame: (element: HTMLImageElement | HTMLVideoElement, width: number, height: number, keepAspect?: boolean) => Uint8ClampedArray | null,
    continuousSeedsRef?: React.MutableRefObject<ContinuousSeed[]>,
    customColorConfigRef?: React.MutableRefObject<CustomColorConfig>
) {
    const [engineMode, setEngineModeState] = useState<EngineMode>('gpu');
    const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
    const [effects, setEffects] = useState<EffectInstance[]>(getDefaultEffects);
    const [gridSize, setGridSize] = useState<GridDimensions>(getInitialScreenResolution);
    const [speed, setSpeed] = useState(1);
    const [isRunning, setIsRunning] = useState(true);
    const [automationModules, setAutomationModules] = useState<AutomationModule[]>([]);

    const [stabilizeConfig, setStabilizeConfig] = useState<StabilizerConfig>({
        enabled: false, targetDensity: 6.0, strength: 1.0,
        adjustKOff: true, adjustKRec: true, adjustKOn: false, adjustFeed: false
    });

    const [seedConfig, setSeedConfig] = useState<InitialSeedConfig>(getInitialLaunchSeedConfig);

    const [moduleOutputs, setModuleOutputs] = useState<Record<string, number>>({});
    const [targetOutputs, setTargetOutputs] = useState<Record<string, number>>({});
    const [automatedParams, setAutomatedParams] = useState<Record<string, number>>({});
    const [sampleData, setSampleData] = useState<{ m: number, c: number }[]>([]);

    const solverRef = useRef<McRDSolver>(null as unknown as McRDSolver);
    if (!solverRef.current) {
        solverRef.current = new McRDSolver(gridSize.width, gridSize.height);
    }

    // Hardware WebGL2 GPU Simulation Engine
    const gpuSolverRef = useRef<GPUSimulationEngine | null>(null);
    useEffect(() => {
        try {
            const gpu = new GPUSimulationEngine(gridSize.width, gridSize.height);
            if (gpu.isSupported) {
                gpuSolverRef.current = gpu;
                gpu.uploadBuffers(solverRef.current.u, solverRef.current.v, solverRef.current.w);
            }
        } catch (err) {
            console.warn('[useSimulation] WebGL2 GPUSimulationEngine init failed, fallback to CPU solver:', err);
            gpuSolverRef.current = null;
        }
        return () => {
            if (gpuSolverRef.current) {
                gpuSolverRef.current.destroy();
                gpuSolverRef.current = null;
            }
        };
    }, []);

    // Dedicated Web Worker for Background Simulation & Zero-Copy RGBA Blitting
    const workerRef = useRef<Worker | null>(null);
    const workerAwaitingRef = useRef<boolean>(false);
    const pendingBrushesRef = useRef<PendingBrush[]>([]);

    useEffect(() => {
        try {
            const worker = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), { type: 'module' });
            workerRef.current = worker;

            worker.postMessage({
                type: 'INIT',
                width: gridSize.width,
                height: gridSize.height,
                totalDensity: paramsRef.current.totalDensity,
                skipSeeding: true
            });

            worker.onmessage = (e: MessageEvent) => {
                const msg = e.data;
                if (!msg) return;
                if (msg.type === 'STEP_DONE') {
                    workerAwaitingRef.current = false;
                    if (msg.rgbaBuffer) {
                        visualizerRef.current?.setWorkerRawBuffer(msg.rgbaBuffer, msg.width, msg.height);
                        visualizerRef.current?.drawNow();
                    }
                    if (solverRef.current) {
                        solverRef.current.tick = msg.tick;
                        solverRef.current.meanU = msg.meanU;
                        solverRef.current.meanV = msg.meanV;
                        solverRef.current.meanW = msg.meanW;
                    }
                }
            };
        } catch (e) {
            console.warn("Web Worker creation fallback to Direct CPU mode:", e);
        }

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []);

    const simTimeRef = useRef(0);
    const paramsRef = useLatestRef(params);
    const effectsRef = useLatestRef(effects);
    const visualizerRef = useRef<VisualizerHandle>(null);
    const requestRef = useRef<number>(0);
    const seedConfigRef = useLatestRef(seedConfig);
    const engineModeRef = useLatestRef(engineMode);

    const lastUiUpdateRef = useRef(0);
    const lastSampleRef = useRef(0);
    const proceduralSeedCacheRef = useRef<Record<string, { configCacheStr: string, data: Float32Array, lastGenerated: number }>>({});

    // Seamless Engine Mode Switcher with buffer sync
    const setEngineMode = useCallback((newMode: EngineMode) => {
        if (newMode === engineModeRef.current) return;

        if (engineModeRef.current === 'gpu' && gpuSolverRef.current && gpuSolverRef.current.isSupported) {
            gpuSolverRef.current.readbackBuffers(solverRef.current.u, solverRef.current.v, solverRef.current.w);
        }

        if (newMode === 'gpu' && gpuSolverRef.current && gpuSolverRef.current.isSupported) {
            gpuSolverRef.current.uploadBuffers(solverRef.current.u, solverRef.current.v, solverRef.current.w);
        }

        if (newMode === 'worker' && workerRef.current) {
            workerRef.current.postMessage({
                type: 'SYNC_BUFFERS',
                width: solverRef.current.width,
                height: solverRef.current.height,
                u: solverRef.current.u,
                v: solverRef.current.v,
                w: solverRef.current.w,
                totalDensity: paramsRef.current.totalDensity,
                colorMap: paramsRef.current.colorMap,
                rgbPostProcessing: paramsRef.current.rgbPostProcessing
            });
        }

        setEngineModeState(newMode);
        visualizerRef.current?.drawNow();
    }, []);

    useEffect(() => {
        if (automationModules.length === 0) {
            setAutomatedParams({});
            setModuleOutputs({});
            setTargetOutputs({});
        }
    }, [automationModules]);

    const lastResizedGridRef = useRef({ width: 200, height: 200 });

    useEffect(() => {
        if (lastResizedGridRef.current.width !== gridSize.width || lastResizedGridRef.current.height !== gridSize.height) {
            lastResizedGridRef.current = { width: gridSize.width, height: gridSize.height };
            solverRef.current.resize(gridSize.width, gridSize.height, params.totalDensity);
            if (gpuSolverRef.current) {
                gpuSolverRef.current.resize(gridSize.width, gridSize.height);
                gpuSolverRef.current.uploadBuffers(solverRef.current.u, solverRef.current.v, solverRef.current.w);
            }
            if (workerRef.current) {
                workerRef.current.postMessage({
                    type: 'RESIZE',
                    width: gridSize.width,
                    height: gridSize.height,
                    totalDensity: params.totalDensity
                });
                workerRef.current.postMessage({
                    type: 'SYNC_BUFFERS',
                    width: gridSize.width,
                    height: gridSize.height,
                    u: solverRef.current.u,
                    v: solverRef.current.v,
                    w: solverRef.current.w,
                    totalDensity: params.totalDensity,
                    colorMap: params.colorMap,
                    rgbPostProcessing: params.rgbPostProcessing
                });
            }
        }
    }, [gridSize, params.totalDensity, params.colorMap, params.rgbPostProcessing]);

    // Sync Video Playback Speed
    useEffect(() => {
        const media = mediaConfigRef.current;
        if (media && media.type === 'video' && media.element) {
            const vid = media.element as HTMLVideoElement;
            if (Math.abs(vid.playbackRate - media.playbackSpeed) > 0.01) {
                vid.playbackRate = media.playbackSpeed;
            }
        }
    });

    // Sync Video Playback with Simulation State (Main media + all continuous video/webcam seeds)
    useEffect(() => {
        const media = mediaConfigRef.current;
        if (media && media.type === 'video' && media.element) {
            const vid = media.element as HTMLVideoElement;
            if (isRunning) {
                vid.play().catch(() => { });
            } else {
                vid.pause();
            }
        }
        if (continuousSeedsRef?.current) {
            for (const seed of continuousSeedsRef.current) {
                if (seed.mediaConfig?.element && (seed.type === 'video' || seed.type === 'webcam')) {
                    const vid = seed.mediaConfig.element as HTMLVideoElement;
                    if (isRunning) {
                        vid.play().catch(() => { });
                    } else {
                        vid.pause();
                    }
                }
            }
        }
    }, [isRunning, mediaConfigRef, continuousSeedsRef]);

    // Reset simulation grid and apply starting seeds
    const reset = useCallback((overrideSeeds?: ContinuousSeed[], overrideParams?: SimulationParams, overrideEffects?: EffectInstance[]) => {
        if (overrideParams) {
            paramsRef.current = overrideParams;
        }
        if (overrideEffects) {
            effectsRef.current = overrideEffects;
        }
        if (overrideSeeds && continuousSeedsRef) {
            continuousSeedsRef.current = overrideSeeds;
        }

        const currentMedia = mediaConfigRef.current;
        const currentParams = (overrideParams && typeof overrideParams === 'object' && 'feedRate' in overrideParams)
            ? overrideParams
            : paramsRef.current;
        const currentEffects = Array.isArray(overrideEffects)
            ? overrideEffects
            : (effectsRef.current || []);
        const validSeeds = Array.isArray(overrideSeeds)
            ? overrideSeeds
            : (continuousSeedsRef?.current && continuousSeedsRef.current.length > 0 ? continuousSeedsRef.current : getDefaultInitialSeeds());
        const allSeeds = validSeeds;
        const startingSeeds = allSeeds.filter(s => s && s.enabled && s.isStartingSeed);

        const injectCSeeds = () => {
            if (allSeeds.length > 0) {
                const cSeedsData: ContinuousSeedData[] = [];
                const w = solverRef.current.width;
                const h = solverRef.current.height;
                const isRGB = currentParams.colorMap === 'rgb' || currentParams.colorMap === 'custom';
                for (const seed of allSeeds) {
                    if (!seed.enabled || seed.isStartingSeed) continue;
                    let data: Float32Array | Uint8ClampedArray | null = null;
                    if (seed.type === 'video' || seed.type === 'image' || seed.type === 'webcam') {
                        if (seed.mediaConfig?.element) data = extractFrame(seed.mediaConfig.element, w, h, seed.mediaConfig.keepAspect);
                    } else if (seed.seedConfig) {
                        data = generateSeed(w, h, seed.seedConfig);
                    }
                    if (data) cSeedsData.push({ seed, data, width: w, height: h, isRGB });
                }
                if (cSeedsData.length > 0) {
                    applyContinuousSeeds(solverRef.current, currentParams.totalDensity, cSeedsData, 1);
                }
            }
        };

        solverRef.current.initialize(currentParams.totalDensity, true);
        simTimeRef.current = 0;
        resetAlifeEngines(solverRef.current.width, solverRef.current.height);

        const hasMediaSeed = !!(currentMedia && currentMedia.seedOnReset);

        if (hasMediaSeed && currentMedia.element) {
            const data = extractFrame(currentMedia.element, solverRef.current.width, solverRef.current.height, currentMedia.keepAspect);
            if (data) {
                solverRef.current.importImage(data, solverRef.current.width, solverRef.current.height, currentParams.totalDensity, currentParams.colorMap === 'rgb' || currentParams.colorMap === 'custom');
            }
        } else if (startingSeeds.length > 0) {
            const w = solverRef.current.width;
            const h = solverRef.current.height;
            const isRGB = currentParams.colorMap === 'rgb' || currentParams.colorMap === 'custom';
            const startSeedsData: ContinuousSeedData[] = [];
            for (const s of startingSeeds) {
                let data: Float32Array | Uint8ClampedArray | null = null;
                if (s.type === 'video' || s.type === 'image' || s.type === 'webcam') {
                    if (s.mediaConfig?.element) data = extractFrame(s.mediaConfig.element, w, h, s.mediaConfig.keepAspect);
                } else if (s.seedConfig) {
                    const cfg = { ...s.seedConfig };
                    if (cfg.type === 'perlin') cfg.perlinSeed = Math.random() * 10000;
                    data = generateSeed(w, h, cfg);
                }
                if (data) startSeedsData.push({ seed: s, data, width: w, height: h, isRGB });
            }
            if (startSeedsData.length > 0) {
                applyContinuousSeeds(solverRef.current, currentParams.totalDensity, startSeedsData, 1);
            }
        }

        injectCSeeds();

        // Upload initial state to GPU and Worker
        if (gpuSolverRef.current && gpuSolverRef.current.isSupported) {
            gpuSolverRef.current.resetAlife();
            gpuSolverRef.current.uploadBuffers(solverRef.current.u, solverRef.current.v, solverRef.current.w);
            // Run initial step so active physics modes and effects immediately influence the starting seed (even on pause)
            gpuSolverRef.current.stepSimulation(currentParams, currentEffects);
        } else {
            solverRef.current.stepOptimized(currentParams, undefined, undefined, currentEffects);
        }
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'SYNC_BUFFERS',
                width: solverRef.current.width,
                height: solverRef.current.height,
                u: solverRef.current.u,
                v: solverRef.current.v,
                w: solverRef.current.w,
                totalDensity: currentParams.totalDensity,
                colorMap: currentParams.colorMap,
                rgbPostProcessing: currentParams.rgbPostProcessing
            });
        }

        visualizerRef.current?.drawNow();
    }, [extractFrame, mediaConfigRef, continuousSeedsRef, paramsRef, effectsRef]);

    const hasInitialReset = useRef(false);
    useEffect(() => {
        if (!hasInitialReset.current) {
            hasInitialReset.current = true;
            const hash = typeof window !== 'undefined' ? window.location.hash : '';
            // If preset hash is present, App.tsx handleHash will handle initial reset with decoded seeds
            if (!hash || (!hash.startsWith('#/preset=') && !hash.startsWith('#preset='))) {
                reset();
            }
        }
    }, [reset]);

    // Unified Brush / Perturb interaction supporting CPU, GPU, and Worker
    const perturb = useCallback((x: number, y: number, amount: number, radius: number, pType: any, brushType: any, rgbColor?: any, boundaryType?: any) => {
        // 1. Direct CPU Solver execution for instant 0ms visual feedback
        solverRef.current.perturb(x, y, amount, radius, pType, brushType, rgbColor, boundaryType);

        // 2. Hardware GPU injection if in GPU mode
        if (engineModeRef.current === 'gpu' && gpuSolverRef.current && gpuSolverRef.current.isSupported) {
            const targetU = rgbColor ? (rgbColor.r / 255) * 6 : (pType === 'remove' ? 0 : 6.0);
            const targetV = rgbColor ? (rgbColor.g / 255) * 6 : 0.0;
            const targetW = rgbColor ? (rgbColor.b / 255) * 6 : 0.0;
            const isPeriodic = boundaryType === 'periodic' || boundaryType === undefined;
            gpuSolverRef.current.injectBrush(
                x, y, radius, amount, targetU, targetV, targetW,
                pType === 'remove' ? 1 : 0,
                brushType,
                isPeriodic ? 0 : 1
            );
        }

        // 3. Worker queue if in Worker mode
        if (engineModeRef.current === 'worker' && workerRef.current) {
            pendingBrushesRef.current.push({ x, y, amount, radius, pType, brushType, rgbColor, boundaryType });
        }

        visualizerRef.current?.drawNow();
    }, []);

    const stepManual = useCallback(() => {
        const currentMedia = mediaConfigRef.current;
        if (currentMedia && currentMedia.type === 'video' && currentMedia.element) {
            const vid = currentMedia.element as HTMLVideoElement;
            vid.currentTime = Math.min(vid.duration, vid.currentTime + (1 / 60) * currentMedia.playbackSpeed);
        }
        if (engineModeRef.current === 'gpu' && gpuSolverRef.current && gpuSolverRef.current.isSupported) {
            gpuSolverRef.current.stepSimulation(paramsRef.current, effectsRef.current);
        } else {
            solverRef.current!.stepOptimized(paramsRef.current, undefined, undefined, effectsRef.current);
        }
        visualizerRef.current?.drawNow();
    }, [mediaConfigRef, paramsRef, effectsRef]);

    // Main Simulation Loop
    const loop = useCallback(() => {
        if (isRunning) {
            simTimeRef.current += 1 / 60;
        }

        // Automation Processing
        const { nextParams, moduleOutputs: outputs, targetOutputs: tOutputs } = processAutomation(automationModules, paramsRef.current, simTimeRef.current);

        const currentlyAutomated: Record<string, number> = {};
        const paramAcc: Record<string, number> = {};

        let mediaOpacityAcc = 0;
        let hasMediaOpacityAutomation = false;

        automationModules.forEach(mod => {
            mod.targets.forEach(t => {
                currentlyAutomated[t.paramKey] = (nextParams as unknown as Record<string, number>)[t.paramKey];
                paramAcc[t.paramKey] = (paramAcc[t.paramKey] || 0) + (tOutputs[`${mod.id}_${t.id}`] || 0);

                if (t.paramKey === 'mediaOpacity') {
                    const val = tOutputs[`${mod.id}_${t.id}`] || 0;
                    mediaOpacityAcc += val;
                    hasMediaOpacityAutomation = true;
                }
            });
        });

        if (hasMediaOpacityAutomation && mediaConfigRef.current) {
            currentlyAutomated['mediaOpacity'] = Math.max(0, Math.min(1, mediaConfigRef.current.opacity + mediaOpacityAcc));
        }

        const currentEffects = effectsRef.current || [];
        const nextEffects: EffectInstance[] = currentEffects.map(eff => {
            const copy = { ...eff, params: { ...eff.params } };
            const prefix = `fx_${eff.id}_`;

            for (const key in paramAcc) {
                if (key.startsWith(prefix)) {
                    const subParam = key.substring(prefix.length);
                    const rawVal = eff.params[subParam];
                    const originalVal = typeof rawVal === 'number' ? rawVal : (subParam === 'gridCoupling' ? 1.0 : (subParam === 'influence' ? 1.0 : 0.0));
                    const modified = originalVal + paramAcc[key];
                    copy.params[subParam] = modified;
                    currentlyAutomated[key] = modified;
                }
            }
            return copy;
        });

        const now = performance.now();
        if (now - lastUiUpdateRef.current > 80) {
            if (automationModules.length > 0) {
                setModuleOutputs(outputs);
                setTargetOutputs(tOutputs);
                setAutomatedParams(currentlyAutomated);
            }
            lastUiUpdateRef.current = now;
        }

        // Continuous Seeds & Seed Modulation Processing
        const cSeedsData: ContinuousSeedData[] = [];
        if (continuousSeedsRef?.current) {
            const cSeeds = continuousSeedsRef.current;
            for (const seed of cSeeds) {
                if (!seed.enabled) continue;

                const s = { ...seed };
                s.blendIf = { ...seed.blendIf, points: [...seed.blendIf.points.map(p => ({ ...p }))] };
                if (seed.seedConfig) s.seedConfig = { ...seed.seedConfig, seedTarget: { ...(seed.seedConfig.seedTarget || { u: 0.1, v: 0.9, w: 0 }) } };

                const processSeedParam = (baseKey: string, currentVal: number, min?: number, max?: number) => {
                    const acc = paramAcc[`cseed_${s.id}_${baseKey}`];
                    if (acc !== undefined) {
                        let newVal = currentVal + acc;
                        if (min !== undefined) newVal = Math.max(min, newVal);
                        if (max !== undefined) newVal = Math.min(max, newVal);
                        currentlyAutomated[`cseed_${s.id}_${baseKey}`] = newVal;
                        return newVal;
                    }
                    return currentVal;
                };

                s.opacity = processSeedParam('opacity', s.opacity, 0, 1.0);
                s.x = processSeedParam('x', s.x, -1, 1.0);
                s.y = processSeedParam('y', s.y, -1, 1.0);
                s.scaleX = processSeedParam('scaleX', s.scaleX, 0);
                s.scaleY = processSeedParam('scaleY', s.scaleY, 0);
                s.rotation = processSeedParam('rotation', s.rotation);

                if (s.blendIf) {
                    s.blendIf.smoothness = processSeedParam('blendIf_smoothness', s.blendIf.smoothness, 0.01, 1.0);
                    s.blendIf.points[0].pos = processSeedParam('blendIf_low', s.blendIf.points[0].pos, 0, 1.0);
                    s.blendIf.points[1].pos = processSeedParam('blendIf_high', s.blendIf.points[1].pos, 0, 1.0);
                }

                if (s.seedConfig) {
                    for (const key in paramAcc) {
                        if (key.startsWith(`cseed_${s.id}_seedConfig_`)) {
                            const subKey = key.substring(`cseed_${s.id}_seedConfig_`.length);
                            if (subKey.startsWith('seedTarget.')) {
                                const prop = subKey.substring('seedTarget.'.length) as 'u' | 'v' | 'w';
                                if (s.seedConfig.seedTarget && typeof s.seedConfig.seedTarget[prop] === 'number') {
                                    const result = Math.max(0, s.seedConfig.seedTarget[prop] + paramAcc[key]);
                                    s.seedConfig.seedTarget[prop] = result;
                                    currentlyAutomated[key] = result;
                                }
                            } else if (subKey.startsWith('seedTarget_')) {
                                const prop = subKey.substring('seedTarget_'.length) as 'u' | 'v' | 'w';
                                if (s.seedConfig.seedTarget && typeof s.seedConfig.seedTarget[prop] === 'number') {
                                    const result = Math.max(0, s.seedConfig.seedTarget[prop] + paramAcc[key]);
                                    s.seedConfig.seedTarget[prop] = result;
                                    currentlyAutomated[key] = result;
                                }
                            } else {
                                const currentVal = s.seedConfig[subKey];
                                if (typeof currentVal === 'number') {
                                    const result = currentVal + paramAcc[key];
                                    s.seedConfig[subKey] = result;
                                    currentlyAutomated[key] = result;
                                }
                            }
                        }
                    }
                }

                // If seed is marked as starting seed or has 0 opacity, do not inject continuously
                if (s.isStartingSeed || s.opacity <= 0.0001) continue;

                let data: Float32Array | Uint8ClampedArray | null = null;
                const w = solverRef.current.width;
                const h = solverRef.current.height;
                const isRGB = nextParams.colorMap === 'rgb' || nextParams.colorMap === 'custom';

                if (s.type === 'video' || s.type === 'image' || s.type === 'webcam') {
                    if (s.mediaConfig?.element) {
                        data = extractFrame(s.mediaConfig.element, w, h, s.mediaConfig.keepAspect);
                        if (s.type === 'video') {
                            const vid = s.mediaConfig.element as HTMLVideoElement;
                            if (vid.playbackRate !== s.mediaConfig.playbackSpeed) {
                                vid.playbackRate = s.mediaConfig.playbackSpeed;
                            }
                        }
                    }
                } else if (s.seedConfig) {
                    const sc = s.seedConfig;
                    const configKey = `${sc.type}_${sc.intensity}_${sc.randomThreshold}_${sc.perlinScale}_${sc.perlinThreshold}_${sc.perlinOctaves}_${sc.perlinSeed}_${sc.perlinGradient}_${sc.gridSpacingX}_${sc.gridSpacingY}_${sc.gridDotSize}_${sc.gridOffset}_${sc.shapeType}_${sc.shapeMode}_${sc.shapeCount}_${sc.shapeSize}_${sc.shapeHollow}_${sc.shapePosX}_${sc.shapePosY}_${sc.mathExpression}_${sc.textString}_${sc.textSize}_${sc.textPosX}_${sc.textPosY}_${sc.seedTarget?.u}_${sc.seedTarget?.v}_${sc.seedTarget?.w}_${w}_${h}`;
                    const cacheEntry = proceduralSeedCacheRef.current[s.id];
                    if (cacheEntry && cacheEntry.configCacheStr === configKey) {
                        data = cacheEntry.data;
                    } else if (cacheEntry && now - cacheEntry.lastGenerated < 33) {
                        // Maintain 30fps max generation rate for smooth 60fps frametime
                        data = cacheEntry.data;
                    } else {
                        data = generateSeed(w, h, s.seedConfig);
                        proceduralSeedCacheRef.current[s.id] = { configCacheStr: configKey, data, lastGenerated: now };
                    }
                }

                if (data) {
                    cSeedsData.push({ seed: s, data, width: w, height: h, isRGB });
                }
            }
        }

        // Media Input Frame Extraction
        const solver = solverRef.current;
        const currentMedia = mediaConfigRef.current;
        let videoData: { data: Uint8ClampedArray; width: number; height: number; opacity: number; isRGB: boolean } | undefined = undefined;

        if (currentMedia) {
            let effectiveOpacity = currentMedia.opacity;
            if (hasMediaOpacityAutomation) {
                effectiveOpacity = Math.max(0, Math.min(1, mediaConfigRef.current.opacity + mediaOpacityAcc));
            }

            if (effectiveOpacity > 0.0001 && currentMedia.element) {
                const data = extractFrame(currentMedia.element, solver.width, solver.height);
                if (data) {
                    videoData = {
                        data,
                        width: solver.width,
                        height: solver.height,
                        opacity: effectiveOpacity,
                        isRGB: nextParams.colorMap === 'rgb' || nextParams.colorMap === 'custom'
                    };
                }
            }
        }

        if (isRunning) {
            const currentMode = engineModeRef.current;

            // 1. Hardware WebGL2 GPU Acceleration Path (60+ FPS on VRAM)
            if (currentMode === 'gpu' && gpuSolverRef.current && gpuSolverRef.current.isSupported) {
                const gpuSolver = gpuSolverRef.current;
                const totalDensity = nextParams.totalDensity || 6.0;

                const activeCSeeds = cSeedsData.filter(cs => cs.seed.opacity > 0.0001);

                // Continuous Seeds & Video Injection on GPU: Zero-readback native WebGL2 injection
                injectContinuousSeedsToGPU(gpuSolver, activeCSeeds, totalDensity, videoData);

                // Apply any queued brushes to GPU
                if (pendingBrushesRef.current.length > 0) {
                    applyPendingBrushesToGPU(gpuSolver, pendingBrushesRef.current);
                    pendingBrushesRef.current = [];
                }

                for (let i = 0; i < speed; i++) {
                    gpuSolver.stepSimulation(nextParams, nextEffects);
                }
                visualizerRef.current?.drawNow();
            }
            // 2. Web Worker Multithreading Path with Background RGBA Rendering (<0.2ms main thread)
            else if (currentMode === 'worker' && workerRef.current && !workerAwaitingRef.current) {
                workerAwaitingRef.current = true;
                const stepVideoData = videoData ? {
                    ...videoData,
                    opacity: videoData.opacity / Math.max(1, speed)
                } : undefined;

                const brushesToApply = pendingBrushesRef.current.slice();
                pendingBrushesRef.current = [];

                workerRef.current.postMessage({
                    type: 'STEP',
                    params: nextParams,
                    videoData: stepVideoData,
                    continuousSeedsData: cSeedsData,
                    effects: nextEffects,
                    speed,
                    brushes: brushesToApply,
                    customColorConfig: customColorConfigRef?.current,
                    rgbPostProcessing: nextParams.rgbPostProcessing
                });
            }
            // 3. Direct CPU Main Thread Path (Synchronous)
            else if (currentMode === 'cpu') {
                if (stabilizeConfig.enabled) {
                    solver.getStats(5000);
                }

                const stepVideoData = videoData ? {
                    ...videoData,
                    opacity: videoData.opacity / Math.max(1, speed)
                } : undefined;

                for (let i = 0; i < speed; i++) {
                    solver.stepOptimized(nextParams, stepVideoData, cSeedsData, nextEffects);
                }

                if (now - lastSampleRef.current > 2000) {
                    const samples = [];
                    for (let k = 0; k < 30; k++) {
                        const idx = Math.floor(Math.random() * solver.u.length);
                        samples.push({ m: solver.u[idx], c: solver.v[idx] });
                    }
                    setSampleData(samples);
                    lastSampleRef.current = now;
                }
            }
        } else {
            // Live brush interaction path while paused
            const hasPendingBrushes = pendingBrushesRef.current.length > 0;

            if (hasPendingBrushes) {
                const currentMode = engineModeRef.current;
                if (currentMode === 'gpu' && gpuSolverRef.current && gpuSolverRef.current.isSupported) {
                    const gpuSolver = gpuSolverRef.current;
                    applyPendingBrushesToGPU(gpuSolver, pendingBrushesRef.current);
                    pendingBrushesRef.current = [];
                    gpuSolver.stepSimulation(nextParams, nextEffects);
                    visualizerRef.current?.drawNow();
                } else if (currentMode === 'cpu') {
                    pendingBrushesRef.current = [];
                    solver.stepOptimized(nextParams, undefined, undefined, nextEffects);
                    visualizerRef.current?.drawNow();
                }
            }
        }

        requestRef.current = requestAnimationFrame(loop);
    }, [isRunning, speed, stabilizeConfig, automationModules, extractFrame, mediaConfigRef, paramsRef, effectsRef, continuousSeedsRef, customColorConfigRef]);

    return {
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
        solver: solverRef.current!,
        gpuSolver: gpuSolverRef.current,
        visualizerRef,
        loop, requestRef, reset, simTimeRef, paramsRef, effectsRef, engineModeRef,
        stepManual, perturb,
        seedConfig, setSeedConfig,
        seedConfigRef
    };
}
