import { GPUSimulationEngine } from './gpuSolver';
import { ContinuousSeedData } from '../types';

export interface PendingBrush {
  x: number;
  y: number;
  radius: number;
  amount: number;
  pType: 'inject' | 'remove' | 'smudge';
  brushType: 'circle' | 'square' | 'gaussian' | 'splatter';
  rgbColor?: { r: number; g: number; b: number };
  boundaryType?: 'periodic' | 'open' | 'closed';
}

export function injectContinuousSeedsToGPU(
  gpuSolver: GPUSimulationEngine,
  activeSeeds: ContinuousSeedData[],
  totalDensity: number,
  videoData?: { data: Uint8ClampedArray; width: number; height: number; opacity: number; isRGB: boolean }
): void {
  if (activeSeeds.length > 0) {
    for (const cs of activeSeeds) {
      if (cs.seed.opacity <= 0.0001) continue;
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

  if (videoData && videoData.opacity > 0.0001) {
    gpuSolver.injectContinuousSeed(
      videoData.data,
      videoData.width,
      videoData.height,
      videoData.isRGB,
      true, // isUint8
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
}

export function applyPendingBrushesToGPU(
  gpuSolver: GPUSimulationEngine,
  brushes: PendingBrush[]
): void {
  for (const b of brushes) {
    const targetU = b.rgbColor ? (b.rgbColor.r / 255) * 6 : (b.pType === 'remove' ? 0 : 6.0);
    const targetV = b.rgbColor ? (b.rgbColor.g / 255) * 6 : 0.0;
    const targetW = b.rgbColor ? (b.rgbColor.b / 255) * 6 : 0.0;
    const isPeriodic = b.boundaryType === 'periodic' || b.boundaryType === undefined;

    gpuSolver.injectBrush(
      b.x,
      b.y,
      b.radius,
      b.amount,
      targetU,
      targetV,
      targetW,
      b.pType === 'remove' ? 1 : 0,
      b.brushType,
      isPeriodic ? 0 : 1
    );
  }
}
