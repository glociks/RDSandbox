import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Label, Switch } from '../ui/Shared';
import { Image as ImageIcon, Video, X, AlertTriangle, Loader2 } from 'lucide-react';
import { useModalA11y } from '../../hooks/useFocusTrap';

interface Props {
  mediaSrc: string;
  mediaType: 'image' | 'video';
  onConfirm: (width: number, height: number, keepAspect: boolean, mediaElement: HTMLImageElement | HTMLVideoElement) => void;
  onCancel: () => void;
}

export const MediaImportModal: React.FC<Props> = ({ mediaSrc, mediaType, onConfirm, onCancel }) => {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const [keepAspect, setKeepAspect] = useState(true);
  const [disableResize, setDisableResize] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showHighResConfirm, setShowHighResConfirm] = useState(false);

  const confirmFired = useRef(false);
  const containerRef = useModalA11y({ isOpen: true, onClose: onCancel });

  const makeEven = (n: number) => n % 2 === 0 ? n : n + 1;

  const fitDimensions = (w: number, h: number, noResize: boolean) => {
    const SUGGESTED_DIM = 400;
    const MAX_DIM = 4096;
    const limit = noResize ? MAX_DIM : SUGGESTED_DIM;

    if (w > limit || h > limit) {
      if (w > h) {
        const ratio = h / w;
        setWidth(makeEven(limit));
        setHeight(makeEven(Math.round(limit * ratio)));
      } else {
        const ratio = w / h;
        setHeight(makeEven(limit));
        setWidth(makeEven(Math.round(limit * ratio)));
      }
    } else {
      setWidth(makeEven(w));
      setHeight(makeEven(h));
    }
  };

  useEffect(() => {
    setIsLoaded(false);
    if (mediaType === 'image') {
      const img = new Image();
      img.onload = () => {
        setOrigW(img.width);
        setOrigH(img.height);
        fitDimensions(img.width, img.height, false);
        setIsLoaded(true);
      };
      img.src = mediaSrc;
    } else {
      const vid = document.createElement('video');
      vid.onloadedmetadata = () => {
        setOrigW(vid.videoWidth);
        setOrigH(vid.videoHeight);
        fitDimensions(vid.videoWidth, vid.videoHeight, false);
      };
      vid.oncanplay = () => {
        setIsLoaded(true);
      };
      vid.src = mediaSrc;
      vid.currentTime = 0.1;
    }
  }, [mediaSrc, mediaType]);

  useEffect(() => {
    if (origW > 0 && origH > 0) {
      fitDimensions(origW, origH, disableResize);
    }
  }, [disableResize]);

  const handleWidthChange = (val: number) => {
    const max = 4096;
    let w = Math.max(10, Math.min(max, val));
    w = makeEven(w);
    setWidth(w);
    if (keepAspect && origW > 0) {
      setHeight(makeEven(Math.round(w * (origH / origW))));
    }
  };

  const handleHeightChange = (val: number) => {
    const max = 4096;
    let h = Math.max(10, Math.min(max, val));
    h = makeEven(h);
    setHeight(h);
    if (keepAspect && origH > 0) {
      setWidth(makeEven(Math.round(h * (origW / origH))));
    }
  };

  const executeConfirm = () => {
    if (!isLoaded || confirmFired.current) return;
    confirmFired.current = true;

    if (mediaType === 'image') {
      const img = new Image();
      img.src = mediaSrc;
      img.onload = () => onConfirm(width, height, keepAspect, img);
    } else {
      const vid = document.createElement('video');
      vid.src = mediaSrc;
      vid.loop = true;
      vid.muted = true;
      vid.playsInline = true;
      vid.crossOrigin = "anonymous";

      const onReady = () => {
        onConfirm(width, height, keepAspect, vid);
      };

      vid.addEventListener('canplay', onReady, { once: true });
      vid.load();
    }
  };

  const checkAndConfirm = () => {
    if (width * height > 930000) {
      setShowHighResConfirm(true);
    } else {
      executeConfirm();
    }
  };

  const isHighRes = width * height > 930000;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-import-title"
      className="fixed inset-0 z-[200] flex items-center justify-center ui-modal-overlay backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <Card
        className="w-80 p-4 space-y-4 ui-modal shadow-2xl relative overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {showHighResConfirm && (
          <div className="absolute inset-0 z-50 bg-zinc-900 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <AlertTriangle size={32} className="text-red-500 mb-2" />
            <h3 className="text-sm font-bold text-zinc-100 uppercase">High Resolution Warning</h3>
            <p className="text-xs text-zinc-400">
              Importing media larger than 720p ({width}x{height}) can severely impact performance and might cause the browser tab to crash on some devices.
            </p>
            <div className="flex gap-2 w-full pt-2">
              <Button variant="secondary" onClick={() => setShowHighResConfirm(false)} className="flex-1">Go Back</Button>
              <Button variant="destructive" onClick={executeConfirm} className="flex-1">Import Anyway</Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between ui-modal-header pb-2">
          <h2 id="media-import-title" className="text-xs font-bold uppercase tracking-wider ui-modal-title flex items-center gap-2">
            {mediaType === 'image' ? <ImageIcon size={14} className="text-emerald-400" /> : <Video size={14} className="text-blue-400" />}
            Import {mediaType === 'image' ? 'Image' : 'Video'}
          </h2>
          <button onClick={onCancel} aria-label="Close dialog" className="ui-modal-close transition-colors"><X size={16} /></button>
        </div>

        <div className="flex justify-center bg-zinc-950 p-2 border border-zinc-800 rounded-sm relative min-h-[100px] items-center">
          {!isLoaded && <Loader2 className="absolute animate-spin text-zinc-500" size={24} />}
          {mediaType === 'image' ? (
            <img src={mediaSrc} alt="Preview" className={`max-h-32 object-contain transition-opacity ${isLoaded ? 'opacity-100' : 'opacity-30'}`} />
          ) : (
            <video src={mediaSrc} className={`max-h-32 object-contain transition-opacity ${isLoaded ? 'opacity-100' : 'opacity-30'}`} controls muted />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Keep Aspect Ratio</Label>
            <Switch checked={keepAspect} onCheckedChange={setKeepAspect} aria-label="Keep Aspect Ratio" />
          </div>

          <div className="flex items-center justify-between">
            <Label className={disableResize ? "text-amber-400" : ""}>Disable Safe Resize</Label>
            <Switch checked={disableResize} onCheckedChange={setDisableResize} aria-label="Disable Safe Resize" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="media-import-w">Width (Even)</Label>
              <Input id="media-import-w" name="media-import-w" type="number" aria-label="Target Width" value={width} onChange={(e: { target: { value: string | number } }) => handleWidthChange(parseInt(e.target.value as string, 10) || 10)} />
            </div>
            <div>
              <Label htmlFor="media-import-h">Height (Even)</Label>
              <Input id="media-import-h" name="media-import-h" type="number" aria-label="Target Height" value={height} onChange={(e: { target: { value: string | number } }) => handleHeightChange(parseInt(e.target.value as string, 10) || 10)} />
            </div>
          </div>

          <div className="bg-zinc-800/50 p-2 rounded text-[10px] text-zinc-400 flex gap-2 items-start">
            <AlertTriangle size={12} className={`shrink-0 mt-0.5 ${isHighRes ? 'text-amber-500' : 'text-zinc-500'}`} />
            <span>
              {isHighRes
                ? "Warning: High resolutions (>720p) can significantly slow down the simulation."
                : "Grid will be resized to match these dimensions."}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={checkAndConfirm} disabled={!isLoaded} className={!isLoaded ? "opacity-50 cursor-wait" : ""}>
            {isLoaded ? "Import & Resize" : "Loading..."}
          </Button>
        </div>
      </Card>
    </div>
  );
};
