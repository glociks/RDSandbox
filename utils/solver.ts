import { SimulationParams, ContinuousSeedData, EffectInstance, ColorMap, CustomColorConfig } from '../types';
import { importImage, injectSignal, perturb } from './interaction';
import { stepOptimized, resetAlifeEngines } from './physics';
import { convertScalarGridToRGB } from './colors';

/**
 * High-Performance CPU Chemistry & Physics Grid Solver.
 *
 * Implements mass-conserving activator-substrate reaction-diffusion systems,
 * multi-scale hierarchical cellular automata, and zero-copy ping-pong dual buffers.
 */
export class McRDSolver {
  width: number;
  height: number;

  // Zero-Copy Ping-Pong Dual Buffers
  _uA: Float32Array;
  _uB: Float32Array;
  _vA: Float32Array;
  _vB: Float32Array;
  _wA: Float32Array;
  _wB: Float32Array;

  // Active source pointers (exposed for public read/write)
  u: Float32Array;
  v: Float32Array;
  w: Float32Array;

  // Target destination pointers for the current computation pass
  _nextU: Float32Array;
  _nextV: Float32Array;
  _nextW: Float32Array;

  prevU: Float32Array;
  prevV: Float32Array;
  prevW: Float32Array;

  vx: Float32Array;
  vy: Float32Array;

  meanU: number = 0;
  meanV: number = 0;
  meanW: number = 0;

  fractalField: Float32Array;
  private _pyramidBuffers: Float32Array[] = [];
  tick: number = 0;
  private _activeIdx: number = 0;
  private _nextDirty: boolean = false;
  private _quiescentCached: boolean = false;
  private _quiescentLastCheckedTick: number = -100;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    const size = width * height;

    this._uA = new Float32Array(size);
    this._uB = new Float32Array(size);
    this._vA = new Float32Array(size);
    this._vB = new Float32Array(size);
    this._wA = new Float32Array(size);
    this._wB = new Float32Array(size);

    this.u = this._uA;
    this.v = this._vA;
    this.w = this._wA;

    this._nextU = this._uB;
    this._nextV = this._vB;
    this._nextW = this._wB;

    this.prevU = new Float32Array(size);
    this.prevV = new Float32Array(size);
    this.prevW = new Float32Array(size);

    this.vx = new Float32Array(size);
    this.vy = new Float32Array(size);

    this.fractalField = new Float32Array(size);

    // Pre-allocate pyramid buffers up to max depth=5 to eliminate runtime GC
    for (let d = 0; d < 5; d++) {
      this._pyramidBuffers.push(new Float32Array(Math.max(256, (size >> (2 * (d + 1))))));
    }

    this.initialize(6.0, true);
  }

  // O(1) Zero-Copy Pointer Swap
  swapBuffers() {
    this._activeIdx = 1 - this._activeIdx;
    if (this._activeIdx === 0) {
      this.u = this._uA;
      this.v = this._vA;
      this.w = this._wA;
      this._nextU = this._uB;
      this._nextV = this._vB;
      this._nextW = this._wB;
    } else {
      this.u = this._uB;
      this.v = this._vB;
      this.w = this._wB;
      this._nextU = this._uA;
      this._nextV = this._vA;
      this._nextW = this._wA;
    }
    this._nextDirty = false;
  }

  // Optimization S7: Synchronize target buffers to source buffers only if dirty/needed
  syncNextToCurrent() {
    this._nextU.set(this.u);
    this._nextV.set(this.v);
    this._nextW.set(this.w);
    this._nextDirty = false;
  }

  // Optimization S6: Reuse buffers when possible on resize to eliminate multi-megabyte allocations
  resize(width: number, height: number, totalDensity: number) {
    this.width = width;
    this.height = height;
    const size = width * height;

    if (this._uA.length !== size) {
      this._uA = new Float32Array(size);
      this._uB = new Float32Array(size);
      this._vA = new Float32Array(size);
      this._vB = new Float32Array(size);
      this._wA = new Float32Array(size);
      this._wB = new Float32Array(size);

      this.prevU = new Float32Array(size);
      this.prevV = new Float32Array(size);
      this.prevW = new Float32Array(size);
      this.vx = new Float32Array(size);
      this.vy = new Float32Array(size);
      this.fractalField = new Float32Array(size);

      // Re-allocate pyramid buffers for new size
      this._pyramidBuffers = [];
      for (let d = 0; d < 5; d++) {
        this._pyramidBuffers.push(new Float32Array(Math.max(256, (size >> (2 * (d + 1))))));
      }
    }

    this._activeIdx = 0;
    this.u = this._uA;
    this.v = this._vA;
    this.w = this._wA;
    this._nextU = this._uB;
    this._nextV = this._vB;
    this._nextW = this._wB;
    this._nextDirty = false;
    this._quiescentLastCheckedTick = -100;

    this.initialize(totalDensity);
  }

  // Optimization S1: Use engine-optimized Float32Array.fill() instead of 22M scalar assignments
  initialize(initialDensity: number = 6.0, skipSeeding: boolean = false) {
    this._uA.fill(1.0);
    this._uB.fill(1.0);
    this._vA.fill(0);
    this._vB.fill(0);
    this._wA.fill(0);
    this._wB.fill(0);
    this.prevU.fill(1.0);
    this.prevV.fill(0);
    this.prevW.fill(0);
    this.vx.fill(0);
    this.vy.fill(0);
    this.fractalField.fill(0);

    this._activeIdx = 0;
    this.u = this._uA;
    this.v = this._vA;
    this.w = this._wA;
    this._nextU = this._uB;
    this._nextV = this._vB;
    this._nextW = this._wB;
    this._nextDirty = false;
    this._quiescentLastCheckedTick = -100;

    resetAlifeEngines(this.width, this.height);

    if (!skipSeeding) {
      const size = this.width * this.height;
      const numSeeds = Math.floor(size / 1000) + 5;
      for (let k = 0; k < numSeeds; k++) {
        const cx = Math.random() * this.width;
        const cy = Math.random() * this.height;
        this.perturb(cx, cy, initialDensity, this.width / 15, 'inject', 'circle', { r: 255, g: 255, b: 255 }, 'periodic');
      }
    }
    this.tick++;
  }

  /**
   * Applies brush perturbations to the chemistry grid.
   */
  perturb(x: number, y: number, amount: number, radius: number = 8, type: 'inject' | 'remove' | 'smudge' = 'inject', brushType: 'circle' | 'square' | 'gaussian' | 'splatter' = 'circle', rgbColor?: { r: number, g: number, b: number }, boundaryType: 'periodic' | 'open' | 'closed' = 'periodic') {
    perturb(this, x, y, amount, radius, type, brushType, rgbColor, boundaryType);
    this.tick++;
  }

  /**
   * Imports an image buffer into the chemistry concentration fields.
   */
  importImage(imageData: Uint8ClampedArray, imgWidth: number, imgHeight: number, totalDensity: number, isRGB: boolean) {
    importImage(this, imageData, imgWidth, imgHeight, totalDensity, isRGB);
    this.tick++;
  }

  /**
   * Injects an external video frame signal dynamically into the active simulation grid.
   */
  injectSignal(imageData: Uint8ClampedArray, imgWidth: number, imgHeight: number, totalDensity: number, opacity: number, isRGB: boolean) {
    injectSignal(this, imageData, imgWidth, imgHeight, totalDensity, opacity, isRGB);
    this.tick++;
  }

  /**
   * Advances the simulation using optimized SIMD/vectorized CPU stencils across all active effect layers.
   */
  stepOptimized(params: SimulationParams, videoData?: { data: Uint8ClampedArray, width: number, height: number, opacity: number, isRGB: boolean }, continuousSeedsData?: ContinuousSeedData[], effects?: EffectInstance[]) {
    stepOptimized(this, params, videoData, continuousSeedsData, effects);
  }

  // Convert current scalar concentrations to direct RGB simulation channels using active colormap
  bakeColorMapToRGB(prevColorMap: ColorMap, customConfig?: CustomColorConfig) {
    convertScalarGridToRGB(this.u, this.v, this.w, prevColorMap, customConfig);
    this.tick++;
  }

  // Optimization S4: Compute statistics using Kahan compensated summation to eliminate float accumulation drift
  getStats(sampleCount: number = 5000) {
    let sumU = 0, cU = 0;
    let sumV = 0, cV = 0;
    let sumW = 0, cW = 0;
    const len = this.u.length;
    const step = Math.max(1, Math.ceil(len / sampleCount));
    let count = 0;

    for (let i = 0; i < len; i += step) {
      // Kahan sum for U
      const yU = this.u[i] - cU;
      const tU = sumU + yU;
      cU = (tU - sumU) - yU;
      sumU = tU;

      // Kahan sum for V
      const yV = this.v[i] - cV;
      const tV = sumV + yV;
      cV = (tV - sumV) - yV;
      sumV = tV;

      // Kahan sum for W
      const yW = this.w[i] - cW;
      const tW = sumW + yW;
      cW = (tW - sumW) - yW;
      sumW = tW;

      count++;
    }

    this.meanU = count > 0 ? sumU / count : 0;
    this.meanV = count > 0 ? sumV / count : 0;
    this.meanW = count > 0 ? sumW / count : 0;
    return { meanU: this.meanU, meanV: this.meanV, meanW: this.meanW };
  }

  // Optimization S2, S3, S5: Multi-scale hierarchical CA with pre-allocated pyramid buffers, unrolled relaxation, and cached quiescence
  updateFractal(params: SimulationParams & { fractalInfluence?: number, fractalGrowth?: number, fractalNoise?: number }) {
    if (params.useFractal === false) return;
    const fractalDepth = Math.max(1, Math.min(5, params.fractalDepth ?? 2));
    const fractalBlockSize = Math.max(2, Math.min(6, params.fractalBlockSize ?? 3));
    const fractalBirth = params.fractalBirth ?? [3];
    const fractalSurvive = params.fractalSurvive ?? [2, 3];
    const fractalThreshold = params.fractalThreshold ?? 0.35;
    const fractalInfluence = params.fractalInfluence ?? 0.6;
    const fractalGrowth = params.fractalGrowth ?? 0.7;

    const w = this.width;
    const h = this.height;
    const totalCells = w * h;

    let birthMask = 0;
    let surviveMask = 0;
    for (const n of fractalBirth) birthMask |= (1 << n);
    for (const n of fractalSurvive) surviveMask |= (1 << n);

    const density = params.totalDensity || 6.0;
    const invTotalDensity = 1.0 / density;

    // Optimization S5: Quiescent state check throttled to once every 60 frames
    if (this.tick - this._quiescentLastCheckedTick > 60) {
      let totalMorphogen = 0;
      for (let i = 0; i < totalCells; i += 64) {
        totalMorphogen += this.v[i] + this.fractalField[i];
      }
      this._quiescentCached = totalMorphogen < 5.0;
      this._quiescentLastCheckedTick = this.tick;
    }

    if (this._quiescentCached) {
      // Spontaneous central fractal nucleation so it evolves autonomously when left alone
      const cx = (w / 2) | 0;
      const cy = (h / 2) | 0;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if ((dx * dx + dy * dy) <= 9 && (dx + dy) % 2 === 0) {
            const idx = ((cy + dy + h) % h) * w + ((cx + dx + w) % w);
            this.fractalField[idx] = 1.0;
            this.v[idx] = density * 0.7;
          }
        }
      }
      this._quiescentCached = false;
    }

    // Optimization S3: 4-way unrolled relaxation decay of previous fractal memory
    const unroll = totalCells - (totalCells % 4);
    for (let i = 0; i < unroll; i += 4) {
      this.fractalField[i] *= 0.88;
      this.fractalField[i + 1] *= 0.88;
      this.fractalField[i + 2] *= 0.88;
      this.fractalField[i + 3] *= 0.88;
    }
    for (let i = unroll; i < totalCells; i++) {
      this.fractalField[i] *= 0.88;
    }

    // Multi-scale hierarchical CA sweep
    for (let d = 0; d < fractalDepth; d++) {
      const scale = Math.pow(fractalBlockSize, d);
      if (scale >= w || scale >= h) break;

      const mw = Math.floor(w / scale);
      const mh = Math.floor(h / scale);
      if (mw < 2 || mh < 2) continue;

      const macroSize = mw * mh;
      // Optimization S2: Reusing pre-allocated pyramid buffer without recreation
      if (!this._pyramidBuffers[d] || this._pyramidBuffers[d].length < macroSize) {
        this._pyramidBuffers[d] = new Float32Array(macroSize);
      }
      const macroGrid = this._pyramidBuffers[d];

      // Fast block aggregation with direct row stride
      for (let my = 0; my < mh; my++) {
        const startY = my * scale;
        const endY = Math.min(h, startY + scale);
        const macroRow = my * mw;

        for (let mx = 0; mx < mw; mx++) {
          const startX = mx * scale;
          const endX = Math.min(w, startX + scale);
          let sum = 0;

          for (let py = startY; py < endY; py++) {
            const rowOff = py * w;
            for (let px = startX; px < endX; px++) {
              const idx = rowOff + px;
              sum += (this.v[idx] * 0.7 + this.fractalField[idx] * density * 0.5) * invTotalDensity;
            }
          }
          macroGrid[macroRow + mx] = sum;
        }
      }

      const area = scale * scale;
      const threshold = area * fractalThreshold;
      const layerInfluence = (1.0 / (d + 1)) * fractalInfluence;

      for (let my = 0; my < mh; my++) {
        const uMy = (my - 1 + mh) % mh;
        const dMy = (my + 1) % mh;

        for (let mx = 0; mx < mw; mx++) {
          const lMx = (mx - 1 + mw) % mw;
          const rMx = (mx + 1) % mw;

          const neighbors = (
            (macroGrid[uMy * mw + lMx] > threshold ? 1 : 0) +
            (macroGrid[uMy * mw + mx] > threshold ? 1 : 0) +
            (macroGrid[uMy * mw + rMx] > threshold ? 1 : 0) +
            (macroGrid[my * mw + lMx] > threshold ? 1 : 0) +
            (macroGrid[my * mw + rMx] > threshold ? 1 : 0) +
            (macroGrid[dMy * mw + lMx] > threshold ? 1 : 0) +
            (macroGrid[dMy * mw + mx] > threshold ? 1 : 0) +
            (macroGrid[dMy * mw + rMx] > threshold ? 1 : 0)
          );

          const selfVal = macroGrid[my * mw + mx];
          const isAlive = selfVal > threshold;
          let result = 0;

          if (isAlive) {
            if ((surviveMask >> neighbors) & 1) result = 1;
          } else {
            if ((birthMask >> neighbors) & 1) result = 1;
          }

          const startX = mx * scale;
          const startY = my * scale;
          const endX = Math.min(w, startX + scale);
          const endY = Math.min(h, startY + scale);

          if (result === 1) {
            // Alive cell: inject fractal energy into scale block
            for (let py = startY; py < endY; py++) {
              const rowOff = py * w;
              for (let px = startX; px < endX; px++) {
                this.fractalField[rowOff + px] += layerInfluence * 0.85;
              }
            }
          } else if (isAlive && result === 0) {
            // Dead cell: decay energy
            for (let py = startY; py < endY; py++) {
              const rowOff = py * w;
              for (let px = startX; px < endX; px++) {
                this.fractalField[rowOff + px] = Math.max(0, this.fractalField[rowOff + px] - layerInfluence * 0.4);
              }
            }
          }
        }
      }
    }

    const blendRate = Math.min(1.0, fractalGrowth * 0.5);

    // Apply continuous hierarchical fractal feedback to physical morphogens
    for (let i = 0; i < totalCells; i++) {
      const fieldVal = Math.min(1.5, this.fractalField[i]);
      if (fieldVal > 0.08) {
        const targetV = fieldVal * density * 0.85;
        this.v[i] = this.v[i] * (1 - blendRate) + targetV * blendRate;
        this.u[i] = Math.max(0.1, this.u[i] * (1 - blendRate * 0.5) + (density - targetV) * (blendRate * 0.5));
      } else {
        this.v[i] *= (1 - blendRate * 0.08);
      }
    }
  }
}