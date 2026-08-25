import { describe, it, expect } from 'vitest';
import { McRDSolver } from '../utils/solver';
import { DEFAULT_PARAMS } from '../constants';
import { applyPresetWithSettings } from '../utils/presetLoader';

describe('McRDSolver Physics Engine', () => {
  it('should initialize concentration buffers with correct dimensions', () => {
    const solver = new McRDSolver(100, 100);
    solver.initialize(6.0, false);

    expect(solver.width).toBe(100);
    expect(solver.height).toBe(100);
    expect(solver.u.length).toBe(10000);
    expect(solver.v.length).toBe(10000);
    expect(solver.w.length).toBe(10000);
    expect(solver.u.some(val => val > 0)).toBe(true);
  });

  it('should step the simulation forward without producing NaN values', () => {
    const solver = new McRDSolver(50, 50);
    solver.initialize(6.0, false);

    for (let i = 0; i < 5; i++) {
      solver.stepOptimized(DEFAULT_PARAMS);
    }

    expect(solver.tick).toBeGreaterThan(0);
    expect(Number.isNaN(solver.meanU)).toBe(false);
    expect(Number.isNaN(solver.meanV)).toBe(false);
    expect(Number.isNaN(solver.meanW)).toBe(false);
    expect(Number.isFinite(solver.meanU)).toBe(true);
  });

  it('should support dynamic buffer resizing without memory corruption', () => {
    const solver = new McRDSolver(50, 50);
    solver.initialize(6.0, false);
    solver.resize(80, 80, 6.0);

    expect(solver.width).toBe(80);
    expect(solver.height).toBe(80);
    expect(solver.u.length).toBe(6400);
    expect(solver.v.length).toBe(6400);
  });

  it('should apply brush perturbations accurately', () => {
    const solver = new McRDSolver(40, 40);
    solver.initialize(6.0, true);

    const initialU = solver.u[20 * 40 + 20];
    solver.perturb(20, 20, 10.0, 5, 'inject', 'circle', undefined, 'periodic');
    const perturbedU = solver.u[20 * 40 + 20];

    expect(perturbedU).toBeGreaterThan(initialU);
  });

  it('should handle preset loading and immediate re-seed execution without throwing', () => {
    const solver = new McRDSolver(30, 30);
    solver.initialize(6.0, true);

    let resetCalledWithSeeds: any = null;
    let resetParams: any = null;
    let resetEffects: any = null;
    const target = {
      setParams: () => {},
      setEffects: () => {},
      setSeedConfig: () => {},
      setStabilizeConfig: () => {},
      setCustomColorConfig: () => {},
      setGridSize: () => {},
      setContinuousSeeds: () => {},
      setAutomationModules: () => {},
      solver,
      handleParamChange: () => {},
      reset: (overrideSeeds?: any, overrideParams?: any, overrideEffects?: any) => {
        resetCalledWithSeeds = overrideSeeds;
        resetParams = overrideParams;
        resetEffects = overrideEffects;
      }
    };

    const dummyPreset = {
      name: 'Test Preset',
      params: { ...DEFAULT_PARAMS, feedRate: 0.05 },
      effects: [
        {
          id: 'fx_test',
          type: 'surfaceTension' as const,
          name: 'Test Tension',
          enabled: true,
          isMinimized: false,
          params: { surfaceMobility: 0.5, interfacialTension: 0.2, phaseSeparation: 1, coalescenceRate: 0.8, tensionInfluence: 1 }
        }
      ],
      continuousSeeds: [
        {
          id: 'test_seed_1',
          name: 'Test',
          type: 'perlin' as const,
          enabled: true,
          isMinimized: false,
          opacity: 1.0,
          blendMode: 'add' as const,
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          blendIf: { enabled: false, points: [], smoothness: 0.1 },
          isStartingSeed: true
        }
      ]
    };

    applyPresetWithSettings(dummyPreset, {
      physics: 'replace',
      continuousSeeds: 'replace',
      automation: 'replace'
    }, target);

    expect(Array.isArray(resetCalledWithSeeds)).toBe(true);
    expect(resetCalledWithSeeds.length).toBe(1);
    expect(resetCalledWithSeeds[0].id).toBe('test_seed_1');
    expect(resetParams?.feedRate).toBe(0.05);
    expect(Array.isArray(resetEffects)).toBe(true);
    expect(resetEffects[0].id).toBe('fx_test');
  });
});
