import React, { useRef, useEffect } from 'react';
import { BookOpen, X } from 'lucide-react';
import { EffectType } from '../../types';
import { EFFECT_DETAILED_INFO, EFFECT_INFO } from '../../constants';

interface EffectInfoAccordionProps {
  type: EffectType;
  isOpen: boolean;
  onClose: () => void;
}

export const EffectInfoAccordion: React.FC<EffectInfoAccordionProps> = ({ type, isOpen, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use capture to guarantee intercepting outside clicks before parent triggers
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const info = EFFECT_DETAILED_INFO[type] || {
    formula: '∂tu = f(u, v, ∇²)',
    principles: 'Dynamical differential simulation system.',
    mechanisms: 'Non-linear feedback and spatial transport parameters.'
  };
  const basicInfo = EFFECT_INFO[type];

  return (
    <div
      ref={containerRef}
      className="p-2.5 my-1.5 border border-indigo-500/30 rounded bg-indigo-950/30 backdrop-blur-md shadow-xl space-y-1.5 transition-all text-left select-text animate-in fade-in zoom-in duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-1">
        <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
          <BookOpen size={11} className="text-indigo-400" /> {basicInfo ? basicInfo.name : type} &mdash; Model
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-0.5 rounded hover:bg-zinc-800/60 transition-colors"
          title="Close info"
        >
          <X size={11} />
        </button>
      </div>

      <div className="text-[9.5px] font-light text-zinc-300 leading-relaxed space-y-1.5">
        <div className="font-mono text-indigo-200/90 text-[9px] bg-indigo-900/40 border border-indigo-500/20 px-1.5 py-1 rounded overflow-x-auto custom-scrollbar">
          {info.formula}
        </div>
        <p className="text-zinc-300 font-light leading-normal">
          {info.principles}
        </p>
        {info.mechanisms && (
          <p className="text-zinc-400 font-light text-[9px] leading-tight pt-0.5 border-t border-zinc-800/60">
            <strong className="text-zinc-300 font-medium">Dynamics:</strong> {info.mechanisms}
          </p>
        )}
      </div>
    </div>
  );
};
