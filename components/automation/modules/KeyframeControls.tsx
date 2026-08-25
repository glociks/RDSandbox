import React, { useRef, useEffect, useState } from 'react';
import { ParameterControl, Label, Switch, Button } from '../../ui/Shared';
import { MousePointer2, Plus, Eraser, Spline, TrendingUp, StepForward } from 'lucide-react';
import { AutomationModule } from '../../../types';

interface KeyframeItem {
  id: string;
  t: number;
  val: number;
  type: 'linear' | 'bezier' | 'jump';
}

interface KeyframeEditorState {
  zoom: number;
  scrollX: number;
  selectedKeyframeId: string | null;
  mode: 'select' | 'add' | 'remove';
  defCurveType: 'linear' | 'bezier' | 'jump';
}

interface KeyframeControlsProps {
  module: AutomationModule;
  onUpdate: (updates: Partial<AutomationModule>) => void;
  simTime?: number;
  currentOutput?: number;
}

export const KeyframeControls: React.FC<KeyframeControlsProps> = ({ module, onUpdate, simTime = 0, currentOutput = 0 }) => {
  const kf = module.keyframe || {
    timelineLength: 120,
    loop: true,
    keyframes: [
      { id: 'k1', t: 0, val: 0, type: 'linear' as const },
      { id: 'k2', t: 60, val: 1, type: 'bezier' as const },
      { id: 'k3', t: 120, val: 0, type: 'linear' as const },
    ],
    editor: {
      zoom: 1,
      scrollX: 0,
      selectedKeyframeId: null,
      mode: 'select' as const,
      defCurveType: 'linear' as const,
    },
  };
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [draggedKeyframeId, setDraggedKeyframeId] = useState<string | null>(null);
  const [lastPanX, setLastPanX] = useState(0);

  const updateKeyframeState = (updates: Partial<typeof kf>) => {
    onUpdate({
      keyframe: {
        ...kf,
        ...updates,
        editor: {
          ...(kf.editor as KeyframeEditorState),
          ...(updates.editor || {}),
        },
      },
    });
  };
  
  const drawCanvas = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const targetW = Math.max(100, Math.floor(rect.width || containerRef.current.clientWidth || 240));
      const targetH = Math.max(50, Math.floor(rect.height || containerRef.current.clientHeight || 128));
      if (cvs.width !== targetW || cvs.height !== targetH) {
        cvs.width = targetW;
        cvs.height = targetH;
      }
    }

    const { width, height } = cvs;
    const editor = kf.editor as KeyframeEditorState;
    const { zoom = 1, scrollX = 0, selectedKeyframeId = null } = editor || {};
    const { timelineLength = 120, keyframes = [] } = kf;
    
    ctx.fillStyle = '#18181b'; 
    ctx.fillRect(0, 0, width, height);
    
    const visibleFrames = timelineLength / Math.max(0.1, zoom);
    const startFrame = (scrollX / 100) * (timelineLength - visibleFrames);
    
    const frameToX = (f: number) => ((f - startFrame) / visibleFrames) * width;
    const valToY = (v: number) => height - (v * height); 

    // Grid lines
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    const step = Math.max(10, Math.floor(visibleFrames / 10));
    
    ctx.beginPath();
    for (let f = Math.floor(startFrame); f <= startFrame + visibleFrames; f++) {
      if (f % step === 0) {
        const x = frameToX(f);
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
      }
    }
    for (let v = 0; v <= 1; v += 0.25) {
      const y = valToY(v);
      ctx.moveTo(0, y); ctx.lineTo(width, y);
    }
    ctx.stroke();
    
    const sorted = [...keyframes].sort((a: KeyframeItem, b: KeyframeItem) => a.t - b.t);
    
    if (sorted.length > 0) {
      ctx.strokeStyle = '#6366f1'; 
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      ctx.moveTo(frameToX(startFrame), valToY(sorted[0].val));
      ctx.lineTo(frameToX(sorted[0].t), valToY(sorted[0].val));

      for (let i = 0; i < sorted.length - 1; i++) {
        const curr = sorted[i];
        const next = sorted[i + 1];
        
        if (next.t < startFrame || curr.t > startFrame + visibleFrames) continue;

        const x1 = frameToX(curr.t);
        const y1 = valToY(curr.val);
        const x2 = frameToX(next.t);
        const y2 = valToY(next.val);

        ctx.moveTo(x1, y1);

        if (curr.type === 'jump') {
          ctx.lineTo(x2, y1);
          ctx.lineTo(x2, y2);
        } else if (curr.type === 'linear') {
          ctx.lineTo(x2, y2);
        } else {
          const cx1 = x1 + (x2 - x1) * 0.5;
          const cy1 = y1;
          const cx2 = x1 + (x2 - x1) * 0.5;
          const cy2 = y2;
          ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
        }
      }
      
      const last = sorted[sorted.length - 1];
      ctx.lineTo(frameToX(Math.max(last.t, startFrame + visibleFrames)), valToY(last.val));
      ctx.stroke();

      // Keyframe dots
      for (const p of sorted) {
        if (p.t < startFrame - step || p.t > startFrame + visibleFrames + step) continue;
        
        const x = frameToX(p.t);
        const y = valToY(p.val);
        
        ctx.beginPath();
        ctx.arc(x, y, p.id === selectedKeyframeId ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = p.id === selectedKeyframeId ? '#ffffff' : '#a5b4fc';
        ctx.fill();
        if (p.id === selectedKeyframeId) {
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    } else {
      ctx.strokeStyle = '#6366f1'; 
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, valToY(0));
      ctx.lineTo(width, valToY(0));
      ctx.stroke();
    }

    // Playhead timeline position indicator
    let currentFrame = (simTime * 60);
    if (kf.loop) {
      currentFrame = currentFrame % Math.max(1, timelineLength);
    } else {
      currentFrame = Math.min(currentFrame, timelineLength);
    }

    const playheadX = frameToX(currentFrame);
    if (playheadX >= -2 && playheadX <= width + 2) {
      // Vertical playhead cursor line
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Playhead top marker triangle
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(playheadX - 4, 0);
      ctx.lineTo(playheadX + 4, 0);
      ctx.lineTo(playheadX, 5);
      ctx.closePath();
      ctx.fill();

      // Output value indicator marker dot
      if (typeof currentOutput === 'number') {
        const outY = valToY(Math.max(0, Math.min(1, currentOutput)));
        ctx.beginPath();
        ctx.arc(playheadX, outY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#f43f5e';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [kf, simTime, currentOutput]);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      drawCanvas();
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const { width, height } = cvs;
    const editor = kf.editor as KeyframeEditorState;
    const { zoom = 1, scrollX = 0, mode = 'select' } = editor || {};
    const { timelineLength = 120, keyframes = [] } = kf;
    
    const visibleFrames = timelineLength / Math.max(0.1, zoom);
    const startFrame = (scrollX / 100) * (timelineLength - visibleFrames);
    
    const xToFrame = (x: number) => startFrame + (x / width) * visibleFrames;
    const yToVal = (y: number) => 1 - (y / height);

    let hitId: string | null = null;
    for (const k of keyframes) {
      const kx = ((k.t - startFrame) / visibleFrames) * width;
      const ky = height - (k.val * height);
      const dist = Math.sqrt(Math.pow(mx - kx, 2) + Math.pow(my - ky, 2));
      if (dist < 8) {
        hitId = k.id;
        break;
      }
    }

    if (hitId) {
      if (mode === 'remove') {
        const newKfs = keyframes.filter((k: KeyframeItem) => k.id !== hitId);
        updateKeyframeState({ keyframes: newKfs, editor: { ...editor, selectedKeyframeId: null } });
      } else {
        updateKeyframeState({ editor: { ...editor, selectedKeyframeId: hitId } });
        setDraggedKeyframeId(hitId);
        setIsDragging(true);
      }
    } else {
      if (mode === 'add') {
        const t = Math.max(0, Math.min(timelineLength, Math.round(xToFrame(mx))));
        const val = Math.max(0, Math.min(1, yToVal(my)));
        const newId = `k_${Date.now()}`;
        const type = editor.defCurveType || 'linear';
        const newKf: KeyframeItem = { id: newId, t, val, type };
        
        updateKeyframeState({ 
          keyframes: [...keyframes, newKf], 
          editor: { ...editor, selectedKeyframeId: newId } 
        });
        
        setDraggedKeyframeId(newId);
        setIsDragging(true);
      } else {
        updateKeyframeState({ editor: { ...editor, selectedKeyframeId: null } });
        setIsPanning(true);
        setLastPanX(e.clientX);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const editor = kf.editor as KeyframeEditorState;
    if (isPanning) {
      const deltaX = lastPanX - e.clientX;
      setLastPanX(e.clientX);
      
      const scrollDelta = (deltaX / (canvasRef.current?.width || 1)) * 100;
      let newScroll = (editor.scrollX || 0) + scrollDelta;
      newScroll = Math.max(0, Math.min(100, newScroll));
      
      updateKeyframeState({ editor: { ...editor, scrollX: newScroll } });
      return;
    }

    if (!isDragging || !draggedKeyframeId) return;
    
    const cvs = canvasRef.current;
    if (!cvs) return;
    
    const rect = cvs.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const { width, height } = cvs;
    const { zoom = 1, scrollX = 0 } = editor || {};
    const { timelineLength = 120, keyframes = [] } = kf;
    
    const visibleFrames = timelineLength / Math.max(0.1, zoom);
    const startFrame = (scrollX / 100) * (timelineLength - visibleFrames);
    
    const xToFrame = (x: number) => startFrame + (x / width) * visibleFrames;
    const yToVal = (y: number) => 1 - (y / height);
    
    const newT = Math.max(0, Math.min(timelineLength, Math.round(xToFrame(mx))));
    const newVal = Math.max(0, Math.min(1, yToVal(my)));
    
    const updated = keyframes.map((k: KeyframeItem) => k.id === draggedKeyframeId ? { ...k, t: newT, val: newVal } : k);
    updateKeyframeState({ keyframes: updated });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    setIsPanning(false);
    setDraggedKeyframeId(null);
  };

  const setCurveType = (type: 'linear' | 'bezier' | 'jump') => {
    const editor = kf.editor as KeyframeEditorState;
    if (editor.selectedKeyframeId) {
      const updated = kf.keyframes.map((k: KeyframeItem) => k.id === editor.selectedKeyframeId ? { ...k, type } : k);
      updateKeyframeState({ keyframes: updated });
    } else {
      updateKeyframeState({ editor: { ...editor, defCurveType: type } });
    }
  };

  const editor = kf.editor as KeyframeEditorState;

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex justify-between items-center bg-zinc-950 p-1 rounded-sm border border-zinc-800">
        <div className="flex gap-1">
          <Button
            size="iconSm"
            variant={editor.mode === 'select' ? 'primary' : 'ghost'}
            onClick={() => updateKeyframeState({ editor: { ...editor, mode: 'select' } })}
            title="Select / Move"
            aria-label="Select or Move Keyframe"
          >
            <MousePointer2 size={12} />
          </Button>
          <Button
            size="iconSm"
            variant={editor.mode === 'add' ? 'primary' : 'ghost'}
            onClick={() => updateKeyframeState({ editor: { ...editor, mode: 'add' } })}
            title="Add Keyframe"
            aria-label="Add Keyframe"
          >
            <Plus size={12} />
          </Button>
          <Button
            size="iconSm"
            variant={editor.mode === 'remove' ? 'primary' : 'ghost'}
            onClick={() => updateKeyframeState({ editor: { ...editor, mode: 'remove' } })}
            title="Remove Keyframe"
            aria-label="Remove Keyframe"
          >
            <Eraser size={12} />
          </Button>
        </div>
        <div className="w-px h-4 bg-zinc-800" />
        <div className="flex gap-1">
          <Button
            size="iconSm"
            variant={editor.defCurveType === 'linear' ? 'secondary' : 'ghost'}
            onClick={() => setCurveType('linear')}
            title="Linear"
            aria-label="Linear Curve"
          >
            <TrendingUp size={12} />
          </Button>
          <Button
            size="iconSm"
            variant={editor.defCurveType === 'bezier' ? 'secondary' : 'ghost'}
            onClick={() => setCurveType('bezier')}
            title="Smooth"
            aria-label="Smooth Bezier Curve"
          >
            <Spline size={12} />
          </Button>
          <Button
            size="iconSm"
            variant={editor.defCurveType === 'jump' ? 'secondary' : 'ghost'}
            onClick={() => setCurveType('jump')}
            title="Step/Jump"
            aria-label="Step Jump Curve"
          >
            <StepForward size={12} />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={containerRef} 
        className="relative border border-zinc-800 rounded-sm overflow-hidden h-32 bg-zinc-950 touch-none cursor-crosshair"
        onWheel={(e) => {
          e.preventDefault();
          const d = -e.deltaY * 0.002;
          const newZoom = Math.max(1, Math.min(10, (editor.zoom || 1) + d));
          updateKeyframeState({ editor: { ...editor, zoom: newZoom } });
        }}
      >
        <canvas 
          ref={canvasRef} 
          className="w-full h-full block"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          aria-label="Keyframe Timeline Canvas"
        />
        
        <div className="absolute top-1 right-1 flex flex-col gap-1 pointer-events-none">
          <div className="bg-zinc-900/70 p-0.5 px-1 rounded text-[8px] text-zinc-400 font-mono">{(editor.mode || 'select').toUpperCase()}</div>
        </div>
      </div>

      {/* Footer controls */}
      <div className="flex gap-2">
        <div className="flex-1">
          <ParameterControl label="Length (Frames)" value={kf.timelineLength} min={10} max={1000} step={10} onChange={(v: number) => updateKeyframeState({ timelineLength: v })} />
        </div>
        <div className="flex flex-col justify-center">
          <Label>Loop</Label>
          <Switch checked={kf.loop} onCheckedChange={(v: boolean) => updateKeyframeState({ loop: v })} />
        </div>
      </div>
    </div>
  );
};
