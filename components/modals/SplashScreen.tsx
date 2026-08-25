import React, { useEffect } from 'react';
import { Card, Button } from '../ui/Shared';
import { Info, X, ExternalLink } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const SplashScreen: React.FC<Props> = ({ onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="splash-screen-title"
      className="fixed inset-0 z-[300] flex items-center justify-center ui-modal-overlay backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-md max-h-[80vh] flex flex-col ui-modal shadow-2xl animate-in fade-in zoom-in duration-200" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 ui-modal-header shrink-0">
          <h2 id="splash-screen-title" className="text-sm font-bold uppercase tracking-wider ui-modal-title flex items-center gap-2">
            <Info size={16} className="ui-icon-sidebar ui-modal-title-icon"/> About RD Sandbox
          </h2>
          <button onClick={onClose} aria-label="Close dialog" className="ui-modal-close transition-colors"><X size={18}/></button>
        </div>
        
        <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar text-zinc-300">
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">
              RD Sandbox is an interactive experimental visual effects playground inspired by physics-based simulations. 
            </p>
            <p className="text-sm leading-relaxed font-bold">
              ⚠️ CAUTION: Contains strobing effects! Not suitable for photosensitive users!
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-zinc-500">Getting started:</h3>
            <ul className="list-disc pl-4 text-xs text-zinc-400 space-y-1">
              <li>Side menus can be toggled by clicking the arrow icons at the top or on the sidebars.</li>
              <li>Images and videos can be imported via the &quot;Import&quot; options in the File menu on the top bar.</li>
              <li>You can modulate parameters by adding automation devices on the right, then clicking either the link icon or the &quot;Link Parameter&quot; button.</li>
              <li>You can save, export, and import presets via the &quot;Modes&quot; menu on the top bar (or the hamburger menu on mobile).</li>
              <li>To export a snapshot image of the current simulation, select &quot;Export Snapshot&quot; from the File menu. To render video, click the camera button at the top.</li>
              <li>Shortcuts: &quot;H&quot; - Hide all UI, &quot;Z&quot; - Reset simulation, &quot;Spacebar&quot; - Play/Pause.</li>
              <li>Additional UI toggles are available in the View menu.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-zinc-500">Known Issues</h3>
            <ul className="list-disc pl-4 text-xs text-zinc-400 space-y-1">
              <li>Using higher resolutions (&gt;400px) may cause frame drops on lower-end devices.</li>
              <li>&quot;Blowouts&quot; (solid colors) or Numerical Explosions can occur if parameters are pushed too far. Use the <b>Reset</b> button or enable <b>Clamp Mode</b> (Shield icon) to make the simulation more stable.</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-500 mb-1">Created by</p>
            <a 
              href="https://formset.studio" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-bold text-zinc-100 hover:text-indigo-400 transition-colors group"
            >
              FORMSET<sup className="text-[9px] text-zinc-500 group-hover:text-indigo-300 transition-colors -top-2">STUDIO</sup>
              <ExternalLink size={10} className="opacity-50 group-hover:opacity-100"/>
            </a>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 shrink-0 flex justify-center">
          <Button onClick={onClose}>Get Started</Button>
        </div>
      </Card>
    </div>
  );
};
