import React, { useRef, useState, useEffect, useId } from 'react';

interface AutoMarqueeTextProps {
  text: string;
  className?: string;
  speed?: number; // pixels per second
  pauseDuration?: number; // seconds to pause at each end
  showTooltip?: boolean;
}

export const AutoMarqueeText: React.FC<AutoMarqueeTextProps> = ({
  text,
  className = '',
  speed = 12, // Smooth, gentle 12 px per second constant speed
  pauseDuration = 1.6, // 1.6s pause at each end for easy readability
  showTooltip = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowDistance, setOverflowDistance] = useState<number>(0);
  const [totalCycleDuration, setTotalCycleDuration] = useState<number>(0);
  const [keyframePercentages, setKeyframePercentages] = useState<{ p1: number; p2: number; p3: number }>({ p1: 15, p2: 50, p3: 65 });
  const [isHovered, setIsHovered] = useState(false);
  const uniqueId = useId().replace(/[:]/g, '_');
  const animName = `marquee_${uniqueId}`;

  useEffect(() => {
    const measure = () => {
      if (containerRef.current && textRef.current) {
        const clientW = containerRef.current.clientWidth;
        const scrollW = textRef.current.scrollWidth;
        const diff = scrollW - clientW;

        if (diff > 2) {
          const dist = diff + 8; // small extra margin so whole word clears
          const travelTime = dist / Math.max(5, speed);
          const totalCycle = (travelTime * 2) + (pauseDuration * 2);

          const pause1Pct = (pauseDuration / totalCycle) * 100;
          const travelEndPct = ((pauseDuration + travelTime) / totalCycle) * 100;
          const pause2EndPct = ((pauseDuration + travelTime + pauseDuration) / totalCycle) * 100;

          setOverflowDistance(dist);
          setTotalCycleDuration(totalCycle);
          setKeyframePercentages({ p1: pause1Pct, p2: travelEndPct, p3: pause2EndPct });
        } else {
          setOverflowDistance(0);
          setTotalCycleDuration(0);
        }
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', measure);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [text, speed, pauseDuration]);

  const isOverflowing = overflowDistance > 0;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden whitespace-nowrap min-w-0 max-w-full inline-block group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Scoped CSS Keyframes for Ping-Pong Animation based on physical speed */}
      {isOverflowing && totalCycleDuration > 0 && (
        <style>{`
          @keyframes ${animName} {
            0% { transform: translateX(0); }
            ${keyframePercentages.p1.toFixed(1)}% { transform: translateX(0); }
            ${keyframePercentages.p2.toFixed(1)}% { transform: translateX(-${overflowDistance}px); }
            ${keyframePercentages.p3.toFixed(1)}% { transform: translateX(-${overflowDistance}px); }
            100% { transform: translateX(0); }
          }
        `}</style>
      )}

      <span
        ref={textRef}
        className="inline-block whitespace-nowrap will-change-transform"
        style={
          isOverflowing && totalCycleDuration > 0
            ? { animation: `${animName} ${totalCycleDuration.toFixed(2)}s ease-in-out infinite` }
            : {}
        }
      >
        {text}
      </span>

      {/* Floating Lightweight Tooltip (Tipbar) */}
      {showTooltip && isOverflowing && isHovered && (
        <div
          role="tooltip"
          className="fixed z-[99999] pointer-events-none px-2 py-1 text-[9.5px] font-light text-zinc-200 bg-zinc-900/95 border border-zinc-700/80 rounded shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: (containerRef.current?.getBoundingClientRect().top || 0) - 26,
            left: Math.max(8, (containerRef.current?.getBoundingClientRect().left || 0))
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};
