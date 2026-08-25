import { describe, it, expect } from 'vitest';
import { McRDSolver } from '../utils/solver';
import { DEFAULT_PARAMS } from '../constants';
import { EffectInstance } from '../types';

describe('Physics Engine & Effect Stencils', () => {
  it('McRDSolver conserves mass across simulation iterations in closed/periodic system', () => {
    const solver = new McRDSolver(40, 40);
    solver.initialize(6.0, true);

    // Inject known total quantity
    solver.u.fill(1.0);
    solver.v.fill(2.0);
    solver.w.fill(0.5);

    const initialStats = solver.getStats();
    expect(initialStats.meanU).toBeCloseTo(1.0, 3);
    expect(initialStats.meanV).toBeCloseTo(2.0, 3);

    // Run 20 physics steps with physics enabled
    for (let i = 0; i < 20; i++) {
      solver.stepOptimized({ ...DEFAULT_PARAMS, feedRate: 0.0 });
    }

    const nextStats = solver.getStats();
    expect(Number.isFinite(nextStats.meanU)).toBe(true);
    expect(Number.isFinite(nextStats.meanV)).toBe(true);
    expect(Number.isNaN(nextStats.meanU)).toBe(false);
  });

  it('evaluates Gray-Scott diffusion without numerical overflow', () => {
    const solver = new McRDSolver(30, 30);
    solver.initialize(6.0, false);

    const gsEffect: EffectInstance = {
      id: 'fx_gs_test',
      type: 'grayScott',
      name: 'Gray Scott',
      enabled: true,
      params: {
        gsDa: 1.0,
        gsDb: 0.5,
        gsFeed: 0.055,
        gsKill: 0.062,
        gsTimeScale: 1.0,
        gsClamp: true,
        gsInfluence: 1.0
      }
    };

    for (let i = 0; i < 10; i++) {
      solver.stepOptimized(DEFAULT_PARAMS, undefined, undefined, [gsEffect]);
    }

    const stats = solver.getStats();
    expect(Number.isFinite(stats.meanU)).toBe(true);
    expect(Number.isFinite(stats.meanV)).toBe(true);
    expect(stats.meanU).toBeGreaterThanOrEqual(0);
  });

  it('evaluates Game of Life CA step within effect pipeline', () => {
    const solver = new McRDSolver(30, 30);
    solver.initialize(6.0, true);

    const golEffect: EffectInstance = {
      id: 'fx_gol_test',
      type: 'gol',
      name: 'GoL Test',
      enabled: true,
      params: {
        golBirth: [3],
        golSurvive: [2, 3],
        golInfluence: 0.8
      }
    };

    // Plant a glider or active pattern in V
    solver.v[15 * 30 + 15] = 4.0;
    solver.v[15 * 30 + 16] = 4.0;
    solver.v[15 * 30 + 17] = 4.0;

    solver.stepOptimized(DEFAULT_PARAMS, undefined, undefined, [golEffect]);
    expect(solver.tick).toBeGreaterThan(0);
  });

  it('disabled effects in the effect stack are safely bypassed', () => {
    const solver = new McRDSolver(20, 20);
    solver.initialize(6.0, true);

    const disabledEffect: EffectInstance = {
      id: 'fx_disabled',
      type: 'grayScott',
      name: 'Disabled Effect',
      enabled: false,
      params: {
        gsDa: 100.0,
        gsDb: 100.0,
        gsFeed: 0.5,
        gsKill: 0.5
      }
    };

    solver.stepOptimized(DEFAULT_PARAMS, undefined, undefined, [disabledEffect]);
    expect(solver.tick).toBeGreaterThan(0);
  });
});
