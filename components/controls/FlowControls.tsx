
import React from 'react';
import { ParameterControl } from '../ui/Shared';
import { SimulationParams } from '../../types';
import { DEFAULT_PARAMS } from '../../constants';

interface Props {
  params: SimulationParams;
  onChange: (key: keyof SimulationParams, value: any) => void;
  activeLinkModuleId?: string | null;
  linkedParams?: string[];
  automatedParams?: Record<string, number>;
}

export const FlowControls: React.FC<Props> = ({ 
  params, onChange, activeLinkModuleId, linkedParams = [], automatedParams = {} 
}) => {

  const getLinkStatus = (key: string) => {
    if (!activeLinkModuleId) return 'idle';
    if (linkedParams.includes(key)) return 'selected';
    return 'selectable';
  };

  return (
    <div className="space-y-2">
        <div className="flex gap-1.5 min-w-0 w-full">
           <div className="flex-1 min-w-0">
              <ParameterControl 
                 label="Flow X (px)" value={params.flowX} min={-5} max={5} step={0.1} 
                 onChange={(v: number) => onChange('flowX', v)} 
                 linkStatus={getLinkStatus('flowX')} onLink={() => onChange('flowX', 'LINK')}
                 automatedValue={automatedParams['flowX']}
                 defaultValue={DEFAULT_PARAMS.flowX}
              />
           </div>
           <div className="flex-1 min-w-0">
              <ParameterControl 
                 label="Flow Y (px)" value={params.flowY} min={-5} max={5} step={0.1} 
                 onChange={(v: number) => onChange('flowY', v)} 
                 linkStatus={getLinkStatus('flowY')} onLink={() => onChange('flowY', 'LINK')}
                 automatedValue={automatedParams['flowY']}
                 defaultValue={DEFAULT_PARAMS.flowY}
              />
           </div>
        </div>
        
        <ParameterControl 
             label="Zoom Feedback" value={params.flowScale ?? 1.0} min={0.1} max={2.0} step={0.01} 
             onChange={(v: number) => onChange('flowScale', v)} 
             linkStatus={getLinkStatus('flowScale')} onLink={() => onChange('flowScale', 'LINK')}
             automatedValue={automatedParams['flowScale']}
             defaultValue={DEFAULT_PARAMS.flowScale}
        />
    </div>
  );
};
