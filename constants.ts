
import { SimulationParams, ColorMap, InitialSeedConfig, EffectType, EffectInstance, StabilizerConfig, RGBPostProcessingConfig, ContinuousSeed, PresetData } from './types';
import { DEFAULT_EFFECT_PARAMS } from './defaultParams';
import { generateId } from './utils/idGenerator';

export * from './defaultParams';

export function getDefaultEffects(): EffectInstance[] {
  return [
    {
      id: 'fx_gol_default',
      type: 'gol',
      name: 'Game of Life (CA)',
      enabled: true,
      isMinimized: false,
      params: { ...DEFAULT_EFFECT_PARAMS.gol }
    }
  ];
}

export function convertParamsToEffects(params: Partial<SimulationParams>, stabilizer?: StabilizerConfig): EffectInstance[] {
  const effects: EffectInstance[] = [];

  // Flow
  effects.push({
    id: generateId('fx_flow'),
    type: 'flow',
    name: 'Flow Controls',
    enabled: true,
    isMinimized: false,
    params: {
      flowX: params.flowX ?? 0,
      flowY: params.flowY ?? 0,
      flowScale: params.flowScale ?? 1.0,
      flowAngle: 0,
      flowSpeed: 0
    }
  });

  // McRD Physics
  if (params.usePhysics !== false) {
    effects.push({
      id: generateId('fx_physics'),
      type: 'physics',
      name: 'McRD Physics',
      enabled: params.usePhysics ?? true,
      isMinimized: false,
      params: {
        Dm: params.Dm ?? 0.1,
        Dc: params.Dc ?? 1.0,
        Dw: params.Dw ?? 5.0,
        kOn: params.kOn ?? 0.05,
        kRec: params.kRec ?? 0.08,
        kSat: params.kSat ?? 0.05,
        kOff: params.kOff ?? 0.8,
        feedRate: params.feedRate ?? 0.0,
        physicsInfluence: params.physicsInfluence ?? 1.0
      }
    });
  }

  // Gray-Scott
  if (params.useGrayScott) {
    effects.push({
      id: generateId('fx_grayscott'),
      type: 'grayScott',
      name: 'Gray-Scott Model',
      enabled: true,
      isMinimized: false,
      params: {
        gsDa: params.gsDa ?? 1.0,
        gsDb: params.gsDb ?? 0.5,
        gsFeed: params.gsFeed ?? 0.055,
        gsKill: params.gsKill ?? 0.062,
        gsTimeScale: params.gsTimeScale ?? 1.0,
        gsClamp: params.gsClamp ?? true,
        gsInfluence: params.gsInfluence ?? 1.0
      }
    });
  }

  // MultiDim
  if (params.useMultiDim) {
    effects.push({
      id: generateId('fx_multidim'),
      type: 'multiDim',
      name: 'Hyper-Dimensionality',
      enabled: true,
      isMinimized: false,
      params: {
        coupling: params.coupling ?? 0.2,
        multiDimZoom: params.multiDimZoom ?? 1.0,
        multiDimCrossDiff: params.multiDimCrossDiff ?? 0.0,
        multiDimInfluence: params.multiDimInfluence ?? 1.0
      }
    });
  }

  // GoL
  if (params.useGoL) {
    effects.push({
      id: generateId('fx_gol'),
      type: 'gol',
      name: 'Classic CA (GoL)',
      enabled: true,
      isMinimized: false,
      params: {
        golBirth: params.golBirth ?? [3],
        golSurvive: params.golSurvive ?? [2, 3],
        golInfluence: params.golInfluence ?? 0.5
      }
    });
  }

  // SoCA
  if (params.useSoCA) {
    effects.push({
      id: generateId('fx_soca'),
      type: 'soca',
      name: '2nd Order (SoCA)',
      enabled: true,
      isMinimized: false,
      params: {
        socaDamping: params.socaDamping ?? 0.96,
        socaSpring: params.socaSpring ?? 0.01,
        socaDtScale: params.socaDtScale ?? 1.0,
        socaSmoothness: params.socaSmoothness ?? 0.5,
        socaSmoothnessEnabled: params.socaSmoothnessEnabled ?? false,
        socaReactionMix: params.socaReactionMix ?? 1.0
      }
    });
  }

  // LGA
  if (params.useLGA) {
    effects.push({
      id: generateId('fx_lga'),
      type: 'lga',
      name: 'Lattice Gas (LGA)',
      enabled: true,
      isMinimized: false,
      params: {
        lgaProbability: params.lgaProbability ?? 0.5,
        lgaAdvection: params.lgaAdvection ?? 1.0,
        lgaViscosity: params.lgaViscosity ?? 0.1,
        lgaBarrier: params.lgaBarrier ?? 8.0,
        lgaNoise: params.lgaNoise ?? 0.05,
        lgaFlowX: params.lgaFlowX ?? 0,
        lgaFlowY: params.lgaFlowY ?? 0,
        lgaWallColor: params.lgaWallColor ?? '#ff0000',
        lgaWallTol: params.lgaWallTol ?? 0.2,
        lgaInfluence: params.lgaInfluence ?? 1.0,
        lgaVerticalFactor: params.lgaVerticalFactor ?? 0.0
      }
    });
  }

  // Gravity
  if (params.useGravity) {
    effects.push({
      id: generateId('fx_gravity'),
      type: 'gravity',
      name: 'Gravity & Inertia',
      enabled: true,
      isMinimized: false,
      params: {
        gravityStrength: params.gravityStrength ?? 0.5,
        gravityAngle: params.gravityAngle ?? 0,
        gravityFriction: params.gravityFriction ?? 0.9,
        gravityMassThreshold: params.gravityMassThreshold ?? 2.0
      }
    });
  }

  // Walker
  if (params.useWalker) {
    effects.push({
      id: generateId('fx_walker'),
      type: 'walker',
      name: 'Random Walker',
      enabled: true,
      isMinimized: false,
      params: {
        jitterChance: params.jitterChance ?? 0.0,
        jitterStrength: params.jitterStrength ?? 0.5,
        noise: params.noise ?? 0.02,
        walkerMask: params.walkerMask ?? false,
        walkerMaskColor: params.walkerMaskColor ?? '#ffffff',
        walkerMaskTol: params.walkerMaskTol ?? 0.1,
        walkerMaskInvert: params.walkerMaskInvert ?? false
      }
    });
  }

  // Fractal
  if (params.useFractal) {
    effects.push({
      id: generateId('fx_fractal'),
      type: 'fractal',
      name: 'Fractal Automata',
      enabled: true,
      isMinimized: false,
      params: {
        fractalDepth: params.fractalDepth ?? 2,
        fractalBlockSize: params.fractalBlockSize ?? 4,
        fractalBirth: params.fractalBirth ?? [3],
        fractalSurvive: params.fractalSurvive ?? [2, 3],
        fractalInfluence: params.fractalInfluence ?? 0.4,
        fractalThreshold: params.fractalThreshold ?? 0.4
      }
    });
  }

  // Stabilizer
  if (stabilizer && stabilizer.enabled) {
    effects.push({
      id: generateId('fx_stabilizer'),
      type: 'stabilizer',
      name: 'Stabilizer',
      enabled: true,
      isMinimized: false,
      params: {
        targetDensity: stabilizer.targetDensity,
        strength: stabilizer.strength,
        adjustKOff: stabilizer.adjustKOff,
        adjustKRec: stabilizer.adjustKRec,
        adjustKOn: stabilizer.adjustKOn,
        adjustFeed: stabilizer.adjustFeed
      }
    });
  }

  return effects.length > 0 ? effects : getDefaultEffects();
}

export const CA_PRESETS = [
  { name: "Conway's Life", b: [3], s: [2, 3], desc: "Chaotic growth" },
  { name: "HighLife", b: [3, 6], s: [2, 3], desc: "Replicating runners" },
  { name: "Day & Night", b: [3, 6, 7, 8], s: [3, 4, 6, 7, 8], desc: "Symmetric phases" },
  { name: "Maze", b: [3], s: [1, 2, 3, 4, 5], desc: "Mazes & corridors" },
  { name: "Anneal", b: [4, 6, 7, 8], s: [3, 5, 6, 7, 8], desc: "Major coarsening" },
  { name: "Seeds", b: [2], s: [], desc: "Explosive growth" },
  { name: "Coral", b: [3], s: [4, 5, 6, 7, 8], desc: "Slow organic growth" },
  { name: "Amoeba", b: [3, 5, 7], s: [1, 3, 5, 8], desc: "Oscillating soup" },
  { name: "Walled Cities", b: [4, 5, 6, 7, 8], s: [2, 3, 4, 5], desc: "Fortress structures" },
];

export const PHYSICS_PRESETS = [
  { name: "Mitosis", params: { Dm: 0.1, Dc: 4.0, kOn: 0.05, kRec: 0.08, kOff: 0.8, feedRate: 0.03 } },
  { name: "Coral Growth", params: { Dm: 0.05, Dc: 10.0, kOn: 0.02, kRec: 0.1, kOff: 0.5, feedRate: 0.06 } },
  { name: "Bacteria", params: { Dm: 0.2, Dc: 2.0, kOn: 0.1, kRec: 0.05, kOff: 0.9, feedRate: 0.01 } },
  { name: "Worms", params: { Dm: 0.1, Dc: 15.0, kOn: 0.04, kRec: 0.12, kOff: 0.7, feedRate: 0.0 } },
];

export const GRAY_SCOTT_PRESETS = [
  { name: "Cells / Coral", params: { gsFeed: 0.055, gsKill: 0.062, gsDa: 1.0, gsDb: 0.5 } },
  { name: "Solitons", params: { gsFeed: 0.03, gsKill: 0.062, gsDa: 1.0, gsDb: 0.5 } },
  { name: "Spirals", params: { gsFeed: 0.018, gsKill: 0.051, gsDa: 1.0, gsDb: 0.5 } },
  { name: "Mazes", params: { gsFeed: 0.029, gsKill: 0.057, gsDa: 1.0, gsDb: 0.5 } },
  { name: "Chaos", params: { gsFeed: 0.026, gsKill: 0.051, gsDa: 1.0, gsDb: 0.5 } },
  { name: "Worms", params: { gsFeed: 0.078, gsKill: 0.061, gsDa: 1.0, gsDb: 0.5 } },
];

export const FRACTAL_PRESETS = [
  { name: "Sierpinski", params: { fractalDepth: 3, fractalBlockSize: 2, fractalBirth: [1], fractalSurvive: [1,2], fractalThreshold: 0.3 } },
  { name: "Mega-Structure", params: { fractalDepth: 2, fractalBlockSize: 8, fractalBirth: [3], fractalSurvive: [2,3], fractalThreshold: 0.5 } },
  { name: "Recursive Noise", params: { fractalDepth: 4, fractalBlockSize: 2, fractalBirth: [2,3,4], fractalSurvive: [1,2,5], fractalThreshold: 0.2 } },
];

export const MULTIDIM_PRESETS = [
  { name: "Weak Coupling", params: { coupling: 0.05, Dw: 0.1 } },
  { name: "Strong Sync", params: { coupling: 0.3, Dw: 5.0 } },
  { name: "Interference", params: { coupling: 0.15, Dw: 0.01 } },
];

export const SOCA_PRESETS = [
  { name: "Water Ripples", params: { socaDamping: 0.99, socaSpring: 0.05, socaReactionMix: 0.1, socaSmoothnessEnabled: false } },
  { name: "Jelly", params: { socaDamping: 0.9, socaSpring: 0.1, socaReactionMix: 1.0, socaSmoothnessEnabled: true, socaSmoothness: 0.3 } },
  { name: "Quantum Chaos", params: { socaDamping: 0.999, socaSpring: 0.001, socaReactionMix: 0.5, socaSmoothnessEnabled: false } },
];

export const LGA_PRESETS = [
  { name: "Laminar Flow", params: { lgaProbability: 0.1, lgaAdvection: 2.0, lgaViscosity: 0.2 } },
  { name: "Turbulence", params: { lgaProbability: 0.8, lgaAdvection: 3.0, lgaViscosity: 0.01 } },
  { name: "Viscous Oil", params: { lgaProbability: 0.4, lgaAdvection: 0.5, lgaViscosity: 0.8 } },
];

export const VORTEX_PRESETS = [
  { name: "Single Whirlpool", params: { vortexSpeed: 1.2, vortexRadius: 0.45, vortexCenterX: 0.5, vortexCenterY: 0.5, vortexAngle: 0.0, vortexFeedback: 1.0, vortexCount: 1, vortexDecay: 1.0, vortexBlend: 1.0 } },
  { name: "Inward Spiral Drain", params: { vortexSpeed: 1.8, vortexRadius: 0.4, vortexCenterX: 0.5, vortexCenterY: 0.5, vortexAngle: 25.0, vortexFeedback: 0.96, vortexCount: 1, vortexDecay: 1.0, vortexBlend: 1.0 } },
  { name: "Binary Vortex Pair", params: { vortexSpeed: -1.5, vortexRadius: 0.3, vortexCenterX: 0.5, vortexCenterY: 0.5, vortexAngle: 0.0, vortexFeedback: 1.0, vortexCount: 2, vortexDecay: 1.2, vortexBlend: 1.0 } },
  { name: "Centrifugal Outflow", params: { vortexSpeed: 1.0, vortexRadius: 0.35, vortexCenterX: 0.5, vortexCenterY: 0.5, vortexAngle: -20.0, vortexFeedback: 1.04, vortexCount: 1, vortexDecay: 1.0, vortexBlend: 0.9 } },
];

export const WALKER_PRESETS = [
  { name: "Brownian Diffusion", params: { jitterChance: 0.2, jitterStrength: 0.5, noise: 0.02 } },
  { name: "Stochastic Jitter", params: { jitterChance: 0.5, jitterStrength: 0.8, noise: 0.05 } },
  { name: "Micro Chaos", params: { jitterChance: 0.8, jitterStrength: 1.0, noise: 0.1 } },
  { name: "Subtle Tremor", params: { jitterChance: 0.08, jitterStrength: 0.3, noise: 0.01 } },
];

export const EXCITABLE_PRESETS = [
  { name: "Chemical Spiral Waves", params: { fnA: 0.7, fnB: 0.8, fnEpsilon: 0.08, fnDt: 0.1, fnThreshold: 0.1, fnStimulus: 0.0, fnInfluence: 0.85 } },
  { name: "Neural Action Pulses", params: { fnA: 0.5, fnB: 0.9, fnEpsilon: 0.03, fnDt: 0.15, fnThreshold: 0.05, fnStimulus: 0.02, fnInfluence: 0.95 } },
  { name: "Turbulent Waves", params: { fnA: 0.8, fnB: 0.7, fnEpsilon: 0.12, fnDt: 0.1, fnThreshold: 0.2, fnStimulus: 0.05, fnInfluence: 0.7 } },
];

export const CHROMATIC_PRESETS = [
  { name: "Prism Dispersion", params: { driftU: 0.04, driftV: -0.02, driftW: 0.05, phaseAngle: 0.8, dispersionStrength: 1.2, chromaMix: 0.9 } },
  { name: "Spectral Drift", params: { driftU: 0.01, driftV: 0.02, driftW: -0.03, phaseAngle: 1.57, dispersionStrength: 0.8, chromaMix: 0.6 } },
  { name: "Subtle Halo", params: { driftU: 0.005, driftV: -0.005, driftW: 0.01, phaseAngle: 0.3, dispersionStrength: 0.4, chromaMix: 0.5 } },
];

export const TURBULENCE_PRESETS = [
  { name: "Organic Wisps", params: { turbScale: 0.025, turbSpeed: 1.0, turbStrength: 1.2, turbDirX: 0.0, turbDirY: 0.0, turbFeedback: 1.0, turbOctaves: 2, turbInfluence: 1.0 } },
  { name: "Atmospheric Curl", params: { turbScale: 0.01, turbSpeed: 0.5, turbStrength: 1.8, turbDirX: 0.2, turbDirY: -0.5, turbFeedback: 0.98, turbOctaves: 3, turbInfluence: 1.0 } },
  { name: "Horizontal Jet Stream", params: { turbScale: 0.03, turbSpeed: 1.2, turbStrength: 1.5, turbDirX: 1.5, turbDirY: 0.0, turbFeedback: 1.0, turbOctaves: 2, turbInfluence: 1.0 } },
  { name: "Fine Noise Plumes", params: { turbScale: 0.06, turbSpeed: 1.5, turbStrength: 0.8, turbDirX: 0.0, turbDirY: -1.0, turbFeedback: 1.02, turbOctaves: 1, turbInfluence: 0.75 } },
];

export const SHARPEN_PRESETS = [
  { name: "Crystal Edges", params: { sharpenStrength: 1.5, sharpenInfluence: 1.0, threshold: 0.08, negativeDiffusion: 0.04, edgeBlend: 0.95 } },
  { name: "Shockwave Shaper", params: { sharpenStrength: 2.2, sharpenInfluence: 1.0, threshold: 0.02, negativeDiffusion: 0.08, edgeBlend: 1.0 } },
  { name: "Subtle Contrast", params: { sharpenStrength: 0.6, sharpenInfluence: 1.0, threshold: 0.15, negativeDiffusion: 0.01, edgeBlend: 0.7 } },
];

export const REACTION_KINETICS_PRESETS = [
  { name: "Rotating Spirals", params: { bzEpsilon: 0.08, bzMu: 0.002, bzQ: 0.001, bzF: 1.2, bzSpeed: 1.0, bzDiffusion: 0.25, bzInfluence: 1.0 } },
  { name: "Target Pacemaker", params: { bzEpsilon: 0.04, bzMu: 0.001, bzQ: 0.0008, bzF: 1.6, bzSpeed: 1.4, bzDiffusion: 0.15, bzInfluence: 0.9 } },
  { name: "Chaotic Scroll Waves", params: { bzEpsilon: 0.14, bzMu: 0.003, bzQ: 0.002, bzF: 0.9, bzSpeed: 0.8, bzDiffusion: 0.4, bzInfluence: 1.0 } },
];

export const ELECTRIC_ARCS_PRESETS = [
  { name: "Tesla Discharge", params: { arcBranching: 0.7, arcThreshold: 0.4, arcDecay: 0.93, arcIntensity: 1.8, arcJitter: 0.5, arcDriftAngle: 0.0, arcInfluence: 1.0 } },
  { name: "Plasma Filaments", params: { arcBranching: 0.4, arcThreshold: 0.55, arcDecay: 0.96, arcIntensity: 1.2, arcJitter: 0.2, arcDriftAngle: 1.57, arcInfluence: 0.85 } },
  { name: "Lightning Storm", params: { arcBranching: 0.85, arcThreshold: 0.3, arcDecay: 0.88, arcIntensity: 2.4, arcJitter: 0.7, arcDriftAngle: 0.0, arcInfluence: 1.0 } },
];

export const QUANTUM_PHASE_PRESETS = [
  { name: "Quantized Vortex Lattice", params: { quantumHbar: 1.0, quantumCoupling: 1.2, quantumPotential: 0.4, quantumPhaseSpeed: 1.0, quantumInterference: 0.85, quantumInfluence: 1.0 } },
  { name: "Wavepacket Fringes", params: { quantumHbar: 1.8, quantumCoupling: 0.2, quantumPotential: 0.8, quantumPhaseSpeed: 1.4, quantumInterference: 1.0, quantumInfluence: 0.9 } },
  { name: "Superfluid Soliton", params: { quantumHbar: 0.6, quantumCoupling: -0.8, quantumPotential: 0.2, quantumPhaseSpeed: 0.7, quantumInterference: 0.6, quantumInfluence: 1.0 } },
];

export const THERMAL_CONVECTION_PRESETS = [
  { name: "Lava Lamp Plumes", params: { buoyancy: 1.8, coolingRate: 0.04, thermalDiff: 0.15, heatSource: 1.2, plumeTurbulence: 0.6, thermalInfluence: 1.0 } },
  { name: "Rayleigh Rolls", params: { buoyancy: 1.0, coolingRate: 0.08, thermalDiff: 0.3, heatSource: 0.5, plumeTurbulence: 0.2, thermalInfluence: 0.85 } },
  { name: "Mushroom Jets", params: { buoyancy: 2.5, coolingRate: 0.02, thermalDiff: 0.1, heatSource: 1.5, plumeTurbulence: 0.8, thermalInfluence: 1.0 } },
];

export const CRYSTAL_SNOWFLAKE_PRESETS = [
  { name: "6-Fold Hexagonal Snow", params: { anisotropyOrder: 6, anisotropyStrength: 0.75, freezingRate: 0.35, meltingRate: 0.03, vaporSupersaturation: 0.9, crystalInfluence: 1.0 } },
  { name: "4-Fold Cubic Dendrite", params: { anisotropyOrder: 4, anisotropyStrength: 0.65, freezingRate: 0.4, meltingRate: 0.04, vaporSupersaturation: 0.8, crystalInfluence: 1.0 } },
  { name: "Needle Frost", params: { anisotropyOrder: 8, anisotropyStrength: 0.9, freezingRate: 0.5, meltingRate: 0.02, vaporSupersaturation: 1.2, crystalInfluence: 0.95 } },
];

export const SURFACE_TENSION_PRESETS = [
  { name: "Spinodal Droplets", params: { surfaceMobility: 0.45, interfacialTension: 0.18, phaseSeparation: 1.1, coalescenceRate: 0.8, tensionInfluence: 1.0 } },
  { name: "Pearl Chains", params: { surfaceMobility: 0.2, interfacialTension: 0.3, phaseSeparation: 1.5, coalescenceRate: 1.2, tensionInfluence: 0.9 } },
  { name: "Organic Emulsion", params: { surfaceMobility: 0.6, interfacialTension: 0.08, phaseSeparation: 0.7, coalescenceRate: 0.5, tensionInfluence: 0.8 } },
];

export const LENIA_PRESETS = [
  { name: "Orbium Soliton (Glider)", params: { radius: 13, mu: 0.15, sigma: 0.035, kernelMu: 0.5, kernelSigma: 0.15, leniaDt: 0.1, leniaInfluence: 1.0, sampleStep: 1 } },
  { name: "Gyrorbium (Spinner)", params: { radius: 13, mu: 0.156, sigma: 0.0224, kernelMu: 0.5, kernelSigma: 0.15, leniaDt: 0.08, leniaInfluence: 1.0, sampleStep: 1 } },
  { name: "Aquarium (Tetraorbium)", params: { radius: 13, mu: 0.142, sigma: 0.031, kernelMu: 0.5, kernelSigma: 0.15, leniaDt: 0.1, leniaInfluence: 1.0, sampleStep: 1 } },
  { name: "Gemini Mitosis (Dividing)", params: { radius: 14, mu: 0.18, sigma: 0.040, kernelMu: 0.5, kernelSigma: 0.12, leniaDt: 0.12, leniaInfluence: 1.0, sampleStep: 1 } },
  { name: "Scutium Crawler (Fast)", params: { radius: 12, mu: 0.135, sigma: 0.028, kernelMu: 0.45, kernelSigma: 0.18, leniaDt: 0.09, leniaInfluence: 1.0, sampleStep: 1 } },
  { name: "High Performance (4x Speed)", params: { radius: 12, mu: 0.15, sigma: 0.035, kernelMu: 0.5, kernelSigma: 0.15, leniaDt: 0.1, leniaInfluence: 1.0, sampleStep: 2 } },
];

export const PHYSARUM_PRESETS = [
  { name: "Bio-Vascular Maze", params: { agentCount: 25000, sensorAngle: 0.45, sensorDistance: 9.0, rotationAngle: 0.4, stepSize: 1.6, depositAmount: 2.0, decayFactor: 0.95, diffuseFactor: 0.25, physarumInfluence: 1.0 } },
  { name: "Highways & Anastomosis", params: { agentCount: 35000, sensorAngle: 0.35, sensorDistance: 12.0, rotationAngle: 0.3, stepSize: 2.0, depositAmount: 2.5, decayFactor: 0.97, diffuseFactor: 0.15, physarumInfluence: 1.0 } },
  { name: "Foraging Mycelium", params: { agentCount: 15000, sensorAngle: 0.6, sensorDistance: 6.0, rotationAngle: 0.5, stepSize: 1.2, depositAmount: 1.5, decayFactor: 0.92, diffuseFactor: 0.3, physarumInfluence: 0.85 } },
];

export const LBM_PRESETS = [
  { name: "Von Kármán Street", params: { tau: 0.65, gravityX: 0.002, gravityY: 0.0, coupling: 1.2, lbmInfluence: 1.0 } },
  { name: "Thermal Plume Convection", params: { tau: 0.85, gravityX: 0.0, gravityY: -0.008, coupling: 1.8, lbmInfluence: 1.0 } },
  { name: "Viscous Vortex Cascade", params: { tau: 1.2, gravityX: 0.001, gravityY: -0.002, coupling: 0.8, lbmInfluence: 0.9 } },
];

export { REGIME_PRESETS, DEFAULT_PRESETS } from './presets';

export function getRandomBrightHex(): string {
  const h = Math.random() * 360;
  const s = 0.95;
  const l = 0.55;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getRandomLaunchColorConfig(): any {
  const randomColor = getRandomBrightHex();
  return {
    mode: 'scalar',
    scalarGradient: [
      { pos: 0.0, color: '#000000' },
      { pos: 0.5, color: randomColor },
      { pos: 1.0, color: '#ffffff' }
    ],
    rgbMultipliers: { r: 1.0, g: 1.0, b: 1.0 },
    rgbBias: { r: 0, g: 0, b: 0 }
  };
}

export function getDefaultInitialSeeds(): ContinuousSeed[] {
  return [
    {
      id: 'cseed_initial_perlin',
      name: 'Initial Perlin Seed',
      type: 'perlin',
      enabled: true,
      isMinimized: false,
      opacity: 1.0,
      blendMode: 'add',
      x: 0,
      y: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      rotation: 0,
      blendIf: { enabled: false, points: [{ pos: 0, val: 0, id: '1' }, { pos: 1, val: 1, id: '2' }], smoothness: 0.1 },
      isStartingSeed: true,
      seedConfig: {
        type: 'perlin',
        intensity: 1.0,
        randomThreshold: 0.05,
        perlinScale: 20,
        perlinThreshold: 0.45,
        perlinOctaves: 4,
        perlinSeed: Math.floor(Math.random() * 10000),
        perlinGradient: false,
        gridSpacingX: 10,
        gridSpacingY: 10,
        gridDotSize: 2,
        gridOffset: false,
        shapeSize: 20,
        shapeHollow: false,
        seedTarget: { u: 0.1, v: 0.9, w: 0.0 }
      }
    }
  ];
}

