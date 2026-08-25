import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Label, Switch } from '../ui/Shared';
import { Image as ImageIcon, X, AlertTriangle } from 'lucide-react';

interface Props {
  imageSrc: string;
  originalWidth: number;
  originalHeight: number;
  onConfirm: (width: number, height: number, keepAspect: boolean) => void;
  onCancel: () => void;
}

export const ImageImportModal: React.FC<Props> = ({ imageSrc, originalWidth, originalHeight, onConfirm, onCancel }) => {
  const [width, setWidth] = useState(originalWidth);
  const [height, setHeight] = useState(originalHeight);
  const [keepAspect, setKeepAspect] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // Auto-resize logic on mount
  useEffect(() => {
    let w = originalWidth;
    let h = originalHeight;
    const MAX_DIM = 600;
    
    if (w > MAX_DIM || h > MAX_DIM) {
       if (w > h) {
          h = Math.round(h * (MAX_DIM / w));
          w = MAX_DIM;
       } else {
          w = Math.round(w * (MAX_DIM / h));
          h = MAX_DIM;
       }
    }
    setWidth(w);
    setHeight(h);
  }, [originalWidth, originalHeight]);

  const handleWidthChange = (val: number) => {
    const w = Math.max(10, val);
    setWidth(w);
    if (keepAspect) {
      setHeight(Math.round(w * (originalHeight / originalWidth)));
    }
  };

  const handleHeightChange = (val: number) => {
    const h = Math.max(10, val);
    setHeight(h);
    if (keepAspect) {
      setWidth(Math.round(h * (originalWidth / originalHeight)));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-import-title"
      className="fixed inset-0 z-[200] flex items-center justify-center ui-modal-overlay ui-seed-modal-overlay backdrop-blur-sm p-4"
    >
      <Card className="w-80 p-4 space-y-4 ui-modal ui-seed-modal shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 ui-seed-modal-header">
           <h2 id="image-import-title" className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 ui-seed-modal-title">
             <ImageIcon size={14} className="ui-icon ui-seed-modal-icon text-emerald-400"/> Import Image
           </h2>
           <button onClick={onCancel} aria-label="Close dialog" className="text-zinc-500 hover:text-white ui-seed-modal-close"><X size={16}/></button>
        </div>

        <div className="flex justify-center bg-zinc-950 p-2 border border-zinc-800 rounded-sm ui-seed-modal-preview">
           <img src={imageSrc} alt="Preview" className="max-h-32 object-contain" />
        </div>
        
        <div className="space-y-3">
           <div className="flex items-center justify-between">
              <Label>Keep Aspect Ratio</Label>
              <Switch checked={keepAspect} onCheckedChange={setKeepAspect} aria-label="Keep Aspect Ratio" />
           </div>

           <div className="grid grid-cols-2 gap-2">
             <div>
               <Label htmlFor="img-import-w">Width</Label>
               <Input id="img-import-w" name="img-import-w" type="number" aria-label="Target Width" value={width} onChange={(e: { target: { value: string | number } }) => handleWidthChange(parseInt(e.target.value as string, 10) || 10)} />
             </div>
             <div>
               <Label htmlFor="img-import-h">Height</Label>
               <Input id="img-import-h" name="img-import-h" type="number" aria-label="Target Height" value={height} onChange={(e: { target: { value: string | number } }) => handleHeightChange(parseInt(e.target.value as string, 10) || 10)} />
             </div>
           </div>

           <div className="bg-zinc-800/50 p-2 rounded text-[10px] text-zinc-400 flex gap-2 items-start">
              <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5"/>
              <span>Simulation grid will be resized to these dimensions. Resetting the simulation will restore this image.</span>
           </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(width, height, keepAspect)}>Import &amp; Resize</Button>
        </div>
      </Card>
    </div>
  );
};
