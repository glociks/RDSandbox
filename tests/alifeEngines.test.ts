import { describe, it, expect } from 'vitest';
import { McRDSolver } from '../utils/solver';
import { LeniaEngine, PhysarumEngine, LBMD2Q9Engine, fastSin, fastCos, fastGaussianExp } from '../utils/alifeEngines';

describe('Artificial Life & Hydrodynamics Simulation Engines', () => {
  it('Fast Trigonometric & Exponential LUT functions match mathematical precision', () => {
    for (let angle = 0; angle <= Math.PI * 2; angle += 0.2) {
      expect(fastSin(angle)).toBeCloseTo(Math.sin(angle), 2);
      expect(fastCos(angle)).toBeCloseTo(Math.cos(angle), 2);
    }

    for (let x = 0; x < 10; x += 0.5) {
      expect(fastGaussianExp(x)).toBeCloseTo(Math.exp(-x), 2);
    }
  });

  it('LeniaEngine builds sparse kernel and steps continuous cellular field evolution', () => {
    const solver = new McRDSolver(30, 30);
    solver.initialize(6.0, true);

    const lenia = new LeniaEngine(30, 30, 10);
    expect(lenia.sparseCount).toBeGreaterThan(0);
    expect(lenia.kernelSum).toBeGreaterThan(0);

    // Seed center with continuous concentration
    for (let y = 10; y < 20; y++) {
      for (let x = 10; x < 20; x++) {
        solver.v[y * 30 + x] = 1.0;
      }
    }

    lenia.step(solver, {
      radius: 10,
      mu: 0.15,
      sigma: 0.03,
      kernelMu: 0.5,
      kernelSigma: 0.15,
      dt: 0.1,
      influence: 1.0
    });

    const nextStats = solver.getStats();
    expect(Number.isFinite(nextStats.meanV)).toBe(true);
    expect(Number.isNaN(nextStats.meanV)).toBe(false);
  });

  it('PhysarumEngine manages agent chemotaxis swarm and trail deposition/decay', () => {
    const solver = new McRDSolver(40, 40);
    solver.initialize(6.0, true);

    const physarum = new PhysarumEngine(40, 40, 500);
    // 500 agents * 3 coordinates (x, y, angle) = 1500 elements in Float32Array
    expect(physarum.agents.length).toBe(1500);
    expect(physarum.trail.length).toBe(40 * 40);

    physarum.step(solver, {
      agentCount: 500,
      sensorAngle: 0.45,
      sensorDistance: 5.0,
      rotationAngle: 0.4,
      stepSize: 1.0,
      depositAmount: 1.5,
      decayFactor: 0.9,
      diffuseFactor: 0.2,
      gridCoupling: 1.0,
      influence: 1.0
    });

    const stats = solver.getStats();
    expect(Number.isFinite(stats.meanV)).toBe(true);
    expect(Number.isNaN(stats.meanV)).toBe(false);
  });

  it('LBMD2Q9Engine simulates Lattice Boltzmann D2Q9 fluid velocities and relaxation', () => {
    const solver = new McRDSolver(30, 30);
    solver.initialize(6.0, true);
    solver.u.fill(1.0);

    const lbm = new LBMD2Q9Engine(30, 30);
    expect(lbm.f.length).toBe(30 * 30 * 9);

    // Apply fluid step with horizontal force
    lbm.step(solver, {
      tau: 0.8,
      gravityX: 0.005,
      gravityY: 0.0,
      coupling: 1.0,
      influence: 1.0
    });

    const stats = solver.getStats();
    expect(Number.isFinite(stats.meanU)).toBe(true);
    expect(Number.isNaN(stats.meanU)).toBe(false);
  });
});
