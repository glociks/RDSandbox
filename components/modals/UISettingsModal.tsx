import React from 'react';
import { Card, Button, Label } from '../ui/Shared';
import { Palette, X, Check } from 'lucide-react';
import { UITheme } from '../../types';
import { useModalA11y } from '../../hooks/useFocusTrap';

interface Props {
  currentTheme: UITheme;
  onApply: (theme: UITheme) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Violet', hex: '#8b5cf6' },
];

export const UISettingsModal: React.FC<Props> = ({ currentTheme, onApply, onClose }) => {
  const containerRef = useModalA11y({ isOpen: true, onClose });

  const handleColorSelect = (color: string) => {
    onApply({ ...currentTheme, accentColor: color });
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ui-settings-title"
      className="fixed inset-0 z-[200] flex items-center justify-center ui-modal-overlay backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <Card
        className="w-72 p-4 space-y-4 ui-modal shadow-2xl"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between ui-modal-header pb-2">
          <h2 id="ui-settings-title" className="text-xs font-bold uppercase tracking-wider ui-modal-title flex items-center gap-2">
            <Palette size={14} className="text-zinc-400"/> UI Settings
          </h2>
          <button onClick={onClose} aria-label="Close dialog" className="ui-modal-close transition-colors"><X size={16}/></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Accent Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c.name}
                  onClick={() => handleColorSelect(c.hex)}
                  className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                  aria-label={`${c.name} Accent Color`}
                >
                  {currentTheme.accentColor === c.hex && <Check size={14} className="text-white drop-shadow-md"/>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" onClick={onClose}>Done</Button>
        </div>
      </Card>
    </div>
  );
};
