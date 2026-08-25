import { describe, it, expect } from 'vitest';
import { generateSeed } from '../utils/seeding';
import { InitialSeedConfig } from '../types';

describe('Procedural Seeding & Conditioning Engine', () => {
  const width = 64;
  const height = 64;
  const totalPixels = width * height;

  it('generates random noise seeds with controlled density and intensity', () => {
    const config: InitialSeedConfig = {
      type: 'random',
      intensity: 2.5,
      randomThreshold: 0.2,
      seedTarget: { u: 1, v: 0, w: 0 },
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
    };

    const data = generateSeed(width, height, config);
    expect(data.length).toBe(totalPixels);

    let nonZeroCount = 0;
    for (let i = 0; i < totalPixels; i++) {
      if (data[i] > 0) {
        expect(data[i]).toBeCloseTo(2.5, 3);
        nonZeroCount++;
      }
    }
    // With threshold 0.2, approximately 20% (+/- 10%) should be non-zero
    const ratio = nonZeroCount / totalPixels;
    expect(ratio).toBeGreaterThan(0.05);
    expect(ratio).toBeLessThan(0.40);
  });

  it('generates multi-octave Perlin noise seeds (binary threshold and smooth gradient)', () => {
    const binaryConfig: InitialSeedConfig = {
      type: 'perlin',
      intensity: 3.0,
      perlinScale: 15,
      perlinThreshold: 0.4,
      perlinOctaves: 3,
      perlinSeed: 12345,
      perlinGradient: false,
      randomThreshold: 0.01,
      seedTarget: { u: 1, v: 0, w: 0 },
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
    };

    const binaryData = generateSeed(width, height, binaryConfig);
    for (let i = 0; i < totalPixels; i++) {
      expect(binaryData[i] === 0 || binaryData[i] === 3.0).toBe(true);
    }

    const gradientConfig: InitialSeedConfig = {
      ...binaryConfig,
      perlinGradient: true,
    };

    const gradientData = generateSeed(width, height, gradientConfig);
    let hasIntermediateValues = false;
    for (let i = 0; i < totalPixels; i++) {
      expect(gradientData[i]).toBeGreaterThanOrEqual(0);
      expect(gradientData[i]).toBeLessThanOrEqual(3.0);
      if (gradientData[i] > 0.1 && gradientData[i] < 2.9) {
        hasIntermediateValues = true;
      }
    }
    expect(hasIntermediateValues).toBe(true);
  });

  it('stamps geometric grid patterns with configurable dot spacing and size', () => {
    const gridConfig: InitialSeedConfig = {
      type: 'grid',
      intensity: 1.0,
      gridSpacingX: 16,
      gridSpacingY: 16,
      gridDotSize: 4,
      gridOffset: false,
      randomThreshold: 0.01,
      seedTarget: { u: 1, v: 0, w: 0 },
      perlinScale: 20,
      perlinThreshold: 0.5,
      perlinOctaves: 2,
      perlinSeed: 0,
      perlinGradient: false,
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
    };

    const data = generateSeed(width, height, gridConfig);
    // Origin dot (0,0) to (3,3) should be stamped
    expect(data[0]).toBe(1.0);
    expect(data[3 * width + 3]).toBe(1.0);
    // Position (8, 8) between dots should be 0
    expect(data[8 * width + 8]).toBe(0.0);
  });

  it('renders single and hollow geometric shapes (circles, squares, stars)', () => {
    const circleConfig: InitialSeedConfig = {
      type: 'shapes',
      shapeType: 'circle',
      shapeMode: 'single',
      shapePosX: 0.5,
      shapePosY: 0.5,
      shapeSize: 12,
      shapeHollow: false,
      intensity: 2.0,
      randomThreshold: 0.01,
      seedTarget: { u: 1, v: 0, w: 0 },
      perlinScale: 20,
      perlinThreshold: 0.5,
      perlinOctaves: 2,
      perlinSeed: 0,
      perlinGradient: false,
      gridSpacingX: 20,
      gridSpacingY: 20,
      gridDotSize: 2,
      gridOffset: false,
      shapeCount: 1,
      mathExpression: '',
      textString: '',
      textSize: 20,
      textPosX: 0.5,
      textPosY: 0.5,
    };

    const filledCircle = generateSeed(width, height, circleConfig);
    const centerIdx = 32 * width + 32;
    expect(filledCircle[centerIdx]).toBe(2.0);

    const hollowCircleConfig: InitialSeedConfig = {
      ...circleConfig,
      shapeHollow: true,
    };
    const hollowCircle = generateSeed(width, height, hollowCircleConfig);
    // Center of a large hollow circle should be 0
    expect(hollowCircle[centerIdx]).toBe(0.0);
  });

  it('evaluates safe math expressions into procedural raster patterns', () => {
    const mathConfig: InitialSeedConfig = {
      type: 'math',
      intensity: 1.5,
      mathExpression: 'sin(x * 0.1) * cos(y * 0.1) > 0',
      randomThreshold: 0.01,
      seedTarget: { u: 1, v: 0, w: 0 },
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
      textString: '',
      textSize: 20,
      textPosX: 0.5,
      textPosY: 0.5,
    };

    const data = generateSeed(width, height, mathConfig);
    expect(data.length).toBe(totalPixels);
    let hasHigh = false;
    let hasLow = false;
    for (let i = 0; i < totalPixels; i++) {
      if (data[i] > 0) hasHigh = true;
      if (data[i] === 0) hasLow = true;
    }
    expect(hasHigh).toBe(true);
    expect(hasLow).toBe(true);
  });
});
