import React, { useState, useEffect, useRef } from 'react';
import { X, Play, ExternalLink, Info } from 'lucide-react';
import { Button } from '../ui/Shared';
import { REGIME_PRESETS, DEFAULT_PARAMS, getDefaultEffects, getDefaultInitialSeeds } from '../../constants';
import { PresetData } from '../../types';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartClosing?: () => void;
  onSelectPreset?: (preset: PresetData) => void;
}

const DEFAULT_SANDBOX_PRESET: PresetData = {
  name: 'Default',
  desc: 'Classic Reaction-Diffusion Sandbox',
  params: DEFAULT_PARAMS,
  effects: getDefaultEffects(),
  continuousSeeds: getDefaultInitialSeeds(),
};

const WELCOME_PRESETS: PresetData[] = [
  DEFAULT_SANDBOX_PRESET,
  ...REGIME_PRESETS
];

type FadePhase = 'solid-in' | 'idle' | 'fading-card' | 'fading-overlay' | 'done';

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, onStartClosing, onSelectPreset }) => {
  const [phase, setPhase] = useState<FadePhase>('solid-in');
  const [activePresetName, setActivePresetName] = useState<string>('Default');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Rapid launch entrance: solid black veil fades out to reveal the cutout
  useEffect(() => {
    if (isOpen) {
      setPhase('solid-in');
      const t = setTimeout(() => {
        setPhase('idle');
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startFadeOut = () => {
    clearTimer();
    onStartClosing?.();
    setPhase('fading-card');
    // Stage 1: Card and cutout shadow fade out over 1000ms
    timerRef.current = setTimeout(() => {
      setPhase('fading-overlay');
      // Stage 2: Overlay fades out over 1000ms to reveal full UI
      timerRef.current = setTimeout(() => {
        setPhase('done');
        onClose();
      }, 1000);
    }, 1000);
  };

  // Click anywhere to dismiss or skip / fast-forward stages
  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (phase === 'idle') {
      startFadeOut();
    } else if (phase === 'fading-card') {
      // Fast-forward Stage 1 -> immediately go to Stage 2
      clearTimer();
      onStartClosing?.();
      setPhase('fading-overlay');
      timerRef.current = setTimeout(() => {
        setPhase('done');
        onClose();
      }, 1000);
    } else if (phase === 'fading-overlay') {
      // Fast-forward Stage 2 -> immediately finish
      clearTimer();
      onStartClosing?.();
      setPhase('done');
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        if (phase === 'idle') {
          startFadeOut();
        } else {
          clearTimer();
          onStartClosing?.();
          setPhase('done');
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, onClose, onStartClosing]);

  const marqueeContainerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingMarquee = useRef(false);
  const isHoveredMarquee = useRef(false);
  const marqueeStartX = useRef(0);
  const marqueeScrollLeft = useRef(0);
  const marqueeHasDragged = useRef(false);
  const scrollPosRef = useRef(0);
  const singleTrackWidthRef = useRef(0);

  // Measure and cache single track width to avoid forced reflow in RAF
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    singleTrackWidthRef.current = track.scrollWidth;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === track) {
          singleTrackWidthRef.current = track.scrollWidth;
        }
      }
    });
    ro.observe(track);
    return () => ro.disconnect();
  }, []);

  // Global pointerup to ensure drag state cleans up reliably anywhere
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDraggingMarquee.current) {
        isDraggingMarquee.current = false;
        marqueeContainerRef.current?.classList.remove('is-dragging');
        setTimeout(() => {
          marqueeHasDragged.current = false;
        }, 50);
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  // RAF loop with time-based delta for steady, elegant scroll speed across all screens (60Hz, 120Hz, 144Hz)
  useEffect(() => {
    let animId: number;
    let lastTime: number | null = null;
    const SPEED_PX_PER_SEC = 24; // Calm, steady speed

    const step = (timestamp: number) => {
      if (lastTime === null) {
        lastTime = timestamp;
      }
      const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
      lastTime = timestamp;

      const el = marqueeContainerRef.current;
      const singleTrackWidth = singleTrackWidthRef.current || trackRef.current?.scrollWidth || 0;
      if (el && singleTrackWidth > 0) {
        // Auto-advance with delta-time if not dragging or hovered
        if (!isDraggingMarquee.current && !isHoveredMarquee.current) {
          scrollPosRef.current += SPEED_PX_PER_SEC * dt;
        }
        // Seamless modulo wrapping with 0 gap
        if (scrollPosRef.current >= singleTrackWidth) {
          scrollPosRef.current -= singleTrackWidth;
        } else if (scrollPosRef.current < 0) {
          scrollPosRef.current += singleTrackWidth;
        }
        el.scrollLeft = scrollPosRef.current;
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleMarqueeWheel = (e: React.WheelEvent) => {
    const el = marqueeContainerRef.current;
    const singleTrackWidth = singleTrackWidthRef.current || trackRef.current?.scrollWidth || 0;
    if (el && singleTrackWidth > 0) {
      e.stopPropagation();
      const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      scrollPosRef.current += delta;
      if (scrollPosRef.current >= singleTrackWidth) {
        scrollPosRef.current -= singleTrackWidth;
      } else if (scrollPosRef.current < 0) {
        scrollPosRef.current += singleTrackWidth;
      }
      el.scrollLeft = scrollPosRef.current;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!marqueeContainerRef.current) return;
    isDraggingMarquee.current = true;
    marqueeHasDragged.current = false;
    marqueeStartX.current = e.clientX;
    marqueeScrollLeft.current = scrollPosRef.current;
    marqueeContainerRef.current.classList.add('is-dragging');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingMarquee.current || !marqueeContainerRef.current) return;
    const x = e.clientX;
    const walk = x - marqueeStartX.current;
    if (Math.abs(walk) > 5) {
      marqueeHasDragged.current = true;
    }
    const singleTrackWidth = singleTrackWidthRef.current || trackRef.current?.scrollWidth || 0;
    let newScroll = marqueeScrollLeft.current - walk;
    if (singleTrackWidth > 0) {
      while (newScroll >= singleTrackWidth) {
        newScroll -= singleTrackWidth;
        marqueeScrollLeft.current -= singleTrackWidth;
      }
      while (newScroll < 0) {
        newScroll += singleTrackWidth;
        marqueeScrollLeft.current += singleTrackWidth;
      }
    }
    scrollPosRef.current = newScroll;
    marqueeContainerRef.current.scrollLeft = newScroll;
  };

  const handlePointerUp = () => {
    if (isDraggingMarquee.current) {
      isDraggingMarquee.current = false;
      marqueeContainerRef.current?.classList.remove('is-dragging');
      setTimeout(() => {
        marqueeHasDragged.current = false;
      }, 50);
    }
  };

  const handlePresetClick = (e: React.MouseEvent, preset: typeof WELCOME_PRESETS[0]) => {
    e.stopPropagation();
    if (marqueeHasDragged.current) {
      return;
    }
    setActivePresetName(preset.name);
    onSelectPreset?.(preset);
  };

  if (!isOpen || phase === 'done') return null;

  const isSolidVeilVisible = phase === 'solid-in';
  const isOverlayFading = phase === 'fading-overlay';
  const isCardFading = phase === 'fading-card' || isOverlayFading;

  return (
    <>
      {/* Layer 1: Solid base veil (fades out rapidly on launch to reveal the cutout) */}
      <div
        className={`welcome-solid-veil ${isSolidVeilVisible ? 'opacity-100' : 'opacity-0'
          }`}
      />

      {/* Layer 2: Main Welcome Card Container with Cutout Mask */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-header-title"
        onClick={handleOverlayClick}
        className={`welcome-overlay-container ${isOverlayFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        title="Click anywhere to proceed (Double-click to skip animation)"
      >
        <div
          onClick={(e) => {
            if (phase === 'fading-card' || phase === 'fading-overlay') {
              handleOverlayClick(e);
            } else {
              e.stopPropagation();
            }
          }}
          className={`welcome-card-shell grid grid-cols-1 md:grid-cols-2 gap-0 ${isCardFading ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
            }`}
        >
          {/* Simulation Window Cutout: Top on Mobile (< md), Left on Desktop/Tablet (>= md) */}
          <div className="welcome-viewport-window order-1 md:order-1 h-24 sm:h-32 md:h-auto min-h-[90px] sm:min-h-[120px] md:min-h-[380px]" />

          {/* Minimalistic Info Content: Bottom on Mobile, Right on Desktop/Tablet */}
          <div className="welcome-content-pane order-2 md:order-2 flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-start justify-between pb-2 border-b border-zinc-800/80 shrink-0">
              <div>
                <div className="welcome-header-small">welcome to</div>
                <h1 id="welcome-header-title" className="welcome-header-title">RDSandbox</h1>
              </div>
              <button
                type="button"
                aria-label="Close welcome modal"
                onClick={(e) => {
                  e.stopPropagation();
                  startFadeOut();
                }}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-md transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            {/* Description & Shortcuts in Simple Text Paragraphs */}
            <div className="my-2 md:my-3 space-y-2 md:space-y-2.5 text-zinc-300">
              <p className="welcome-description">
                Interactive real-time visual sandbox for reaction-diffusion synthesis, continuous cellular automata, and fluid dynamics.
              </p>

              {/* Photosensitivity Notice: Line 1 = Icon + Title, Line 2 = Full width description underneath */}
              <div className="welcome-photosensitivity-box">
                <div className="welcome-photosensitivity-header">
                  <Info size={13} className="welcome-photosensitivity-icon" />
                  <span className="welcome-photosensitivity-title">Photosensitivity Notice</span>
                </div>
                <p className="welcome-photosensitivity-desc">
                  This application generates high-contrast visual patterns, rapid oscillations, and fluid dynamics that may trigger reactions in photosensitive individuals.
                </p>
              </div>

              {/* Minimalistic Preset Switcher Infinite Flowing Marquee with Drag & Wheel Scroll */}
              <div className="pt-0.5">
                <div className="text-[10.5px] text-zinc-400 font-normal mb-1">Starting Presets:</div>
                <div
                  ref={marqueeContainerRef}
                  onWheel={handleMarqueeWheel}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onMouseEnter={() => { isHoveredMarquee.current = true; }}
                  onMouseLeave={() => {
                    isHoveredMarquee.current = false;
                    isDraggingMarquee.current = false;
                    marqueeContainerRef.current?.classList.remove('is-dragging');
                  }}
                  className="welcome-marquee-container"
                  title="Scroll or drag to explore presets, click to preview in real-time"
                >
                  <div ref={trackRef} className="welcome-marquee-track">
                    {WELCOME_PRESETS.map((preset) => {
                      const isActive = activePresetName === preset.name;
                      return (
                        <button
                          key={`track1_${preset.name}`}
                          type="button"
                          onClick={(e) => handlePresetClick(e, preset)}
                          className={`welcome-preset-pill ${isActive ? 'is-active' : ''}`}
                          title={preset.desc || preset.name}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                  <div className="welcome-marquee-track" aria-hidden="true">
                    {WELCOME_PRESETS.map((preset) => {
                      const isActive = activePresetName === preset.name;
                      return (
                        <button
                          key={`track2_${preset.name}`}
                          type="button"
                          tabIndex={-1}
                          aria-hidden="true"
                          onClick={(e) => handlePresetClick(e, preset)}
                          className={`welcome-preset-pill ${isActive ? 'is-active' : ''}`}
                          title={preset.desc || preset.name}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                  <div className="welcome-marquee-track" aria-hidden="true">
                    {WELCOME_PRESETS.map((preset) => {
                      const isActive = activePresetName === preset.name;
                      return (
                        <button
                          key={`track3_${preset.name}`}
                          type="button"
                          tabIndex={-1}
                          aria-hidden="true"
                          onClick={(e) => handlePresetClick(e, preset)}
                          className={`welcome-preset-pill ${isActive ? 'is-active' : ''}`}
                          title={preset.desc || preset.name}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Desktop/Tablet Controls Shortcuts - Hidden on Mobile */}
              <div className="hidden md:block space-y-1 text-xs text-zinc-300 leading-relaxed pt-0.5 font-normal">
                <p><span className="text-zinc-100 font-normal">Space</span> — Play / Pause simulation</p>
                <p><span className="text-zinc-100 font-normal">Z</span> — Re-Seed simulation grid</p>
                <p><span className="text-zinc-100 font-normal">H</span> — Hide / Show user interface</p>
                <p><span className="text-zinc-100 font-normal">Click &amp; Drag</span> — Draw &amp; inject morphogen concentration</p>
              </div>
            </div>

            {/* Minimalist Footer */}
            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between shrink-0">
              <a
                href="https://formset.studio"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] text-zinc-500 hover:text-indigo-400 transition-colors inline-flex items-center gap-1 font-normal"
              >
                formset.studio <ExternalLink size={10} />
              </a>

              <Button
                variant="primary"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  startFadeOut();
                }}
                className="gap-1.5 font-normal text-xs cursor-pointer shadow-md"
              >
                <Play size={12} className="fill-current" /> Enter Sandbox
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

