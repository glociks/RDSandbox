import { describe, it, expect } from 'vitest';
import { McRDSolver } from '../utils/solver';
import { applyContinuousSeeds } from '../utils/physics';
import { ContinuousSeed, ContinuousSeedData } from '../types';

describe('Layer Compositing & Blend Modes Engine', () => {
  const width = 20;
  const height = 20;
  const size = width * height;

  const createBaseSeed = (blendMode: ContinuousSeed['blendMode'], opacity: number = 1.0): ContinuousSeed => ({
    id: 'test_seed',
    name: 'Test Seed',
    type: 'random',
    enabled: true,
    isMinimized: false,
    opacity,
    blendMode,
    x: 0,
    y: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    rotation: 0,
    seedConfig: {
      type: 'random',
      intensity: 1.0,
      randomThreshold: 0.1,
      seedTarget: { u: 0.5, v: 0.5, w: 0.0 },
      perlinScale: 20,
      perlinThreshold: 0.5,
      perlinOctaves: 2,
      perlinSeed: 0,
      perlinGradient: false,
      gridSpacingX: 20,
      gridSpacingY: 20,
      gridDotSize: 2,
      gridOffset: false,
      shapeType: 'circle',
      shapeMode: 'single',
      shapeCount: 1,
      shapeSize: 10,
      shapeHollow: false,
      shapePosX: 0.5,
      shapePosY: 0.5,
      mathExpression: '',
      textString: '',
      textSize: 20,
      textPosX: 0.5,
      textPosY: 0.5,
    },
    blendIf: { enabled: false, points: [{ pos: 0, val: 0, id: '1' }, { pos: 1, val: 1, id: '2' }], smoothness: 0.1 },
  });

  it('add blend mode sums input into substrate concentration', () => {
    const solver = new McRDSolver(width, height);
    solver.initialize(6.0, true);
    solver.u.fill(2.0);

    const seed = createBaseSeed('add', 1.0);
    const seedData: ContinuousSeedData = {
      seed,
      data: new Float32Array(size).fill(1.0),
      width,
      height,
      isRGB: false,
    };

    // val (1.0) * totalDensity (6.0) * targetU (0.5) = 3.0 added to 2.0 = 5.0
    applyContinuousSeeds(solver, 6.0, [seedData], 1.0);
    expect(solver.u[0]).toBeCloseTo(5.0, 3);
  });

  it('replace blend mode crossfades target concentration in RGB mode', () => {
    const solver = new McRDSolver(width, height);
    solver.initialize(6.0, true);
    solver.u.fill(10.0);

    const seed = createBaseSeed('replace', 0.5);
    const seedData: ContinuousSeedData = {
      seed,
      data: new Float32Array(size).fill(1.0),
      width,
      height,
      isRGB: true,
    };

    // srcU = 1.0 * 6.0 * 0.5 = 3.0
    // solver.u[0] += (3.0 - 10.0) * 0.5 = 10.0 - 3.5 = 6.5
    applyContinuousSeeds(solver, 6.0, [seedData], 1.0);
    expect(solver.u[0]).toBeCloseTo(6.5, 3);
  });

  it('subtract blend mode reduces substrate concentration', () => {
    const solver = new McRDSolver(width, height);
    solver.initialize(6.0, true);
    solver.u.fill(4.0);

    const seed = createBaseSeed('subtract', 1.0);
    const seedData: ContinuousSeedData = {
      seed,
      data: new Float32Array(size).fill(1.0),
      width,
      height,
      isRGB: false,
    };

    // srcU = 1.0 * 6.0 * 0.5 = 3.0; 4.0 - 3.0 = 1.0
    applyContinuousSeeds(solver, 6.0, [seedData], 1.0);
    expect(solver.u[0]).toBeCloseTo(1.0, 3);
  });

  it('multiply blend mode scales substrate concentration', () => {
    const solver = new McRDSolver(width, height);
    solver.initialize(6.0, true);
    solver.u.fill(4.0);

    const seed = createBaseSeed('multiply', 1.0);
    const seedData: ContinuousSeedData = {
      seed,
      data: new Float32Array(size).fill(0.5),
      width,
      height,
      isRGB: false,
    };

    applyContinuousSeeds(solver, 6.0, [seedData], 1.0);
    expect(solver.u[0]).toBeLessThan(4.0);
    expect(solver.u[0]).toBeGreaterThan(0.0);
  });

  it('blendIf luminance gating restricts injection outside specified luminance threshold range', () => {
    const solver = new McRDSolver(width, height);
    solver.initialize(6.0, true);
    solver.u.fill(1.0);
    solver.v.fill(0.5);

    const seedWithBlendIf = createBaseSeed('add', 1.0);
    seedWithBlendIf.blendIf = {
      enabled: true,
      points: [
        { pos: 0.5, val: 0.0, id: '1' },
        { pos: 0.8, val: 1.0, id: '2' }
      ],
      smoothness: 0.01
    };

    // Substrate V density is 0.5 / 6.0 = 0.083, which is far below 0.5
    const seedData: ContinuousSeedData = {
      seed: seedWithBlendIf,
      data: new Float32Array(size).fill(1.0),
      width,
      height,
      isRGB: false,
    };

    applyContinuousSeeds(solver, 6.0, [seedData], 1.0);
    // Concentration should remain untouched because it was gated out
    expect(solver.u[0]).toBeCloseTo(1.0, 1);
  });
});
