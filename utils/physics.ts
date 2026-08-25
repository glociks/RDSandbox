import { SimulationParams, ContinuousSeedData, EffectInstance } from '../types';
import { McRDSolver } from './solver';
import { LeniaEngine, PhysarumEngine, LBMD2Q9Engine, fastSin, fastCos, fastGaussianExp } from './alifeEngines';

// Engine caches for Artificial Life modules
let cachedLeniaEngine: LeniaEngine | null = null;
let cachedPhysarumEngine: PhysarumEngine | null = null;
let cachedLBMEngine: LBMD2Q9Engine | null = null;

export function resetAlifeEngines(width?: number, height?: number) {
    if (cachedLBMEngine) {
        if (width && height && (cachedLBMEngine.width !== width || cachedLBMEngine.height !== height)) {
            cachedLBMEngine = new LBMD2Q9Engine(width, height);
        } else {
            cachedLBMEngine.reset();
        }
    }
    if (cachedPhysarumEngine) {
        if (width && height && (cachedPhysarumEngine.width !== width || cachedPhysarumEngine.height !== height)) {
            cachedPhysarumEngine = new PhysarumEngine(width, height, cachedPhysarumEngine.agentCount);
        } else {
            cachedPhysarumEngine.initAgents(cachedPhysarumEngine.agentCount);
        }
    }
}

// Reusable temporary tuple for zero-allocation 3-channel bilinear sampling
const sampleOut: [number, number, number] = [0, 0, 0];

// High-performance branchless Bilinear Interpolation with fast wrap/clamp
export function sampleBilinear(arr: Float32Array, w: number, h: number, x: number, y: number, wrap: boolean): number {
    let x0 = x | 0;
    let y0 = y | 0;
    if (x < 0 && x !== x0) x0--;
    if (y < 0 && y !== y0) y0--;

    const dx = x - x0;
    const dy = y - y0;

    let x1 = x0 + 1;
    let y1 = y0 + 1;

    if (wrap) {
        if (x0 < 0 || x0 >= w) x0 = ((x0 % w) + w) % w;
        if (x1 < 0 || x1 >= w) x1 = ((x1 % w) + w) % w;
        if (y0 < 0 || y0 >= h) y0 = ((y0 % h) + h) % h;
        if (y1 < 0 || y1 >= h) y1 = ((y1 % h) + h) % h;
    } else {
        if (x0 < 0) x0 = 0; else if (x0 >= w) x0 = w - 1;
        if (x1 < 0) x1 = 0; else if (x1 >= w) x1 = w - 1;
        if (y0 < 0) y0 = 0; else if (y0 >= h) y0 = h - 1;
        if (y1 < 0) y1 = 0; else if (y1 >= h) y1 = h - 1;
    }

    const y0w = y0 * w;
    const y1w = y1 * w;
    const v0 = arr[y0w + x0] + (arr[y0w + x1] - arr[y0w + x0]) * dx;
    const v1 = arr[y1w + x0] + (arr[y1w + x1] - arr[y1w + x0]) * dx;

    return v0 + (v1 - v0) * dy;
}

// Fused 3-channel Bilinear Interpolation: 3x fewer coordinate computations & cache misses
export function sampleBilinear3(
    arrU: Float32Array, arrV: Float32Array, arrW: Float32Array,
    w: number, h: number, x: number, y: number, wrap: boolean,
    out: [number, number, number]
) {
    let x0 = x | 0;
    let y0 = y | 0;
    if (x < 0 && x !== x0) x0--;
    if (y < 0 && y !== y0) y0--;

    const dx = x - x0;
    const dy = y - y0;

    let x1 = x0 + 1;
    let y1 = y0 + 1;

    if (wrap) {
        if (x0 < 0 || x0 >= w) x0 = ((x0 % w) + w) % w;
        if (x1 < 0 || x1 >= w) x1 = ((x1 % w) + w) % w;
        if (y0 < 0 || y0 >= h) y0 = ((y0 % h) + h) % h;
        if (y1 < 0 || y1 >= h) y1 = ((y1 % h) + h) % h;
    } else {
        if (x0 < 0) x0 = 0; else if (x0 >= w) x0 = w - 1;
        if (x1 < 0) x1 = 0; else if (x1 >= w) x1 = w - 1;
        if (y0 < 0) y0 = 0; else if (y0 >= h) y0 = h - 1;
        if (y1 < 0) y1 = 0; else if (y1 >= h) y1 = h - 1;
    }

    const y0w = y0 * w;
    const y1w = y1 * w;
    const i00 = y0w + x0;
    const i10 = y0w + x1;
    const i01 = y1w + x0;
    const i11 = y1w + x1;

    const u0 = arrU[i00] + (arrU[i10] - arrU[i00]) * dx;
    const u1 = arrU[i01] + (arrU[i11] - arrU[i01]) * dx;
    out[0] = u0 + (u1 - u0) * dy;

    const v0 = arrV[i00] + (arrV[i10] - arrV[i00]) * dx;
    const v1 = arrV[i01] + (arrV[i11] - arrV[i01]) * dx;
    out[1] = v0 + (v1 - v0) * dy;

    const w0 = arrW[i00] + (arrW[i10] - arrW[i00]) * dx;
    const w1 = arrW[i01] + (arrW[i11] - arrW[i01]) * dx;
    out[2] = w0 + (w1 - w0) * dy;
}

// Fast inline Xorshift PRNG to replace slow Math.random() in hot pixel loops
let rngState = 123456789;
export function fastRand(): number {
    rngState ^= rngState << 13;
    rngState ^= rngState >>> 17;
    rngState ^= rngState << 5;
    return (rngState >>> 0) * 2.3283064365386963e-10;
}

// Fast Rational Padé Approximation of atan2 (10x faster than Math.atan2)
export function fastAtan2(y: number, x: number): number {
    if (x === 0 && y === 0) return 0;
    const absY = y < 0 ? -y : y;
    let angle = 0;
    if (x >= 0) {
        const r = (x - absY) / (x + absY + 1e-7);
        angle = 0.1963 * r * r * r - 0.9817 * r + 0.785398;
    } else {
        const r = (x + absY) / (absY - x + 1e-7);
        angle = 0.1963 * r * r * r - 0.9817 * r + 2.356194;
    }
    return y < 0 ? -angle : angle;
}

// Optimization P10: Static reusable tuple for curlNoise to eliminate per-call object allocations
const curlStaticOut: { vx: number, vy: number } = { vx: 0, vy: 0 };

// Multi-octave incompressible Curl Noise velocity evaluator using fast trig LUTs
export function curlNoisePotential(x: number, y: number, t: number, scale: number): { vx: number, vy: number } {
    let vx = 0;
    let vy = 0;
    let amp = 1.0;
    let freq = scale;

    for (let o = 0; o < 3; o++) {
        const tOffset = t * (1.0 + o * 0.35);
        const s1 = fastSin(x * freq + tOffset);
        const c1 = fastCos(y * freq + tOffset * 0.7);
        const s2 = fastSin((x + y) * freq * 1.3 - tOffset * 0.5);
        const c2 = fastCos((x - y) * freq * 1.3 + tOffset * 0.3);

        const dpsi_dy = -s1 * fastSin(y * freq + tOffset * 0.7) + 0.6 * (fastCos((x + y) * freq * 1.3 - tOffset * 0.5) * c2 - s2 * fastSin((x - y) * freq * 1.3 + tOffset * 0.3));
        const dpsi_dx = fastCos(x * freq + tOffset) * c1 + 0.6 * (fastCos((x + y) * freq * 1.3 - tOffset * 0.5) * c2 - s2 * fastSin((x - y) * freq * 1.3 + tOffset * 0.3));

        vx += dpsi_dy * amp;
        vy -= dpsi_dx * amp;

        freq *= 2.0;
        amp *= 0.5;
    }

    curlStaticOut.vx = vx;
    curlStaticOut.vy = vy;
    return curlStaticOut;
}

// Optimization P2: 128×128 Precomputed Tiled Noise Field for Curl Turbulence
const CURL_TILE_SIZE = 128;
const curlTileVx = new Float32Array(CURL_TILE_SIZE * CURL_TILE_SIZE);
const curlTileVy = new Float32Array(CURL_TILE_SIZE * CURL_TILE_SIZE);
let lastCurlTileTime = -99999;
let lastCurlTileScale = -1;

function updateCurlNoiseTile(t: number, scale: number) {
    if (Math.abs(t - lastCurlTileTime) < 0.0001 && Math.abs(scale - lastCurlTileScale) < 0.0001) return;
    for (let ty = 0; ty < CURL_TILE_SIZE; ty++) {
        const row = ty * CURL_TILE_SIZE;
        for (let tx = 0; tx < CURL_TILE_SIZE; tx++) {
            const idx = row + tx;
            const res = curlNoisePotential(tx, ty, t, scale);
            curlTileVx[idx] = res.vx;
            curlTileVy[idx] = res.vy;
        }
    }
    lastCurlTileTime = t;
    lastCurlTileScale = scale;
}

// Optimization P4: 256×256 Precomputed Quantum Phase Interference LUT
const QUANTUM_LUT_SIZE = 256;
const quantumPhaseLUT = new Float32Array(QUANTUM_LUT_SIZE * QUANTUM_LUT_SIZE);
for (let iy = 0; iy < QUANTUM_LUT_SIZE; iy++) {
    const imVal = (iy - 128) / 64;
    const row = iy * QUANTUM_LUT_SIZE;
    for (let ix = 0; ix < QUANTUM_LUT_SIZE; ix++) {
        const reVal = (ix - 128) / 64;
        quantumPhaseLUT[row + ix] = fastSin(fastAtan2(imVal, reVal + 0.001) * 3.0);
    }
}

// Optimization P5: 512-entry Precomputed Anisotropy LUT for Crystal Snowflake
const ANIS_LUT_SIZE = 512;
const anisLUT = new Float32Array(ANIS_LUT_SIZE);
let lastAnisotropyVal = -1;

function ensureAnisLUT(anisotropy: number): Float32Array {
    if (Math.abs(anisotropy - lastAnisotropyVal) < 0.0001) return anisLUT;
    for (let i = 0; i < ANIS_LUT_SIZE; i++) {
        const theta = (i / ANIS_LUT_SIZE) * Math.PI * 2;
        anisLUT[i] = 1.0 + anisotropy * fastCos(6.0 * theta);
    }
    lastAnisotropyVal = anisotropy;
    return anisLUT;
}

// Fast hex to RGB tuple
function hexToRgb(hex: string): [number, number, number] {
    if (!hex || hex[0] !== '#') return [255, 0, 0];
    const bi = parseInt(hex.slice(1), 16);
    return [(bi >> 16) & 255, (bi >> 8) & 255, bi & 255];
}

// Continuous Seeds Injection
export function applyContinuousSeeds(
    solver: McRDSolver,
    totalDensity: number,
    continuousSeedsData: ContinuousSeedData[],
    steps: number
) {
    const w = solver.width;
    const h = solver.height;

    for (const cdata of continuousSeedsData) {
        const { seed, data, width: cw, height: ch, isRGB } = cdata;
        if (seed.opacity <= 0) continue;

        let maxOp = seed.opacity / steps;

        const scaleX = seed.scaleX || 0.001;
        const scaleY = seed.scaleY || 0.001;
        const rotRad = (seed.rotation * Math.PI) / 180;
        const cosT = fastCos(-rotRad);
        const sinT = fastSin(-rotRad);
        const invScaleX = 1.0 / scaleX;
        const invScaleY = 1.0 / scaleY;

        const cx = w / 2;
        const cy = h / 2;
        const tx = cx + seed.x * w * 0.5;
        const ty = cy + seed.y * h * 0.5;

        const maxRadius = Math.sqrt((cw * scaleX * 0.5) ** 2 + (ch * scaleY * 0.5) ** 2) + 2;
        const minPy = Math.max(0, Math.floor(ty - maxRadius));
        const maxPy = Math.min(h - 1, Math.ceil(ty + maxRadius));
        const minPx = Math.max(0, Math.floor(tx - maxRadius));
        const maxPx = Math.min(w - 1, Math.ceil(tx + maxRadius));

        const isUint8Data = data instanceof Uint8ClampedArray;
        const blendMode = seed.blendMode || 'replace';
        const hasBlendIf = seed.blendIf && seed.blendIf.enabled && seed.blendIf.points && seed.blendIf.points.length >= 2;
        const blendIfLow = hasBlendIf ? (seed.blendIf.points[0]?.pos ?? 0) : 0;
        const blendIfHigh = hasBlendIf ? (seed.blendIf.points[seed.blendIf.points.length - 1]?.pos ?? 1) : 1;
        const blendIfSmooth = hasBlendIf ? seed.blendIf.smoothness : 0.01;

        const invTotalDensity = 1.0 / totalDensity;

        for (let py = minPy; py <= maxPy; py++) {
            const dy = py - ty;
            const yOffset = py * w;

            for (let px = minPx; px <= maxPx; px++) {
                const dx = px - tx;

                const rx = dx * cosT - dy * sinT;
                const ry = dx * sinT + dy * cosT;

                const sx = rx * invScaleX;
                const sy = ry * invScaleY;

                const srcX = cw * 0.5 + sx;
                const srcY = ch * 0.5 + sy;

                const sIx = Math.round(srcX);
                const sIy = Math.round(srcY);

                if (sIx >= 0 && sIx < cw && sIy >= 0 && sIy < ch) {
                    const i = yOffset + px;
                    let srcU = 0, srcV = 0, srcW = 0;

                    if (isUint8Data) {
                        const vIdx = (sIy * cw + sIx) * 4;
                        if (isRGB) {
                            srcU = (data[vIdx] / 255) * totalDensity;
                            srcV = (data[vIdx + 1] / 255) * totalDensity;
                            srcW = (data[vIdx + 2] / 255) * totalDensity;
                        } else {
                            const lum = (data[vIdx] * 0.299 + data[vIdx + 1] * 0.587 + data[vIdx + 2] * 0.114) / 255;
                            srcV = lum * totalDensity;
                            srcU = srcV;
                        }
                    } else {
                        const val = (data as Float32Array)[sIy * cw + sIx];
                        const targetU = seed.seedConfig?.seedTarget?.u ?? 0.1;
                        const targetV = seed.seedConfig?.seedTarget?.v ?? 0.9;
                        const targetW = seed.seedConfig?.seedTarget?.w ?? 0.0;
                        srcU = val * totalDensity * targetU;
                        srcV = val * totalDensity * targetV;
                        srcW = val * totalDensity * targetW;
                    }

                    let vOp = maxOp;
                    if (hasBlendIf) {
                        const currentV = solver.v[i] * invTotalDensity;
                        let factor = 1.0;
                        if (currentV < blendIfLow - blendIfSmooth || currentV > blendIfHigh + blendIfSmooth) factor = 0;
                        else if (currentV < blendIfLow) factor = (currentV - (blendIfLow - blendIfSmooth)) / blendIfSmooth;
                        else if (currentV > blendIfHigh) factor = ((blendIfHigh + blendIfSmooth) - currentV) / blendIfSmooth;

                        if (factor <= 0) continue;
                        vOp *= factor;
                    }

                    if (blendMode === 'add') {
                        solver.u[i] += srcU * vOp;
                        solver.v[i] += srcV * vOp;
                        solver.w[i] += srcW * vOp;
                    } else if (blendMode === 'subtract') {
                        solver.u[i] -= srcU * vOp;
                        solver.v[i] -= srcV * vOp;
                        solver.w[i] -= srcW * vOp;
                    } else if (blendMode === 'multiply') {
                        solver.u[i] *= (1.0 - vOp) + (srcU * invTotalDensity) * vOp;
                        solver.v[i] *= (1.0 - vOp) + (srcV * invTotalDensity) * vOp;
                        solver.w[i] *= (1.0 - vOp) + (srcW * invTotalDensity) * vOp;
                    } else if (blendMode === 'screen') {
                        const cVU = solver.u[i] * invTotalDensity;
                        const cVV = solver.v[i] * invTotalDensity;
                        const cVW = solver.w[i] * invTotalDensity;
                        const sU = srcU * invTotalDensity;
                        const sV = srcV * invTotalDensity;
                        const sW = srcW * invTotalDensity;
                        solver.u[i] = ((1.0 - (1.0 - cVU) * (1.0 - sU)) * totalDensity - solver.u[i]) * vOp + solver.u[i];
                        solver.v[i] = ((1.0 - (1.0 - cVV) * (1.0 - sV)) * totalDensity - solver.v[i]) * vOp + solver.v[i];
                        solver.w[i] = ((1.0 - (1.0 - cVW) * (1.0 - sW)) * totalDensity - solver.w[i]) * vOp + solver.w[i];
                    } else {
                        // 'replace' / normal stamp blend (prevents infinite additive accumulation)
                        if (isRGB) {
                            solver.u[i] += (srcU - solver.u[i]) * vOp;
                            solver.v[i] += (srcV - solver.v[i]) * vOp;
                            solver.w[i] += (srcW - solver.w[i]) * vOp;
                        } else {
                            solver.v[i] += (srcV - solver.v[i]) * vOp;
                        }
                    }
                }
            }
        }
    }
}

// Next-Generation High-Performance Zero-Copy Physics Simulation Pipeline
export function stepOptimized(
    solver: McRDSolver,
    params: SimulationParams,
    videoData?: { data: Uint8ClampedArray, width: number, height: number, opacity: number, isRGB: boolean },
    continuousSeedsData?: ContinuousSeedData[],
    effects?: EffectInstance[]
) {
    solver.tick++;

    const {
        dt, totalDensity, boundaryType, clampMode
    } = params;

    const w = solver.width;
    const h = solver.height;
    const size = w * h;

    const isPeriodic = boundaryType === 'periodic';

    // Sub-stepping for numerical stability
    const baseDt = dt;
    let steps = clampMode ? Math.min(2, Math.max(1, Math.ceil(baseDt / 0.1))) : 1;
    const dtSub = baseDt / steps;

    // 1. Continuous Seeds Injection
    if (continuousSeedsData && continuousSeedsData.length > 0) {
        applyContinuousSeeds(solver, totalDensity, continuousSeedsData, steps);
    }

    // 2. Attached Video / Image Frame Injection
    if (videoData && videoData.opacity > 0 && videoData.data) {
        const vOp = videoData.opacity / steps;
        const vData = videoData.data;
        const isRGB = videoData.isRGB;
        for (let i = 0; i < size; i++) {
            const vIdx = i * 4;
            if (vIdx < vData.length) {
                if (isRGB) {
                    const srcU = (vData[vIdx] / 255) * totalDensity;
                    const srcV = (vData[vIdx + 1] / 255) * totalDensity;
                    const srcW = (vData[vIdx + 2] / 255) * totalDensity;
                    solver.u[i] += (srcU - solver.u[i]) * vOp;
                    solver.v[i] += (srcV - solver.v[i]) * vOp;
                    solver.w[i] += (srcW - solver.w[i]) * vOp;
                } else {
                    const lum = (vData[vIdx] * 0.299 + vData[vIdx + 1] * 0.587 + vData[vIdx + 2] * 0.114) / 255;
                    const srcVal = lum * totalDensity;
                    solver.v[i] += (srcVal - solver.v[i]) * vOp;
                }
            }
        }
    }

    for (let s = 0; s < steps; s++) {

        // Stacked Modular Effects Execution (with O(1) Zero-Copy Buffer Pointer Swapping)
        if (effects && effects.length > 0) {
            for (const effect of effects) {
                if (!effect.enabled) continue;
                const p = effect.params || {};

                const baseCoupling = typeof p.gridCoupling === 'number'
                    ? p.gridCoupling
                    : (p.gridCoupling === false ? 0.0 : 1.0);
                const cR = (typeof p.gridCouplingR === 'number' ? p.gridCouplingR : 1.0) * baseCoupling;
                const cG = (typeof p.gridCouplingG === 'number' ? p.gridCouplingG : 1.0) * baseCoupling;
                const cB = (typeof p.gridCouplingB === 'number' ? p.gridCouplingB : 1.0) * baseCoupling;
                const isRGBMode = params.colorMap === 'rgb' || params.colorMap === 'custom';

                const srcU = solver.u;
                const srcV = solver.v;
                const srcW = solver.w;
                const dstU = solver._nextU;
                const dstV = solver._nextV;
                const dstW = solver._nextW;

                switch (effect.type) {

                    // 1. FLOW (Unified High-Precision Advection & Zoom Feedback)
                    case 'flow': {
                        const flowScale = p.flowScale ?? 1.0;
                        const flowX = p.flowX ?? 0;
                        const flowY = p.flowY ?? 0;

                        if (Math.abs(flowScale - 1.0) > 0.0001 || Math.abs(flowX) > 0.0001 || Math.abs(flowY) > 0.0001) {
                            const curU = solver.u;
                            const curV = solver.v;
                            const curW = solver.w;
                            const nU = solver._nextU;
                            const nV = solver._nextV;
                            const nW = solver._nextW;

                            const cx = w * 0.5;
                            const cy = h * 0.5;
                            const invScale = 1.0 / Math.max(0.01, flowScale);

                            for (let y = 0; y < h; y++) {
                                const sy = cy + (y - cy) * invScale - flowY;
                                const rowOff = y * w;
                                for (let x = 0; x < w; x++) {
                                    const sx = cx + (x - cx) * invScale - flowX;
                                    const idx = rowOff + x;
                                    sampleBilinear3(curU, curV, curW, w, h, sx, sy, isPeriodic, sampleOut);
                                    nU[idx] = sampleOut[0];
                                    nV[idx] = sampleOut[1];
                                    nW[idx] = sampleOut[2];
                                }
                            }
                            solver.swapBuffers();
                        }
                        break;
                    }

                    // 2. MCRD PHYSICS (Vectorized 5-Point Laplacian + Reaction Kinetics)
                    case 'physics': {
                        const Dm = p.Dm ?? 0.1;
                        const Dc = p.Dc ?? 1.0;
                        const Dw = p.Dw ?? 5.0;
                        const kOn = p.kOn ?? 0.05;
                        const kRec = p.kRec ?? 0.08;
                        const kSat = p.kSat ?? 0.05;
                        const kOff = p.kOff ?? 0.8;
                        const feedRate = p.feedRate ?? 0.0;
                        const infPhys = p.physicsInfluence ?? 1.0;

                        if (infPhys > 0) {
                            const curU = solver.u;
                            const curV = solver.v;
                            const curW = solver.w;
                            const nU = solver._nextU;
                            const nV = solver._nextV;
                            const nW = solver._nextW;

                            // Fast branchless interior loop
                            for (let py = 1; py < h - 1; py++) {
                                const yOff = py * w;
                                const uRow = yOff - w;
                                const dRow = yOff + w;

                                for (let px = 1; px < w - 1; px++) {
                                    const i = yOff + px;
                                    const valU = curU[i];
                                    const valV = curV[i];
                                    const valW = curW[i];

                                    const lapU = curU[i - 1] + curU[i + 1] + curU[uRow + px] + curU[dRow + px] - 4.0 * valU;
                                    const lapV = curV[i - 1] + curV[i + 1] + curV[uRow + px] + curV[dRow + px] - 4.0 * valV;
                                    const lapW = curW[i - 1] + curW[i + 1] + curW[uRow + px] + curW[dRow + px] - 4.0 * valW;

                                    const uSq = valU * valU;
                                    const recruitment = (kRec * uSq) / (1.0 + kSat * uSq);
                                    const reaction = valV * (kOn + recruitment) - kOff * valU;

                                    const du = (Dm * lapU + reaction) * infPhys * cR;
                                    const dv = (Dc * lapV - reaction + (feedRate > 0 ? feedRate * ((totalDensity * 0.5) - valV) : 0)) * infPhys * cG;
                                    const dw = (Dw * lapW + (valU * 0.01) - (valW * 0.05)) * infPhys * cB;

                                    nU[i] = valU + du * dtSub;
                                    nV[i] = valV + dv * dtSub;
                                    nW[i] = valW + dw * dtSub;
                                }
                            }

                            // Boundary rows (y=0, y=h-1)
                            for (let py = 0; py < h; py += (h - 1 || 1)) {
                                const yOff = py * w;
                                const yPrevOff = (isPeriodic ? ((py - 1 + h) % h) : Math.max(0, py - 1)) * w;
                                const yNextOff = (isPeriodic ? ((py + 1) % h) : Math.min(h - 1, py + 1)) * w;
                                for (let px = 0; px < w; px++) {
                                    const i = yOff + px;
                                    const xL = isPeriodic ? ((px - 1 + w) % w) : Math.max(0, px - 1);
                                    const xR = isPeriodic ? ((px + 1) % w) : Math.min(w - 1, px + 1);

                                    const valU = curU[i];
                                    const valV = curV[i];
                                    const valW = curW[i];

                                    const lapU = curU[yOff + xL] + curU[yOff + xR] + curU[yPrevOff + px] + curU[yNextOff + px] - 4.0 * valU;
                                    const lapV = curV[yOff + xL] + curV[yOff + xR] + curV[yPrevOff + px] + curV[yNextOff + px] - 4.0 * valV;
                                    const lapW = curW[yOff + xL] + curW[yOff + xR] + curW[yPrevOff + px] + curW[yNextOff + px] - 4.0 * valW;

                                    const uSq = valU * valU;
                                    const recruitment = (kRec * uSq) / (1.0 + kSat * uSq);
                                    const reaction = valV * (kOn + recruitment) - kOff * valU;

                                    nU[i] = valU + (Dm * lapU + reaction) * infPhys * dtSub * cR;
                                    nV[i] = valV + (Dc * lapV - reaction + (feedRate > 0 ? feedRate * ((totalDensity * 0.5) - valV) : 0)) * infPhys * dtSub * cG;
                                    nW[i] = valW + (Dw * lapW + (valU * 0.01) - (valW * 0.05)) * infPhys * dtSub * cB;
                                }
                            }

                            // Boundary columns (px=0, px=w-1) for interior py
                            for (let py = 1; py < h - 1; py++) {
                                const yOff = py * w;
                                const uRow = yOff - w;
                                const dRow = yOff + w;
                                for (let px of [0, w - 1]) {
                                    const i = yOff + px;
                                    const xL = isPeriodic ? ((px - 1 + w) % w) : Math.max(0, px - 1);
                                    const xR = isPeriodic ? ((px + 1) % w) : Math.min(w - 1, px + 1);

                                    const valU = curU[i];
                                    const valV = curV[i];
                                    const valW = curW[i];

                                    const lapU = curU[yOff + xL] + curU[yOff + xR] + curU[uRow + px] + curU[dRow + px] - 4.0 * valU;
                                    const lapV = curV[yOff + xL] + curV[yOff + xR] + curV[uRow + px] + curV[dRow + px] - 4.0 * valV;
                                    const lapW = curW[yOff + xL] + curW[yOff + xR] + curW[uRow + px] + curW[dRow + px] - 4.0 * valW;

                                    const uSq = valU * valU;
                                    const recruitment = (kRec * uSq) / (1.0 + kSat * uSq);
                                    const reaction = valV * (kOn + recruitment) - kOff * valU;

                                    nU[i] = valU + (Dm * lapU + reaction) * infPhys * dtSub * cR;
                                    nV[i] = valV + (Dc * lapV - reaction + (feedRate > 0 ? feedRate * ((totalDensity * 0.5) - valV) : 0)) * infPhys * dtSub * cG;
                                    nW[i] = valW + (Dw * lapW + (valU * 0.01) - (valW * 0.05)) * infPhys * dtSub * cB;
                                }
                            }

                            solver.swapBuffers();
                        }
                        break;
                    }

                    // 3. GRAY-SCOTT
                    case 'grayScott': {
                        const gsDa = p.gsDa ?? 1.0;
                        const gsDb = p.gsDb ?? 0.5;
                        const gsFeed = p.gsFeed ?? 0.055;
                        const gsKill = p.gsKill ?? 0.062;
                        const gsInfluence = p.gsInfluence ?? 1.0;
                        const gsTimeScale = p.gsTimeScale ?? 1.0;

                        if (gsInfluence > 0) {
                            const curU = solver.u;
                            const curV = solver.v;
                            const curW = solver.w;
                            const nU = solver._nextU;
                            const nV = solver._nextV;
                            const nW = solver._nextW;

                            const dtEff = dtSub * gsTimeScale;

                            for (let py = 1; py < h - 1; py++) {
                                const yOff = py * w;
                                const uRow = yOff - w;
                                const dRow = yOff + w;

                                for (let px = 1; px < w - 1; px++) {
                                    const i = yOff + px;
                                    const a = curU[i];
                                    const b = curV[i];

                                    const lapA = curU[i - 1] + curU[i + 1] + curU[uRow + px] + curU[dRow + px] - 4.0 * a;
                                    const lapB = curV[i - 1] + curV[i + 1] + curV[uRow + px] + curV[dRow + px] - 4.0 * b;

                                    const uvv = a * b * b;
                                    const du = (gsDa * lapA - uvv + gsFeed * (1.0 - a)) * gsInfluence;
                                    const dv = (gsDb * lapB + uvv - (gsFeed + gsKill) * b) * gsInfluence;

                                    nU[i] = a + du * dtEff;
                                    nV[i] = b + dv * dtEff;
                                    nW[i] = curW[i];
                                }
                            }

                            // Boundary edge sweeps
                            for (let py = 0; py < h; py += (h - 1 || 1)) {
                                const yOff = py * w;
                                const yPrevOff = (isPeriodic ? ((py - 1 + h) % h) : Math.max(0, py - 1)) * w;
                                const yNextOff = (isPeriodic ? ((py + 1) % h) : Math.min(h - 1, py + 1)) * w;
                                for (let px = 0; px < w; px++) {
                                    const i = yOff + px;
                                    const xL = isPeriodic ? ((px - 1 + w) % w) : Math.max(0, px - 1);
                                    const xR = isPeriodic ? ((px + 1) % w) : Math.min(w - 1, px + 1);

                                    const a = curU[i];
                                    const b = curV[i];

                                    const lapA = curU[yOff + xL] + curU[yOff + xR] + curU[yPrevOff + px] + curU[yNextOff + px] - 4.0 * a;
                                    const lapB = curV[yOff + xL] + curV[yOff + xR] + curV[yPrevOff + px] + curV[yNextOff + px] - 4.0 * b;

                                    const uvv = a * b * b;
                                    nU[i] = a + (gsDa * lapA - uvv + gsFeed * (1.0 - a)) * gsInfluence * dtEff * cR;
                                    nV[i] = b + (gsDb * lapB + uvv - (gsFeed + gsKill) * b) * gsInfluence * dtEff * cG;
                                    nW[i] = curW[i] + (gsDa * (curW[yOff + xL] + curW[yOff + xR] + curW[yPrevOff + px] + curW[yNextOff + px] - 4.0 * curW[i]) - 0.05 * curW[i]) * gsInfluence * dtEff * cB;
                                }
                            }

                            solver.swapBuffers();
                        }
                        break;
                    }

                    // 4. STABILIZER
                    case 'stabilizer': {
                        const targetDensity = p.targetDensity ?? 6.0;
                        const strength = p.strength ?? 1.0;
                        const currentDensity = (solver.meanU + solver.meanV) || 1.0;
                        const diff = (targetDensity - currentDensity) * strength * 0.05 * dtSub;

                        const unroll = size - (size % 4);
                        for (let i = 0; i < unroll; i += 4) {
                            solver.u[i] = Math.max(0, solver.u[i] + diff * 0.1);
                            solver.v[i] = Math.max(0, solver.v[i] + diff * 0.1);
                            solver.u[i + 1] = Math.max(0, solver.u[i + 1] + diff * 0.1);
                            solver.v[i + 1] = Math.max(0, solver.v[i + 1] + diff * 0.1);
                            solver.u[i + 2] = Math.max(0, solver.u[i + 2] + diff * 0.1);
                            solver.v[i + 2] = Math.max(0, solver.v[i + 2] + diff * 0.1);
                            solver.u[i + 3] = Math.max(0, solver.u[i + 3] + diff * 0.1);
                            solver.v[i + 3] = Math.max(0, solver.v[i + 3] + diff * 0.1);
                        }
                        for (let i = unroll; i < size; i++) {
                            solver.u[i] = Math.max(0, solver.u[i] + diff * 0.1);
                            solver.v[i] = Math.max(0, solver.v[i] + diff * 0.1);
                        }
                        break;
                    }

                    // 5. Optimization P9: GRAVITY (Fused Velocity Update + Bilinear Advection in Single Sweep)
                    case 'gravity': {
                        const gravityStrength = p.gravityStrength ?? 0.5;
                        const gravityAngle = p.gravityAngle ?? 0;
                        const friction = p.gravityFriction ?? 0.9;
                        const threshold = p.gravityMassThreshold ?? 2.0;

                        const gx = fastSin(gravityAngle) * gravityStrength;
                        const gy = fastCos(gravityAngle) * gravityStrength;

                        const curU = solver.u;
                        const curV = solver.v;
                        const curW = solver.w;
                        const nU = solver._nextU;
                        const nV = solver._nextV;
                        const nW = solver._nextW;

                        for (let py = 0; py < h; py++) {
                            const yOff = py * w;
                            for (let px = 0; px < w; px++) {
                                const idx = yOff + px;
                                if (curV[idx] > threshold) {
                                    solver.vx[idx] += gx * dtSub;
                                    solver.vy[idx] += gy * dtSub;
                                }
                                solver.vx[idx] *= friction;
                                solver.vy[idx] *= friction;

                                const srcX = px - solver.vx[idx];
                                const srcY = py - solver.vy[idx];
                                sampleBilinear3(curU, curV, curW, w, h, srcX, srcY, isPeriodic, sampleOut);
                                nU[idx] = sampleOut[0];
                                nV[idx] = sampleOut[1];
                                nW[idx] = sampleOut[2];
                            }
                        }
                        solver.swapBuffers();
                        break;
                    }

                    // 6. LGA (Lattice Gas Automaton)
                    case 'lga': {
                        const inf = p.lgaInfluence ?? 1.0;
                        const vFact = p.lgaVerticalFactor ?? 1.0;
                        const inertia = Math.max(0, 1.0 - (p.lgaViscosity ?? 0.1));
                        const lgaProbability = p.lgaProbability ?? 0.5;
                        const lgaAdvection = p.lgaAdvection ?? 1.0;
                        const lgaBarrier = p.lgaBarrier ?? 8.0;
                        const lgaNoise = p.lgaNoise ?? 0.05;
                        const lgaFlowX = p.lgaFlowX ?? 0;
                        const lgaFlowY = p.lgaFlowY ?? 0;

                        dstU.set(srcU);
                        dstV.set(srcV);
                        dstW.set(srcW);

                        for (let py = 0; py < h; py++) {
                            const yOff = py * w;
                            for (let px = 0; px < w; px++) {
                                const i = yOff + px;
                                const noiseX = (fastRand() - 0.5) * lgaNoise;
                                const noiseY = (fastRand() - 0.5) * lgaNoise;

                                solver.vx[i] = solver.vx[i] * inertia + lgaFlowX * (1 - inertia) + noiseX;
                                solver.vy[i] = solver.vy[i] * inertia + lgaFlowY * (1 - inertia) + noiseY;

                                const moveX = solver.vx[i] * lgaAdvection;
                                const moveY = solver.vy[i] * lgaAdvection * vFact;
                                const absX = Math.abs(moveX);
                                const absY = Math.abs(moveY);

                                const stepX = (absX | 0) + (fastRand() < (absX % 1) ? 1 : 0);
                                const stepY = (absY | 0) + (fastRand() < (absY % 1) ? 1 : 0);
                                const dx = -stepX * Math.sign(moveX);
                                const dy = -stepY * Math.sign(moveY);

                                if (dx === 0 && dy === 0) continue;

                                let tx = px + dx;
                                let ty = py + dy;

                                if (isPeriodic) {
                                    tx = ((tx % w) + w) % w;
                                    ty = ((ty % h) + h) % h;
                                } else {
                                    if (tx < 0) tx = 0; else if (tx >= w) tx = w - 1;
                                    if (ty < 0) ty = 0; else if (ty >= h) ty = h - 1;
                                }
                                const neighborIdx = ty * w + tx;

                                if (srcU[neighborIdx] < lgaBarrier) {
                                    if (fastRand() < lgaProbability) {
                                        dstU[i] = dstU[i] * (1 - inf) + srcU[neighborIdx] * inf;
                                        dstV[i] = dstV[i] * (1 - inf) + srcV[neighborIdx] * inf;
                                        dstW[i] = dstW[i] * (1 - inf) + srcW[neighborIdx] * inf;
                                    }
                                } else {
                                    solver.vx[i] *= -0.5;
                                    solver.vy[i] *= -0.5;
                                }
                            }
                        }
                        solver.swapBuffers();
                        break;
                    }

                    // 7. FRACTAL AUTOMATA
                    case 'fractal': {
                        if (s === 0) {
                            solver.updateFractal({ ...params, ...p, useFractal: true });
                        }
                        break;
                    }

                    // 8. SOCA (Second Order Automata / Acoustic Waves)
                    case 'soca': {
                        const speed = p.socaSpeed ?? p.socaDtScale ?? 1.0;
                        const damping = p.socaDamping ?? 0.995;
                        const spring = p.socaCoupling ?? p.socaSpring ?? 0.1;
                        const inf = p.socaInfluence ?? p.socaReactionMix ?? 1.0;

                        const curU = solver.u;
                        const curV = solver.v;
                        const curW = solver.w;
                        const nU = solver._nextU;
                        const nV = solver._nextV;
                        const nW = solver._nextW;
                        const prevU = solver.prevU;
                        const prevV = solver.prevV;
                        const prevW = solver.prevW;

                        // Fast interior branchless sweep
                        for (let py = 1; py < h - 1; py++) {
                            const yOff = py * w;
                            const uRow = yOff - w;
                            const dRow = yOff + w;

                            for (let px = 1; px < w - 1; px++) {
                                const i = yOff + px;
                                const valU = curU[i];
                                const lapU = curU[i - 1] + curU[i + 1] + curU[uRow + px] + curU[dRow + px] - 4 * valU;
                                const velU = (valU - prevU[i]) * damping;
                                const accU = (lapU * speed * speed * 0.25 - spring * (valU - 1.0));
                                const nextUVal = Math.max(0, valU + velU + accU * dtSub);
                                prevU[i] = valU;

                                const valV = curV[i];
                                const lapV = curV[i - 1] + curV[i + 1] + curV[uRow + px] + curV[dRow + px] - 4 * valV;
                                const velV = (valV - prevV[i]) * damping;
                                const accV = (lapV * speed * speed * 0.25 - spring * valV + (valU - 1.0) * 0.3);
                                const nextVVal = Math.max(0, valV + velV + accV * dtSub);
                                prevV[i] = valV;

                                const valW = curW[i];
                                const lapW = curW[i - 1] + curW[i + 1] + curW[uRow + px] + curW[dRow + px] - 4 * valW;
                                const velW = (valW - prevW[i]) * damping;
                                const accW = (lapW * speed * speed * 0.25 - spring * valW + (valV - 1.0) * 0.3);
                                const nextWVal = Math.max(0, valW + velW + accW * dtSub);
                                prevW[i] = valW;

                                nU[i] = valU * (1 - inf * cR) + nextUVal * (inf * cR);
                                nV[i] = valV * (1 - inf * cG) + nextVVal * (inf * cG);
                                nW[i] = valW * (1 - inf * cB) + nextWVal * (inf * cB);
                            }
                        }

                        // Boundary sweeps
                        for (let py = 0; py < h; py += (h - 1 || 1)) {
                            const yOff = py * w;
                            const yPrevOff = (isPeriodic ? ((py - 1 + h) % h) : Math.max(0, py - 1)) * w;
                            const yNextOff = (isPeriodic ? ((py + 1) % h) : Math.min(h - 1, py + 1)) * w;
                            for (let px = 0; px < w; px++) {
                                const i = yOff + px;
                                const xL = isPeriodic ? ((px - 1 + w) % w) : Math.max(0, px - 1);
                                const xR = isPeriodic ? ((px + 1) % w) : Math.min(w - 1, px + 1);

                                const valU = curU[i];
                                const lapU = curU[yOff + xL] + curU[yOff + xR] + curU[yPrevOff + px] + curU[yNextOff + px] - 4 * valU;
                                const velU = (valU - prevU[i]) * damping;
                                const accU = (lapU * speed * speed * 0.25 - spring * (valU - 1.0));
                                const nextUVal = Math.max(0, valU + velU + accU * dtSub);
                                prevU[i] = valU;

                                const valV = curV[i];
                                const lapV = curV[yOff + xL] + curV[yOff + xR] + curV[yPrevOff + px] + curV[yNextOff + px] - 4 * valV;
                                const velV = (valV - prevV[i]) * damping;
                                const accV = (lapV * speed * speed * 0.25 - spring * valV + (valU - 1.0) * 0.3);
                                const nextVVal = Math.max(0, valV + velV + accV * dtSub);
                                prevV[i] = valV;

                                const valW = curW[i];
                                const lapW = curW[yOff + xL] + curW[yOff + xR] + curW[yPrevOff + px] + curW[yNextOff + px] - 4 * valW;
                                const velW = (valW - prevW[i]) * damping;
                                const accW = (lapW * speed * speed * 0.25 - spring * valW + (valV - 1.0) * 0.3);
                                const nextWVal = Math.max(0, valW + velW + accW * dtSub);
                                prevW[i] = valW;

                                nU[i] = valU * (1 - inf * cR) + nextUVal * (inf * cR);
                                nV[i] = valV * (1 - inf * cG) + nextVVal * (inf * cG);
                                nW[i] = valW * (1 - inf * cB) + nextWVal * (inf * cB);
                            }
                        }
                        solver.swapBuffers();
                        break;
                    }

                    // 9. Optimization P6: GAME OF LIFE (Branchless Bitmask Rule Evaluation)
                    case 'gol': {
                        const blend = p.golBlend ?? 0.8;
                        const halfDensity = (totalDensity || 6.0) * 0.5;
                        const aliveThreshold = (p.golThreshold ?? 0.35) * halfDensity;

                        let birthMask = 0;
                        let surviveMask = 0;
                        if (Array.isArray(p.golBirth)) {
                            for (const b of p.golBirth) birthMask |= (1 << b);
                        } else {
                            const birthLow = p.golBirthLow ?? 3;
                            const birthHigh = p.golBirthHigh ?? 3;
                            for (let b = birthLow; b <= birthHigh; b++) birthMask |= (1 << b);
                        }
                        if (Array.isArray(p.golSurvive)) {
                            for (const s of p.golSurvive) surviveMask |= (1 << s);
                        } else {
                            const survivalLow = p.golSurvivalLow ?? 2;
                            const survivalHigh = p.golSurvivalHigh ?? 3;
                            for (let sv = survivalLow; sv <= survivalHigh; sv++) surviveMask |= (1 << sv);
                        }

                        const curU = solver.u;
                        const curV = solver.v;
                        const curW = solver.w;
                        const nU = solver._nextU;
                        const nV = solver._nextV;
                        const nW = solver._nextW;

                        for (let py = 1; py < h - 1; py++) {
                            const yOff = py * w;
                            const uRow = yOff - w;
                            const dRow = yOff + w;

                            for (let px = 1; px < w - 1; px++) {
                                const i = yOff + px;
                                
                                // Channel U (Red)
                                const countR = (
                                    (curU[uRow + px - 1] > aliveThreshold ? 1 : 0) +
                                    (curU[uRow + px] > aliveThreshold ? 1 : 0) +
                                    (curU[uRow + px + 1] > aliveThreshold ? 1 : 0) +
                                    (curU[i - 1] > aliveThreshold ? 1 : 0) +
                                    (curU[i + 1] > aliveThreshold ? 1 : 0) +
                                    (curU[dRow + px - 1] > aliveThreshold ? 1 : 0) +
                                    (curU[dRow + px] > aliveThreshold ? 1 : 0) +
                                    (curU[dRow + px + 1] > aliveThreshold ? 1 : 0)
                                );
                                const isAliveR = curU[i] > aliveThreshold;
                                const nextStateR = isAliveR ? ((surviveMask >> countR) & 1) : ((birthMask >> countR) & 1);
                                const targetR = nextStateR ? halfDensity : 0.0;
                                nU[i] = curU[i] * (1 - blend * cR) + targetR * (blend * cR);

                                // Channel V (Green)
                                const countG = (
                                    (curV[uRow + px - 1] > aliveThreshold ? 1 : 0) +
                                    (curV[uRow + px] > aliveThreshold ? 1 : 0) +
                                    (curV[uRow + px + 1] > aliveThreshold ? 1 : 0) +
                                    (curV[i - 1] > aliveThreshold ? 1 : 0) +
                                    (curV[i + 1] > aliveThreshold ? 1 : 0) +
                                    (curV[dRow + px - 1] > aliveThreshold ? 1 : 0) +
                                    (curV[dRow + px] > aliveThreshold ? 1 : 0) +
                                    (curV[dRow + px + 1] > aliveThreshold ? 1 : 0)
                                );
                                const isAliveG = curV[i] > aliveThreshold;
                                const nextStateG = isAliveG ? ((surviveMask >> countG) & 1) : ((birthMask >> countG) & 1);
                                const targetG = nextStateG ? halfDensity : 0.0;
                                nV[i] = curV[i] * (1 - blend * cG) + targetG * (blend * cG);

                                // Channel W (Blue)
                                const countB = (
                                    (curW[uRow + px - 1] > aliveThreshold ? 1 : 0) +
                                    (curW[uRow + px] > aliveThreshold ? 1 : 0) +
                                    (curW[uRow + px + 1] > aliveThreshold ? 1 : 0) +
                                    (curW[i - 1] > aliveThreshold ? 1 : 0) +
                                    (curW[i + 1] > aliveThreshold ? 1 : 0) +
                                    (curW[dRow + px - 1] > aliveThreshold ? 1 : 0) +
                                    (curW[dRow + px] > aliveThreshold ? 1 : 0) +
                                    (curW[dRow + px + 1] > aliveThreshold ? 1 : 0)
                                );
                                const isAliveB = curW[i] > aliveThreshold;
                                const nextStateB = isAliveB ? ((surviveMask >> countB) & 1) : ((birthMask >> countB) & 1);
                                const targetB = nextStateB ? halfDensity : 0.0;
                                nW[i] = curW[i] * (1 - blend * cB) + targetB * (blend * cB);
                            }
                        }
                        solver.swapBuffers();
                        break;
                    }

                    // 10. RANDOM WALKER
                    case 'walker': {
                        const walkerCount = p.walkerCount ?? 20;
                        const walkerSpeed = p.walkerSpeed ?? (p.jitterStrength ? p.jitterStrength * 5.0 : 2.5);
                        const walkerTrail = p.walkerTrail ?? (p.jitterChance ? p.jitterChance * 3.0 : 2.0);

                        for (let k = 0; k < walkerCount; k++) {
                            const wx = Math.floor(fastRand() * w);
                            const wy = Math.floor(fastRand() * h);
                            const angle = fastRand() * Math.PI * 2;
                            const dx = Math.round(fastCos(angle) * walkerSpeed);
                            const dy = Math.round(fastSin(angle) * walkerSpeed);

                            let nx = wx + dx;
                            let ny = wy + dy;
                            if (isPeriodic) {
                                nx = ((nx % w) + w) % w;
                                ny = ((ny % h) + h) % h;
                            } else {
                                nx = Math.max(0, Math.min(w - 1, nx));
                                ny = Math.max(0, Math.min(h - 1, ny));
                            }
                            const idx = ny * w + nx;
                            solver.u[idx] = Math.min(50.0, solver.u[idx] + walkerTrail * 0.5 * cR);
                            solver.v[idx] = Math.min(50.0, solver.v[idx] + walkerTrail * cG);
                            solver.w[idx] = Math.min(50.0, solver.w[idx] + walkerTrail * 0.7 * cB);
                        }
                        break;
                    }

                    // 11. HYPER-DIMENSIONAL COUPLING
                    case 'multiDim': {
                        const dimCoupling = p.dimCoupling ?? 0.5;
                        const dimSpeed = p.dimSpeed ?? 1.0;
                        const inf = p.multiDimInfluence ?? 1.0;

                        if (inf > 0) {
                            const curU = solver.u;
                            const curV = solver.v;
                            const curW = solver.w;
                            const nU = solver._nextU;
                            const nV = solver._nextV;
                            const nW = solver._nextW;

                            for (let py = 1; py < h - 1; py++) {
                                const yOff = py * w;
                                const uRow = yOff - w;
                                const dRow = yOff + w;

                                for (let px = 1; px < w - 1; px++) {
                                    const i = yOff + px;
                                    const u = curU[i];
                                    const v = curV[i];
                                    const wVal = curW[i];

                                    const lapU = curU[i - 1] + curU[i + 1] + curU[uRow + px] + curU[dRow + px] - 4 * u;
                                    const lapV = curV[i - 1] + curV[i + 1] + curV[uRow + px] + curV[dRow + px] - 4 * v;
                                    const lapW = curW[i - 1] + curW[i + 1] + curW[uRow + px] + curW[dRow + px] - 4 * wVal;

                                    const rotUV = (v - u) * dimCoupling;
                                    const rotVW = (wVal - v) * dimCoupling;
                                    const rotWU = (u - wVal) * dimCoupling;

                                    nU[i] = u + (lapU * 0.1 + rotUV) * dimSpeed * inf * dtSub;
                                    nV[i] = v + (lapV * 0.1 + rotVW) * dimSpeed * inf * dtSub;
                                    nW[i] = wVal + (lapW * 0.1 + rotWU) * dimSpeed * inf * dtSub;
                                }
                            }
                            solver.swapBuffers();
                        }
                        break;
                    }

                    // 12. Optimization P3: VORTEX (Gaussian Exp LUT with Angle and Zoom Feedback)
                    case 'vortex': {
                        const vortexSpeed = (p.vortexSpeed ?? 1.0) * 0.5;
                        const vortexRadius = (p.vortexRadius ?? 0.4) * Math.min(w, h);
                        const cx = (p.vortexCenterX ?? 0.5) * w;
                        const cy = (p.vortexCenterY ?? 0.5) * h;
                        const r2 = vortexRadius * vortexRadius + 1.0;
                        const vortexBlend = p.vortexBlend ?? 1.0;
                        const angleRad = ((p.vortexAngle ?? 0.0) * Math.PI) / 180.0;
                        const cosA = Math.cos(angleRad);
                        const sinA = Math.sin(angleRad);
                        const feedback = p.vortexFeedback ?? 1.0;

                        const curU = solver.u;
                        const curV = solver.v;
                        const curW = solver.w;
                        const nU = solver._nextU;
                        const nV = solver._nextV;
                        const nW = solver._nextW;

                        for (let py = 0; py < h; py++) {
                            const dy = py - cy;
                            const yOff = py * w;
                            for (let px = 0; px < w; px++) {
                                const dx = px - cx;
                                const distSq = dx * dx + dy * dy;
                                const falloff = fastGaussianExp(distSq / r2);

                                const rawVx = -dy * vortexSpeed * falloff * dtSub;
                                const rawVy = dx * vortexSpeed * falloff * dtSub;
                                const vx = rawVx * cosA - rawVy * sinA;
                                const vy = rawVx * sinA + rawVy * cosA;

                                const srcX = cx + (dx - vx) / feedback;
                                const srcY = cy + (dy - vy) / feedback;
                                const idx = yOff + px;

                                sampleBilinear3(curU, curV, curW, w, h, srcX, srcY, isPeriodic, sampleOut);

                                nU[idx] = curU[idx] * (1 - vortexBlend) + sampleOut[0] * vortexBlend;
                                nV[idx] = curV[idx] * (1 - vortexBlend) + sampleOut[1] * vortexBlend;
                                nW[idx] = curW[idx] * (1 - vortexBlend) + sampleOut[2] * vortexBlend;
                            }
                        }
                        solver.swapBuffers();
                        break;
                    }

                    // 13. EXCITABLE WAVES (FitzHugh-Nagumo / BZ)
                    case 'excitable': {
                        const a = p.fnA ?? p.excitableThreshold ?? 0.7;
                        const eps = p.fnEpsilon ?? p.excitableEpsilon ?? 0.08;
                        const b = p.fnB ?? p.excitableRecoveryRate ?? 0.8;
                        const speed = p.excitableWaveSpeed ?? 1.0;
                        const inf = p.fnInfluence ?? p.excitableInfluence ?? 0.8;
                        const stimulus = p.fnStimulus ?? 0.0;

                        const curU = solver.u;
                        const curV = solver.v;
                        const curW = solver.w;
                        const nU = solver._nextU;
                        const nV = solver._nextV;
                        const nW = solver._nextW;

                        for (let py = 1; py < h - 1; py++) {
                            const yOff = py * w;
                            const uRow = yOff - w;
                            const dRow = yOff + w;

                            for (let px = 1; px < w - 1; px++) {
                                const i = yOff + px;
                                const u = curU[i];
                                const v = curV[i];

                                const lapU = curU[i - 1] + curU[i + 1] + curU[uRow + px] + curU[dRow + px] - 4 * u;

                                const du = (speed * lapU + u * (1.0 - u) * (u - a) - v + stimulus) * inf * dtSub;
                                const dv = (eps * (b * u - v)) * inf * dtSub;

                                nU[i] = Math.max(0, u + du);
                                nV[i] = Math.max(0, v + dv);
                                nW[i] = curW[i];
                            }
                        }
                        solver.swapBuffers();
                        break;
                    }

                    // 14. CHROMATIC DISPERSION
                    case 'chromatic': {
                        const dispX = (p.driftU !== undefined ? p.driftU * 50.0 : (p.chromaticDispersionX ?? 1.0)) * dtSub * 10.0;
                        const dispY = (p.driftV !== undefined ? p.driftV * 50.0 : (p.chromaticDispersionY ?? 0.0)) * dtSub * 10.0;
                        const blend = p.chromaMix ?? p.chromaticBlend ?? 0.8;

                        const curU = solver.u;
                        const curV = solver.v;
                        const curW = solver.w;
                        const nU = solver._nextU;
                        const nV = solver._nextV;
                        const nW = solver._nextW;

                        for (let py = 0; py < h; py++) {
                            const yOff = py * w;
                            for (let px = 0; px < w; px++) {
                                const idx = yOff + px;
                                const redU = sampleBilinear(curU, w, h, px + dispX, py + dispY, isPeriodic);
                                const blueW = sampleBilinear(curW, w, h, px - dispX, py - dispY, isPeriodic);

                                nU[idx] = curU[idx] * (1 - blend) + redU * blend;
                                nV[idx] = curV[idx];
                                nW[idx] = curW[idx] * (1 - blend) + blueW * blend;
                            }
                        }
                        solver.swapBuffers();
                        break;
                    }

                    // 15. Optimization P2: CURL TURBULENCE (Tiled Precomputed Noise Field with Directional Flow & Feedback)
                    case 'turbulence': {
                        const turbScale = p.turbScale ?? 0.03;
                        const turbSpeed = p.turbSpeed ?? 0.8;
                        const turbStrength = (p.turbStrength ?? 1.2) * 20.0;
                        const turbInfluence = p.turbInfluence ?? 1.0;
                        const feedback = p.turbFeedback ?? 1.0;
                        const dirX = p.turbDirX ?? 0.0;
                        const dirY = p.turbDirY ?? 0.0;
                        const t = solver.tick * 0.02 * turbSpeed;

                        // Pre-compute 128x128 noise tile once for current frame
                        updateCurlNoiseTile(t, turbScale);

                        const curU = solver.u;
                        const curV = solver.v;
                        const curW = solver.w;
                        const nU = solver._nextU;
                        const nV = solver._nextV;
                        const nW = solver._nextW;

                        const tileMask = CURL_TILE_SIZE - 1;
                        const cx = w * 0.5;
                        const cy = h * 0.5;

                        for (let py = 0; py < h; py++) {
                            const yOff = py * w;
                            const tileY = py & tileMask;
                            const tileRow = tileY * CURL_TILE_SIZE;

                            for (let px = 0; px < w; px++) {
                                const idx = yOff + px;
                                const tileIdx = tileRow + (px & tileMask);
                                const vx = (curlTileVx[tileIdx] + dirX * 1.5) * turbStrength * dtSub;
                                const vy = (curlTileVy[tileIdx] + dirY * 1.5) * turbStrength * dtSub;

                                const rawSrcX = px - vx;
                                const rawSrcY = py - vy;
                                const srcX = cx + (rawSrcX - cx) / feedback;
                                const srcY = cy + (rawSrcY - cy) / feedback;

                                sampleBilinear3(curU, curV, curW, w, h, srcX, srcY, isPeriodic, sampleOut);

                                nU[idx] = curU[idx] * (1 - turbInfluence) + sampleOut[0] * turbInfluence;
                                nV[idx] = curV[idx] * (1 - turbInfluence) + sampleOut[1] * turbInfluence;
                                nW[idx] = curW[idx] * (1 - turbInfluence) + sampleOut[2] * turbInfluence;
                            }
                        }
                        solver.swapBuffers();
                        break;
                    }

                    // 16. SHARPEN
                    case 'sharpen': {
                        const inf = p.sharpenInfluence ?? p.influence ?? 1.0;
                        if (inf <= 0) break;
                        const strength = (p.sharpenStrength ?? 0.5) * inf;
                        const curU = solver.u;
                        const curV = solver.v;
                        const curW = solver.w;
                        const nU = solver._nextU;
                        const nV = solver._nextV;
                        const nW = solver._nextW;

                        for (let py = 1; py < h - 1; py++) {
                            const yOff = py * w;
                            const uRow = yOff - w;
                            const dRow = yOff + w;

                            for (let px = 1; px < w - 1; px++) {
                                const i = yOff + px;
                                const lapU = curU[i - 1] + curU[i + 1] + curU[uRow + px] + curU[dRow + px] - 4 * curU[i];
                                const lapV = curV[i - 1] + curV[i + 1] + curV[uRow + px] + curV[dRow + px] - 4 * curV[i];
                                const lapW = curW[i - 1] + curW[i + 1] + curW[uRow + px] + curW[dRow + px] - 4 * curW[i];

                                nU[i] = Math.max(0, curU[i] - lapU * strength * 0.2);
                                nV[i] = Math.max(0, curV[i] - lapV * strength * 0.2);
                                nW[i] = Math.max(0, curW[i] - lapW * strength * 0.2);
                            }
                        }
                        solver.swapBuffers();
                        break;
                    }

                    // 17. Optimization P7: REACTION KINETICS (Oregonator with Linearly-Implicit Stabilization)
                    case 'reactionKinetics': {
                        const q = p.bzQ ?? p.oregonatorQ ?? 0.002;
                        const fVal = p.bzF ?? p.oregonatorF ?? 1.2;
                        const eps = p.bzEpsilon ?? p.oregonatorEps ?? 0.08;
                        const speed = p.bzSpeed ?? p.reactionSpeed ?? 1.0;
                        const inf = p.bzInfluence ?? p.reactionInfluence ?? 1.0;
                        const diff = p.bzDiffusion ?? 0.25;

                        const curU = solver.u;
                        const curV = solver.v;
                        const curW = solver.w;
                        const nU = solver._nextU;
                        const nV = solver._nextV;
                        const nW = solver._nextW;

                        for (let py = 1; py < h - 1; py++) {
                            const yOff = py * w;
                            const uRow = yOff - w;
                            const dRow = yOff + w;

                            for (let px = 1; px < w - 1; px++) {
                                const i = yOff + px;
                                const u = curU[i];
                                const v = curV[i];

                                const lapU = curU[i - 1] + curU[i + 1] + curU[uRow + px] + curU[dRow + px] - 4 * u;
                                const lapV = curV[i - 1] + curV[i + 1] + curV[uRow + px] + curV[dRow + px] - 4 * v;

                                const denom = u + q + 1e-5;
                                const fReact = (u * (1 - u) - fVal * v * (u - q) / denom) / eps;
                                const df_du = (1 - 2 * u - (fVal * v * 2 * q) / (denom * denom)) / eps;
                                const stabFactor = 1.0 / (1.0 - Math.min(0, df_du) * dtSub * speed * inf);

                                const du = (fReact + lapU * diff) * speed * inf * dtSub * stabFactor;
                                const dv = (u - v + lapV * (diff * 0.5)) * speed * inf * dtSub;

                                nU[i] = Math.max(0, u + du);
                                nV[i] = Math.max(0, v + dv);
                                nW[i] = curW[i];
                            }
                        }
                        solver.swapBuffers();
                        break;
                    }

                    // 18. ELECTRIC ARCS
                    case 'electricArcs': {
                        const branching = p.arcBranching ?? 0.6;
                        const decay = p.arcDecay ?? 0.92;
                        const intensity = (p.arcIntensity ?? 1.5) * (totalDensity || 6.0);
                        const jitter = p.arcJitter ?? 0.4;
                        const driftAngle = p.arcDriftAngle ?? 0.0;
                        const inf = p.arcInfluence ?? 1.0;

                        const decayFactor = Math.max(0.85, Math.min(0.99, decay));
                        const unroll = size - (size % 4);
                        for (let i = 0; i < unroll; i += 4) {
                            solver.w[i] *= decayFactor;
                            solver.w[i + 1] *= decayFactor;
                            solver.w[i + 2] *= decayFactor;
                            solver.w[i + 3] *= decayFactor;
                        }
                        for (let i = unroll; i < size; i++) {
                            solver.w[i] *= decayFactor;
                        }

                        const strikeCount = Math.min(6, Math.floor(branching * 3) + 1);

                        for (let st = 0; st < strikeCount; st++) {
                            let sx = Math.floor(fastRand() * w);
                            let sy = Math.floor(fastRand() * h);

                            let bestCharge = 0;
                            for (let probe = 0; probe < 4; probe++) {
                                const px = Math.floor(fastRand() * w);
                                const py = Math.floor(fastRand() * h);
                                const pIdx = py * w + px;
                                const charge = solver.v[pIdx] + solver.u[pIdx] * 0.5;
                                if (charge > bestCharge) {
                                    bestCharge = charge;
                                    sx = px;
                                    sy = py;
                                }
                            }

                            let curX = sx;
                            let curY = sy;
                            let angle = driftAngle + (fastRand() - 0.5) * 1.2;

                            for (let step = 0; step < 24; step++) {
                                angle += (fastRand() - 0.5) * jitter * 2.0;
                                curX += fastCos(angle) * 2.0;
                                curY += fastSin(angle) * 2.0;

                                let ix = Math.floor(curX);
                                let iy = Math.floor(curY);

                                if (isPeriodic) {
                                    ix = ((ix % w) + w) % w;
                                    iy = ((iy % h) + h) % h;
                                } else if (ix < 0 || ix >= w || iy < 0 || iy >= h) break;

                                const gridIdx = iy * w + ix;
                                solver.u[gridIdx] = Math.min(50.0, solver.u[gridIdx] + intensity * inf);
                                solver.w[gridIdx] = Math.min(50.0, solver.w[gridIdx] + intensity * inf);
                                solver.v[gridIdx] = Math.min(50.0, solver.v[gridIdx] + intensity * inf * 0.4);
                            }
                        }
                        break;
                    }

                    // 19. Optimization P4: QUANTUM PHASE (LUT-Accelerated Phase Interference)
                    case 'quantumPhase': {
                        const hbar = p.quantumHbar ?? 1.0;
                        const coupling = p.quantumCoupling ?? 0.8;
                        const pot = p.quantumPotential ?? 0.5;
                        const phaseSpeed = p.quantumPhaseSpeed ?? 1.0;
                        const interf = p.quantumInterference ?? 0.8;
                        const inf = p.quantumInfluence ?? 1.0;

                        const curU = solver.u;
                        const curV = solver.v;
                        const curW = solver.w;
                        const nU = solver._nextU;
                        const nV = solver._nextV;
                        const nW = solver._nextW;

                        for (let py = 1; py < h - 1; py++) {
                            const yOff = py * w;
                            const uRow = yOff - w;
                            const dRow = yOff + w;

                            for (let px = 1; px < w - 1; px++) {
                                const i = yOff + px;
                                const re = curU[i];
                                const im = curV[i];

                                const lapRe = curU[i - 1] + curU[i + 1] + curU[uRow + px] + curU[dRow + px] - 4 * re;
                                const lapIm = curV[i - 1] + curV[i + 1] + curV[uRow + px] + curV[dRow + px] - 4 * im;

                                const probDensity = (re * re + im * im) / (totalDensity * totalDensity + 0.01);
                                const nonLinearPot = pot + coupling * probDensity;

                                const dRe = (0.5 * hbar * lapIm - nonLinearPot * im) * phaseSpeed * dtSub;
                                const dIm = (-0.5 * hbar * lapRe + nonLinearPot * re) * phaseSpeed * dtSub;

                                const targetRe = Math.max(0, re + dRe);
                                const targetIm = Math.max(0, im + dIm);

                                // Fast 256x256 LUT phase interference lookup
                                const qIx = Math.min(255, Math.max(0, ((targetRe * 64) | 0) + 128));
                                const qIy = Math.min(255, Math.max(0, ((targetIm * 64) | 0) + 128));
                                const phaseInterference = quantumPhaseLUT[qIy * QUANTUM_LUT_SIZE + qIx] * probDensity * totalDensity * 0.3;

                                nU[i] = re * (1 - inf) + targetRe * inf;
                                nV[i] = im * (1 - inf) + targetIm * inf;
                                nW[i] = curW[i] * (1 - inf) + Math.max(0, curW[i] + phaseInterference * interf) * inf;
                            }
                        }
                        solver.swapBuffers();
                        break;
                    }

                    // 20. THERMAL CONVECTION
                    case 'thermalConvection': {
                        const buoyancy = p.buoyancy ?? 1.4;
                        const heatSource = p.heatSource ?? 0.8;
                        const cooling = p.coolingRate ?? 0.05;
                        const thermalDiff = p.thermalDiff ?? 0.2;
                        const plumeTurb = p.plumeTurbulence ?? 0.5;
                        const inf = p.convectionInfluence ?? p.thermalInfluence ?? 1.0;

                        const curU = solver.u;
                        const curV = solver.v;
                        const curW = solver.w;
                        const nU = solver._nextU;
                        const nV = solver._nextV;
                        const nW = solver._nextW;

                        for (let py = 1; py < h - 1; py++) {
                            const yOff = py * w;
                            const uRow = yOff - w;
                            const dRow = yOff + w;

                            for (let px = 1; px < w - 1; px++) {
                                const i = yOff + px;
                                if (py >= h - 3) {
                                    curW[i] = Math.max(curW[i], heatSource * (totalDensity || 6.0));
                                    curU[i] = Math.max(curU[i], heatSource * (totalDensity || 6.0) * 0.4);
                                }
                                const temp = curW[i];
                                const lapT = curW[i - 1] + curW[i + 1] + curW[uRow + px] + curW[dRow + px] - 4 * temp;

                                solver.vx[i] += (fastRand() - 0.5) * plumeTurb * buoyancy * 0.2;
                                solver.vy[i] += (temp * 0.03 * buoyancy - 0.01) * dtSub;
                                solver.vx[i] *= 0.98;
                                solver.vy[i] *= 0.98;

                                const srcX = px - solver.vx[i] * dtSub * 15.0;
                                const srcY = py - solver.vy[i] * dtSub * 15.0;

                                sampleBilinear3(curU, curV, curW, w, h, srcX, srcY, isPeriodic, sampleOut);

                                nU[i] = curU[i] * (1 - inf) + sampleOut[0] * inf;
                                nV[i] = curV[i] * (1 - inf) + sampleOut[1] * inf;
                                nW[i] = Math.max(0, temp + (thermalDiff * lapT - cooling * temp) * dtSub);
                            }
                        }
                        solver.swapBuffers();
                        break;
                    }

                    // 21. Optimization P5: CRYSTAL SNOWFLAKE (Anisotropy LUT Accelerated)
                    case 'crystalSnowflake': {
                        const anisotropy = p.anisotropyStrength ?? p.snowflakeAnisotropy ?? 0.05;
                        const supercooling = p.freezingRate ?? p.snowflakeSupercooling ?? 0.7;
                        const growth = p.vaporSupersaturation ?? p.snowflakeGrowthSpeed ?? 1.2;
                        const inf = p.crystalInfluence ?? p.snowflakeInfluence ?? 1.0;

                        const aLut = ensureAnisLUT(anisotropy);

                        const curU = solver.u;
                        const curV = solver.v;
                        const curW = solver.w;
                        const nU = solver._nextU;
                        const nV = solver._nextV;
                        const nW = solver._nextW;

                        for (let py = 1; py < h - 1; py++) {
                            const yOff = py * w;
                            const uRow = yOff - w;
                            const dRow = yOff + w;

                            for (let px = 1; px < w - 1; px++) {
                                const i = yOff + px;
                                const phi = curV[i];

                                const dPhiX = (curV[i + 1] - curV[i - 1]) * 0.5;
                                const dPhiY = (curV[dRow + px] - curV[uRow + px]) * 0.5;

                                const theta = fastAtan2(dPhiY, dPhiX);
                                const thetaIdx = (((theta + Math.PI) * (ANIS_LUT_SIZE / (Math.PI * 2))) | 0) & (ANIS_LUT_SIZE - 1);
                                const eps = aLut[thetaIdx];

                                const lapPhi = curV[i - 1] + curV[i + 1] + curV[uRow + px] + curV[dRow + px] - 4 * phi;
                                const dPhi = (eps * eps * lapPhi + phi * (1.0 - phi) * (phi - 0.5 + supercooling * (1.0 - curU[i] / (totalDensity || 6.0)))) * growth * dtSub;

                                nU[i] = Math.max(0, curU[i] - dPhi * 0.5);
                                nV[i] = phi * (1 - inf) + Math.max(0, Math.min(50.0, phi + dPhi)) * inf;
                                nW[i] = curW[i];
                            }
                        }
                        solver.swapBuffers();
                        break;
                    }

                    // 22. Optimization P8: SURFACE TENSION (Cahn-Hilliard Phase Separation)
                    case 'surfaceTension': {
                        const mobility = (p.surfaceMobility ?? 0.4) * 0.5;
                        const tension = p.interfacialTension ?? 0.15;
                        const sep = p.phaseSeparation ?? 1.0;
                        const inf = p.tensionInfluence ?? 1.0;
                        const density = totalDensity || 6.0;

                        const curU = solver.u;
                        const curV = solver.v;
                        const curW = solver.w;
                        const nU = solver._nextU;
                        const nV = solver._nextV;
                        const nW = solver._nextW;

                        for (let py = 1; py < h - 1; py++) {
                            const yOff = py * w;
                            const uRow = yOff - w;
                            const dRow = yOff + w;

                            for (let px = 1; px < w - 1; px++) {
                                const i = yOff + px;
                                const valU = curU[i];
                                const phiU = (valU / density) * 2.0 - 1.0;
                                const lapU = curU[i - 1] + curU[i + 1] + curU[uRow + px] + curU[dRow + px] - 4 * valU;
                                const muU = (phiU * phiU * phiU - phiU) * sep - (tension / density) * lapU;

                                const valV = curV[i];
                                const phiV = (valV / density) * 2.0 - 1.0;
                                const lapV = curV[i - 1] + curV[i + 1] + curV[uRow + px] + curV[dRow + px] - 4 * valV;
                                const muV = (phiV * phiV * phiV - phiV) * sep - (tension / density) * lapV;

                                const nextUVal = Math.max(0, Math.min(density * 1.5, valU + (mobility * lapU - muU * 0.5) * dtSub * density));
                                const nextVVal = Math.max(0, Math.min(density * 1.5, valV + (mobility * lapV - muV * 0.5) * dtSub * density));

                                nU[i] = valU * (1 - inf) + nextUVal * inf;
                                nV[i] = valV * (1 - inf) + nextVVal * inf;
                                nW[i] = curW[i];
                            }
                        }
                        solver.swapBuffers();
                        break;
                    }

                    // 23. LENIA (Continuous Cellular Automata)
                    case 'lenia': {
                        if (!cachedLeniaEngine || cachedLeniaEngine.width !== w || cachedLeniaEngine.height !== h) {
                            cachedLeniaEngine = new LeniaEngine(w, h, p.radius ?? 13);
                        }
                        cachedLeniaEngine.step(solver, {
                            radius: p.radius ?? 13,
                            mu: p.mu ?? 0.15,
                            sigma: p.sigma ?? 0.035,
                            kernelMu: p.kernelMu ?? 0.5,
                            kernelSigma: p.kernelSigma ?? 0.15,
                            dt: p.leniaDt ?? p.dt ?? 0.1,
                            influence: p.leniaInfluence ?? p.influence ?? 1.0,
                            couplingR: cR,
                            couplingG: cG,
                            couplingB: cB,
                            isRGB: isRGBMode
                        });
                        break;
                    }

                    // 24. PHYSARUM POLYCEPHALUM (Slime Mold Agent Chemotaxis)
                    case 'physarum': {
                        if (!cachedPhysarumEngine || cachedPhysarumEngine.width !== w || cachedPhysarumEngine.height !== h) {
                            cachedPhysarumEngine = new PhysarumEngine(w, h, p.agentCount ?? 15000);
                        }
                        cachedPhysarumEngine.step(solver, {
                            agentCount: p.agentCount ?? 15000,
                            sensorAngle: p.sensorAngle ?? 0.45,
                            sensorDistance: p.sensorDistance ?? 8.0,
                            rotationAngle: p.rotationAngle ?? 0.4,
                            stepSize: p.stepSize ?? 1.5,
                            depositAmount: p.depositAmount ?? 1.8,
                            decayFactor: p.decayFactor ?? 0.96,
                            diffuseFactor: p.diffuseFactor ?? 0.2,
                            influence: p.physarumInfluence ?? 1.0,
                            gridCoupling: p.gridCoupling !== false
                        });
                        break;
                    }

                    // 25. LATTICE BOLTZMANN (LBM D2Q9 Microscopic Hydrodynamics)
                    case 'lbm': {
                        if (!cachedLBMEngine || cachedLBMEngine.width !== w || cachedLBMEngine.height !== h) {
                            cachedLBMEngine = new LBMD2Q9Engine(w, h);
                        }
                        cachedLBMEngine.step(solver, {
                            tau: p.tau ?? 0.8,
                            gravityX: p.gravityX ?? 0.0,
                            gravityY: p.gravityY ?? -0.005,
                            coupling: p.coupling ?? 1.0,
                            influence: p.lbmInfluence ?? 1.0
                        });
                        break;
                    }
                }
            }
        }

        // Media Video injection
        if (videoData) {
            const vOp = (videoData.opacity / steps);
            for (let i = 0; i < size; i++) {
                const vIdx = i * 4;
                if (vIdx < videoData.data.length) {
                    if (videoData.isRGB) {
                        const srcU = (videoData.data[vIdx] / 255) * totalDensity;
                        const srcV = (videoData.data[vIdx + 1] / 255) * totalDensity;
                        const srcW = (videoData.data[vIdx + 2] / 255) * totalDensity;
                        solver.u[i] += (srcU - solver.u[i]) * vOp;
                        solver.v[i] += (srcV - solver.v[i]) * vOp;
                        solver.w[i] += (srcW - solver.w[i]) * vOp;
                    } else {
                        const lum = (videoData.data[vIdx] * 0.299 + videoData.data[vIdx + 1] * 0.587 + videoData.data[vIdx + 2] * 0.114) / 255;
                        const srcVal = lum * totalDensity;
                        solver.v[i] += (srcVal - solver.v[i]) * vOp;
                    }
                }
            }
        }

        if (continuousSeedsData && continuousSeedsData.length > 0) {
            applyContinuousSeeds(solver, totalDensity, continuousSeedsData, steps);
        }

        // Dissipation & Retention (4-Way Unrolled)
        const fadeOutRate = params.fadeOutRate ?? 0.8;
        if (Math.abs(fadeOutRate - 0.8) > 0.01) {
            if (fadeOutRate < 0.8) {
                const retainCoeff = 1.0 + (0.8 - fadeOutRate) * 0.06 * dtSub;
                const unroll = size - (size % 4);
                for (let i = 0; i < unroll; i += 4) {
                    solver.v[i] = Math.min(50.0, solver.v[i] * retainCoeff);
                    solver.w[i] = Math.min(50.0, solver.w[i] * retainCoeff);
                    solver.v[i + 1] = Math.min(50.0, solver.v[i + 1] * retainCoeff);
                    solver.w[i + 1] = Math.min(50.0, solver.w[i + 1] * retainCoeff);
                    solver.v[i + 2] = Math.min(50.0, solver.v[i + 2] * retainCoeff);
                    solver.w[i + 2] = Math.min(50.0, solver.w[i + 2] * retainCoeff);
                    solver.v[i + 3] = Math.min(50.0, solver.v[i + 3] * retainCoeff);
                    solver.w[i + 3] = Math.min(50.0, solver.w[i + 3] * retainCoeff);
                }
                for (let i = unroll; i < size; i++) {
                    solver.v[i] = Math.min(50.0, solver.v[i] * retainCoeff);
                    solver.w[i] = Math.min(50.0, solver.w[i] * retainCoeff);
                }
            } else {
                const dissipateCoeff = Math.max(0.0, 1.0 - (fadeOutRate - 0.8) * 0.25 * dtSub);
                const unroll = size - (size % 4);
                for (let i = 0; i < unroll; i += 4) {
                    solver.v[i] *= dissipateCoeff;
                    solver.w[i] *= dissipateCoeff;
                    solver.v[i + 1] *= dissipateCoeff;
                    solver.w[i + 1] *= dissipateCoeff;
                    solver.v[i + 2] *= dissipateCoeff;
                    solver.w[i + 2] *= dissipateCoeff;
                    solver.v[i + 3] *= dissipateCoeff;
                    solver.w[i + 3] *= dissipateCoeff;
                }
                for (let i = unroll; i < size; i++) {
                    solver.v[i] *= dissipateCoeff;
                    solver.w[i] *= dissipateCoeff;
                }
            }
        }

        // Optimization P1: Fast numerical sanitization pass (NaN check + clamp without isFinite function call overhead)
        const unroll = size - (size % 4);
        for (let i = 0; i < unroll; i += 4) {
            let u0 = solver.u[i], v0 = solver.v[i], w0 = solver.w[i];
            if (u0 !== u0 || u0 < 0) u0 = 0; else if (u0 > 50.0) u0 = 50.0;
            if (v0 !== v0 || v0 < 0) v0 = 0; else if (v0 > 50.0) v0 = 50.0;
            if (w0 !== w0 || w0 < 0) w0 = 0; else if (w0 > 50.0) w0 = 50.0;
            solver.u[i] = u0; solver.v[i] = v0; solver.w[i] = w0;

            let u1 = solver.u[i + 1], v1 = solver.v[i + 1], w1 = solver.w[i + 1];
            if (u1 !== u1 || u1 < 0) u1 = 0; else if (u1 > 50.0) u1 = 50.0;
            if (v1 !== v1 || v1 < 0) v1 = 0; else if (v1 > 50.0) v1 = 50.0;
            if (w1 !== w1 || w1 < 0) w1 = 0; else if (w1 > 50.0) w1 = 50.0;
            solver.u[i + 1] = u1; solver.v[i + 1] = v1; solver.w[i + 1] = w1;

            let u2 = solver.u[i + 2], v2 = solver.v[i + 2], w2 = solver.w[i + 2];
            if (u2 !== u2 || u2 < 0) u2 = 0; else if (u2 > 50.0) u2 = 50.0;
            if (v2 !== v2 || v2 < 0) v2 = 0; else if (v2 > 50.0) v2 = 50.0;
            if (w2 !== w2 || w2 < 0) w2 = 0; else if (w2 > 50.0) w2 = 50.0;
            solver.u[i + 2] = u2; solver.v[i + 2] = v2; solver.w[i + 2] = w2;

            let u3 = solver.u[i + 3], v3 = solver.v[i + 3], w3 = solver.w[i + 3];
            if (u3 !== u3 || u3 < 0) u3 = 0; else if (u3 > 50.0) u3 = 50.0;
            if (v3 !== v3 || v3 < 0) v3 = 0; else if (v3 > 50.0) v3 = 50.0;
            if (w3 !== w3 || w3 < 0) w3 = 0; else if (w3 > 50.0) w3 = 50.0;
            solver.u[i + 3] = u3; solver.v[i + 3] = v3; solver.w[i + 3] = w3;
        }
        for (let i = unroll; i < size; i++) {
            let uVal = solver.u[i];
            let vVal = solver.v[i];
            let wVal = solver.w[i];

            if (uVal !== uVal || uVal < 0) uVal = 0; else if (uVal > 50.0) uVal = 50.0;
            if (vVal !== vVal || vVal < 0) vVal = 0; else if (vVal > 50.0) vVal = 50.0;
            if (wVal !== wVal || wVal < 0) wVal = 0; else if (wVal > 50.0) wVal = 50.0;

            solver.u[i] = uVal;
            solver.v[i] = vVal;
            solver.w[i] = wVal;
        }
    }
}
