import React, { createContext, useContext, useState, ReactNode } from 'react';
import { BrushMode, BrushType } from '../types';

export interface BrushState {
  brushMode: BrushMode;
  setBrushMode: (mode: BrushMode) => void;
  brushType: BrushType;
  setBrushType: (type: BrushType) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  brushColor: { r: number; g: number; b: number };
  setBrushColor: (color: { r: number; g: number; b: number }) => void;
  fullColorMode: boolean;
  setFullColorMode: (fullColor: boolean | ((prev: boolean) => boolean)) => void;
}

const BrushContext = createContext<BrushState | null>(null);

export const BrushProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [brushMode, setBrushMode] = useState<BrushMode>('inject');
  const [brushType, setBrushType] = useState<BrushType>('circle');
  const [brushSize, setBrushSize] = useState<number>(8);
  const [brushColor, setBrushColor] = useState<{ r: number; g: number; b: number }>({ r: 255, g: 255, b: 255 });
  const [fullColorMode, setFullColorMode] = useState<boolean>(false);

  return (
    <BrushContext.Provider
      value={{
        brushMode,
        setBrushMode,
        brushType,
        setBrushType,
        brushSize,
        setBrushSize,
        brushColor,
        setBrushColor,
        fullColorMode,
        setFullColorMode,
      }}
    >
      {children}
    </BrushContext.Provider>
  );
};

export function useBrush(): BrushState {
  const context = useContext(BrushContext);
  if (!context) {
    throw new Error('useBrush must be used within a BrushProvider');
  }
  return context;
}
