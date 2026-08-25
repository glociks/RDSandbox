import React, { useState, useRef, useCallback, useEffect } from 'react';
import { VideoRecorder } from '../utils/videoRecorder';
import { processAutomation } from '../utils/automation';
import { generateSeed } from '../utils/seeding';
import { applyContinuousSeeds } from '../utils/physics';
import { McRDSolver } from '../utils/solver';
import { GPUSimulationEngine } from '../utils/gpuSolver';
import { VisualizerHandle } from '../components/Visualizer';
import {
    MediaConfig,
    SimulationParams,
    EffectInstance,
    AutomationModule,
    InitialSeedConfig,
    ContinuousSeed,
    ContinuousSeedData,
    EngineMode,
    CustomColorConfig,
    RenderConfig
} from '../types';

export function useRenderer(
    solver: McRDSolver,
    gpuSolver: GPUSimulationEngine | null,
    visualizerRef: React.RefObject<VisualizerHandle | null>,
    mediaConfigRef: React.MutableRefObject<MediaConfig | null>,
    paramsRef: React.MutableRefObject<SimulationParams>,
    effectsRef: React.MutableRefObject<EffectInstance[]>,
    automationModules: AutomationModule[],
    extractFrame: (element: HTMLImageElement | HTMLVideoElement, width: number, height: number, keepAspect?: boolean) => Uint8ClampedArray | null,
    setIsRunning: React.Dispatch<React.SetStateAction<boolean>>,
    simTimeRef: React.MutableRefObject<number>,
    seedConfigRef: React.MutableRefObject<InitialSeedConfig>,
    continuousSeedsRef: React.MutableRefObject<ContinuousSeed[]>,
    engineModeRef?: React.MutableRefObject<EngineMode>,
    customColorConfigRef?: React.MutableRefObject<CustomColorConfig>
) {
    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState({ current: 0, total: 0 });
    const [showRenderModal, setShowRenderModal] = useState(false);

    const automationModulesRef = useRef<AutomationModule[]>(automationModules);
    useEffect(() => {
        automationModulesRef.current = automationModules;
    }, [automationModules]);

    const renderStateRef = useRef<{
        active: boolean;
        config: RenderConfig | null;
        currentFrame: number;
        recorder: VideoRecorder | null;
    }>({ active: false, config: null, currentFrame: 0, recorder: null });

    const cachedSeedMap = useRef<Map<string, Float32Array>>(new Map());

    const cancelRender = useCallback(() => {
        renderStateRef.current.active = false;
        setIsRendering(false);
        setIsRunning(false);
        setRenderProgress({ current: 0, total: 0 });
        if (renderStateRef.current.recorder) {
            renderStateRef.current.recorder = null;
        }
    }, [setIsRunning]);

    const processRenderLoop = async () => {
        if (!renderStateRef.current.active || !renderStateRef.current.config) return;

        const state = renderStateRef.current;
        const { fps, simSpeed, durationFrames } = state.config!;
        const isWarmup = state.currentFrame < 0;

        try {
            // 1. Sync Video Elements
            const promises: Promise<void>[] = [];

            const syncVid = (vid: HTMLVideoElement, playbackSpeed: number) => {
                if (!vid.paused) vid.pause();

                let targetTime = 0;
                if (state.currentFrame >= 0) {
                    targetTime = (state.currentFrame / fps) * playbackSpeed;
                }

                if (vid.duration > 0 && Number.isFinite(vid.duration)) {
                    targetTime = targetTime % vid.duration;
                }

                if (vid.readyState >= 1 && Math.abs(vid.currentTime - targetTime) > 0.01) {
                    promises.push(new Promise<void>((resolve) => {
                        let resolved = false;
                        const onSeek = () => {
                            if (!resolved) {
                                resolved = true;
                                resolve();
                            }
                        };

                        vid.addEventListener('seeked', onSeek, { once: true });

                        const timeoutId = setTimeout(() => {
                            if (!resolved) {
                                resolved = true;
                                vid.removeEventListener('seeked', onSeek);
                                resolve();
                            }
                        }, 2000);

                        try {
                            vid.currentTime = targetTime;
                        } catch (e) {
                            clearTimeout(timeoutId);
                            onSeek();
                        }
                    }));
                }
            };

            const currentMedia = mediaConfigRef.current;
            if (currentMedia && currentMedia.type === 'video' && currentMedia.element) {
                syncVid(currentMedia.element as HTMLVideoElement, currentMedia.playbackSpeed);
            }

            if (continuousSeedsRef?.current) {
                for (const seed of continuousSeedsRef.current) {
                    if (seed.enabled && seed.type === 'video' && seed.mediaConfig?.element) {
                        syncVid(seed.mediaConfig.element as HTMLVideoElement, seed.mediaConfig.playbackSpeed);
                    }
                }
            }

            if (promises.length > 0) {
                await Promise.all(promises);
            }

            // 2. Automation Processing
            simTimeRef.current += 1 / fps;
            const { nextParams, targetOutputs } = processAutomation(automationModulesRef.current, paramsRef.current, simTimeRef.current);

            let mediaOpacityAcc = 0;
            let hasMediaOpacityAutomation = false;
            const paramAcc: Record<string, number> = {};

            const mods = automationModulesRef.current;
            for (let m = 0; m < mods.length; m++) {
                const mod = mods[m];
                const targets = mod.targets;
                for (let t = 0; t < targets.length; t++) {
                    const trg = targets[t];
                    const outVal = targetOutputs[`${mod.id}_${trg.id}`] || 0;
                    paramAcc[trg.paramKey] = (paramAcc[trg.paramKey] || 0) + outVal;
                    if (trg.paramKey === 'mediaOpacity') {
                        mediaOpacityAcc += outVal;
                        hasMediaOpacityAutomation = true;
                    }
                }
            }

            // Dynamic Effect Stack Automation
            const currentEffects = effectsRef?.current || [];
            const nextEffects: EffectInstance[] = currentEffects.map((eff: EffectInstance) => {
                const copy: EffectInstance = { ...eff, params: { ...eff.params } };
                const prefix = `fx_${eff.id}_`;
                for (const key in paramAcc) {
                    if (key.startsWith(prefix)) {
                        const subParam = key.substring(prefix.length);
                        const rawVal = eff.params[subParam];
                        const originalVal = typeof rawVal === 'number' ? rawVal : (subParam === 'gridCoupling' ? 1.0 : (subParam === 'influence' ? 1.0 : 0.0));
                        copy.params[subParam] = originalVal + paramAcc[key];
                    }
                }
                return copy;
            });

            // 2.5 Continuous Seeds Processing
            const cSeedsData: ContinuousSeedData[] = [];
            if (continuousSeedsRef?.current) {
                const cSeeds = continuousSeedsRef.current;
                const w = solver.width;
                const h = solver.height;
                const isRGB = nextParams.colorMap === 'rgb' || nextParams.colorMap === 'custom';

                for (let i = 0; i < cSeeds.length; i++) {
                    const seed = cSeeds[i];
                    if (!seed.enabled || seed.isStartingSeed || seed.opacity <= 0.0001) continue;
                    const s = { ...seed };
                    s.opacity = Math.max(0, Math.min(1.0, s.opacity + (paramAcc[`cseed_${s.id}_opacity`] || 0)));
                    if (s.opacity <= 0.0001) continue;
                    s.x = Math.max(-1, Math.min(1.0, s.x + (paramAcc[`cseed_${s.id}_x`] || 0)));
                    s.y = Math.max(-1, Math.min(1.0, s.y + (paramAcc[`cseed_${s.id}_y`] || 0)));
                    s.scaleX = Math.max(0, s.scaleX + (paramAcc[`cseed_${s.id}_scaleX`] || 0));
                    s.scaleY = Math.max(0, s.scaleY + (paramAcc[`cseed_${s.id}_scaleY`] || 0));
                    s.rotation = s.rotation + (paramAcc[`cseed_${s.id}_rotation`] || 0);

                    let data: Float32Array | Uint8ClampedArray | null = null;

                    if (s.type === 'video' || s.type === 'image' || s.type === 'webcam') {
                        if (s.mediaConfig?.element) {
                            data = extractFrame(s.mediaConfig.element, w, h, s.mediaConfig.keepAspect);
                        }
                    } else if (s.seedConfig) {
                        data = generateSeed(w, h, s.seedConfig);
                    }

                    if (data) {
                        cSeedsData.push({ seed: s, data, width: w, height: h, isRGB });
                    }
                }
            }

            // 3. Prepare Video Data
            let videoData: { data: Uint8ClampedArray; width: number; height: number; opacity: number; isRGB: boolean } | undefined = undefined;
            if (currentMedia) {
                let effectiveOpacity = currentMedia.opacity;
                if (hasMediaOpacityAutomation) {
                    effectiveOpacity = Math.max(0, Math.min(1.0, currentMedia.opacity + mediaOpacityAcc));
                }

                if (effectiveOpacity > 0.0001 && currentMedia.element) {
                    const data = extractFrame(currentMedia.element, solver.width, solver.height);
                    if (data) {
                        videoData = {
                            data,
                            width: solver.width,
                            height: solver.height,
                            opacity: effectiveOpacity / Math.max(1, simSpeed),
                            isRGB: nextParams.colorMap === 'rgb' || nextParams.colorMap === 'custom'
                        };
                    }
                }
            }

            // 4. Run Physics Steps with GPU or CPU Engine
            const currentEngineMode = engineModeRef?.current || 'gpu';
            if (currentEngineMode === 'gpu' && gpuSolver && gpuSolver.isSupported) {
                const totalDensity = nextParams.totalDensity || 6.0;
                const activeCSeeds = cSeedsData.filter((cs: ContinuousSeedData) => cs.seed.opacity > 0.0001);
                const hasActiveVideo = !!(videoData && videoData.opacity > 0.0001);

                if (activeCSeeds.length > 0) {
                    for (const cs of activeCSeeds) {
                        const isUint8 = cs.data instanceof Uint8ClampedArray;
                        const blendMode = cs.seed.blendMode || 'replace';
                        const targetU = cs.seed.seedConfig?.seedTarget?.u ?? 1.0;
                        const targetV = cs.seed.seedConfig?.seedTarget?.v ?? 0.0;
                        const targetW = cs.seed.seedConfig?.seedTarget?.w ?? 0.0;
                        gpuSolver.injectContinuousSeed(
                            cs.data,
                            cs.width,
                            cs.height,
                            cs.isRGB,
                            isUint8,
                            cs.seed.opacity,
                            cs.seed.x ?? 0,
                            cs.seed.y ?? 0,
                            cs.seed.scaleX ?? 1.0,
                            cs.seed.scaleY ?? 1.0,
                            cs.seed.rotation ?? 0,
                            blendMode,
                            totalDensity,
                            targetU,
                            targetV,
                            targetW,
                            cs.seed.blendIf
                        );
                    }
                }
                if (hasActiveVideo && videoData) {
                    gpuSolver.injectContinuousSeed(
                        videoData.data,
                        videoData.width,
                        videoData.height,
                        videoData.isRGB,
                        true,
                        videoData.opacity,
                        0,
                        0,
                        1.0,
                        1.0,
                        0,
                        'replace',
                        totalDensity
                    );
                }
                for (let i = 0; i < simSpeed; i++) {
                    gpuSolver.stepSimulation(nextParams, nextEffects);
                }
            } else {
                for (let i = 0; i < simSpeed; i++) {
                    solver.stepOptimized(nextParams, videoData, cSeedsData, nextEffects);
                }
            }

            // Draw to visualizer canvas
            visualizerRef.current?.drawNow();

            // 5. Record frame only when warmup is completed
            if (!isWarmup && visualizerRef.current) {
                const simCanvas = visualizerRef.current.getSimulationCanvas();
                if (simCanvas && state.recorder?.isConfigured) {
                    await state.recorder.addFrame(simCanvas);
                }

                if (state.currentFrame % 10 === 0 || state.currentFrame === durationFrames - 1) {
                    setRenderProgress({ current: state.currentFrame, total: durationFrames });
                }
            }

            // 6. Loop Advance
            state.currentFrame++;
            if (state.currentFrame < durationFrames && state.active) {
                setTimeout(processRenderLoop, 0);
            } else {
                if (state.recorder) await state.recorder.stop(state.config?.fileName);
                setIsRendering(false);
                renderStateRef.current.active = false;
                setRenderProgress({ current: 0, total: 0 });

                setIsRunning(false);

                if (currentMedia && currentMedia.type === 'video' && currentMedia.element) {
                    (currentMedia.element as HTMLVideoElement).pause();
                }
            }

        } catch (err) {
            console.error("Render error", err);
            setIsRendering(false);
            renderStateRef.current.active = false;
            setIsRunning(false);
        }
    };

    const startRender = useCallback((config: RenderConfig) => {
        setShowRenderModal(false);
        setIsRendering(true);
        setIsRunning(false);
        cachedSeedMap.current.clear();

        const safeW = solver.width % 2 === 0 ? solver.width : solver.width - 1;
        const safeH = solver.height % 2 === 0 ? solver.height : solver.height - 1;

        const hasMediaSeed = !!(mediaConfigRef.current?.seedOnReset);
        const startingSeeds = (continuousSeedsRef?.current || []).filter((s: ContinuousSeed) => s.enabled && s.isStartingSeed);

        solver.initialize(paramsRef.current.totalDensity, true);

        if (hasMediaSeed && mediaConfigRef.current?.element) {
            const data = extractFrame(mediaConfigRef.current.element, solver.width, solver.height, mediaConfigRef.current.keepAspect);
            if (data) {
                solver.importImage(data, solver.width, solver.height, paramsRef.current.totalDensity, paramsRef.current.colorMap === 'rgb' || paramsRef.current.colorMap === 'custom');
            }
        } else if (startingSeeds.length > 0) {
            const w = solver.width;
            const h = solver.height;
            const isRGB = paramsRef.current.colorMap === 'rgb' || paramsRef.current.colorMap === 'custom';
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
                applyContinuousSeeds(solver, paramsRef.current.totalDensity, startSeedsData, 1);
            }
        }

        if (gpuSolver && gpuSolver.isSupported) {
            gpuSolver.uploadBuffers(solver.u, solver.v, solver.w);
        }

        visualizerRef.current?.drawNow();
        simTimeRef.current = 0;

        renderStateRef.current = {
            active: true,
            config: config,
            currentFrame: -config.warmupFrames,
            recorder: new VideoRecorder()
        };

        setRenderProgress({ current: 0, total: config.durationFrames });

        renderStateRef.current.recorder?.start(safeW, safeH, config.fps).then(() => {
            processRenderLoop();
        }).catch(err => {
            console.error(err);
            alert("Recording initialization failed.");
            setIsRendering(false);
            renderStateRef.current.active = false;
        });

    }, [solver, gpuSolver, continuousSeedsRef, extractFrame, mediaConfigRef, paramsRef, visualizerRef, simTimeRef]);

    return {
        isRendering,
        renderProgress,
        showRenderModal,
        setShowRenderModal,
        startRender,
        cancelRender,
        renderStateRef
    };
}
