import { InitialSeedConfig } from '../types';
import { compileSafeMathExpression, MathEvalContext } from './mathParser';
import { fastRand } from './physics';

// Ultra-fast integer hash for 2D noise generation (zero float transcendentals)
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) * 2.3283064365386963e-10;
}

// 2D Value Noise with fast Hermite smoothstep
function noise2D(x: number, y: number, seed: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const f = x - i;
  const g = y - j;

  const a = hash(i, j, seed);
  const b = hash(i + 1, j, seed);
  const c = hash(i, j + 1, seed);
  const d = hash(i + 1, j + 1, seed);

  const u = f * f * (3.0 - 2.0 * f);
  const v = g * g * (3.0 - 2.0 * g);

  return (a * (1.0 - u) + b * u) * (1.0 - v) + (c * (1.0 - u) + d * u) * v;
}

// FBM (Fractal Brownian Motion)
function fbm(x: number, y: number, octaves: number, seed: number): number {
  let v = 0;
  let a = 0.5;
  for (let i = 0; i < octaves; i++) {
    v += a * noise2D(x, y, seed);
    x = x * 2.0 + 100.0;
    y = y * 2.0 + 100.0;
    a *= 0.5;
  }
  return v;
}

// Main procedural seed generator
export function generateSeed(width: number, height: number, config: InitialSeedConfig): Float32Array {
  const size = width * height;
  const data = new Float32Array(size);
  const { type, intensity } = config;

  switch (type) {
    case 'random': {
      const thresh = config.randomThreshold;
      for (let i = 0; i < size; i++) {
        if (fastRand() < thresh) {
          data[i] = intensity;
        }
      }
      break;
    }
    case 'perlin': {
      const scale = config.perlinScale / 10.0;
      const seed = (config.perlinSeed || fastRand() * 1000) | 0;
      const octaves = config.perlinOctaves;
      const isGrad = config.perlinGradient;
      const thresh = config.perlinThreshold;

      for (let y = 0; y < height; y++) {
        const rowOff = y * width;
        const sy = y * scale * 0.1;
        for (let x = 0; x < width; x++) {
          const val = fbm(x * scale * 0.1, sy, octaves, seed);
          if (isGrad) {
            const norm = val < 0 ? 0 : (val > 1.0 ? 1.0 : val);
            data[rowOff + x] = norm * intensity;
          } else if (val > thresh) {
            data[rowOff + x] = intensity;
          }
        }
      }
      break;
    }
    case 'grid': {
      // O(DotCount) direct bounding box stamping instead of O(W * H) modulo sweeps
      const spacingX = Math.max(2, config.gridSpacingX | 0);
      const spacingY = Math.max(2, config.gridSpacingY | 0);
      const dotSize = Math.max(1, config.gridDotSize | 0);
      const offset = config.gridOffset ? (spacingX / 2) | 0 : 0;

      let rowIdx = 0;
      for (let gy = 0; gy < height; gy += spacingY) {
        const shiftX = (rowIdx % 2 === 0) ? 0 : offset;
        rowIdx++;

        for (let gx = 0; gx < width; gx += spacingX) {
          const startX = gx + shiftX;
          const endX = Math.min(width, startX + dotSize);
          const endY = Math.min(height, gy + dotSize);

          for (let py = gy; py < endY; py++) {
            const rowOff = py * width;
            for (let px = startX; px < endX; px++) {
              if (px >= 0 && px < width) {
                data[rowOff + px] = intensity;
              }
            }
          }
        }
      }
      break;
    }
    case 'shapes': {
      const shapeSize = Math.max(1, config.shapeSize ?? 10);
      const shapesToDraw: { cx: number; cy: number; r: number }[] = [];

      if (config.shapeMode === 'single') {
        const posX = typeof config.shapePosX === 'number' ? config.shapePosX : 0.5;
        const posY = typeof config.shapePosY === 'number' ? config.shapePosY : 0.5;
        shapesToDraw.push({
          cx: posX * width,
          cy: posY * height,
          r: shapeSize
        });
      } else {
        const count = Math.max(1, config.shapeCount ?? 5);
        for (let k = 0; k < count; k++) {
          shapesToDraw.push({
            cx: fastRand() * width,
            cy: fastRand() * height,
            r: Math.max(1, shapeSize * (0.8 + fastRand() * 0.4))
          });
        }
      }

      for (const shape of shapesToDraw) {
        const { cx, cy, r } = shape;
        const ix = cx | 0;
        const iy = cy | 0;
        const ir = Math.ceil(r);
        const rSq = r * r;
        const hollow = !!config.shapeHollow;
        const thickness = Math.max(1, r * 0.25);
        const innerRSq = Math.max(0, r - thickness) * Math.max(0, r - thickness);
        const shapeType = config.shapeType || 'circle';

        const minY = Math.max(0, iy - ir);
        const maxY = Math.min(height - 1, iy + ir);
        const minX = Math.max(0, ix - ir);
        const maxX = Math.min(width - 1, ix + ir);

        for (let y = minY; y <= maxY; y++) {
          const dy = y - iy;
          const dySq = dy * dy;
          const rowOff = y * width;

          for (let x = minX; x <= maxX; x++) {
            const dx = x - ix;
            let hit = false;

            if (shapeType === 'circle') {
              const dSq = dx * dx + dySq;
              if (hollow) {
                if (dSq <= rSq && dSq >= innerRSq) hit = true;
              } else if (dSq <= rSq) {
                hit = true;
              }
            } else if (shapeType === 'rect') {
              const absX = Math.abs(dx);
              const absY = Math.abs(dy);
              if (absX <= r && absY <= r) {
                if (hollow) {
                  if (absX >= r - thickness || absY >= r - thickness) hit = true;
                } else {
                  hit = true;
                }
              }
            } else if (shapeType === 'star') {
              const nx = Math.abs(dx) / r;
              const ny = Math.abs(dy) / r;
              const dist = Math.pow(nx, 0.6) + Math.pow(ny, 0.6);
              if (dist <= 1.0) {
                if (hollow) {
                  const innerR = Math.max(1, r - thickness);
                  const innerDist = Math.pow(Math.abs(dx) / innerR, 0.6) + Math.pow(Math.abs(dy) / innerR, 0.6);
                  if (innerDist >= 1.0) hit = true;
                } else {
                  hit = true;
                }
              }
            }

            if (hit) {
              data[rowOff + x] = intensity;
            }
          }
        }
      }
      break;
    }
    case 'math': {
      const expr = config.mathExpression || 'Math.sin(x*0.1)*Math.cos(y*0.1) > 0';
      const compiledFn = compileSafeMathExpression(expr);
      const ctx: MathEvalContext = {
        x: 0, y: 0, nx: 0, ny: 0, r: 0, theta: 0, t: 0,
        pi: Math.PI, e: Math.E,
        w: width, h: height,
        width, height,
        u: 0, v: 0, wVal: 0, rand: 0
      };

      for (let y = 0; y < height; y++) {
        ctx.y = y;
        ctx.ny = (y / height) * 2 - 1;
        const rowOff = y * width;

        for (let x = 0; x < width; x++) {
          ctx.x = x;
          ctx.nx = (x / width) * 2 - 1;
          ctx.r = Math.sqrt(ctx.nx * ctx.nx + ctx.ny * ctx.ny);
          ctx.theta = Math.atan2(ctx.ny, ctx.nx);
          ctx.rand = fastRand();

          const res = compiledFn(ctx);
          if (typeof res === 'boolean') {
            if (res) data[rowOff + x] = intensity;
          } else if (typeof res === 'number') {
            data[rowOff + x] = Math.max(0, Math.min(intensity, res * intensity));
          }
        }
      }
      break;
    }
    case 'text': {
      const text = config.textString || 'McRD';
      const sizePx = Math.max(10, config.textSize || 40);
      const posX = typeof config.textPosX === 'number' ? config.textPosX : 0.5;
      const posY = typeof config.textPosY === 'number' ? config.textPosY : 0.5;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = width;
      offCanvas.height = height;
      const offCtx = offCanvas.getContext('2d');
      if (offCtx) {
        offCtx.fillStyle = '#000000';
        offCtx.fillRect(0, 0, width, height);
        offCtx.font = `bold ${sizePx}px sans-serif`;
        offCtx.fillStyle = '#FFFFFF';
        offCtx.textAlign = 'center';
        offCtx.textBaseline = 'middle';
        offCtx.fillText(text, posX * width, posY * height);

        const imgData = offCtx.getImageData(0, 0, width, height);
        for (let i = 0; i < size; i++) {
          const lum = imgData.data[i * 4] / 255.0;
          if (lum > 0.1) {
            data[i] = lum * intensity;
          }
        }
      }
      break;
    }
  }

  return data;
}
