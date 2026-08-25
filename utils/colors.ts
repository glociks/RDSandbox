import { ColorMap, CustomColorConfig, RGBPostProcessingConfig } from '../types';

/**
 * Color Pipeline, Lookup Tables (LUTs), and Little-Endian 32-bit RGBA Buffer Packing.
 */

// Cache for hex to RGB conversions to avoid string parsing overhead in hot loops
const hexCache = new Map<string, [number, number, number]>();

/**
 * Converts hexadecimal color strings (e.g. "#FF0000") to RGB integer tuples with LRU caching.
 */
export const hexToRgb = (hex: string): [number, number, number] => {
  if (!hex) return [0, 0, 0];
  const cached = hexCache.get(hex);
  if (cached) return cached;
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  const bigint = parseInt(cleanHex, 16);
  const rgb: [number, number, number] = [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  if (hexCache.size < 500) {
    hexCache.set(hex, rgb);
  }
  return rgb;
};

// 32-bit Little-Endian Pixel Packer: (A << 24) | (B << 16) | (G << 8) | R
export function packRGBA32(r: number, g: number, b: number, a: number = 255): number {
  return ((a & 255) << 24) | (((b > 255 ? 255 : (b < 0 ? 0 : b | 0)) & 255) << 16) | (((g > 255 ? 255 : (g < 0 ? 0 : g | 0)) & 255) << 8) | ((r > 255 ? 255 : (r < 0 ? 0 : r | 0)) & 255);
}

// Pre-computed 32-bit and 8-bit LUTs for preset colormaps (256 steps)
export const LUT_SIZE = 256;
export const magmaLUT = new Uint8Array(LUT_SIZE * 3);
export const electricLUT = new Uint8Array(LUT_SIZE * 3);
export const bioLUT = new Uint8Array(LUT_SIZE * 3);
export const thermalLUT = new Uint8Array(LUT_SIZE * 3);

export const magmaLUT32 = new Uint32Array(LUT_SIZE);
export const electricLUT32 = new Uint32Array(LUT_SIZE);
export const bioLUT32 = new Uint32Array(LUT_SIZE);
export const thermalLUT32 = new Uint32Array(LUT_SIZE);

// Optimization C7: Accurate rounding for smoother color gradients
function buildPresetLUTs() {
  for (let i = 0; i < LUT_SIZE; i++) {
    const t = Math.pow(i / (LUT_SIZE - 1), 0.7);
    const idx = i * 3;

    // Magma
    let mr = 0, mg = 0, mb = 0;
    if (t < 0.2) {
      const localT = t / 0.2;
      mr = Math.round(10 + localT * 60);
      mg = Math.round(10 + localT * 20);
      mb = Math.round(20 + localT * 100);
    } else if (t < 0.5) {
      const localT = (t - 0.2) / 0.3;
      mr = Math.round(70 + localT * 185);
      mg = Math.round(30 + localT * 50);
      mb = Math.round(120 - localT * 120);
    } else {
      const localT = (t - 0.5) / 0.5;
      mr = 255;
      mg = Math.round(80 + localT * 175);
      mb = Math.round(localT * 255);
    }
    magmaLUT[idx] = mr; magmaLUT[idx + 1] = mg; magmaLUT[idx + 2] = mb;
    magmaLUT32[i] = packRGBA32(mr, mg, mb, 255);

    // Electric
    let er = 0, eg = 0, eb = 0;
    if (t < 0.33) {
      const localT = t / 0.33;
      er = 0;
      eg = Math.round(localT * 50);
      eb = Math.round(localT * 150);
    } else if (t < 0.66) {
      const localT = (t - 0.33) / 0.33;
      er = 0;
      eg = Math.round(50 + localT * 205);
      eb = Math.round(150 + localT * 105);
    } else {
      const localT = (t - 0.66) / 0.34;
      er = Math.round(localT * 255);
      eg = 255;
      eb = 255;
    }
    electricLUT[idx] = er; electricLUT[idx + 1] = eg; electricLUT[idx + 2] = eb;
    electricLUT32[i] = packRGBA32(er, eg, eb, 255);

    // Bio
    let br = 0, bg = 0, bb = 0;
    if (t < 0.5) {
      const localT = t / 0.5;
      br = Math.round(localT * 50);
      bg = Math.round(20 + localT * 130);
      bb = 20;
    } else {
      const localT = (t - 0.5) / 0.5;
      br = Math.round(50 + localT * 205);
      bg = Math.round(150 + localT * 105);
      bb = 20;
    }
    bioLUT[idx] = br; bioLUT[idx + 1] = bg; bioLUT[idx + 2] = bb;
    bioLUT32[i] = packRGBA32(br, bg, bb, 255);

    // Thermal
    let tr = 0, tg = 0, tb = 0;
    if (t < 0.33) {
      const localT = t / 0.33;
      tr = 0;
      tg = 0;
      tb = Math.round(50 + localT * 205);
    } else if (t < 0.66) {
      const localT = (t - 0.33) / 0.33;
      tr = Math.round(localT * 255);
      tg = 0;
      tb = Math.round(255 - localT * 255);
    } else {
      const localT = (t - 0.66) / 0.34;
      tr = 255;
      tg = Math.round(localT * 255);
      tb = 0;
    }
    thermalLUT[idx] = tr; thermalLUT[idx + 1] = tg; thermalLUT[idx + 2] = tb;
    thermalLUT32[i] = packRGBA32(tr, tg, tb, 255);
  }
}
buildPresetLUTs();

// Optimization C2: 1024-Entry Pre-computed Tone-Map LUT for fast RGB mode
const TONE_MAP_LUT_SIZE = 1024;
const toneMapLUT = new Uint8Array(TONE_MAP_LUT_SIZE);
for (let i = 0; i < TONE_MAP_LUT_SIZE; i++) {
  const c = i / (TONE_MAP_LUT_SIZE - 1);
  const mapped = (c * (1.0 + c * 0.18)) / (1.0 + c * 0.75);
  const out = Math.round(mapped * 255.0);
  toneMapLUT[i] = out > 255 ? 255 : (out < 0 ? 0 : out);
}

// Optimization C1: 1024-Entry Pre-computed Gamma LUT cache
const GAMMA_LUT_SIZE = 1024;
const gammaLUT = new Uint8Array(GAMMA_LUT_SIZE);
let lastCachedGamma = -1;

function ensureGammaLUT(gamma: number): Uint8Array {
  if (Math.abs(gamma - lastCachedGamma) < 0.001) return gammaLUT;
  const safeGamma = Math.max(0.1, gamma);
  const invGamma = 1.0 / safeGamma;
  for (let i = 0; i < GAMMA_LUT_SIZE; i++) {
    const t = i / (GAMMA_LUT_SIZE - 1);
    const val = Math.round(Math.pow(t, invGamma) * 255.0);
    gammaLUT[i] = val > 255 ? 255 : (val < 0 ? 0 : val);
  }
  lastCachedGamma = gamma;
  return gammaLUT;
}

// Dynamic custom gradient 32-bit LUT cache
let cachedCustomLUT: Uint8Array | null = null;
let cachedCustomLUT32: Uint32Array | null = null;
let cachedCustomKey: string = '';

export function getCustomGradientLUT(config: CustomColorConfig): Uint8Array {
  ensureCustomLUT(config);
  return cachedCustomLUT!;
}

export function getCustomGradientLUT32(config: CustomColorConfig): Uint32Array {
  ensureCustomLUT(config);
  return cachedCustomLUT32!;
}

// Optimization C4: Fast string hash without JSON.stringify
function getGradientFastKey(stops: { pos: number, color: string }[] | undefined): string {
  if (!stops || stops.length === 0) return 'empty';
  let key = '' + stops.length;
  for (let s = 0; s < stops.length; s++) {
    key += '_' + stops[s].pos.toFixed(3) + stops[s].color;
  }
  return key;
}

function ensureCustomLUT(config: CustomColorConfig) {
  const stops = config.scalarGradient;
  const key = getGradientFastKey(stops);
  if (cachedCustomLUT && cachedCustomLUT32 && cachedCustomKey === key) {
    return;
  }
  const lut = new Uint8Array(LUT_SIZE * 3);
  const lut32 = new Uint32Array(LUT_SIZE);
  if (!stops || stops.length === 0) {
    cachedCustomLUT = lut;
    cachedCustomLUT32 = lut32;
    cachedCustomKey = key;
    return;
  }

  const sortedStops = [...stops].sort((a, b) => a.pos - b.pos);
  const firstColor = hexToRgb(sortedStops[0].color);
  const lastColor = hexToRgb(sortedStops[sortedStops.length - 1].color);

  for (let i = 0; i < LUT_SIZE; i++) {
    const t = i / (LUT_SIZE - 1);
    let r = 0, g = 0, b = 0;

    if (t <= sortedStops[0].pos) {
      r = firstColor[0]; g = firstColor[1]; b = firstColor[2];
    } else if (t >= sortedStops[sortedStops.length - 1].pos) {
      r = lastColor[0]; g = lastColor[1]; b = lastColor[2];
    } else {
      for (let s = 0; s < sortedStops.length - 1; s++) {
        if (t >= sortedStops[s].pos && t <= sortedStops[s + 1].pos) {
          const range = Math.max(0.0001, sortedStops[s + 1].pos - sortedStops[s].pos);
          const localT = (t - sortedStops[s].pos) / range;
          const c1 = hexToRgb(sortedStops[s].color);
          const c2 = hexToRgb(sortedStops[s + 1].color);
          r = Math.round(c1[0] + (c2[0] - c1[0]) * localT);
          g = Math.round(c1[1] + (c2[1] - c1[1]) * localT);
          b = Math.round(c1[2] + (c2[2] - c1[2]) * localT);
          break;
        }
      }
    }
    const idx = i * 3;
    lut[idx] = r; lut[idx + 1] = g; lut[idx + 2] = b;
    lut32[i] = packRGBA32(r, g, b, 255);
  }
  cachedCustomLUT = lut;
  cachedCustomLUT32 = lut32;
  cachedCustomKey = key;
}

export const getCustomColor = (u: number, v: number, w: number, config: CustomColorConfig): [number, number, number] => {
  if (config.mode === 'rgb') {
    const invScale = 1.0 / 6.0;
    const cR = (u * invScale) * config.rgbMultipliers.r + (config.rgbBias.r / 255.0);
    const cG = (v * invScale) * config.rgbMultipliers.g + (config.rgbBias.g / 255.0);
    const cB = (w * invScale) * config.rgbMultipliers.b + (config.rgbBias.b / 255.0);
    const mR = cR > 0 ? (cR * (1.0 + cR * 0.18)) / (1.0 + cR * 0.75) : 0;
    const mG = cG > 0 ? (cG * (1.0 + cG * 0.18)) / (1.0 + cG * 0.75) : 0;
    const mB = cB > 0 ? (cB * (1.0 + cB * 0.18)) / (1.0 + cB * 0.75) : 0;
    return [
      Math.min(255, Math.max(0, (mR * 255.0) | 0)),
      Math.min(255, Math.max(0, (mG * 255.0) | 0)),
      Math.min(255, Math.max(0, (mB * 255.0) | 0))
    ];
  } else {
    const lut = getCustomGradientLUT(config);
    const displayVal = Math.max(u, v * 0.5);
    const norm = Math.min(displayVal / 8.0, 1.0);
    const lutIdx = Math.min(LUT_SIZE - 1, Math.floor(norm * (LUT_SIZE - 1))) * 3;
    return [lut[lutIdx], lut[lutIdx + 1], lut[lutIdx + 2]];
  }
};

function toneMapComponent(c: number): number {
  if (c <= 0) return 0;
  const idx = Math.min(TONE_MAP_LUT_SIZE - 1, Math.max(0, (c * (TONE_MAP_LUT_SIZE - 1)) | 0));
  return toneMapLUT[idx];
}

export const getColor = (u: number, v: number, w: number, type: ColorMap, customConfig?: CustomColorConfig, rgbPostProcessing?: RGBPostProcessingConfig): [number, number, number] => {
  if (type === 'custom' && customConfig) {
    return getCustomColor(u, v, w, customConfig);
  }
  if (type === 'rgb') {
    const pp = rgbPostProcessing;
    if (pp) {
      const exp = pp.exposure;
      let cR = (u / 6.0) * exp * pp.tint.r + pp.brightness;
      let cG = (v / 6.0) * exp * pp.tint.g + pp.brightness;
      let cB = (w / 6.0) * exp * pp.tint.b + pp.brightness;

      if (pp.contrast !== 1.0) {
        const contBias = 0.5 * (1.0 - pp.contrast);
        cR = cR * pp.contrast + contBias;
        cG = cG * pp.contrast + contBias;
        cB = cB * pp.contrast + contBias;
      }

      let mR = cR > 0 ? (cR * (1.0 + cR * 0.18)) / (1.0 + cR * 0.75) : 0;
      let mG = cG > 0 ? (cG * (1.0 + cG * 0.18)) / (1.0 + cG * 0.75) : 0;
      let mB = cB > 0 ? (cB * (1.0 + cB * 0.18)) / (1.0 + cB * 0.75) : 0;

      if (pp.saturation !== 1.0) {
        const lum = 0.299 * mR + 0.587 * mG + 0.114 * mB;
        const invSat = 1.0 - pp.saturation;
        mR = mR * pp.saturation + lum * invSat;
        mG = mG * pp.saturation + lum * invSat;
        mB = mB * pp.saturation + lum * invSat;
      }

      if (Math.abs(pp.gamma - 1.0) > 0.01) {
        const gLut = ensureGammaLUT(pp.gamma);
        const idxR = Math.min(GAMMA_LUT_SIZE - 1, Math.max(0, (mR * (GAMMA_LUT_SIZE - 1)) | 0));
        const idxG = Math.min(GAMMA_LUT_SIZE - 1, Math.max(0, (mG * (GAMMA_LUT_SIZE - 1)) | 0));
        const idxB = Math.min(GAMMA_LUT_SIZE - 1, Math.max(0, (mB * (GAMMA_LUT_SIZE - 1)) | 0));
        return [gLut[idxR], gLut[idxG], gLut[idxB]];
      }

      const r = Math.min(255, Math.max(0, Math.round(mR * 255.0)));
      const g = Math.min(255, Math.max(0, Math.round(mG * 255.0)));
      const b = Math.min(255, Math.max(0, Math.round(mB * 255.0)));
      return [r, g, b];
    } else {
      const r = toneMapComponent(u / 6.0);
      const g = toneMapComponent(v / 6.0);
      const b = toneMapComponent(w / 6.0);
      return [r, g, b];
    }
  }

  const displayVal = Math.max(u, v * 0.4);
  const norm = Math.min(displayVal / 8.0, 1.0);
  const lutIdx = Math.min(LUT_SIZE - 1, Math.floor(norm * (LUT_SIZE - 1))) * 3;
  let lut = magmaLUT;
  if (type === 'electric') lut = electricLUT;
  else if (type === 'bio') lut = bioLUT;
  else if (type === 'thermal') lut = thermalLUT;

  return [lut[lutIdx], lut[lutIdx + 1], lut[lutIdx + 2]];
};

// Optimization C3: Cached Uint32Array view to avoid object allocations in hot render loop
let cachedOutDataBuffer: ArrayBufferLike | null = null;
let cachedOut32View: Uint32Array | null = null;

function getOut32View(outData: Uint8ClampedArray, len: number): Uint32Array {
  const maxElements = Math.max(0, (outData.byteLength - outData.byteOffset) >>> 2);
  const safeLen = Math.min(len, maxElements);
  if (cachedOutDataBuffer === outData.buffer && cachedOut32View && cachedOut32View.length === safeLen) {
    return cachedOut32View;
  }
  cachedOutDataBuffer = outData.buffer;
  cachedOut32View = new Uint32Array(outData.buffer, outData.byteOffset, safeLen);
  return cachedOut32View;
}

// 32-BIT DIRECT FRAMEBUFFER PACKER (Maximum CPU Memory Bandwidth Utilization)
export function renderGridToBuffer(
  uBuf: Float32Array,
  vBuf: Float32Array,
  wBuf: Float32Array,
  outData: Uint8ClampedArray,
  type: ColorMap,
  customConfig?: CustomColorConfig,
  rgbPostProcessing?: RGBPostProcessingConfig
) {
  const maxElements = Math.max(0, (outData.byteLength - outData.byteOffset) >>> 2);
  const len = Math.min(uBuf.length, maxElements);
  if (len === 0) return;
  // Create or retrieve 32-bit unsigned view directly over output buffer
  const out32 = getOut32View(outData, len);

  if (type === 'custom' && customConfig) {
    if (customConfig.mode === 'rgb') {
      const mr = customConfig.rgbMultipliers.r;
      const mg = customConfig.rgbMultipliers.g;
      const mb = customConfig.rgbMultipliers.b;
      const br = customConfig.rgbBias.r / 255.0;
      const bg = customConfig.rgbBias.g / 255.0;
      const bb = customConfig.rgbBias.b / 255.0;
      const invScale = 1.0 / 6.0;
      for (let i = 0; i < len; i++) {
        const cR = (uBuf[i] * invScale) * mr + br;
        const cG = (vBuf[i] * invScale) * mg + bg;
        const cB = (wBuf[i] * invScale) * mb + bb;
        const mR = cR > 0 ? (cR * (1.0 + cR * 0.18)) / (1.0 + cR * 0.75) : 0;
        const mG = cG > 0 ? (cG * (1.0 + cG * 0.18)) / (1.0 + cG * 0.75) : 0;
        const mB = cB > 0 ? (cB * (1.0 + cB * 0.18)) / (1.0 + cB * 0.75) : 0;
        const r = Math.min(255, Math.max(0, (mR * 255.0) | 0));
        const g = Math.min(255, Math.max(0, (mG * 255.0) | 0));
        const b = Math.min(255, Math.max(0, (mB * 255.0) | 0));
        out32[i] = (0xFF000000) | (b << 16) | (g << 8) | r;
      }
      return;
    } else {
      const lut32 = getCustomGradientLUT32(customConfig);
      for (let i = 0; i < len; i++) {
        const val = Math.max(uBuf[i], vBuf[i] * 0.5);
        const lutIdx = (val > 8.0 ? 255 : (val < 0 ? 0 : (val * 31.875) | 0));
        out32[i] = lut32[lutIdx];
      }
      return;
    }
  }

  if (type === 'rgb') {
    const pp = rgbPostProcessing;
    const hasPP = pp && (
      Math.abs(pp.exposure - 1.0) > 0.01 ||
      Math.abs(pp.contrast - 1.0) > 0.01 ||
      Math.abs(pp.gamma - 1.0) > 0.01 ||
      Math.abs(pp.saturation - 1.0) > 0.01 ||
      Math.abs(pp.brightness) > 0.01 ||
      Math.abs(pp.tint.r - 1.0) > 0.01 ||
      Math.abs(pp.tint.g - 1.0) > 0.01 ||
      Math.abs(pp.tint.b - 1.0) > 0.01
    );

    const invScale = 1.0 / 6.0;

    if (!hasPP) {
      // Fast path using Tone-Map LUT (eliminates rational divides and multiplies per channel)
      const lutMax = TONE_MAP_LUT_SIZE - 1;
      for (let i = 0; i < len; i++) {
        const cR = uBuf[i] * invScale;
        const cG = vBuf[i] * invScale;
        const cB = wBuf[i] * invScale;

        const idxR = cR > 0 ? (cR >= 1.0 ? lutMax : (cR * lutMax) | 0) : 0;
        const idxG = cG > 0 ? (cG >= 1.0 ? lutMax : (cG * lutMax) | 0) : 0;
        const idxB = cB > 0 ? (cB >= 1.0 ? lutMax : (cB * lutMax) | 0) : 0;

        out32[i] = (0xFF000000) | (toneMapLUT[idxB] << 16) | (toneMapLUT[idxG] << 8) | toneMapLUT[idxR];
      }
    } else {
      const exp = pp.exposure;
      const tR = pp.tint.r * exp;
      const tG = pp.tint.g * exp;
      const tB = pp.tint.b * exp;
      const bright = pp.brightness;
      const cont = pp.contrast;
      const contBias = 0.5 * (1.0 - cont);
      const sat = pp.saturation;
      const invSat = 1.0 - sat;
      const applyGamma = Math.abs(pp.gamma - 1.0) > 0.01;
      const gLut = applyGamma ? ensureGammaLUT(pp.gamma) : null;
      const gMax = GAMMA_LUT_SIZE - 1;

      for (let i = 0; i < len; i++) {
        let cR = (uBuf[i] * invScale) * tR + bright;
        let cG = (vBuf[i] * invScale) * tG + bright;
        let cB = (wBuf[i] * invScale) * tB + bright;

        if (cont !== 1.0) {
          cR = cR * cont + contBias;
          cG = cG * cont + contBias;
          cB = cB * cont + contBias;
        }

        let mR = cR > 0 ? (cR * (1.0 + cR * 0.18)) / (1.0 + cR * 0.75) : 0;
        let mG = cG > 0 ? (cG * (1.0 + cG * 0.18)) / (1.0 + cG * 0.75) : 0;
        let mB = cB > 0 ? (cB * (1.0 + cB * 0.18)) / (1.0 + cB * 0.75) : 0;

        if (sat !== 1.0) {
          const lum = 0.299 * mR + 0.587 * mG + 0.114 * mB;
          mR = mR * sat + lum * invSat;
          mG = mG * sat + lum * invSat;
          mB = mB * sat + lum * invSat;
        }

        let r: number, g: number, b: number;
        if (gLut) {
          const idxR = mR > 0 ? (mR >= 1.0 ? gMax : (mR * gMax) | 0) : 0;
          const idxG = mG > 0 ? (mG >= 1.0 ? gMax : (mG * gMax) | 0) : 0;
          const idxB = mB > 0 ? (mB >= 1.0 ? gMax : (mB * gMax) | 0) : 0;
          r = gLut[idxR];
          g = gLut[idxG];
          b = gLut[idxB];
        } else {
          r = (mR * 255.0) | 0;
          g = (mG * 255.0) | 0;
          b = (mB * 255.0) | 0;
          if (r > 255) r = 255; else if (r < 0) r = 0;
          if (g > 255) g = 255; else if (g < 0) g = 0;
          if (b > 255) b = 255; else if (b < 0) b = 0;
        }

        out32[i] = (0xFF000000) | (b << 16) | (g << 8) | r;
      }
    }
    return;
  }

  let lut32 = magmaLUT32;
  if (type === 'electric') lut32 = electricLUT32;
  else if (type === 'bio') lut32 = bioLUT32;
  else if (type === 'thermal') lut32 = thermalLUT32;

  for (let i = 0; i < len; i++) {
    const u = uBuf[i];
    const lutIdx = (u > 8.0 ? 255 : (u < 0 ? 0 : (u * 31.875) | 0));
    out32[i] = lut32[lutIdx];
  }
}

/**
 * Converts a scalar morphogen grid (U, V, W) into direct RGB simulation concentrations
 * based on the active colormap/gradient before switching to RGB mode.
 */
export function convertScalarGridToRGB(
  uBuf: Float32Array,
  vBuf: Float32Array,
  wBuf: Float32Array,
  type: ColorMap,
  customConfig?: CustomColorConfig
) {
  const len = Math.min(uBuf.length, vBuf.length, wBuf.length);
  if (len === 0 || type === 'rgb') return;

  if (type === 'custom' && customConfig) {
    if (customConfig.mode === 'rgb') {
      const mr = customConfig.rgbMultipliers.r;
      const mg = customConfig.rgbMultipliers.g;
      const mb = customConfig.rgbMultipliers.b;
      const br = customConfig.rgbBias.r / 255.0;
      const bg = customConfig.rgbBias.g / 255.0;
      const bb = customConfig.rgbBias.b / 255.0;
      for (let i = 0; i < len; i++) {
        uBuf[i] = Math.min(1.0, Math.max(0.0, uBuf[i] * mr / 255.0 + br));
        vBuf[i] = Math.min(1.0, Math.max(0.0, vBuf[i] * mg / 255.0 + bg));
        wBuf[i] = Math.min(1.0, Math.max(0.0, wBuf[i] * mb / 255.0 + bb));
      }
      return;
    } else {
      const lut = getCustomGradientLUT(customConfig);
      for (let i = 0; i < len; i++) {
        const u = uBuf[i];
        const lutIdx = (u > 8.0 ? 255 : (u < 0 ? 0 : (u * 31.875) | 0)) * 3;
        uBuf[i] = lut[lutIdx] / 255.0;
        vBuf[i] = lut[lutIdx + 1] / 255.0;
        wBuf[i] = lut[lutIdx + 2] / 255.0;
      }
      return;
    }
  }

  let lut = magmaLUT;
  if (type === 'electric') lut = electricLUT;
  else if (type === 'bio') lut = bioLUT;
  else if (type === 'thermal') lut = thermalLUT;

  for (let i = 0; i < len; i++) {
    const u = uBuf[i];
    const lutIdx = (u > 8.0 ? 255 : (u < 0 ? 0 : (u * 31.875) | 0)) * 3;
    uBuf[i] = lut[lutIdx] / 255.0;
    vBuf[i] = lut[lutIdx + 1] / 255.0;
    wBuf[i] = lut[lutIdx + 2] / 255.0;
  }
}

