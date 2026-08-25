/**
 * Real-Time Simulation Canvas Viewport.
 *
 * Manages WebGL2 context rendering, multi-threaded worker frame blitting,
 * pan/zoom coordinate transformations, and pointer gesture interactions.
 */

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { McRDSolver } from '../utils/solver';
import { GPUSimulationEngine } from '../utils/gpuSolver';
import { ColorMap, EngineMode, CustomColorConfig, RGBPostProcessingConfig, ReliefLightingConfig } from '../types';
import { renderGridToBuffer } from '../utils/colors';

interface VisualizerProps {
  solver: McRDSolver;
  gpuSolver?: GPUSimulationEngine | null;
  engineMode?: EngineMode;
  isRunning?: boolean;
  width: number;
  height: number;
  colorMap: ColorMap;
  customColorConfig: CustomColorConfig;
  rgbPostProcessing?: RGBPostProcessingConfig;
  reliefLighting?: ReliefLightingConfig;
  onInteract: (x: number, y: number) => void;
  offset: { x: number, y: number };
  setOffset: (o: { x: number, y: number } | ((prev: { x: number, y: number }) => { x: number, y: number })) => void;
  zoom: number;
  setZoom: (z: number | ((prev: number) => number)) => void;
  infiniteGrid: boolean;
  renderStyle?: 'pixelated' | 'smooth';
}

export interface VisualizerHandle {
  getCanvasDataURL: () => string;
  getStream: (fps: number) => MediaStream | null;
  drawNow: () => void;
  getSimulationCanvas: () => HTMLCanvasElement | null;
  setWorkerImageData: (imgData: ImageData) => void;
  setWorkerRawBuffer: (arrayBuf: ArrayBuffer, w: number, h: number) => void;
}

const Visualizer = forwardRef<VisualizerHandle, VisualizerProps>(({
  solver, gpuSolver, engineMode = 'worker', isRunning = false, width, height, colorMap, customColorConfig, rgbPostProcessing, reliefLighting, onInteract,
  offset, setOffset, zoom, setZoom, infiniteGrid, renderStyle = 'pixelated'
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement>(null);

  // Persisted ImageData reference
  const imageDataRef = useRef<ImageData | null>(null);
  const workerImageDataRef = useRef<ImageData | null>(null);

  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);
  const isMultiTouch = useRef(false);
  const activeTouchPoints = useRef(0);
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Interaction Loop Refs
  const interactionRef = useRef<number | null>(null);
  const isInteracting = useRef(false);
  const currentPointerPos = useRef({ x: 0, y: 0 });

  const getSimCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2 + offset.x;
    const centerY = rect.height / 2 + offset.y;
    const relX = (clientX - rect.left - centerX) / zoom + width / 2;
    const relY = (clientY - rect.top - centerY) / zoom + height / 2;
    if (!infiniteGrid) {
      if (relX < 0 || relX >= width || relY < 0 || relY >= height) return null;
    }
    return { x: relX, y: relY };
  };

  const startInteractionLoop = () => {
    if (interactionRef.current) return;
    const loop = () => {
      if (isInteracting.current) {
        const coords = getSimCoords(currentPointerPos.current.x, currentPointerPos.current.y);
        if (coords) {
          onInteract(coords.x, coords.y);
        }
        interactionRef.current = requestAnimationFrame(loop);
      } else {
        interactionRef.current = null;
      }
    };
    interactionRef.current = requestAnimationFrame(loop);
  };

  const stopInteractionLoop = () => {
    if (interactionRef.current) {
      cancelAnimationFrame(interactionRef.current);
      interactionRef.current = null;
    }
    isInteracting.current = false;
  };

  // Performance-optimised buffer update tracking with fast hashes
  const lastRenderedTickRef = useRef<number>(-1);
  const lastColorMapRef = useRef<string>('');
  const lastCustomHashRef = useRef<number>(0);
  const lastPPHashRef = useRef<number>(0);
  const lastReliefHashRef = useRef<number>(0);

  // Infinite grid bounds caching
  const gridBoundsRef = useRef<{ startX: number, endX: number, startY: number, endY: number, key: string }>({
    startX: 0, endX: 0, startY: 0, endY: 0, key: ''
  });

  const getCustomColorHash = (cfg: CustomColorConfig | undefined): number => {
    if (!cfg) return 0;
    const m = cfg.mode === 'rgb' ? 1 : 2;
    const r = cfg.rgbMultipliers.r * 1000 + cfg.rgbBias.r;
    const g = cfg.rgbMultipliers.g * 1000 + cfg.rgbBias.g;
    const b = cfg.rgbMultipliers.b * 1000 + cfg.rgbBias.b;
    const stopsLen = cfg.scalarGradient ? cfg.scalarGradient.length : 0;
    return m * 10000000 + (r + g + b) + stopsLen * 100;
  };

  const getPPHash = (pp: RGBPostProcessingConfig | undefined): number => {
    if (!pp) return 0;
    return (
      (pp.exposure * 1000) | 0 +
      ((pp.contrast * 1000) | 0) * 10 +
      ((pp.gamma * 1000) | 0) * 100 +
      ((pp.saturation * 1000) | 0) * 1000 +
      ((pp.brightness * 1000) | 0) * 10000 +
      ((pp.tint?.r ?? 1) * 100) * 100000 +
      ((pp.tint?.g ?? 1) * 100) * 1000000 +
      ((pp.tint?.b ?? 1) * 100) * 10000000
    );
  };

  const getReliefHash = (rf: ReliefLightingConfig | undefined): number => {
    if (!rf || !rf.enabled) return 0;
    return (rf.bump * 1000 | 0) + (rf.specular * 1000 | 0) * 10 + (rf.lightAngle * 1000 | 0) * 100;
  };

  const updateBuffer = (force: boolean = false) => {
    // In GPU mode or active running Worker mode, bufferCanvas is updated by the GPU / Worker directly
    if (engineMode === 'gpu') return;
    if (engineMode === 'worker' && isRunning) return;

    if (!bufferCanvasRef.current) {
      bufferCanvasRef.current = document.createElement('canvas');
      bufferCanvasRef.current.width = width;
      bufferCanvasRef.current.height = height;
    }

    const canvas = bufferCanvasRef.current;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      force = true;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const customHash = getCustomColorHash(customColorConfig);
    const ppHash = getPPHash(rgbPostProcessing);
    const reliefHash = getReliefHash(reliefLighting);

    if (!force &&
        lastRenderedTickRef.current === solver.tick &&
        lastColorMapRef.current === colorMap &&
        lastCustomHashRef.current === customHash &&
        lastPPHashRef.current === ppHash &&
        lastReliefHashRef.current === reliefHash) {
      return;
    }

    // When in worker mode and simulation is running, worker handles buffer updates via setWorkerRawBuffer
    // Only fall through to direct CPU render when paused or when solver state has changed
    if (!imageDataRef.current ||
      imageDataRef.current.width !== width ||
      imageDataRef.current.height !== height) {
      imageDataRef.current = new ImageData(width, height);
    }
    const imgData = imageDataRef.current;
    // Direct 32-bit zero-allocation fast CPU buffer filling
    renderGridToBuffer(solver.u, solver.v, solver.w, imgData.data, colorMap, customColorConfig, rgbPostProcessing);
    ctx.putImageData(imgData, 0, 0);

    lastRenderedTickRef.current = solver.tick;
    lastColorMapRef.current = colorMap;
    lastCustomHashRef.current = customHash;
    lastPPHashRef.current = ppHash;
    lastReliefHashRef.current = reliefHash;
  };

  // Render the visualizer canvas (Hardware GPU Direct Pass or 2D CPU Buffer Canvas)
  const draw = () => {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    if (mainCanvas.width !== rect.width || mainCanvas.height !== rect.height) {
      mainCanvas.width = rect.width;
      mainCanvas.height = rect.height;
    }

    // Hardware WebGL2 GPU Rendering Path — render grid-resolution to internal canvas,
    // then draw to main canvas via the same transform used for CPU/Worker.
    if (engineMode === 'gpu' && gpuSolver && gpuSolver.isSupported) {
      gpuSolver.renderToCanvas(
        colorMap,
        customColorConfig,
        rgbPostProcessing,
        reliefLighting
      );
      // Fall through to draw gpuSolver.canvas via the standard pan/zoom code below
    }

    // High-Performance CPU / Web Worker 2D Canvas Blitting Path
    const ctx = mainCanvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = renderStyle === 'smooth';

    const coversViewport = !infiniteGrid && zoom >= 1.0 && offset.x === 0 && offset.y === 0 && width === mainCanvas.width && height === mainCanvas.height;
    if (!coversViewport) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
    }

    updateBuffer();
    // Use GPU canvas as source if in GPU mode, otherwise use the buffer canvas
    const buffer = (engineMode === 'gpu' && gpuSolver && gpuSolver.isSupported)
      ? gpuSolver.canvas
      : bufferCanvasRef.current;
    if (!buffer) return;

    ctx.save();
    ctx.translate(mainCanvas.width / 2 + offset.x, mainCanvas.height / 2 + offset.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-width / 2, -height / 2);

    if (infiniteGrid) {
      const boundsKey = `${mainCanvas.width}_${mainCanvas.height}_${zoom.toFixed(2)}_${offset.x.toFixed(1)}_${offset.y.toFixed(1)}_${width}_${height}`;
      let { startX, endX, startY, endY } = gridBoundsRef.current;

      if (gridBoundsRef.current.key !== boundsKey) {
        const visibleW = mainCanvas.width / zoom;
        const visibleH = mainCanvas.height / zoom;
        startX = Math.floor((-visibleW / 2 - offset.x / zoom) / width) - 1;
        endX = Math.ceil((visibleW / 2 - offset.x / zoom) / width) + 1;
        startY = Math.floor((-visibleH / 2 - offset.y / zoom) / height) - 1;
        endY = Math.ceil((visibleH / 2 - offset.y / zoom) / height) + 1;
        gridBoundsRef.current = { startX, endX, startY, endY, key: boundsKey };
      }

      const overlap = 0.6 / Math.max(zoom, 0.1);

      for (let ty = startY; ty <= endY; ty++) {
        for (let tx = startX; tx <= endX; tx++) {
          ctx.drawImage(
            buffer,
            tx * width,
            ty * height,
            width + overlap,
            height + overlap
          );
        }
      }
    } else {
      ctx.drawImage(buffer, 0, 0);
    }

    ctx.restore();
  };

  useImperativeHandle(ref, () => ({
    getCanvasDataURL: () => {
      if (engineMode === 'gpu' && gpuSolver && gpuSolver.isSupported) {
        return gpuSolver.canvas.toDataURL('image/png');
      }
      updateBuffer();
      if (bufferCanvasRef.current) {
        return bufferCanvasRef.current.toDataURL('image/png');
      }
      return '';
    },
    getStream: (fps: number) => {
      if (engineMode === 'gpu' && gpuSolver && gpuSolver.isSupported) {
        return (gpuSolver.canvas as any).captureStream(fps);
      }
      if (!bufferCanvasRef.current) updateBuffer();
      if (bufferCanvasRef.current) {
        return (bufferCanvasRef.current as any).captureStream(fps);
      }
      return null;
    },
    getSimulationCanvas: () => {
      if (engineMode === 'gpu' && gpuSolver && gpuSolver.isSupported) {
        return gpuSolver.canvas;
      }
      updateBuffer();
      return bufferCanvasRef.current;
    },
    setWorkerImageData: (imgData: ImageData) => {
      workerImageDataRef.current = imgData;
      if (!bufferCanvasRef.current) {
        bufferCanvasRef.current = document.createElement('canvas');
        bufferCanvasRef.current.width = width;
        bufferCanvasRef.current.height = height;
      }
      const canvas = bufferCanvasRef.current;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const ctx = canvas.getContext('2d');
      if (ctx && imgData.width === canvas.width && imgData.height === canvas.height) {
        ctx.putImageData(imgData, 0, 0);
      }
    },
    setWorkerRawBuffer: (arrayBuf: ArrayBuffer, w: number, h: number) => {
      if (arrayBuf.byteLength !== w * h * 4) return;
      // Create ImageData from the transferred buffer and blit immediately
      const frameData = new ImageData(new Uint8ClampedArray(arrayBuf), w, h);
      workerImageDataRef.current = frameData;

      if (!bufferCanvasRef.current) {
        bufferCanvasRef.current = document.createElement('canvas');
      }
      const canvas = bufferCanvasRef.current;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(frameData, 0, 0);
      }
    },
    drawNow: () => {
      draw();
    }
  }));

  useEffect(() => {
    let animId: number;
    const renderLoop = () => {
      draw();
      animId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => cancelAnimationFrame(animId);
  }, [solver, gpuSolver, engineMode, colorMap, width, height, offset, zoom, infiniteGrid, customColorConfig, rgbPostProcessing, reliefLighting, renderStyle]);

  // Native non-passive touch listeners on container to prevent browser pinch-zoom and manage multi-touch
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onNativeTouchStart = (e: TouchEvent) => {
      activeTouchPoints.current = e.touches.length;
      if (e.touches.length >= 2) {
        isMultiTouch.current = true;
        isInteracting.current = false;
        stopInteractionLoop();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        lastTouchDist.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        lastPos.current = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
        if (e.cancelable) e.preventDefault();
      }
    };

    const onNativeTouchMove = (e: TouchEvent) => {
      activeTouchPoints.current = e.touches.length;
      if (e.touches.length >= 2) {
        isMultiTouch.current = true;
        isInteracting.current = false;
        stopInteractionLoop();

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;

        const canvas = canvasRef.current;
        if (lastTouchDist.current !== null && lastTouchDist.current > 0 && canvas) {
          const rect = canvas.getBoundingClientRect();
          const px = midX - rect.left - rect.width / 2;
          const py = midY - rect.top - rect.height / 2;

          const currentZoom = zoomRef.current;
          const zoomFactor = dist / lastTouchDist.current;
          const newZoom = Math.max(0.1, Math.min(20, currentZoom * zoomFactor));
          const actualFactor = newZoom / currentZoom;

          const dx = (lastPos.current.x !== 0) ? midX - lastPos.current.x : 0;
          const dy = (lastPos.current.y !== 0) ? midY - lastPos.current.y : 0;

          zoomRef.current = newZoom;
          setZoom(newZoom);
          setOffset(prev => ({
            x: px - actualFactor * (px - prev.x) + dx,
            y: py - actualFactor * (py - prev.y) + dy,
          }));
        }
        lastTouchDist.current = dist;
        lastPos.current = { x: midX, y: midY };
        if (e.cancelable) e.preventDefault();
      }
    };

    const onNativeTouchEnd = (e: TouchEvent) => {
      activeTouchPoints.current = e.touches.length;
      if (e.touches.length < 2) {
        lastTouchDist.current = null;
        lastPos.current = { x: 0, y: 0 };
      }
      if (e.touches.length === 0) {
        isMultiTouch.current = false;
        isInteracting.current = false;
        stopInteractionLoop();
      }
    };

    container.addEventListener('touchstart', onNativeTouchStart, { passive: false });
    container.addEventListener('touchmove', onNativeTouchMove, { passive: false });
    container.addEventListener('touchend', onNativeTouchEnd, { passive: false });
    container.addEventListener('touchcancel', onNativeTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', onNativeTouchStart);
      container.removeEventListener('touchmove', onNativeTouchMove);
      container.removeEventListener('touchend', onNativeTouchEnd);
      container.removeEventListener('touchcancel', onNativeTouchEnd);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      if (isMultiTouch.current || activeTouchPoints.current >= 2) {
        isInteracting.current = false;
        stopInteractionLoop();
        return;
      }
    }
    if (e.button === 1 || (e.pointerType === 'touch' && e.buttons === 0)) {
      isDragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
    } else if (e.button === 0) {
      if (e.pointerType === 'touch' && (isMultiTouch.current || activeTouchPoints.current >= 2)) {
        return;
      }
      currentPointerPos.current = { x: e.clientX, y: e.clientY };
      isInteracting.current = true;
      const coords = getSimCoords(e.clientX, e.clientY);
      if (coords) {
        onInteract(coords.x, coords.y);
      }
      startInteractionLoop();
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && (isMultiTouch.current || activeTouchPoints.current >= 2)) {
      isInteracting.current = false;
      stopInteractionLoop();
      return;
    }
    if (isDragging.current) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    } else if (isInteracting.current) {
      currentPointerPos.current = { x: e.clientX, y: e.clientY };
      const coords = getSimCoords(e.clientX, e.clientY);
      if (coords) {
        onInteract(coords.x, coords.y);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    stopInteractionLoop();
    if (e.pointerType === 'touch' && activeTouchPoints.current === 0) {
      isMultiTouch.current = false;
    }
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Cursor position relative to viewport/container center
    const px = e.clientX - rect.left - rect.width / 2;
    const py = e.clientY - rect.top - rect.height / 2;

    const zoomFactor = Math.exp(-e.deltaY * 0.0015);
    const newZoom = Math.max(0.1, Math.min(20, zoom * zoomFactor));
    const actualFactor = newZoom / zoom;

    setZoom(newZoom);
    setOffset(prev => ({
      x: px - actualFactor * (px - prev.x),
      y: py - actualFactor * (py - prev.y),
    }));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      isMultiTouch.current = true;
      isInteracting.current = false;
      stopInteractionLoop();

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      const canvas = canvasRef.current;
      if (lastTouchDist.current !== null && lastTouchDist.current > 0 && canvas) {
        const rect = canvas.getBoundingClientRect();
        const px = midX - rect.left - rect.width / 2;
        const py = midY - rect.top - rect.height / 2;

        const currentZoom = zoomRef.current;
        const zoomFactor = dist / lastTouchDist.current;
        const newZoom = Math.max(0.1, Math.min(20, currentZoom * zoomFactor));
        const actualFactor = newZoom / currentZoom;

        // Pan delta from midpoint motion
        const dx = (lastPos.current.x !== 0) ? midX - lastPos.current.x : 0;
        const dy = (lastPos.current.y !== 0) ? midY - lastPos.current.y : 0;

        zoomRef.current = newZoom;
        setZoom(newZoom);
        setOffset(prev => ({
          x: px - actualFactor * (px - prev.x) + dx,
          y: py - actualFactor * (py - prev.y) + dy,
        }));
      }
      lastTouchDist.current = dist;
      lastPos.current = { x: midX, y: midY };
    } else if (e.touches.length === 1 && !isMultiTouch.current && !isDragging.current) {
      currentPointerPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (isInteracting.current) {
        const coords = getSimCoords(e.touches[0].clientX, e.touches[0].clientY);
        if (coords) {
          onInteract(coords.x, coords.y);
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    activeTouchPoints.current = e.touches.length;
    if (e.touches.length < 2) {
      lastTouchDist.current = null;
      lastPos.current = { x: 0, y: 0 };
    }
    if (e.touches.length === 0) {
      isMultiTouch.current = false;
      isInteracting.current = false;
      stopInteractionLoop();
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-black touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair touch-none select-none"
        style={{ imageRendering: renderStyle === 'pixelated' ? 'pixelated' : 'auto' }}
      />
    </div>
  );
});

export default Visualizer;
