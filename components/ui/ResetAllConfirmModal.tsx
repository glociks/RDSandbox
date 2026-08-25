import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, AlertTriangle, X } from 'lucide-react';
import { Card, Button } from './Shared';

interface ResetAllConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResetAllConfirmModal: React.FC<ResetAllConfirmModalProps> = ({
  isOpen,
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

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-all-confirm-title"
      className="fixed inset-0 z-[300] flex items-center justify-center ui-modal-overlay backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <Card
        className="w-80 sm:w-[420px] px-6 py-4.5 space-y-4 ui-modal shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between ui-modal-header pb-2 border-b border-zinc-800/80">
          <h2 id="reset-all-confirm-title" className="text-xs font-medium uppercase tracking-wider ui-modal-title flex items-center gap-2 text-amber-400">
            <RotateCcw size={14} className="text-amber-400" />
            Reset All Settings
          </h2>
          <button onClick={onCancel} aria-label="Close dialog" className="ui-modal-close transition-colors cursor-pointer" title="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-3">
          <div className="bg-amber-950/30 p-3 rounded text-[10.5px] text-amber-200 flex gap-2.5 items-start border border-amber-800/40">
            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-normal">
              Are you sure you want to reset everything? This will reset all simulation parameters, active effects, seeds, and automation modules back to the default factory state.
            </span>
          </div>
          <p className="text-[10.5px] text-zinc-400 leading-relaxed font-light px-0.5">
            Any unsaved custom configurations or parameter adjustments will be cleared.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/80">
          <Button size="sm" variant="secondary" onClick={onCancel} className="font-normal">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-normal border-none shadow cursor-pointer"
          >
            <RotateCcw size={13} /> Reset All
          </Button>
        </div>
      </Card>
    </div>,
    document.body
  );
};
