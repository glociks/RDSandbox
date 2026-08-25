
import React, { useRef, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
  onClickOutside: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ClickOutside: React.FC<Props> = ({ children, onClickOutside, className, style }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Using capture phase (third argument = true) to ensure to catch the event 
    // before it reaches the target or is stopped by other handlers.
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        onClickOutside();
      }
    }

    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("touchstart", handleClickOutside, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("touchstart", handleClickOutside, true);
    };
  }, [onClickOutside]);

  return <div ref={wrapperRef} className={className} style={style}>{children}</div>;
};
