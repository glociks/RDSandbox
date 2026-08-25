import React, { useState, useRef } from 'react';
import { Card, Button, Input, Label } from '../ui/Shared';
import { Maximize, X, AlertTriangle, Link2, Unlink2 } from 'lucide-react';
import { useModalA11y } from '../../hooks/useFocusTrap';

interface Props {
  currentWidth: number;
  currentHeight: number;
  onApply: (w: number, h: number) => void;
  onClose: () => void;
}

export const CustomResolutionModal: React.FC<Props> = ({ currentWidth, currentHeight, onApply, onClose }) => {
  const [w, setW] = useState(currentWidth);
  const [h, setH] = useState(currentHeight);
  const [lockAspect, setLockAspect] = useState(false);
  const lockedRatioRef = useRef<number>(currentHeight / (currentWidth || 1));

  const containerRef = useModalA11y({ isOpen: true, onClose });

  const makeEven = (n: number) => n % 2 === 0 ? n : n + 1;

  const handleWidthChange = (val: number) => {
    const inputW = Math.max(10, Math.min(4096, val || 10));
    if (lockAspect) {
      const ratio = lockedRatioRef.current > 0.001 ? lockedRatioRef.current : 1.0;
      const minW = Math.max(10, Math.round(10 / ratio));
      const maxW = Math.min(4096, Math.round(4096 / ratio));
      const clampedW = Math.max(minW, Math.min(maxW, inputW));
      const newW = makeEven(clampedW);
      const newH = makeEven(Math.max(10, Math.min(4096, Math.round(newW * ratio))));
      setW(newW);
      setH(newH);
    } else {
      setW(makeEven(inputW));
    }
  };

  const handleHeightChange = (val: number) => {
    const inputH = Math.max(10, Math.min(4096, val || 10));
    if (lockAspect) {
      const ratio = lockedRatioRef.current > 0.001 ? lockedRatioRef.current : 1.0;
      const minH = Math.max(10, Math.round(10 * ratio));
      const maxH = Math.min(4096, Math.round(4096 * ratio));
      const clampedH = Math.max(minH, Math.min(maxH, inputH));
      const newH = makeEven(clampedH);
      const newW = makeEven(Math.max(10, Math.min(4096, Math.round(newH / ratio))));
      setW(newW);
      setH(newH);
    } else {
      setH(makeEven(inputH));
    }
  };

  const isVeryHighRes = (w * h) > 2000000;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-res-modal-title"
      className="fixed inset-0 z-[250] flex items-center justify-center ui-modal-overlay backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <Card
        className="w-80 p-4 space-y-4 ui-modal shadow-2xl"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between ui-modal-header pb-2">
           <h2 id="custom-res-modal-title" className="text-xs font-bold uppercase tracking-wider ui-modal-title flex items-center gap-2">
             <Maximize size={14} className="text-indigo-400"/> Custom Resolution
           </h2>
           <button onClick={onClose} aria-label="Close dialog" className="ui-modal-close transition-colors"><X size={16}/></button>
        </div>
        
        <div className="space-y-3">
           <div className="flex items-center justify-between">
             <span className="text-[10px] text-zinc-400 font-medium">Dimensions</span>
             <button
               type="button"
               onClick={() => {
                 setLockAspect(prev => {
                   const next = !prev;
                   if (next) {
                     lockedRatioRef.current = h / (w || 1);
                   }
                   return next;
                 });
               }}
               title={lockAspect ? "Aspect Ratio Locked (Click to unlock)" : "Lock Aspect Ratio"}
               aria-label={lockAspect ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
               className={`px-1.5 py-0.5 rounded text-[9px] flex items-center gap-1 transition-colors border cursor-pointer ${
                 lockAspect
                   ? 'bg-indigo-950/90 border-indigo-500/80 text-indigo-200 hover:bg-indigo-900'
                   : 'bg-zinc-900/80 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
               }`}
             >
               {lockAspect ? <Link2 size={10} className="text-indigo-400" /> : <Unlink2 size={10} />}
               <span>{lockAspect ? 'Ratio Locked' : 'Unlocked'}</span>
             </button>
           </div>
           <div className="grid grid-cols-2 gap-2.5">
             <div className="p-1.5 rounded bg-zinc-900/40 border border-zinc-800/80">
               <Label htmlFor="custom-res-w" className="text-[10px]">Width (Even)</Label>
               <Input id="custom-res-w" name="custom-res-w" type="number" aria-label="Grid Width" value={w} onChange={(e: { target: { value: string | number } }) => handleWidthChange(parseInt(e.target.value as string, 10))} />
             </div>
             <div className="p-1.5 rounded bg-zinc-900/40 border border-zinc-800/80">
               <Label htmlFor="custom-res-h" className="text-[10px]">Height (Even)</Label>
               <Input id="custom-res-h" name="custom-res-h" type="number" aria-label="Grid Height" value={h} onChange={(e: { target: { value: string | number } }) => handleHeightChange(parseInt(e.target.value as string, 10))} />
             </div>
           </div>
           
           <div className="text-[10px] text-zinc-500 pt-1">
             <p>Total Cells: {(w*h).toLocaleString()}</p>
             {w*h > 500000 && !isVeryHighRes && <p className="text-amber-500">Warning: High resolution may reduce performance.</p>}
             {isVeryHighRes && (
                 <div className="flex gap-2 items-start text-red-400 mt-2 bg-red-900/20 p-2 rounded">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
                    <span>CRITICAL: Extreme resolution may crash the browser or GPU driver on standard devices. Use with caution.</span>
                 </div>
             )}
           </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => { onApply(w, h); onClose(); }}>Apply Resize</Button>
        </div>
      </Card>
    </div>
  );
};
