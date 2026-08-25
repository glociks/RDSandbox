import { describe, it, expect } from 'vitest';
import { McRDSolver } from '../utils/solver';
import { DEFAULT_PARAMS } from '../constants';
import { EffectInstance } from '../types';

describe('Modular Effect Stencils Pipeline', () => {
  const width = 30;
  const height = 30;

  it('evaluates FitzHugh-Nagumo Excitable wave dynamics', () => {
    const solver = new McRDSolver(width, height);
    solver.initialize(6.0, true);

    const fhnEffect: EffectInstance = {
      id: 'fx_fhn',
      type: 'excitable',
      name: 'Excitable Wave',
      enabled: true,
      params: {
        fhnEpsilon: 0.08,
        fhnA: 0.7,
        fhnB: 0.8,
        fhnTimeScale: 1.0,
        fhnInfluence: 1.0
      }
    };

    // Trigger local impulse
    solver.u[15 * width + 15] = 2.0;

    for (let i = 0; i < 5; i++) {
      solver.stepOptimized(DEFAULT_PARAMS, undefined, undefined, [fhnEffect]);
    }

    const stats = solver.getStats();
    expect(Number.isFinite(stats.meanU)).toBe(true);
    expect(Number.isNaN(stats.meanU)).toBe(false);
  });

  it('evaluates Cahn-Hilliard surface tension spinodal decomposition', () => {
    const solver = new McRDSolver(width, height);
    solver.initialize(6.0, true);

    const surfaceTensionEffect: EffectInstance = {
      id: 'fx_st',
      type: 'surfaceTension',
      name: 'Surface Tension',
      enabled: true,
      params: {
        stMobility: 0.1,
        stGamma: 0.05,
        stTimeScale: 1.0,
        stInfluence: 1.0
      }
    };

    // Inject random mixed state
    for (let i = 0; i < width * height; i++) {
      solver.u[i] = 2.5 + (Math.sin(i) * 0.5);
    }

    for (let i = 0; i < 5; i++) {
      solver.stepOptimized(DEFAULT_PARAMS, undefined, undefined, [surfaceTensionEffect]);
    }

    const stats = solver.getStats();
    expect(Number.isFinite(stats.meanU)).toBe(true);
    expect(Number.isNaN(stats.meanU)).toBe(false);
  });

  it('evaluates Vortex swirl rotation velocity fields', () => {
    const solver = new McRDSolver(width, height);
    solver.initialize(6.0, true);

    const vortexEffect: EffectInstance = {
      id: 'fx_vortex',
      type: 'vortex',
      name: 'Vortex Swirl',
      enabled: true,
      params: {
        vortexCount: 2,
        vortexStrength: 1.5,
        vortexRadius: 8,
        vortexTimeScale: 1.0,
        vortexInfluence: 1.0
      }
    };

    for (let i = 0; i < 5; i++) {
      solver.stepOptimized(DEFAULT_PARAMS, undefined, undefined, [vortexEffect]);
    }

    expect(solver.tick).toBeGreaterThanOrEqual(5);
    expect(Number.isFinite(solver.u[15 * width + 15])).toBe(true);
  });

  it('evaluates LGA (Lattice Gas Automata FHP) microscopic collision steps', () => {
    const solver = new McRDSolver(width, height);
    solver.initialize(6.0, true);

    const lgaEffect: EffectInstance = {
      id: 'fx_lga',
      type: 'lga',
      name: 'LGA Automata',
      enabled: true,
      params: {
        lgaDensity: 0.3,
        lgaSpeed: 1,
        lgaInfluence: 0.8,
        lgaGridCoupling: 1.0
      }
    };

    solver.stepOptimized(DEFAULT_PARAMS, undefined, undefined, [lgaEffect]);
    expect(solver.tick).toBeGreaterThan(0);
    expect(Number.isFinite(solver.meanU)).toBe(true);
  });

  it('evaluates Oregonator BZ Reaction kinetics chemical oscillations', () => {
    const solver = new McRDSolver(width, height);
    solver.initialize(6.0, true);

    const bzEffect: EffectInstance = {
      id: 'fx_bz',
      type: 'reactionKinetics',
      name: 'BZ Reaction',
      enabled: true,
      params: {
        rkAlpha: 1.2,
        rkBeta: 1.0,
        rkGamma: 1.0,
        rkTimeScale: 1.0,
        rkInfluence: 1.0
      }
    };

    for (let i = 0; i < 5; i++) {
      solver.stepOptimized(DEFAULT_PARAMS, undefined, undefined, [bzEffect]);
    }

    const stats = solver.getStats();
    expect(Number.isFinite(stats.meanU)).toBe(true);
    expect(stats.meanU).toBeGreaterThanOrEqual(0);
  });
});
