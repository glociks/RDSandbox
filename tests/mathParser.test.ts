import { describe, it, expect } from 'vitest';
import { compileSafeMathExpression, MathEvalContext } from '../utils/mathParser';

describe('compileSafeMathExpression Parser & AST Compiler', () => {
  const baseContext: MathEvalContext = {
    x: 10,
    y: 20,
    w: 100,
    h: 100,
    nx: 0.1,
    ny: 0.2,
    r: 5,
    theta: 0.5,
    t: 1.0,
    pi: Math.PI,
    e: Math.E,
  };

  it('should compile and evaluate basic arithmetic operations', () => {
    const fn = compileSafeMathExpression('2 + 3 * 4');
    expect(fn(baseContext)).toBe(14);
  });

  it('should respect operator precedence and parentheses', () => {
    const fn = compileSafeMathExpression('(2 + 3) * 4');
    expect(fn(baseContext)).toBe(20);
  });

  it('should evaluate contextual variables accurately', () => {
    const fn = compileSafeMathExpression('x * 2 + y');
    expect(fn(baseContext)).toBe(40);
  });

  it('should support standard mathematical trigonometric and exponential functions', () => {
    const sinFn = compileSafeMathExpression('sin(0)');
    expect(sinFn(baseContext)).toBe(0);

    const cosFn = compileSafeMathExpression('cos(0)');
    expect(cosFn(baseContext)).toBe(1);

    const sqrtFn = compileSafeMathExpression('sqrt(16)');
    expect(sqrtFn(baseContext)).toBe(4);

    const clampFn = compileSafeMathExpression('clamp(15, 0, 10)');
    expect(clampFn(baseContext)).toBe(10);

    const hypotFn = compileSafeMathExpression('hypot(3, 4)');
    expect(hypotFn(baseContext)).toBe(5);
  });

  it('should evaluate boolean logic, equality and comparison operators', () => {
    const compFn = compileSafeMathExpression('(x > 5) && (y == 20)');
    expect(compFn(baseContext)).toBe(1);

    const orFn = compileSafeMathExpression('(x < 5) || (y == 20)');
    expect(orFn(baseContext)).toBe(1);

    const notFn = compileSafeMathExpression('!(x == 10)');
    expect(notFn(baseContext)).toBe(0);
  });

  it('should handle division and modulo by zero gracefully without returning NaN or crashing', () => {
    const divZero = compileSafeMathExpression('10 / 0');
    expect(divZero(baseContext)).toBe(0);

    const modZero = compileSafeMathExpression('10 % 0');
    expect(modZero(baseContext)).toBe(0);
  });

  it('should safely reject invalid syntax and hazardous identifier calls', () => {
    const invalidSyntax = compileSafeMathExpression('+++--- invalid syntax');
    expect(typeof invalidSyntax).toBe('function');
    expect(Number.isFinite(invalidSyntax(baseContext))).toBe(true);

    const injectionAttempt = compileSafeMathExpression('window.alert(1)');
    expect(typeof injectionAttempt).toBe('function');
    expect(injectionAttempt(baseContext)).toBe(0);

    const empty = compileSafeMathExpression('');
    expect(empty(baseContext)).toBe(0);

    const oversized = compileSafeMathExpression('1+'.repeat(600));
    expect(oversized(baseContext)).toBe(0);
  });
});
