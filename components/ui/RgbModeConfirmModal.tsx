import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Palette, AlertTriangle, Check, X } from 'lucide-react';
import { Card, Button } from './Shared';
import { ColorMap } from '../../types';

interface RgbModeConfirmModalProps {
  isOpen: boolean;
  currentColorMap: ColorMap;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RgbModeConfirmModal: React.FC<RgbModeConfirmModalProps> = ({
  isOpen,
  currentColorMap,
  onConfirm,
  onCancel
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const colorMapName = currentColorMap.charAt(0).toUpperCase() + currentColorMap.slice(1);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rgb-mode-confirm-title"
      className="fixed inset-0 z-[300] flex items-center justify-center ui-modal-overlay backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <Card
        className="w-full max-w-[460px] px-7 sm:px-8 py-5 space-y-4 ui-modal shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between ui-modal-header pb-2 border-b border-zinc-800/80">
          <h2 id="rgb-mode-confirm-title" className="text-xs font-medium uppercase tracking-wider ui-modal-title flex items-center gap-2">
            <Palette size={14} className="text-indigo-400" />
            Switch to RGB Mode
          </h2>
          <button onClick={onCancel} aria-label="Close dialog" className="ui-modal-close transition-colors cursor-pointer" title="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-3">
          <div className="bg-zinc-800/50 p-3 rounded text-[10.5px] text-zinc-300 flex gap-2.5 items-start border border-zinc-700/50">
            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-normal">
              The simulation is currently set to <strong className="text-indigo-300 font-medium">{colorMapName}</strong> mode. Using custom color painting will automatically switch the simulation to <strong className="text-white font-medium">Full RGB mode</strong> and change how colors are rendered.
            </span>
          </div>

          <div className="text-[10.5px] text-zinc-400 leading-relaxed font-light px-0.5">
            You can customize or revert color themes anytime in <span className="text-zinc-300">Settings</span> at the bottom of the left sidebar or via the <span className="text-zinc-300">Color Hotbar</span> in the top-right.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/80">
          <Button size="sm" variant="secondary" onClick={onCancel} className="font-normal">
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={onConfirm}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-normal cursor-pointer"
          >
            <Check size={14} /> Switch to RGB &amp; Paint
          </Button>
        </div>
      </Card>
    </div>,
    document.body
  );
};
