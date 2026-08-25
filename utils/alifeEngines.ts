/**
 * High-Performance Artificial Life & Microscopic Hydrodynamics Engines.
 *
 * Includes:
 * - Continuous Lenia (Continuous-space donut kernel convolutions & non-linear growth mappings, arXiv:1812.05433)
 * - Physarum Polycephalum (Multi-agent sensory chemotaxis foraging swarms, Jeff Jones 2010)
 * - Lattice Boltzmann Method LBM D2Q9 (Bhatnagar-Gross-Krook hydrodynamic collision-streaming, Chen & Doolen 1998)
 */

import { fastRand, sampleBilinear, sampleBilinear3 } from './physics';
import { McRDSolver } from './solver';

// Fast Precomputed Trigonometric & Exponential LUTs (4096-entry)
const TRIG_LUT_SIZE = 4096;
const TRIG_MASK = TRIG_LUT_SIZE - 1;
const RAD_TO_LUT = TRIG_LUT_SIZE / (Math.PI * 2);
const sinLUT = new Float32Array(TRIG_LUT_SIZE);
const cosLUT = new Float32Array(TRIG_LUT_SIZE);

for (let i = 0; i < TRIG_LUT_SIZE; i++) {
    const angle = (i / TRIG_LUT_SIZE) * Math.PI * 2;
    sinLUT[i] = Math.sin(angle);
    cosLUT[i] = Math.cos(angle);
}

export function fastSin(rad: number): number {
    const idx = ((rad * RAD_TO_LUT) | 0) & TRIG_MASK;
    return sinLUT[idx < 0 ? idx + TRIG_LUT_SIZE : idx];
}

export function fastCos(rad: number): number {
    const idx = ((rad * RAD_TO_LUT) | 0) & TRIG_MASK;
    return cosLUT[idx < 0 ? idx + TRIG_LUT_SIZE : idx];
}

// 2048-entry Gaussian Exp LUT for Lenia Growth Mapping & Physics
const EXP_LUT_SIZE = 2048;
export const expLUT = new Float32Array(EXP_LUT_SIZE);
for (let i = 0; i < EXP_LUT_SIZE; i++) {
    const x = (i / (EXP_LUT_SIZE - 1)) * 12.0; // range 0 to 12
    expLUT[i] = Math.exp(-x);
}

export function fastGaussianExp(sqDistDiv2SigmaSq: number): number {
    if (sqDistDiv2SigmaSq >= 12.0) return 0;
    const idx = (sqDistDiv2SigmaSq * (EXP_LUT_SIZE - 1) / 12.0) | 0;
    return expLUT[idx < 0 ? 0 : idx];
}

// Reusable static sample tuple for zero-allocation sampling
const lbmSampleOut: [number, number, number] = [0, 0, 0];

// ============================================================================
// 1. ULTRA-FAST LENIA CONTINUOUS CELLULAR AUTOMATA ENGINE
// ============================================================================
export interface LeniaConfig {
    radius: number;         // Kernel radius R (e.g., 10 to 18)
    mu: number;             // Growth center mu (e.g., 0.15)
    sigma: number;          // Growth width sigma (e.g., 0.015)
    kernelMu: number;       // Radial kernel ring center (0.5)
    kernelSigma: number;    // Radial kernel ring width (0.15)
    dt: number;             // Step integration time (0.1)
    influence: number;      // Blend influence (1.0)
    couplingR?: number;
    couplingG?: number;
    couplingB?: number;
    isRGB?: boolean;
    totalDensity?: number;
}

export class LeniaEngine {
    width: number;
    height: number;
    kernelRadius: number = 0;
    
    // Sparse Active Kernel Elements
    sparseDx: Int16Array = new Int16Array(0);
    sparseDy: Int16Array = new Int16Array(0);
    sparseOffsets: Int32Array = new Int32Array(0); // Precomputed linear offsets (eliminates inner multiplications)
    sparseWeights: Float32Array = new Float32Array(0);
    sparseCount: number = 0;
    kernelSum: number = 1.0;

    constructor(width: number, height: number, radius: number = 13) {
        this.width = width;
        this.height = height;
        this.buildSparseKernel(radius, 0.5, 0.15);
    }

    buildSparseKernel(radius: number, kernelMu: number = 0.5, kernelSigma: number = 0.15) {
        this.kernelRadius = Math.max(3, Math.min(20, Math.round(radius)));
        const r = this.kernelRadius;
        const w = this.width;
        
        const tempDx: number[] = [];
        const tempDy: number[] = [];
        const tempOff: number[] = [];
        const tempW: number[] = [];
        let sum = 0;

        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const dist = Math.sqrt(dx * dx + dy * dy) / r;
                if (dist <= 1.0) {
                    const val = Math.exp(-((dist - kernelMu) ** 2) / (2 * kernelSigma * kernelSigma));
                    if (val > 0.0001) {
                        tempDx.push(dx);
                        tempDy.push(dy);
                        tempOff.push(dy * w + dx);
                        tempW.push(val);
                        sum += val;
                    }
                }
            }
        }

        this.sparseCount = tempDx.length;
        this.sparseDx = new Int16Array(tempDx);
        this.sparseDy = new Int16Array(tempDy);
        this.sparseOffsets = new Int32Array(tempOff);
        this.sparseWeights = new Float32Array(tempW);
        this.kernelSum = sum > 0 ? sum : 1.0;
    }

    // Step Lenia field evolution on solver grid (Vectorized Linear Sweeps with Multi-Channel RGB Coupling)
    step(solver: McRDSolver, config: LeniaConfig) {
        if (config.radius !== this.kernelRadius || solver.width !== this.width || solver.height !== this.height) {
            this.width = solver.width;
            this.height = solver.height;
            this.buildSparseKernel(config.radius, config.kernelMu ?? 0.5, config.kernelSigma ?? 0.15);
        }

        const w = this.width;
        const h = this.height;
        const count = this.sparseCount;
        const sOffsets = this.sparseOffsets;
        const sDx = this.sparseDx;
        const sDy = this.sparseDy;
        const sW = this.sparseWeights;
        const invKSum = 1.0 / this.kernelSum;
        const mu = config.mu ?? 0.15;
        const sigma = Math.max(0.005, config.sigma ?? 0.035);
        const invTwoSigmaSq = 1.0 / (2.0 * sigma * sigma);
        const dt = config.dt ?? 0.1;
        const baseInf = config.influence ?? 1.0;
        const cR = config.couplingR ?? 1.0;
        const cG = config.couplingG ?? 1.0;
        const cB = config.couplingB ?? 1.0;
        const infR = baseInf * cR;
        const infG = baseInf * cG;
        const infB = baseInf * cB;

        const totalDensity = config.totalDensity ?? 6.0;
        const invDensity = 1.0 / totalDensity;

        // Process channels (U, and V, W if RGB / coupling is active)
        const channels: Array<{ src: Float32Array; dst: Float32Array; inf: number }> = [
            { src: solver.u, dst: solver._nextU, inf: infR }
        ];

        if (config.isRGB || cG > 0.01 || cB > 0.01) {
            channels.push({ src: solver.v, dst: solver._nextV, inf: infG });
            channels.push({ src: solver.w, dst: solver._nextW, inf: infB });
        } else {
            solver._nextV.set(solver.v);
            solver._nextW.set(solver.w);
        }

        const r = this.kernelRadius;

        for (const ch of channels) {
            const src = ch.src;
            const dst = ch.dst;
            const inf = ch.inf;

            // Interior Bulk Loop
            for (let y = r; y < h - r; y++) {
                const yOff = y * w;
                for (let x = r; x < w - r; x++) {
                    const i = yOff + x;
                    let conv = 0;

                    for (let k = 0; k < count; k++) {
                        conv += src[i + sOffsets[k]] * sW[k];
                    }

                    const n = (conv * invKSum) * invDensity;
                    const diff = n - mu;
                    const growth = 2.0 * fastGaussianExp(diff * diff * invTwoSigmaSq) - 1.0;

                    const curVal = src[i];
                    const nextVal = Math.max(0.0, Math.min(totalDensity, curVal + dt * growth * totalDensity));

                    dst[i] = curVal * (1.0 - inf) + nextVal * inf;
                }
            }

            // Boundary Halo Sweeps (Periodic Wrapping)
            for (let y = 0; y < h; y++) {
                const isBorderY = y < r || y >= h - r;

                const sweepRow = (xMin: number, xMax: number) => {
                    for (let x = xMin; x < xMax; x++) {
                        const i = y * w + x;
                        let conv = 0;

                        for (let k = 0; k < count; k++) {
                            const sx = ((x + sDx[k]) % w + w) % w;
                            const sy = ((y + sDy[k]) % h + h) % h;
                            conv += src[sy * w + sx] * sW[k];
                        }

                        const n = (conv * invKSum) * invDensity;
                        const diff = n - mu;
                        const growth = 2.0 * fastGaussianExp(diff * diff * invTwoSigmaSq) - 1.0;

                        const curVal = src[i];
                        const nextVal = Math.max(0.0, Math.min(totalDensity, curVal + dt * growth * totalDensity));

                        dst[i] = curVal * (1.0 - inf) + nextVal * inf;
                    }
                };

                if (isBorderY) {
                    sweepRow(0, w);
                } else {
                    sweepRow(0, r);
                    sweepRow(w - r, w);
                }
            }
        }

        solver.swapBuffers();
    }
}

// ============================================================================
// 2. ULTRA-FAST PHYSARUM POLYCEPHALUM SLIME MOLD AGENT ENGINE
// ============================================================================
export interface PhysarumConfig {
    agentCount: number;         // Number of agents (e.g. 5,000 to 50,000)
    sensorAngle: number;        // Sensor angle offset (e.g. 0.45 radians ~ 25 deg)
    sensorDistance: number;     // Sensor distance (e.g. 6 to 12 pixels)
    rotationAngle: number;      // Turn angle rate (e.g. 0.4 radians)
    stepSize: number;           // Move distance per step (e.g. 1.2 to 2.5)
    depositAmount: number;      // Chemoattractant trail deposit amount (e.g. 2.0)
    decayFactor: number;        // Trail field dissipation rate (e.g. 0.96)
    diffuseFactor: number;      // Trail field blur/diffusion (e.g. 0.2)
    influence: number;          // Blend influence
    gridCoupling?: number | boolean; // Bidirectional simulation grid coupling (0.0 to 2.0)
}

export class PhysarumEngine {
    width: number;
    height: number;
    agents: Float32Array; // Stride 3: [x, y, angle]
    agentCount: number = 0;
    diffuseBuffer: Float32Array; // Ping-pong buffer for symmetric artifact-free diffusion
    trail: Float32Array;         // Internal persistent trail map for direct execution

    constructor(width: number, height: number, initialAgents: number = 25000) {
        this.width = width;
        this.height = height;
        this.agents = new Float32Array(0);
        this.diffuseBuffer = new Float32Array(width * height);
        this.trail = new Float32Array(width * height);
        this.initAgents(initialAgents);
    }

    initAgents(count: number) {
        this.agentCount = count;
        this.agents = new Float32Array(count * 3);
        const w = this.width;
        const h = this.height;

        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            this.agents[idx] = fastRand() * w;
            this.agents[idx + 1] = fastRand() * h;
            this.agents[idx + 2] = fastRand() * Math.PI * 2;
        }
    }

    reset() {
        this.trail.fill(0);
        this.diffuseBuffer.fill(0);
        this.initAgents(this.agentCount);
    }

    injectTrail(x: number, y: number, radius: number, amount: number) {
        const w = this.width;
        const h = this.height;
        const r = Math.max(1, Math.round(radius));
        const cx = Math.round(x);
        const cy = Math.round(y);

        for (let dy = -r; dy <= r; dy++) {
            const py = ((cy + dy) % h + h) % h;
            const yOff = py * w;
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy <= r * r) {
                    const px = ((cx + dx) % w + w) % w;
                    this.trail[yOff + px] = Math.min(50.0, this.trail[yOff + px] + amount);
                }
            }
        }
    }

    // Direct execution on custom or internal Float32Array trail buffers
    stepDirect(trailTarget: Float32Array, uTarget: Float32Array | null, config: PhysarumConfig) {
        const targetCount = Math.max(500, Math.min(60000, config.agentCount));
        if (targetCount !== this.agentCount || this.agents.length !== targetCount * 3) {
            this.initAgents(targetCount);
        }

        const w = this.width;
        const h = this.height;
        const sAngle = config.sensorAngle ?? 0.45;
        const sDist = config.sensorDistance ?? 8.0;
        const rAngle = config.rotationAngle ?? 0.4;
        const stepDist = config.stepSize ?? 1.5;
        const deposit = config.depositAmount ?? 1.8;
        const inf = config.influence ?? 1.0;
        const coupling = typeof config.gridCoupling === 'number'
            ? config.gridCoupling
            : (config.gridCoupling === false ? 0.0 : 1.0);
        const gridAttractWeight = coupling * 4.0;

        const count = this.agentCount;
        const agents = this.agents;
        const trail = trailTarget;

        // 1. Sensory Perception & Chemotaxis Motion
        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            let ax = agents[idx];
            let ay = agents[idx + 1];
            let angle = agents[idx + 2];

            // Sensor positions (Left, Center, Right) using fast LUT trigonometry
            const leftAngle = angle - sAngle;
            const rightAngle = angle + sAngle;

            const lX = ((ax + fastCos(leftAngle) * sDist) % w + w) % w;
            const lY = ((ay + fastSin(leftAngle) * sDist) % h + h) % h;
            const cX = ((ax + fastCos(angle) * sDist) % w + w) % w;
            const cY = ((ay + fastSin(angle) * sDist) % h + h) % h;
            const rX = ((ax + fastCos(rightAngle) * sDist) % w + w) % w;
            const rY = ((ay + fastSin(rightAngle) * sDist) % h + h) % h;

            const lIdx = (lY | 0) * w + (lX | 0);
            const cIdx = (cY | 0) * w + (cX | 0);
            const rIdx = (rY | 0) * w + (rX | 0);

            const gridLeft = (coupling > 0.001 && uTarget) ? uTarget[lIdx] * gridAttractWeight : 0;
            const gridCenter = (coupling > 0.001 && uTarget) ? uTarget[cIdx] * gridAttractWeight : 0;
            const gridRight = (coupling > 0.001 && uTarget) ? uTarget[rIdx] * gridAttractWeight : 0;

            const senseLeft = trail[lIdx] + gridLeft;
            const senseCenter = trail[cIdx] + gridCenter;
            const senseRight = trail[rIdx] + gridRight;

            // Jeff Jones Chemotactic Motor Decision Rule
            if (senseCenter > senseLeft && senseCenter > senseRight) {
                // Keep orientation forward
            } else if (senseLeft > senseRight) {
                angle -= rAngle;
            } else if (senseRight > senseLeft) {
                angle += rAngle;
            } else {
                angle += (fastRand() - 0.5) * rAngle * 0.8;
            }

            // Move forward
            ax = ((ax + fastCos(angle) * stepDist) % w + w) % w;
            ay = ((ay + fastSin(angle) * stepDist) % h + h) % h;

            agents[idx] = ax;
            agents[idx + 1] = ay;
            agents[idx + 2] = angle;

            // Deposit chemoattractant trail
            const gridIdx = (ay | 0) * w + (ax | 0);
            trail[gridIdx] = Math.min(50.0, trail[gridIdx] + deposit * inf);
        }

        // 2. High-speed decay pass (continuous GPU shader computes full spatial diffusion)
        const decay = Math.min(0.999, Math.max(0.7, config.decayFactor ?? 0.96));
        const total = w * h;
        for (let i = 0; i < total; i++) {
            trail[i] *= decay;
        }

        if (uTarget && coupling > 0.001) {
            const feedInf = inf * 0.2 * coupling;
            for (let i = 0; i < total; i++) {
                uTarget[i] = Math.min(8.0, Math.max(0.0, uTarget[i] + (trail[i] * 0.12 - 0.01) * feedInf));
            }
        }
    }

    step(solver: McRDSolver, config: PhysarumConfig) {
        if (solver.width !== this.width || solver.height !== this.height) {
            this.width = solver.width;
            this.height = solver.height;
            this.diffuseBuffer = new Float32Array(this.width * this.height);
            this.trail = new Float32Array(this.width * this.height);
            this.initAgents(this.agentCount);
        }

        this.stepDirect(solver.v, solver.u, config);
    }
}

// ============================================================================
// 3. ULTRA-FAST LATTICE BOLTZMANN METHOD (LBM D2Q9) HYDRODYNAMICS ENGINE
// ============================================================================
export interface LBMConfig {
    tau: number;                // Relaxation time (controls kinematic viscosity: nu = (2*tau - 1)/6)
    gravityY: number;           // Buoyant / body vertical force
    gravityX: number;           // Horizontal flow drive
    coupling: number;           // Morphogen density coupling
    influence: number;
}

export class LBMD2Q9Engine {
    width: number;
    height: number;
    // Interleaved 9-velocity distribution buffers: [size * 9]
    f: Float32Array;
    fNext: Float32Array;

    // D2Q9 lattice constants
    static W0 = 4 / 9;
    static W_CARD = 1 / 9;
    static W_DIAG = 1 / 36;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        const total = width * height * 9;
        this.f = new Float32Array(total);
        this.fNext = new Float32Array(total);
        this.reset();
    }

    reset() {
        const size = this.width * this.height;
        const W0 = LBMD2Q9Engine.W0;
        const WC = LBMD2Q9Engine.W_CARD;
        const WD = LBMD2Q9Engine.W_DIAG;

        for (let i = 0; i < size; i++) {
            const base = i * 9;
            this.f[base] = W0;
            this.f[base + 1] = WC;
            this.f[base + 2] = WC;
            this.f[base + 3] = WC;
            this.f[base + 4] = WC;
            this.f[base + 5] = WD;
            this.f[base + 6] = WD;
            this.f[base + 7] = WD;
            this.f[base + 8] = WD;

            this.fNext[base] = W0;
            this.fNext[base + 1] = WC;
            this.fNext[base + 2] = WC;
            this.fNext[base + 3] = WC;
            this.fNext[base + 4] = WC;
            this.fNext[base + 5] = WD;
            this.fNext[base + 6] = WD;
            this.fNext[base + 7] = WD;
            this.fNext[base + 8] = WD;
        }
    }

    step(solver: McRDSolver, config: LBMConfig) {
        if (solver.width !== this.width || solver.height !== this.height) {
            this.width = solver.width;
            this.height = solver.height;
            const total = this.width * this.height * 9;
            this.f = new Float32Array(total);
            this.fNext = new Float32Array(total);
            this.reset();
        }

        const w = this.width;
        const h = this.height;
        const size = w * h;
        const tau = Math.max(0.55, config.tau);
        const invTau = 1.0 / tau;
        const oneMinusInvTau = 1.0 - invTau;
        const gx = config.gravityX;
        const gy = config.gravityY;
        const coupling = config.coupling;

        const W0 = LBMD2Q9Engine.W0;
        const WC = LBMD2Q9Engine.W_CARD;
        const WD = LBMD2Q9Engine.W_DIAG;

        const f = this.f;
        const fNext = this.fNext;

        const vx = solver.vx;
        const vy = solver.vy;
        const svW = solver.w;
        const svV = solver.v;

        // 1. Optimization A4: Unrolled Collision & Equilibrium BGK Relaxation
        for (let i = 0; i < size; i++) {
            const base = i * 9;

            const f0 = f[base];
            const f1 = f[base + 1];
            const f2 = f[base + 2];
            const f3 = f[base + 3];
            const f4 = f[base + 4];
            const f5 = f[base + 5];
            const f6 = f[base + 6];
            const f7 = f[base + 7];
            const f8 = f[base + 8];

            const rho = f0 + f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8;
            const invRho = 1.0 / (rho > 1e-4 ? rho : 1.0);

            let ux = (f1 - f3 + f5 - f6 - f7 + f8) * invRho;
            let uy = (f2 - f4 + f5 + f6 - f7 - f8) * invRho;

            // Morphogen thermal buoyancy coupling
            const thermalBuoyancy = (svW[i] + svV[i] * 0.2) * 0.05 * coupling;
            ux += gx;
            uy += gy - thermalBuoyancy;

            // Limit macroscopic velocity to sound speed limit (Mach < 0.4 for stability)
            const speedSq = ux * ux + uy * uy;
            if (speedSq > 0.16) {
                const scale = 0.4 / Math.sqrt(speedSq);
                ux *= scale;
                uy *= scale;
            }

            vx[i] = ux;
            vy[i] = uy;

            const uSq15 = 1.5 * (ux * ux + uy * uy);

            // Directional projections
            const eu1 = ux;
            const eu2 = uy;
            const eu3 = -ux;
            const eu4 = -uy;
            const eu5 = ux + uy;
            const eu6 = -ux + uy;
            const eu7 = -ux - uy;
            const eu8 = ux - uy;

            // Fully unrolled equilibrium updates
            f[base] = f0 * oneMinusInvTau + invTau * (W0 * rho * (1.0 - uSq15));
            f[base + 1] = f1 * oneMinusInvTau + invTau * (WC * rho * (1.0 + 3.0 * eu1 + 4.5 * eu1 * eu1 - uSq15));
            f[base + 2] = f2 * oneMinusInvTau + invTau * (WC * rho * (1.0 + 3.0 * eu2 + 4.5 * eu2 * eu2 - uSq15));
            f[base + 3] = f3 * oneMinusInvTau + invTau * (WC * rho * (1.0 + 3.0 * eu3 + 4.5 * eu3 * eu3 - uSq15));
            f[base + 4] = f4 * oneMinusInvTau + invTau * (WC * rho * (1.0 + 3.0 * eu4 + 4.5 * eu4 * eu4 - uSq15));
            f[base + 5] = f5 * oneMinusInvTau + invTau * (WD * rho * (1.0 + 3.0 * eu5 + 4.5 * eu5 * eu5 - uSq15));
            f[base + 6] = f6 * oneMinusInvTau + invTau * (WD * rho * (1.0 + 3.0 * eu6 + 4.5 * eu6 * eu6 - uSq15));
            f[base + 7] = f7 * oneMinusInvTau + invTau * (WD * rho * (1.0 + 3.0 * eu7 + 4.5 * eu7 * eu7 - uSq15));
            f[base + 8] = f8 * oneMinusInvTau + invTau * (WD * rho * (1.0 + 3.0 * eu8 + 4.5 * eu8 * eu8 - uSq15));
        }

        // 2. Optimization A3: Fast Interior Streaming (Zero Modulo in Bulk)
        for (let y = 1; y < h - 1; y++) {
            const srcRow = y * w;
            const uRow = (y - 1) * w;
            const dRow = (y + 1) * w;

            for (let x = 1; x < w - 1; x++) {
                const srcIdx = (srcRow + x) * 9;

                fNext[srcIdx] = f[srcIdx];                                       // d=0 (center)
                fNext[(srcRow + x + 1) * 9 + 1] = f[srcIdx + 1];               // d=1 (right)
                fNext[(dRow + x) * 9 + 2] = f[srcIdx + 2];                     // d=2 (up/down)
                fNext[(srcRow + x - 1) * 9 + 3] = f[srcIdx + 3];               // d=3 (left)
                fNext[(uRow + x) * 9 + 4] = f[srcIdx + 4];                     // d=4 (down/up)
                fNext[(dRow + x + 1) * 9 + 5] = f[srcIdx + 5];                 // d=5 (top-right)
                fNext[(dRow + x - 1) * 9 + 6] = f[srcIdx + 6];                 // d=6 (top-left)
                fNext[(uRow + x - 1) * 9 + 7] = f[srcIdx + 7];                 // d=7 (bottom-left)
                fNext[(uRow + x + 1) * 9 + 8] = f[srcIdx + 8];                 // d=8 (bottom-right)
            }
        }

        // Boundary Streaming (Periodic Modulo only on Edges)
        const CX = [0, 1, 0, -1, 0, 1, -1, -1, 1];
        const CY = [0, 0, 1, 0, -1, 1, 1, -1, -1];

        for (let y = 0; y < h; y += (h - 1 || 1)) {
            const srcRow = y * w;
            for (let x = 0; x < w; x++) {
                const srcIdx = (srcRow + x) * 9;
                for (let d = 0; d < 9; d++) {
                    const nx = ((x + CX[d]) % w + w) % w;
                    const ny = ((y + CY[d]) % h + h) % h;
                    fNext[(ny * w + nx) * 9 + d] = f[srcIdx + d];
                }
            }
        }
        for (let y = 1; y < h - 1; y++) {
            const srcRow = y * w;
            for (const x of [0, w - 1]) {
                const srcIdx = (srcRow + x) * 9;
                for (let d = 0; d < 9; d++) {
                    const nx = ((x + CX[d]) % w + w) % w;
                    const ny = ((y + CY[d]) % h + h) % h;
                    fNext[(ny * w + nx) * 9 + d] = f[srcIdx + d];
                }
            }
        }

        // Optimization A2: O(1) Zero-Copy Buffer Pointer Swap (Eliminates 72MB memcpy per frame!)
        const tempBuf = this.f;
        this.f = this.fNext;
        this.fNext = tempBuf;

        // 3. Optimization A5: Fused 3-Channel Bilinear Advection of Chemical Grid
        const inf = config.influence;
        if (inf > 0) {
            const curU = solver.u;
            const curV = solver.v;
            const curW = solver.w;
            const nU = solver._nextU;
            const nV = solver._nextV;
            const nW = solver._nextW;

            for (let y = 0; y < h; y++) {
                const yOff = y * w;
                for (let x = 0; x < w; x++) {
                    const idx = yOff + x;
                    const srcX = x - vx[idx] * 2.0;
                    const srcY = y - vy[idx] * 2.0;

                    sampleBilinear3(curU, curV, curW, w, h, srcX, srcY, true, lbmSampleOut);

                    nU[idx] = curU[idx] * (1.0 - inf) + lbmSampleOut[0] * inf;
                    nV[idx] = curV[idx] * (1.0 - inf) + lbmSampleOut[1] * inf;
                    nW[idx] = curW[idx] * (1.0 - inf) + lbmSampleOut[2] * inf;
                }
            }
            solver.swapBuffers();
        }
    }
}
