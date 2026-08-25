import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  packRGBA32,
  getCustomGradientLUT,
  getCustomGradientLUT32,
  getColor,
  renderGridToBuffer,
  magmaLUT,
  magmaLUT32,
  electricLUT,
  electricLUT32,
  bioLUT,
  bioLUT32,
  thermalLUT,
  thermalLUT32,
  convertScalarGridToRGB
} from '../utils/colors';
import { CustomColorConfig } from '../types';

describe('Color Pipeline & LUTs', () => {
  it('hexToRgb parses 6-digit hex colors accurately with caching', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
    expect(hexToRgb('#00ff00')).toEqual([0, 255, 0]);
    expect(hexToRgb('#0000ff')).toEqual([0, 0, 255]);
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgb('')).toEqual([0, 0, 0]);
    // Cache hit test
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
  });

  it('packRGBA32 creates 32-bit little-endian RGBA integers with correct alpha', () => {
    const packed = packRGBA32(255, 0, 0, 255);
    // In little-endian: (255 << 24) | (0 << 16) | (0 << 8) | 255 = 0xFF0000FF
    expect(packed >>> 0).toBe(0xFF0000FF >>> 0);

    const packedAlpha128 = packRGBA32(0, 255, 0, 128);
    expect((packedAlpha128 >>> 24) & 255).toBe(128);
  });

  it('packRGBA32 clamps out-of-range color channel values', () => {
    const clampedHigh = packRGBA32(300, 400, 500, 255);
    expect(clampedHigh >>> 0).toBe(0xFFFFFFFF >>> 0);

    const clampedLow = packRGBA32(-50, -20, -10, 255);
    expect(clampedLow >>> 0).toBe(0xFF000000 >>> 0);
  });

  it('Preset LUTs (magma, electric, bio, thermal) are properly sized and initialized', () => {
    expect(magmaLUT.length).toBe(256 * 3);
    expect(magmaLUT32.length).toBe(256);
    expect(electricLUT.length).toBe(256 * 3);
    expect(electricLUT32.length).toBe(256);
    expect(bioLUT.length).toBe(256 * 3);
    expect(bioLUT32.length).toBe(256);
    expect(thermalLUT.length).toBe(256 * 3);
    expect(thermalLUT32.length).toBe(256);

    // Verify all packed LUT entries have alpha = 255
    for (let i = 0; i < 256; i++) {
      expect((magmaLUT32[i] >>> 24) & 255).toBe(255);
      expect((electricLUT32[i] >>> 24) & 255).toBe(255);
      expect((bioLUT32[i] >>> 24) & 255).toBe(255);
      expect((thermalLUT32[i] >>> 24) & 255).toBe(255);
    }
  });

  it('custom gradient LUT interpolates smoothly between stops', () => {
    const customConfig: CustomColorConfig = {
      mode: 'scalar',
      scalarGradient: [
        { pos: 0.0, color: '#000000' },
        { pos: 1.0, color: '#ffffff' }
      ],
      rgbMultipliers: { r: 1, g: 1, b: 1 },
      rgbBias: { r: 0, g: 0, b: 0 }
    };

    const lut = getCustomGradientLUT(customConfig);
    const lut32 = getCustomGradientLUT32(customConfig);

    expect(lut.length).toBe(256 * 3);
    expect(lut32.length).toBe(256);

    // Start stop (black)
    expect(lut[0]).toBe(0);
    expect(lut[1]).toBe(0);
    expect(lut[2]).toBe(0);

    // End stop (white)
    expect(lut[255 * 3]).toBe(255);
    expect(lut[255 * 3 + 1]).toBe(255);
    expect(lut[255 * 3 + 2]).toBe(255);

    // Midpoint should be approximately 128
    const midIdx = 128 * 3;
    expect(lut[midIdx]).toBeGreaterThanOrEqual(125);
    expect(lut[midIdx]).toBeLessThanOrEqual(130);
  });

  it('renderGridToBuffer blits concentration fields to 32-bit RGBA buffers', () => {
    const size = 100;
    const uBuf = new Float32Array(size).fill(1.0);
    const vBuf = new Float32Array(size).fill(0.5);
    const wBuf = new Float32Array(size).fill(0.0);
    const outBuf = new Uint8ClampedArray(size * 4);

    renderGridToBuffer(uBuf, vBuf, wBuf, outBuf, 'magma');

    // All pixels should have alpha = 255
    for (let i = 0; i < size; i++) {
      expect(outBuf[i * 4 + 3]).toBe(255);
    }
  });

  it('renderGridToBuffer handles RGB mode with post processing', () => {
    const size = 10;
    const uBuf = new Float32Array(size).fill(3.0);
    const vBuf = new Float32Array(size).fill(2.0);
    const wBuf = new Float32Array(size).fill(1.0);
    const outBuf = new Uint8ClampedArray(size * 4);

    renderGridToBuffer(uBuf, vBuf, wBuf, outBuf, 'rgb', undefined, {
      exposure: 1.5,
      contrast: 1.2,
      gamma: 1.0,
      saturation: 1.0,
      brightness: 0.1,
      tint: { r: 1.0, g: 1.0, b: 1.0 }
    });

    for (let i = 0; i < size; i++) {
      expect(outBuf[i * 4 + 3]).toBe(255);
      expect(outBuf[i * 4]).toBeGreaterThan(0);
    }
  });

  it('convertScalarGridToRGB converts scalar buffers to RGB domain in-place', () => {
    const size = 10;
    const uBuf = new Float32Array(size).fill(2.0);
    const vBuf = new Float32Array(size).fill(1.0);
    const wBuf = new Float32Array(size).fill(0.0);

    convertScalarGridToRGB(uBuf, vBuf, wBuf, 'magma');

    for (let i = 0; i < size; i++) {
      expect(uBuf[i]).toBeGreaterThanOrEqual(0);
      expect(uBuf[i]).toBeLessThanOrEqual(1.0);
      expect(vBuf[i]).toBeGreaterThanOrEqual(0);
      expect(vBuf[i]).toBeLessThanOrEqual(1.0);
      expect(wBuf[i]).toBeGreaterThanOrEqual(0);
      expect(wBuf[i]).toBeLessThanOrEqual(1.0);
    }
  });
});
