import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ViewportState {
  zoom: number;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  offset: { x: number; y: number };
  setOffset: (offset: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  infiniteGrid: boolean;
  setInfiniteGrid: (infinite: boolean | ((prev: boolean) => boolean)) => void;
}

const ViewportContext = createContext<ViewportState | null>(null);

export const ViewportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [infiniteGrid, setInfiniteGrid] = useState<boolean>(true);

  return (
    <ViewportContext.Provider
      value={{
        zoom,
        setZoom,
        offset,
        setOffset,
        infiniteGrid,
        setInfiniteGrid,
      }}
    >
      {children}
    </ViewportContext.Provider>
  );
};

export function useViewport(): ViewportState {
  const context = useContext(ViewportContext);
  if (!context) {
    throw new Error('useViewport must be used within a ViewportProvider');
  }
  return context;
}
