import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Label, Switch } from '../ui/Shared';
import { Camera, X, AlertTriangle, Loader2, RefreshCcw } from 'lucide-react';
import { useModalA11y } from '../../hooks/useFocusTrap';

interface Props {
  onConfirm: (width: number, height: number, keepAspect: boolean, mediaElement: HTMLVideoElement) => void;
  onCancel: () => void;
}

export const WebcamImportModal: React.FC<Props> = ({ onConfirm, onCancel }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState(400);
  const [height, setHeight] = useState(400);
  const [keepAspect, setKeepAspect] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const confirmedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useModalA11y({ isOpen: true, onClose: onCancel });

  const makeEven = (n: number) => {
    const i = Math.round(n);
    return i % 2 === 0 ? i : i + 1;
  };

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devs => {
      const cams = devs.filter(d => d.kind === 'videoinput');
      setDevices(cams);
      if (cams.length > 0 && !selectedDeviceId) setSelectedDeviceId(cams[0].deviceId);
    }).catch(e => console.warn("[WebcamImport] Enum devices failed:", e));
  }, []);

  const stopCurrentStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setStream(null);
    }
  };

  const startCamera = async () => {
    stopCurrentStream();
    setError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 } }
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = s;
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }

      const devs = await navigator.mediaDevices.enumerateDevices();
      setDevices(devs.filter(d => d.kind === 'videoinput'));

    } catch (err: unknown) {
      console.error("[WebcamImport] Camera access error:", err);
      setError((err as Error)?.message || "Could not access camera. Ensure permissions are granted.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (!confirmedRef.current) {
        stopCurrentStream();
      }
    };
  }, [selectedDeviceId]);

  const handleMetadata = () => {
    if (videoRef.current) {
      const w = videoRef.current.videoWidth;
      const h = videoRef.current.videoHeight;
      if (w && h) {
        setAspectRatio(w / h);
        const MAX = 500;
        if (w > h) {
          setWidth(makeEven(MAX));
          setHeight(makeEven(MAX * (h / w)));
        } else {
          setHeight(makeEven(MAX));
          setWidth(makeEven(MAX * (w / h)));
        }
      }
    }
  };

  const handleWidthChange = (val: number) => {
    const w = Math.max(10, makeEven(val));
    setWidth(w);
    if (keepAspect) {
      setHeight(makeEven(Math.round(w / aspectRatio)));
    }
  };

  const handleHeightChange = (val: number) => {
    const h = Math.max(10, makeEven(val));
    setHeight(h);
    if (keepAspect) {
      setWidth(makeEven(Math.round(h * aspectRatio)));
    }
  };

  const handleConfirm = () => {
    if (!videoRef.current || !stream) return;
    confirmedRef.current = true;

    const vid = document.createElement('video');
    vid.autoplay = true;
    vid.playsInline = true;
    vid.muted = true;
    vid.srcObject = stream;
    vid.play();

    onConfirm(width, height, keepAspect, vid);
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="webcam-import-title"
      className="fixed inset-0 z-[200] flex items-center justify-center ui-modal-overlay ui-seed-modal-overlay backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <Card
        className="w-96 p-4 space-y-4 ui-modal ui-seed-modal shadow-2xl"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between ui-modal-header ui-seed-modal-header pb-2">
          <h2 id="webcam-import-title" className="text-xs font-bold uppercase tracking-wider ui-modal-title ui-seed-modal-title flex items-center gap-2">
            <Camera size={14} className="ui-icon ui-seed-modal-icon text-red-400" /> Attach Webcam
          </h2>
          <button onClick={onCancel} aria-label="Close dialog" className="ui-modal-close ui-seed-modal-close transition-colors"><X size={16} /></button>
        </div>

        <div className="flex justify-center bg-zinc-950 p-2 border border-zinc-800 rounded-sm relative min-h-[150px] items-center overflow-hidden ui-seed-modal-preview">
          {error ? (
            <div className="text-red-400 text-xs text-center p-4">
              <AlertTriangle size={24} className="mx-auto mb-2" />
              <p>{error}</p>
              <Button size="sm" variant="secondary" className="mt-2" onClick={startCamera}>Retry Permission</Button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={handleMetadata}
              className="max-h-48 object-contain"
            />
          )}
          {!stream && !error && <Loader2 className="absolute animate-spin text-zinc-500" size={24} />}
        </div>

        <div className="space-y-3">
          {devices.length > 1 && (
            <div className="space-y-1">
              <Label htmlFor="webcam-camera-source">Camera Source</Label>
              <div className="flex gap-2">
                <select
                  id="webcam-camera-source"
                  name="webcam-camera-source"
                  className="flex-1 bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 p-1 rounded outline-none"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  aria-label="Camera Device"
                >
                  {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}...`}</option>)}
                </select>
                <Button size="iconSm" variant="secondary" onClick={startCamera} aria-label="Refresh Camera"><RefreshCcw size={12} /></Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Keep Aspect Ratio</Label>
            <Switch checked={keepAspect} onCheckedChange={setKeepAspect} aria-label="Keep Aspect Ratio" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="webcam-import-w">Grid Width</Label>
              <Input id="webcam-import-w" name="webcam-import-w" type="number" aria-label="Grid Width" value={width} onChange={(e: { target: { value: string | number } }) => handleWidthChange(parseInt(e.target.value as string, 10) || 10)} />
            </div>
            <div>
              <Label htmlFor="webcam-import-h">Grid Height</Label>
              <Input id="webcam-import-h" name="webcam-import-h" type="number" aria-label="Grid Height" value={height} onChange={(e: { target: { value: string | number } }) => handleHeightChange(parseInt(e.target.value as string, 10) || 10)} />
            </div>
          </div>

          <div className="bg-zinc-800/50 p-2 rounded text-[10px] text-zinc-400 flex gap-2 items-start">
            <AlertTriangle size={12} className="shrink-0 mt-0.5 text-zinc-500" />
            <span>Simulation grid will be resized. Video rendering is disabled while webcam is active.</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={handleConfirm} disabled={!stream} className={!stream ? "opacity-50" : ""}>
            Attach Camera
          </Button>
        </div>
      </Card>
    </div>
  );
};
