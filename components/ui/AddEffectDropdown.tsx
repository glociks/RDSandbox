import React, { useRef, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { EffectType } from '../../types';
import { EFFECT_INFO } from '../../constants';
import { getEffectIcon } from '../../utils/effectIcons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectEffect: (type: EffectType) => void;
  containerRef?: React.RefObject<HTMLElement | null>;
}

interface EffectItemDef {
  type: EffectType;
  photosensitive?: boolean;
}

const EFFECT_SECTIONS: EffectItemDef[][] = [
  // Section 1: Cellular Automata & ALife
  [
    { type: 'gol' },
    { type: 'fractal' },
    { type: 'physarum' },
    { type: 'lenia' }
  ],
  // Section 2: Reaction-Diffusion & Kinetics
  [
    { type: 'physics' },
    { type: 'grayScott' },
    { type: 'reactionKinetics', photosensitive: true },
    { type: 'quantumPhase' },
    { type: 'excitable' },
    { type: 'soca', photosensitive: true },
    { type: 'surfaceTension' }
  ],
  // Section 3: Fluids, Forces & Spatial Operators
  [
    { type: 'flow' },
    { type: 'vortex', photosensitive: true },
    { type: 'turbulence', photosensitive: true },
    { type: 'gravity' },
    { type: 'lga' },
    { type: 'walker' },
    { type: 'multiDim' },
    { type: 'sharpen' }
  ]
];

export const AddEffectDropdown: React.FC<Props> = ({ isOpen, onClose, onSelectEffect, containerRef }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef?.current && containerRef.current.contains(target)) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, containerRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="ui-add-effect-menu absolute top-full left-0 right-0 z-50 max-h-[440px] overflow-y-auto custom-scrollbar"
    >
      {/* Top Header Notice */}
      <div className="ui-add-effect-header-notice flex items-center gap-1.5 px-2 py-1 mb-1 border-b border-zinc-800/80 text-[10px] text-zinc-400 font-normal">
        <AlertTriangle size={11} className="ui-icon-warning shrink-0 text-zinc-500" />
        <span className="truncate">— Effect will generate visual strobing effects.</span>
      </div>

      <div className="ui-add-effect-sections">
        {EFFECT_SECTIONS.map((section, sIdx) => (
          <div key={`section-${sIdx}`} className="ui-add-effect-section">
            {sIdx > 0 && <div className="ui-add-effect-divider" />}
            <div className="ui-add-effect-grid">
              {section.map(({ type, photosensitive }) => {
                const Icon = getEffectIcon(type);
                const info = EFFECT_INFO[type];
                return (
                  <button
                    key={type}
                    type="button"
                    className={`ui-add-effect-item effect-item-${type} group flex items-center justify-between`}
                    onClick={() => {
                      onSelectEffect(type);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`effect-icon effect-icon-${type} shrink-0`}>
                        <Icon size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="ui-add-effect-title truncate">
                          {info.name}
                        </div>
                        <div className="ui-add-effect-desc truncate">
                          {info.desc}
                        </div>
                      </div>
                    </div>
                    {photosensitive && (
                      <div className="ui-photosensitivity-badge shrink-0" title="Photosensitivity Warning: Strobe / rapid visual oscillation">
                        <AlertTriangle size={12} className="ui-icon-warning text-zinc-500" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
