import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { AutomationModule } from '../types';

export interface AutomationLinkState {
  activeLinkModuleId: string | null;
  setActiveLinkModuleId: (id: string | null) => void;
  linkedParams: string[];
}

const AutomationLinkContext = createContext<AutomationLinkState | null>(null);

export const AutomationLinkProvider: React.FC<{
  modules: AutomationModule[];
  children: ReactNode;
}> = ({ modules, children }) => {
  const [activeLinkModuleId, setActiveLinkModuleId] = useState<string | null>(null);

  const linkedParams = useMemo(() => {
    if (activeLinkModuleId) {
      return modules.find((m) => m.id === activeLinkModuleId)?.targets.map((t) => t.paramKey as string) || [];
    }
    return modules.flatMap((m) => m.targets.map((t) => t.paramKey as string));
  }, [activeLinkModuleId, modules]);

  return (
    <AutomationLinkContext.Provider
      value={{
        activeLinkModuleId,
        setActiveLinkModuleId,
        linkedParams,
      }}
    >
      {children}
    </AutomationLinkContext.Provider>
  );
};

export function useAutomationLink(): AutomationLinkState {
  const context = useContext(AutomationLinkContext);
  if (!context) {
    throw new Error('useAutomationLink must be used within an AutomationLinkProvider');
  }
  return context;
}
