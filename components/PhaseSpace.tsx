/**
 * Local Phase Space Trajectory & Nullcline Diagram.
 *
 * Visualizes the phase space of membrane ($m$) vs cytosol ($c$) protein concentrations,
 * displaying the non-linear reactive nullcline $c = \frac{k_{\text{off}} m}{k_{\text{on}} + k_{\text{rec}} m^2}$
 * against the mass conservation subspace ($m + c = \text{totalDensity}$).
 */

import React, { useMemo } from 'react';
import { Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Line, ComposedChart } from 'recharts';
import { SimulationParams } from '../types';

interface PhaseSpaceProps {
  params: SimulationParams;
  sampleData: { m: number; c: number }[];
}

const PhaseSpace: React.FC<PhaseSpaceProps> = ({ params, sampleData }) => {
  const nullclineData = useMemo(() => {
    const data = [];
    for (let m = 0; m <= 12; m += 0.2) {
      const denom = params.kOn + params.kRec * m * m;
      const c = denom !== 0 ? (params.kOff * m) / denom : 0;
      data.push({ m, c_nullcline: c });
    }
    return data;
  }, [params.kOn, params.kRec, params.kOff]);

  const reactiveSubspaceData = useMemo(() => {
    const data = [];
    for (let m = 0; m <= 12; m += 1) {
      data.push({ m, c_mass: Math.max(0, params.totalDensity - m) });
    }
    return data;
  }, [params.totalDensity]);

  return (
    <div
      role="figure"
      aria-label="Phase space trajectory diagram showing membrane and cytosol concentrations"
      className="w-full h-64 bg-slate-800 rounded-lg p-2 border border-slate-700 shadow-sm"
    >
      <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
        Local Phase Space (m vs c)
      </h3>
      <div className="w-full h-52">
        <ComposedChart width={300} height={200} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
          <XAxis
            dataKey="m"
            type="number"
            domain={[0, 10]}
            stroke="#94a3b8"
            tick={{ fontSize: 10 }}
            label={{ value: 'Membrane (m)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 10 }}
          />
          <YAxis
            dataKey="c"
            type="number"
            domain={[0, 8]}
            stroke="#94a3b8"
            tick={{ fontSize: 10 }}
            label={{ value: 'Cytosol (c)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
            itemStyle={{ color: '#f1f5f9' }}
            labelFormatter={() => ''}
          />
          <Line
            data={nullclineData}
            dataKey="c_nullcline"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={false}
            name="Reactive Nullcline"
          />
          <Line
            data={reactiveSubspaceData}
            dataKey="c_mass"
            stroke="#64748b"
            strokeDasharray="5 5"
            strokeWidth={1}
            dot={false}
            name="Mass Conservation"
          />
          <Scatter
            data={sampleData}
            fill="#f472b6"
            shape="circle"
            r={1}
            opacity={0.6}
            name="System State"
          />
        </ComposedChart>
      </div>
      <div className="flex justify-between px-2 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-sky-400 rounded-full" /> Nullcline</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-500 rounded-full" /> Mass Cons.</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-pink-400 rounded-full" /> State</span>
      </div>
    </div>
  );
};

export default React.memo(PhaseSpace);