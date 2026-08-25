import React, { useState } from 'react';
import { Card, Button, Input, Label, Slider } from '../ui/Shared';
import { Palette, X, Plus, Trash2 } from 'lucide-react';
import { CustomColorConfig, GradientStop } from '../../types';
import { useModalA11y } from '../../hooks/useFocusTrap';

interface Props {
  config: CustomColorConfig;
  onApply: (c: CustomColorConfig) => void;
  onClose: () => void;
}

export const ColorCustomizerModal: React.FC<Props> = ({ config, onApply, onClose }) => {
  const [localConfig, setLocalConfig] = useState<CustomColorConfig>(JSON.parse(JSON.stringify(config)));
  const containerRef = useModalA11y({ isOpen: true, onClose });

  const updateGradient = (idx: number, key: keyof GradientStop, val: string | number) => {
    const newStops = [...localConfig.scalarGradient];
    newStops[idx] = { ...newStops[idx], [key]: val };
    newStops.sort((a, b) => a.pos - b.pos);
    setLocalConfig({ ...localConfig, scalarGradient: newStops });
  };

  const addStop = () => {
    const newStops = [...localConfig.scalarGradient, { pos: 0.5, color: '#ffffff' }];
    newStops.sort((a, b) => a.pos - b.pos);
    setLocalConfig({ ...localConfig, scalarGradient: newStops });
  };

  const removeStop = (idx: number) => {
    if (localConfig.scalarGradient.length <= 2) return;
    const newStops = localConfig.scalarGradient.filter((_, i) => i !== idx);
    setLocalConfig({ ...localConfig, scalarGradient: newStops });
  };

  const updateRGB = (channel: 'r' | 'g' | 'b', type: 'rgbMultipliers' | 'rgbBias', val: number) => {
    setLocalConfig({
      ...localConfig,
      [type]: { ...localConfig[type], [channel]: val }
    });
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="color-customizer-title"
      className="fixed inset-0 z-[250] flex items-center justify-center ui-modal-overlay backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-[460px] px-7 sm:px-8 py-5 space-y-4 ui-modal shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between ui-modal-header pb-2">
          <h2 id="color-customizer-title" className="text-xs font-bold uppercase tracking-wider ui-modal-title flex items-center gap-2">
            <Palette size={14} className="text-fuchsia-400" /> Custom Color Map
          </h2>
          <button onClick={onClose} aria-label="Close dialog" className="ui-modal-close transition-colors"><X size={16} /></button>
        </div>

        <div className="flex items-center justify-between bg-zinc-950 p-2 rounded border border-zinc-800">
          <Label>Mode</Label>
          <div className="flex gap-1">
            <Button
              size="xs"
              variant={localConfig.mode === 'scalar' ? 'primary' : 'ghost'}
              onClick={() => setLocalConfig({ ...localConfig, mode: 'scalar' })}
            >Scalar (Gradient)</Button>
            <Button
              size="xs"
              variant={localConfig.mode === 'rgb' ? 'primary' : 'ghost'}
              onClick={() => setLocalConfig({ ...localConfig, mode: 'rgb' })}
            >Multichannel (RGB)</Button>
          </div>
        </div>

        {localConfig.mode === 'scalar' ? (
          <div className="space-y-4">
            <div className="h-4 w-full rounded border border-zinc-700"
              style={{ background: `linear-gradient(to right, ${localConfig.scalarGradient.map(s => `${s.color} ${s.pos * 100}%`).join(', ')})` }}
            />
            <div className="space-y-2">
              <Label>Gradient Stops</Label>
              {localConfig.scalarGradient.map((stop, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="color"
                    id={`gradient-stop-color-${i}`}
                    name={`gradient-stop-color-${i}`}
                    value={stop.color}
                    onChange={(e) => updateGradient(i, 'color', e.target.value)}
                    aria-label={`Gradient stop ${i + 1} color`}
                    className="w-6 h-6 bg-transparent border-none cursor-pointer"
                  />
                  <Slider min={0} max={1} step={0.01} value={stop.pos} onChange={(v: number) => updateGradient(i, 'pos', v)} aria-label={`Gradient stop ${i + 1} position`} />
                  <button onClick={() => removeStop(i)} disabled={localConfig.scalarGradient.length <= 2} aria-label={`Remove stop ${i + 1}`} className="text-zinc-600 hover:text-red-400 disabled:opacity-30"><Trash2 size={12} /></button>
                </div>
              ))}
              <Button size="xs" variant="secondary" onClick={addStop} className="w-full gap-1"><Plus size={10} /> Add Stop</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-2 bg-zinc-800/50 rounded text-[10px] text-zinc-400">
              Adjust how chemical concentrations map to screen colors.
              <br />R = U (Membrane), G = V (Cytosol), B = W (Aux)
            </div>

            <div className="space-y-2">
              <Label>Multipliers (Contrast)</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['r', 'g', 'b'] as const).map(c => (
                  <div key={c} className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">{c === 'r' ? 'Red (U)' : c === 'g' ? 'Green (V)' : 'Blue (W)'}</span>
                    <Input type="number" aria-label={`${c} multiplier`} value={localConfig.rgbMultipliers[c]} onChange={(e: { target: { value: string | number } }) => updateRGB(c, 'rgbMultipliers', parseFloat(e.target.value as string))} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bias (Brightness Offset)</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['r', 'g', 'b'] as const).map(c => (
                  <div key={c} className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">{c} Offset</span>
                    <Input type="number" aria-label={`${c} bias`} value={localConfig.rgbBias[c]} onChange={(e: { target: { value: string | number } }) => updateRGB(c, 'rgbBias', parseFloat(e.target.value as string))} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <Button size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onApply(localConfig)}>Apply Custom Theme</Button>
        </div>
      </Card>
    </div>
  );
};
