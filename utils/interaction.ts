/**
 * Interactive Canvas Brushes & Video/Image Ingestion.
 *
 * Implements Euclidean and toroidal periodic drawing brushes (Circle, Square,
 * Gaussian, Splatter) and bilinear image/video frame injection with zero heap allocation.
 */

import { McRDSolver } from './solver';
import { fastRand } from './physics';

/**
 * Applies brush perturbations to the chemistry concentration fields.
 */
export function perturb(
  solver: McRDSolver,
  x: number, y: number, amount: number, radius: number = 8, 
  type: 'inject' | 'remove' | 'smudge' = 'inject', 
  brushType: 'circle' | 'square' | 'gaussian' | 'splatter' = 'circle',
  rgbColor?: { r: number, g: number, b: number },
  boundaryType: 'periodic' | 'open' | 'closed' = 'periodic'
): void {
  // Input validation - guard against NaN or non-finite inputs
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(amount) || !Number.isFinite(radius)) {
    return;
  }
  if (radius <= 0 || amount === 0) return;

  const cx = x | 0;
  const cy = y | 0;
  const r = radius <= 1 ? 1 : (radius | 0);
  const rSq = r * r;
  const invTwoRSq = 1.0 / (2.0 * rSq || 1);

  const w = solver.width;
  const h = solver.height;
  const isPeriodic = boundaryType === 'periodic';

  const sourceU = solver.u;
  const sourceV = solver.v;
  const sourceW = solver.w;

  for (let dy = -r; dy <= r; dy++) {
    const py = cy + dy;
    let targetY = py;
    if (isPeriodic) {
      targetY = ((py % h) + h) % h;
    } else if (py < 0 || py >= h) {
      continue;
    }

    const yRow = targetY * w;
    const dySq = dy * dy;

    for (let dx = -r; dx <= r; dx++) {
      const distSq = dx * dx + dySq;
      if (brushType !== 'square' && distSq > rSq) continue;

      const px = cx + dx;
      let targetX = px;
      if (isPeriodic) {
        targetX = ((px % w) + w) % w;
      } else if (px < 0 || px >= w) {
        continue;
      }

      let intensity = 1.0;
      if (brushType === 'gaussian') {
        intensity = Math.exp(-distSq * invTwoRSq);
      } else if (brushType === 'splatter') {
        if (fastRand() < 0.3) intensity = 2.0;
        else continue;
      }

      const idx = yRow + targetX;

      if (type === 'inject') {
        if (rgbColor) {
          const rWeight = rgbColor.r / 255.0;
          const gWeight = rgbColor.g / 255.0;
          const bWeight = rgbColor.b / 255.0;
          const boost = amount * 0.4 * intensity;

          solver.u[idx] = Math.min(50.0, solver.u[idx] + rWeight * boost);
          solver.v[idx] = Math.min(50.0, solver.v[idx] + gWeight * boost);
          solver.w[idx] = Math.min(50.0, solver.w[idx] + bWeight * boost);
        } else {
          solver.u[idx] = Math.min(50.0, solver.u[idx] + amount * intensity);
          solver.v[idx] = Math.min(50.0, solver.v[idx] + (amount * 0.5) * intensity);
        }
      } else if (type === 'smudge') {
        const smudgeX = isPeriodic ? (((targetX - 2) % w) + w) % w : Math.max(0, targetX - 2);
        const smudgeIdx = yRow + smudgeX;
        const blend = Math.min(0.8, 0.2 * intensity * (amount / 5.0));

        solver.u[idx] = solver.u[idx] * (1 - blend) + sourceU[smudgeIdx] * blend;
        solver.v[idx] = solver.v[idx] * (1 - blend) + sourceV[smudgeIdx] * blend;
        solver.w[idx] = solver.w[idx] * (1 - blend) + sourceW[smudgeIdx] * blend;
      } else if (type === 'remove') {
        const factor = Math.max(0, 1.0 - Math.min(1.0, (amount * 0.35) * intensity));
        solver.u[idx] *= factor;
        solver.v[idx] *= factor;
        solver.w[idx] *= factor;
      }
    }
  }
}

/**
 * Copies pixel colors from an image array directly into the chemistry grid solver.
 */
export function importImage(
  solver: McRDSolver,
  imageData: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  totalDensity: number,
  isRGB: boolean
): void {
  const w = solver.width;
  const h = solver.height;
  const xRatio = w > 1 ? (imgWidth - 1) / (w - 1) : 0;
  const yRatio = h > 1 ? (imgHeight - 1) / (h - 1) : 0;
  const maxByte = imageData.length - 4;

  for (let y = 0; y < h; y++) {
    const imgY = Math.min(imgHeight - 1, (y * yRatio) | 0);
    const imgRowOff = imgY * imgWidth;
    const rowOff = y * w;

    for (let x = 0; x < w; x++) {
      const imgX = Math.min(imgWidth - 1, (x * xRatio) | 0);
      const imgIdx = Math.min(maxByte, (imgRowOff + imgX) * 4);

      const r = imageData[imgIdx] / 255.0;
      const g = imageData[imgIdx + 1] / 255.0;
      const b = imageData[imgIdx + 2] / 255.0;
      const idx = rowOff + x;

      if (isRGB) {
        solver.u[idx] = r * totalDensity;
        solver.v[idx] = g * totalDensity;
        solver.w[idx] = b * totalDensity;
      } else {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        solver.u[idx] = 1.0; 
        solver.v[idx] = lum * totalDensity; 
        solver.w[idx] = 0;
      }

      solver.prevU[idx] = solver.u[idx];
      solver.prevV[idx] = solver.v[idx];
      solver.prevW[idx] = solver.w[idx];
    }
  }
}

/**
 * Blends frame byte arrays dynamically into active chemistry grid values with linear interpolation.
 */
export function injectSignal(
  solver: McRDSolver,
  imageData: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  totalDensity: number,
  opacity: number,
  isRGB: boolean
): void {
  if (opacity <= 0.001) return;

  const w = solver.width;
  const h = solver.height;
  const xRatio = w > 1 ? (imgWidth - 1) / (w - 1) : 0;
  const yRatio = h > 1 ? (imgHeight - 1) / (h - 1) : 0;
  const maxByte = imageData.length - 4;

  for (let y = 0; y < h; y++) {
    const imgY = Math.min(imgHeight - 1, (y * yRatio) | 0);
    const imgRowOff = imgY * imgWidth;
    const rowOff = y * w;

    for (let x = 0; x < w; x++) {
      const imgX = Math.min(imgWidth - 1, (x * xRatio) | 0);
      const imgIdx = Math.min(maxByte, (imgRowOff + imgX) * 4);

      const r = imageData[imgIdx] / 255.0;
      const g = imageData[imgIdx + 1] / 255.0;
      const b = imageData[imgIdx + 2] / 255.0;
      const idx = rowOff + x;

      if (isRGB) {
        solver.u[idx] += (r * totalDensity - solver.u[idx]) * opacity;
        solver.v[idx] += (g * totalDensity - solver.v[idx]) * opacity;
        solver.w[idx] += (b * totalDensity - solver.w[idx]) * opacity;
      } else {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        solver.v[idx] += (lum * totalDensity - solver.v[idx]) * opacity;
      }
    }
  }
}
