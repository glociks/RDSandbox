/**
 * Dedicated High-Performance Web Worker for Multi-Threaded Physics Simulation & Zero-Copy RGBA Rendering.
 *
 * Computes simulation stencils on a background CPU thread and transfers
 * pre-rendered RGBA framebuffers to the main thread via Transferable ArrayBuffers (zero-copy pointer handoff).
 */

import { McRDSolver } from '../utils/solver';
import { renderGridToBuffer } from '../utils/colors';
import { SimulationParams, ContinuousSeedData, EffectInstance, CustomColorConfig, RGBPostProcessingConfig } from '../types';

export interface WorkerBrushStroke {
    x: number;
    y: number;
    amount: number;
    radius: number;
    pType: 'inject' | 'remove' | 'smudge';
    brushType: 'circle' | 'square' | 'gaussian' | 'splatter';
    rgbColor?: { r: number; g: number; b: number };
    boundaryType: 'periodic' | 'open' | 'closed';
}

export type WorkerInboundMessage =
    | { type: 'INIT'; width: number; height: number; totalDensity?: number; skipSeeding?: boolean }
    | { type: 'RESIZE'; width: number; height: number; totalDensity: number }
    | {
        type: 'STEP';
        params: SimulationParams;
        videoData?: { data: Uint8ClampedArray; width: number; height: number; opacity: number; isRGB: boolean };
        continuousSeedsData?: ContinuousSeedData[];
        effects?: EffectInstance[];
        speed: number;
        brushes?: WorkerBrushStroke[];
        customColorConfig?: CustomColorConfig;
        rgbPostProcessing?: RGBPostProcessingConfig;
    }
    | {
        type: 'PERTURB';
        x: number;
        y: number;
        amount: number;
        radius: number;
        pType: 'inject' | 'remove' | 'smudge';
        brushType: 'circle' | 'square' | 'gaussian' | 'splatter';
        rgbColor?: { r: number; g: number; b: number };
        boundaryType: 'periodic' | 'open' | 'closed';
    }
    | { type: 'IMPORT_IMAGE'; imageData: Uint8ClampedArray; imgWidth: number; imgHeight: number; totalDensity: number; isRGB: boolean }
    | { type: 'INJECT_SIGNAL'; imageData: Uint8ClampedArray; imgWidth: number; imgHeight: number; totalDensity: number; opacity: number; isRGB: boolean }
    | {
        type: 'SYNC_BUFFERS';
        width?: number;
        height?: number;
        u?: Float32Array;
        v?: Float32Array;
        w?: Float32Array;
        totalDensity?: number;
        colorMap?: SimulationParams['colorMap'];
        customColorConfig?: CustomColorConfig;
        rgbPostProcessing?: RGBPostProcessingConfig;
    };

let solver: McRDSolver | null = null;
let currentParams: SimulationParams | null = null;
let currentCustomColorConfig: CustomColorConfig | undefined = undefined;
let currentRGBPostProcessing: RGBPostProcessingConfig | undefined = undefined;

self.onmessage = (e: MessageEvent<WorkerInboundMessage>) => {
    const msg = e.data;
    if (!msg || !msg.type) return;

    switch (msg.type) {
        case 'INIT': {
            const { width, height, totalDensity = 6.0 } = msg;
            solver = new McRDSolver(width, height);
            solver.initialize(totalDensity, msg.skipSeeding);
            self.postMessage({ type: 'INIT_DONE', width, height });
            break;
        }

        case 'RESIZE': {
            const { width, height, totalDensity } = msg;
            if (solver) {
                solver.resize(width, height, totalDensity);
            } else {
                solver = new McRDSolver(width, height);
                solver.initialize(totalDensity);
            }
            self.postMessage({ type: 'RESIZE_DONE', width, height });
            break;
        }

        case 'STEP': {
            if (!solver) return;
            const { params, videoData, continuousSeedsData, effects, speed, brushes, customColorConfig, rgbPostProcessing } = msg;

            currentParams = params;
            currentCustomColorConfig = customColorConfig;
            currentRGBPostProcessing = rgbPostProcessing;

            if (brushes && brushes.length > 0) {
                for (let b = 0; b < brushes.length; b++) {
                    const br = brushes[b];
                    solver.perturb(br.x, br.y, br.amount, br.radius, br.pType, br.brushType, br.rgbColor, br.boundaryType);
                }
            }

            const stepSpeed = Math.max(1, speed || 1);
            for (let i = 0; i < stepSpeed; i++) {
                solver.stepOptimized(params, videoData, continuousSeedsData, effects);
            }

            const byteSize = solver.width * solver.height * 4;
            const rgbaBuf = new ArrayBuffer(byteSize);
            const targetBuf = new Uint8ClampedArray(rgbaBuf);

            renderGridToBuffer(
                solver.u,
                solver.v,
                solver.w,
                targetBuf,
                params.colorMap,
                customColorConfig,
                rgbPostProcessing || params.rgbPostProcessing
            );

            (self as unknown as { postMessage: (msg: unknown, transfer?: Transferable[]) => void }).postMessage({
                type: 'STEP_DONE',
                tick: solver.tick,
                meanU: solver.meanU,
                meanV: solver.meanV,
                meanW: solver.meanW,
                width: solver.width,
                height: solver.height,
                rgbaBuffer: rgbaBuf
            }, [rgbaBuf]);
            break;
        }

        case 'PERTURB': {
            if (!solver) return;
            const { x, y, amount, radius, pType, brushType, rgbColor, boundaryType } = msg;
            solver.perturb(x, y, amount, radius, pType, brushType, rgbColor, boundaryType);
            break;
        }

        case 'IMPORT_IMAGE': {
            if (!solver) return;
            const { imageData, imgWidth, imgHeight, totalDensity, isRGB } = msg;
            solver.importImage(imageData, imgWidth, imgHeight, totalDensity, isRGB);
            self.postMessage({ type: 'IMPORT_IMAGE_DONE', tick: solver.tick });
            break;
        }

        case 'INJECT_SIGNAL': {
            if (!solver) return;
            const { imageData, imgWidth, imgHeight, totalDensity, opacity, isRGB } = msg;
            solver.injectSignal(imageData, imgWidth, imgHeight, totalDensity, opacity, isRGB);
            self.postMessage({ type: 'INJECT_SIGNAL_DONE', tick: solver.tick });
            break;
        }

        case 'SYNC_BUFFERS': {
            const { width, height, u, v, w, colorMap, customColorConfig, rgbPostProcessing } = msg;
            const wVal = width || (solver ? solver.width : 200);
            const hVal = height || (solver ? solver.height : 200);

            if (customColorConfig) currentCustomColorConfig = customColorConfig;
            if (rgbPostProcessing) currentRGBPostProcessing = rgbPostProcessing;

            if (!solver || solver.width !== wVal || solver.height !== hVal) {
                solver = new McRDSolver(wVal, hVal);
            }

            if (u && v && w && u.length === solver.u.length) {
                solver.u.set(u);
                solver.v.set(v);
                solver.w.set(w);
            }

            const byteSize = solver.width * solver.height * 4;
            const syncBuf = new ArrayBuffer(byteSize);
            const syncView = new Uint8ClampedArray(syncBuf);

            renderGridToBuffer(
                solver.u,
                solver.v,
                solver.w,
                syncView,
                colorMap || (currentParams ? currentParams.colorMap : 'magma'),
                currentCustomColorConfig,
                currentRGBPostProcessing
            );

            (self as unknown as { postMessage: (msg: unknown, transfer?: Transferable[]) => void }).postMessage({
                type: 'STEP_DONE',
                tick: solver.tick,
                meanU: solver.meanU,
                meanV: solver.meanV,
                meanW: solver.meanW,
                width: solver.width,
                height: solver.height,
                rgbaBuffer: syncBuf
            }, [syncBuf]);
            break;
        }
    }
};
