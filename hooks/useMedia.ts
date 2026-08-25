/**
 * Media Stream & Frame Ingestion Hook.
 *
 * Manages video playback, webcam capture streams, and texture rasterization
 * with persistent canvas caching for hardware-accelerated GPGPU injection.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { MediaConfig } from '../types';

export function useMedia() {
    const [mediaConfig, setMediaConfig] = useState<MediaConfig | null>(null);
    const mediaConfigRef = useRef<MediaConfig | null>(null);

    const lastFrameData = useRef<{
        data: Uint8ClampedArray;
        width: number;
        height: number;
        src: string;
    } | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const getSourceId = (config: MediaConfig): string => {
        if (config.type === 'webcam') {
            const el = config.element as HTMLVideoElement;
            return el.srcObject ? (el.srcObject as MediaStream).id : 'webcam_nosource';
        } else if (config.type === 'video') {
            return (config.element as HTMLVideoElement).currentSrc;
        } else {
            return (config.element as HTMLImageElement).src;
        }
    };

    useEffect(() => {
        mediaConfigRef.current = mediaConfig;
        if (mediaConfig) {
            const src = getSourceId(mediaConfig);
            if (lastFrameData.current && lastFrameData.current.src !== src) {
                lastFrameData.current = null;
            }
        } else {
            lastFrameData.current = null;
        }
    }, [mediaConfig]);

    const detachMedia = useCallback(() => {
        const current = mediaConfigRef.current;
        if (current?.element) {
            if (current.type === 'video') {
                const vid = current.element as HTMLVideoElement;
                vid.pause();
                vid.removeAttribute('src');
                vid.load();
            } else if (current.type === 'webcam') {
                const vid = current.element as HTMLVideoElement;
                if (vid.srcObject) {
                    const stream = vid.srcObject as MediaStream;
                    stream.getTracks().forEach(t => t.stop());
                    vid.srcObject = null;
                }
            }
        }
        setMediaConfig(null);
        mediaConfigRef.current = null;
        lastFrameData.current = null;
    }, []);

    const extractFrame = useCallback((element: HTMLImageElement | HTMLVideoElement, width: number, height: number, keepAspect: boolean = true): Uint8ClampedArray | null => {
        const isVideo = element instanceof HTMLVideoElement;

        let src = '';
        if (isVideo) {
            if (element.srcObject) {
                src = (element.srcObject as MediaStream).id;
            } else {
                src = element.currentSrc;
            }
        } else {
            src = (element as HTMLImageElement).src;
        }

        if (isVideo && element.readyState < 2) {
            if (lastFrameData.current &&
                lastFrameData.current.width === width &&
                lastFrameData.current.height === height &&
                lastFrameData.current.src === src) {
                return lastFrameData.current.data;
            }
            return null;
        }

        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
        }
        const canvas = canvasRef.current;

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;

        try {
            if (keepAspect) {
                const natW = (element as HTMLVideoElement).videoWidth || (element as HTMLImageElement).naturalWidth || element.width;
                const natH = (element as HTMLVideoElement).videoHeight || (element as HTMLImageElement).naturalHeight || element.height;
                const aspectX = width / (natW || 1);
                const aspectY = height / (natH || 1);
                const scale = Math.min(aspectX, aspectY);
                const w = natW * scale;
                const h = natH * scale;
                const dx = (width - w) / 2;
                const dy = (height - h) / 2;
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(element, dx, dy, w, h);
            } else {
                ctx.drawImage(element, 0, 0, width, height);
            }
            const data = ctx.getImageData(0, 0, width, height).data;

            if (isVideo) {
                lastFrameData.current = {
                    data,
                    width,
                    height,
                    src
                };
            }

            return data;
        } catch {
            if (lastFrameData.current &&
                lastFrameData.current.width === width &&
                lastFrameData.current.height === height &&
                lastFrameData.current.src === src) {
                return lastFrameData.current.data;
            }
            return null;
        }
    }, []);

    return {
        mediaConfig,
        setMediaConfig,
        mediaConfigRef,
        detachMedia,
        extractFrame
    };
}
