import { describe, it, expect } from 'vitest';
import { McRDSolver } from '../utils/solver';
import { perturb } from '../utils/interaction';

describe('Interaction & Brush Perturbations', () => {
  it('circle brush increases concentration inside radius', () => {
    const solver = new McRDSolver(40, 40);
    solver.initialize(6.0, true);

    const centerIdx = 20 * 40 + 20;
    const initialU = solver.u[centerIdx];

    perturb(solver, 20, 20, 5.0, 4, 'inject', 'circle', undefined, 'periodic');

    expect(solver.u[centerIdx]).toBeGreaterThan(initialU);
  });

  it('remove mode decreases concentration', () => {
    const solver = new McRDSolver(40, 40);
    solver.initialize(6.0, true);

    const centerIdx = 20 * 40 + 20;
    solver.u[centerIdx] = 10.0;

    perturb(solver, 20, 20, 5.0, 4, 'remove', 'circle', undefined, 'periodic');

    expect(solver.u[centerIdx]).toBeLessThan(10.0);
  });

  it('safely rejects non-finite inputs (NaN, Infinity) without crashing', () => {
    const solver = new McRDSolver(20, 20);
    solver.initialize(6.0, true);

    expect(() => {
      perturb(solver, NaN, 10, 5.0, 4, 'inject', 'circle');
      perturb(solver, 10, Infinity, 5.0, 4, 'inject', 'circle');
      perturb(solver, 10, 10, NaN, 4, 'inject', 'circle');
      perturb(solver, 10, 10, 5.0, -1, 'inject', 'circle');
    }).not.toThrow();
  });

  it('square brush covers rectangular bounding box', () => {
    const solver = new McRDSolver(40, 40);
    solver.initialize(6.0, true);

    const cornerIdx = (20 + 3) * 40 + (20 + 3);
    const initialU = solver.u[cornerIdx];

    perturb(solver, 20, 20, 5.0, 4, 'inject', 'square', undefined, 'periodic');

    expect(solver.u[cornerIdx]).toBeGreaterThan(initialU);
  });
});
