import { SimulationParams, RGBPostProcessingConfig, EffectType, EffectInstance } from './types';

export const DEFAULT_RGB_POST_PROCESSING: RGBPostProcessingConfig = {
  exposure: 1.0,
  contrast: 1.0,
  gamma: 1.0,
  saturation: 1.0,
  brightness: 0.0,
  tint: { r: 1.0, g: 1.0, b: 1.0 }
};

export const DEFAULT_PARAMS: SimulationParams = {
  usePhysics: true,
  physicsInfluence: 1.0,
  clampMode: false,
  stabilityThreshold: 1.0, 
  fadeOutRate: 0.8,
  rgbPostProcessing: DEFAULT_RGB_POST_PROCESSING,
  renderStyle: 'pixelated',
  renderOrder: ['fractal', 'gravity', 'physics', 'grayScott', 'multiDim', 'gol', 'lga', 'walker', 'media', 'soca', 'advection'],

  Dm: 0.1,
  Dc: 1.0, 
  Dw: 5.0, 
  kOn: 0.05,
  kRec: 0.08,
  kSat: 0.05,
  kOff: 0.8,
  feedRate: 0.0, 
  totalDensity: 6.0,
  
  boundaryType: 'periodic',

  flowX: 0,
  flowY: 0,
  flowScale: 1.0,
  
  useWalker: false,
  jitterChance: 0.0,
  jitterStrength: 0.5,
  noise: 0.02,
  walkerMask: false,
  walkerMaskColor: '#ffffff',
  walkerMaskTol: 0.1,
  walkerMaskInvert: false,

  useGravity: false,
  gravityStrength: 0.5,
  gravityAngle: 0,
  gravityFriction: 0.9,
  gravityMassThreshold: 2.0,

  useGoL: false,
  golBirth: [3],
  golSurvive: [2, 3],
  golInfluence: 0.5,
  
  useSoCA: false,
  socaDamping: 0.96,
  socaSpring: 0.01,
  socaDtScale: 1.0,
  socaSmoothness: 0.5,
  socaSmoothnessEnabled: false,
  socaReactionMix: 1.0,
  
  useLGA: false,
  lgaProbability: 0.5,
  lgaAdvection: 1.0,
  lgaViscosity: 0.1,
  lgaBarrier: 8.0,
  lgaNoise: 0.05,
  lgaFlowX: 0,
  lgaFlowY: 0,
  lgaWallColor: '#ff0000',
  lgaWallTol: 0.2,
  lgaInfluence: 1.0,
  lgaVerticalFactor: 1.0,

  // Fractal Automata Defaults
  useFractal: false,
  fractalDepth: 2,
  fractalBlockSize: 4,
  fractalBirth: [3],
  fractalSurvive: [2, 3],
  fractalInfluence: 0.4,
  fractalThreshold: 0.4,

  // Gray-Scott
  useGrayScott: false,
  gsDa: 1.0,
  gsDb: 0.5,
  gsFeed: 0.055,
  gsKill: 0.062,
  gsTimeScale: 1.0,
  gsClamp: true,
  gsInfluence: 1.0,

  useMultiDim: false,
  coupling: 0.2,
  multiDimZoom: 1.0,
  multiDimCrossDiff: 0.0,
  multiDimInfluence: 1.0,

  brushStrength: 1.0,

  dt: 0.1, 
  colorMap: 'custom'
};

export const DEFAULT_EFFECT_PARAMS: Record<EffectType, Record<string, any>> = {
  flow: {
    flowX: 0,
    flowY: 0,
    flowScale: 1.0,
    flowAngle: 0,
    flowSpeed: 0
  },
  physics: {
    Dm: 0.1,
    Dc: 1.0,
    Dw: 5.0,
    kOn: 0.05,
    kRec: 0.08,
    kSat: 0.05,
    kOff: 0.8,
    feedRate: 0.0,
    physicsInfluence: 1.0
  },
  grayScott: {
    gsDa: 1.0,
    gsDb: 0.5,
    gsFeed: 0.055,
    gsKill: 0.062,
    gsTimeScale: 1.0,
    gsClamp: true,
    gsInfluence: 1.0
  },
  stabilizer: {
    targetDensity: 6.0,
    strength: 1.0,
    adjustKOff: true,
    adjustKRec: true,
    adjustKOn: false,
    adjustFeed: false
  },
  gravity: {
    gravityStrength: 0.5,
    gravityAngle: 0,
    gravityFriction: 0.9,
    gravityMassThreshold: 2.0
  },
  lga: {
    lgaProbability: 0.5,
    lgaAdvection: 1.0,
    lgaViscosity: 0.1,
    lgaBarrier: 8.0,
    lgaNoise: 0.05,
    lgaFlowX: 0,
    lgaFlowY: 0,
    lgaWallColor: '#ff0000',
    lgaWallTol: 0.2,
    lgaInfluence: 1.0,
    lgaVerticalFactor: 1.0
  },
  fractal: {
    fractalDepth: 2,
    fractalBlockSize: 4,
    fractalBirth: [3],
    fractalSurvive: [2, 3],
    fractalInfluence: 0.4,
    fractalThreshold: 0.4
  },
  soca: {
    socaDamping: 0.96,
    socaSpring: 0.01,
    socaDtScale: 1.0,
    socaSmoothness: 0.5,
    socaSmoothnessEnabled: false,
    socaReactionMix: 1.0
  },
  gol: {
    golBirth: [3],
    golSurvive: [2, 3],
    golInfluence: 0.8,
    golBlend: 0.8
  },
  walker: {
    jitterChance: 0.15,
    jitterStrength: 0.5,
    noise: 0.02,
    walkerMask: false,
    walkerMaskColor: '#ffffff',
    walkerMaskTol: 0.1,
    walkerMaskInvert: false
  },
  multiDim: {
    coupling: 0.2,
    multiDimZoom: 1.0,
    multiDimCrossDiff: 0.0,
    multiDimInfluence: 1.0
  },
  // New Modes
  vortex: {
    vortexSpeed: 1.0,
    vortexRadius: 0.4,
    vortexCenterX: 0.5,
    vortexCenterY: 0.5,
    vortexAngle: 0.0,
    vortexFeedback: 1.0,
    vortexCount: 1,
    vortexDecay: 1.0,
    vortexBlend: 1.0
  },
  excitable: {
    fnA: 0.7,
    fnB: 0.8,
    fnEpsilon: 0.08,
    fnDt: 0.1,
    fnThreshold: 0.1,
    fnStimulus: 0.0,
    fnInfluence: 0.8
  },
  chromatic: {
    driftU: 0.02,
    driftV: -0.01,
    driftW: 0.03,
    phaseAngle: 0.5,
    dispersionStrength: 1.0,
    chromaMix: 0.8
  },
  turbulence: {
    turbScale: 0.03,
    turbSpeed: 0.8,
    turbStrength: 1.2,
    turbDirX: 0.0,
    turbDirY: 0.0,
    turbFeedback: 1.0,
    turbOctaves: 2,
    turbInfluence: 1.0
  },
  sharpen: {
    sharpenStrength: 1.0,
    sharpenInfluence: 1.0,
    threshold: 0.05,
    negativeDiffusion: 0.02,
    edgeBlend: 0.9
  },
  // Brand New Advanced Modes
  reactionKinetics: {
    bzEpsilon: 0.08,
    bzMu: 0.002,
    bzQ: 0.001,
    bzF: 1.2,
    bzSpeed: 1.0,
    bzDiffusion: 0.25,
    bzInfluence: 1.0
  },
  electricArcs: {
    arcBranching: 0.6,
    arcThreshold: 0.45,
    arcDecay: 0.92,
    arcIntensity: 1.5,
    arcJitter: 0.4,
    arcDriftAngle: 0.0,
    arcInfluence: 1.0
  },
  quantumPhase: {
    quantumHbar: 1.0,
    quantumCoupling: 0.8,
    quantumPotential: 0.5,
    quantumPhaseSpeed: 1.0,
    quantumInterference: 0.8,
    quantumInfluence: 1.0
  },
  thermalConvection: {
    buoyancy: 1.4,
    coolingRate: 0.05,
    thermalDiff: 0.2,
    heatSource: 0.8,
    plumeTurbulence: 0.5,
    thermalInfluence: 1.0
  },
  crystalSnowflake: {
    anisotropyOrder: 6,
    anisotropyStrength: 0.65,
    freezingRate: 0.3,
    meltingRate: 0.04,
    vaporSupersaturation: 0.8,
    crystalInfluence: 1.0
  },
  surfaceTension: {
    surfaceMobility: 0.4,
    interfacialTension: 0.15,
    phaseSeparation: 1.0,
    coalescenceRate: 0.8,
    tensionInfluence: 1.0
  },
  // Emergent Artificial Life & Micro-Hydrodynamics
  lenia: {
    radius: 13,
    mu: 0.15,
    sigma: 0.035,
    kernelMu: 0.5,
    kernelSigma: 0.15,
    leniaDt: 0.1,
    leniaInfluence: 1.0
  },
  physarum: {
    agentCount: 25000,
    sensorAngle: 0.45,
    sensorDistance: 8.0,
    rotationAngle: 0.4,
    stepSize: 1.5,
    depositAmount: 1.8,
    decayFactor: 0.96,
    diffuseFactor: 0.2,
    physarumInfluence: 1.0
  },
  lbm: {
    tau: 0.8,
    gravityX: 0.0,
    gravityY: -0.005,
    coupling: 1.0,
    lbmInfluence: 1.0
  }
};

export const EFFECT_INFO: Record<EffectType, { name: string; category: 'rd' | 'fluid' | 'ca' | 'optics'; desc: string }> = {
  physics: { name: 'McRD Physics', category: 'rd', desc: 'Mass-Conserving Reaction-Diffusion' },
  grayScott: { name: 'Gray-Scott Model', category: 'rd', desc: 'Classic Morphogenesis Patterns' },
  multiDim: { name: 'Hyper-Dimensionality', category: 'rd', desc: '3rd-dimension Cross-Coupling' },
  excitable: { name: 'Excitable Waves', category: 'rd', desc: 'FitzHugh-Nagumo Traveling Waves' },
  reactionKinetics: { name: 'Reaction Kinetics', category: 'rd', desc: 'Oregonator / BZ Chemical Spiral Waves' },
  quantumPhase: { name: 'Quantum Phase', category: 'rd', desc: 'Schrödinger Fluid & Superfluid Vortices' },

  flow: { name: 'Flow Controls', category: 'fluid', desc: 'Advection & Zoom Feedback' },
  vortex: { name: 'Vortex Swirl', category: 'fluid', desc: 'Rotational Curl & Swirl Field' },
  turbulence: { name: 'Curl Turbulence', category: 'fluid', desc: 'Divergence-Free Organic Flow' },
  thermalConvection: { name: 'Thermal Convection', category: 'fluid', desc: 'Rayleigh-Bénard Buoyant Plumes' },
  surfaceTension: { name: 'Surface Tension', category: 'fluid', desc: 'Cahn-Hilliard Phase Separation & Droplets' },
  gravity: { name: 'Gravity & Inertia', category: 'fluid', desc: 'Mass-threshold Gravity Pull' },
  lga: { name: 'Lattice Gas (LGA)', category: 'fluid', desc: 'Microscopic Particle Collisions' },
  lbm: { name: 'Lattice Boltzmann (LBM)', category: 'fluid', desc: 'D2Q9 Navier-Stokes Hydrodynamics' },

  lenia: { name: 'Lenia Alife', category: 'ca', desc: 'Continuous Cellular Automata (arXiv:1812.05433)' },
  physarum: { name: 'Physarum Slime', category: 'ca', desc: 'Agent Chemotaxis & Vein Networks' },
  gol: { name: 'Classic CA (GoL)', category: 'ca', desc: "Conway's Game of Life Automata" },
  soca: { name: '2nd Order (SoCA)', category: 'ca', desc: 'Inertial Wave Reaction Dynamics' },
  fractal: { name: 'Fractal Automata', category: 'ca', desc: 'Multi-scale Block Hierarchies' },
  crystalSnowflake: { name: 'Crystal Dendrites', category: 'ca', desc: 'Anisotropic Ice Crystal Growth' },
  walker: { name: 'Random Walker', category: 'ca', desc: 'Brownian Noise & Density Jitter' },

  stabilizer: { name: 'Stabilizer', category: 'optics', desc: 'Feedback Active Cell Preserver' },
  chromatic: { name: 'Chromatic Drift', category: 'optics', desc: 'Multi-Channel Phase Dispersion' },
  sharpen: { name: 'Laplacian Sharpen', category: 'optics', desc: 'Edge Crystal Dispersion' },
  electricArcs: { name: 'Electric Arcs', category: 'optics', desc: 'Plasma Discharge & Dielectric Breakdown' }
};

export const EFFECT_DETAILED_INFO: Record<EffectType, { formula: string; principles: string; mechanisms: string }> = {
  physics: {
    formula: '∂tu = Dm∇²u + R(u,v),  ∂tv = Dc∇²v - R(u,v) + feed',
    principles: 'Mass-conserving reaction-diffusion PDE. Activator morphogen recruits substrate through saturation kinetics, producing spot mitosis, self-replicating solitary waves, and living Turing patterns.',
    mechanisms: 'Dm/Dc ratio governs diffusion speed. kRec controls non-linear recruitment feedback. kOff sets decay rate.'
  },
  grayScott: {
    formula: '∂tu = Da∇²u - uv² + F(1-u),  ∂tv = Db∇²v + uv² - (F+k)v',
    principles: 'Classic Pearson/Gray-Scott cubic autocatalysis. Generates solitons, coral labyrinth mazes, chaos, and dividing cell colonies.',
    mechanisms: 'Feed rate (F) feeds chemical nutrient. Kill rate (k) controls activator decay.'
  },
  reactionKinetics: {
    formula: 'ε ∂tx = qy - xy + x(1-x) + D∇²x,  μ ∂ty = -qy - xy + fz,  ∂tz = x - z',
    principles: 'Tyson-Fife scaled 3-variable Oregonator oscillator modeling the Belousov-Zhabotinsky reaction. Generates rotating Archimedean spirals and target pacemakers.',
    mechanisms: 'Speed scales chemical reaction rate. Epsilon (ε) governs wavefront thickness. Factor (f) shifts spiral core rotation.'
  },
  quantumPhase: {
    formula: 'iħ ∂tψ = - (ħ²/2m)∇²ψ + V(r)ψ + g|ψ|²ψ,  ψ = u + iv',
    principles: 'Non-linear Schrödinger Gross-Pitaevskii equation for superfluid Bose-Einstein condensates. Simulates quantized vortex circulation, wavepacket fringes, and superfluid solitons.',
    mechanisms: 'Hbar sets quantum phase velocity. Non-linear coupling (g) controls vortex repulsion.'
  },
  thermalConvection: {
    formula: '∂tT = κ∇²T - (v·∇)T + Q(y),  v = (turb·∂xT, -buoyancy·(T-T₀))',
    principles: 'Boussinesq thermal fluid dynamics. Bottom heat injection creates buoyant rising plumes and rolling convective Rayleigh-Bénard vortex rolls.',
    mechanisms: 'Buoyancy drives upward plume acceleration. Cooling rate dissipates heat at the top.'
  },
  crystalSnowflake: {
    formula: '∂tc = A(θ)·freeze·(u - u_sat),  A(θ) = 1 + str·cos(n·θ)',
    principles: 'Morgenstern-Kepler phase-boundary anisotropic crystal growth. Converts vapor into 6-fold hexagonal snowflake dendrites or 4-fold cubic branches.',
    mechanisms: 'Anisotropy order sets crystal symmetry (6-fold, 4-fold). Freezing rate controls needle growth speed.'
  },
  surfaceTension: {
    formula: '∂tφ = M∇²μ,  μ = (φ³ - φ) - γ∇²φ',
    principles: 'Cahn-Hilliard biharmonic diffuse interface model. Minimizes interfacial area through spinodal decomposition into tension-bound spherical droplets and organic emulsion membranes.',
    mechanisms: 'Interfacial tension controls droplet stiffness. Coalescence rate governs droplet merging speed.'
  },
  electricArcs: {
    formula: 'E = -∇V,  P_breakdown ∝ exp(|E|/E_crit)',
    principles: 'Stochastic dielectric breakdown and plasma streamer ionization. Fires jagged branching lightning bolts across matter clusters and spontaneous electrostatic discharge poles.',
    mechanisms: 'Branching probability forks sub-streamers. Jitter introduces jagged path tortuosity. Intensity sets plasma glow.'
  },
  vortex: {
    formula: 'v = ω × r / (|r|² + r₀²),  ∂tu = - (v·∇)u',
    principles: 'Rotational curl velocity field. Swirls continuous morphogens around multi-center whirlpool vortices with exponential distance falloff.',
    mechanisms: 'Vortex speed sets angular velocity. Radius controls swirl reach. Decay introduces spiral inflow.'
  },
  turbulence: {
    formula: 'v = ∇ × Ψ(x,y,t),  ∇·v = 0',
    principles: 'Divergence-free multi-octave Perlin streamfunction turbulence. Creates organic, smoke-like incompressible fluid vortices without volume loss.',
    mechanisms: 'Scale sets eddy size. Octaves add fractal turbulence detail. Speed controls vortex advection.'
  },
  excitable: {
    formula: '∂tu = u - u³/3 - v + I,  ∂tv = ε(u + a - bv)',
    principles: 'FitzHugh-Nagumo neural & chemical action potential dynamics. Models refractory traveling pulses, self-sustaining wavefronts, and spiral scroll waves.',
    mechanisms: 'Epsilon (ε) governs recovery time. Stimulus triggers spontaneous pulse pacemakers.'
  },
  chromatic: {
    formula: 'u → u(r + δ_u),  v → v(r + δ_v),  w → w(r + δ_w)',
    principles: 'Prism spectral dispersion and phase offset. Shifts color channels across distinct vector angles to create holographic chromatic aberration.',
    mechanisms: 'Drift vectors shift individual channels. Dispersion strength scales prism separation.'
  },
  sharpen: {
    formula: 'u* = u - α∇²u,  (α = sharpen + negative diffusion)',
    principles: 'Laplacian shock filter and reverse diffusion. Compresses blurred chemical transitions into crisp, razor-sharp crystal boundaries.',
    mechanisms: 'Sharpen strength increases edge contrast. Negative diffusion excites shockwave ripples.'
  },
  multiDim: {
    formula: '∂tu = -uv² + crossDiff·∇²v,  ∂tv = uv² - vw² + crossDiff·∇²w',
    principles: 'Three-variable hyper-dimensional chemical coupling. Couples the 3rd state channel (W) with U and V to produce complex 3D-projected manifold waves.',
    mechanisms: 'Coupling syncs channel oscillation. Cross diffusion induces cross-species transport.'
  },
  flow: {
    formula: 'r\' = r₀ + (r - r₀)/scale + v_flow·dt',
    principles: 'Directional linear advection and focal zoom feedback. Shifts the entire grid continuously in arbitrary 2D vector directions with feedback scaling.',
    mechanisms: 'Flow X/Y sets continuous drift velocity. Zoom scale creates infinite recursive expansion or contraction.'
  },
  gravity: {
    formula: 'v_g = g·(sin θ, cos θ),  ∂tu = - (v_g·∇)u',
    principles: 'Mass-threshold directional gravity and friction. Pulls heavy morphogen concentrations in the direction of the gravitational vector.',
    mechanisms: 'Gravity angle sets pull direction. Mass threshold defines the minimum density required to fall.'
  },
  lga: {
    formula: 'n_i(r + c_i, t+1) = n_i(r, t) + C_i(n)',
    principles: 'Lattice Gas Automata (FHP/HPP). Discrete microscopic particle collisions and momentum conservation on a spatial lattice.',
    mechanisms: 'Probability controls collision scattering. Viscosity governs momentum transfer resistance.'
  },
  gol: {
    formula: 'S_{t+1} = Rule(S_t, ∑_{Moore} S_t)',
    principles: 'Conway Cellular Automata. Discrete spatial bitmask state machine evaluating birth and survival across 8-neighbor Moore topologies.',
    mechanisms: 'Birth/Survive bitmasks switch between Life, HighLife, Day & Night, Maze, and Coral rules.'
  },
  soca: {
    formula: '∂²tu = c²∇²u - γ ∂tu',
    principles: 'Second-Order Cellular Automata & mechanical wave dynamics. Implements inertial momentum and oscillatory ripple resonance.',
    mechanisms: 'Damping governs kinetic energy dissipation. Spring constant sets wave frequency.'
  },
  fractal: {
    formula: 'V_hierarchical = ∑_{k=0}^{D} (1/k) CA_{scale=b^k}(V)',
    principles: 'Continuous multi-scale hierarchical cellular automata. Evaluates nested block neighborhoods to generate persistent, self-similar fractal patterns.',
    mechanisms: 'Depth sets recursive scale layers. Block size governs hierarchical jump ratio.'
  },
  walker: {
    formula: 'r_{t+1} = r_t + N(0, σ²)',
    principles: 'Brownian random walk and stochastic density jitter. Injects thermal noise and jitter into selective color masks.',
    mechanisms: 'Jitter chance controls stochastic probability. Mask filter restricts noise to specific color zones.'
  },
  stabilizer: {
    formula: '∂tu = - λ (⟨u+v⟩ - ρ_target)',
    principles: 'Active closed-loop chemical feedback stabilizer. Continuously adjusts kinetic parameters to prevent extinction or saturation.',
    mechanisms: 'Target density sets desired mass equilibrium. Correction strength controls feedback responsiveness.'
  },
  lenia: {
    formula: '∂tu = G(K * u),  K(r) = exp(-(r-μ_k)²/2σ_k²),  G(n) = 2·exp(-(n-μ_g)²/2σ_g²) - 1',
    principles: 'Continuous-space, continuous-state cellular automata (Bert Wang-Chak Chan, arXiv:1812.05433). Uses multi-ring concentric donut kernels and continuous non-linear growth mappings to yield self-organizing solitary organisms, smooth locomotion, and organism mitosis.',
    mechanisms: 'Radius & kernelMu set the sensory ring reach. Growth center (mu) and width (sigma) govern creature viability.'
  },
  physarum: {
    formula: 'θ_{t+1} = θ_t + Δθ(sense),  r_{t+1} = r_t + v·(cos θ, sin θ),  ∂tT = D_T∇²T - λT + deposit',
    principles: 'Bio-inspired agent-based slime mold model (Jeff Jones 2010). Mobile foraging agents sniff chemoattractants with 3 directional sensors, deposit trail morphogens, and spontaneously generate optimal vascular transport networks.',
    mechanisms: 'Agent count sets swarm density. Sensor angle/distance govern trail sensitivity. Decay and diffusion shape network thickness.'
  },
  lbm: {
    formula: 'f_i(r + e_i, t+1) = f_i(r, t) - (1/τ)(f_i - f_i^{eq}) + F_i',
    principles: 'Lattice Boltzmann Method D2Q9 microscopic hydrodynamics (Chen & Doolen 1998). Simulates Navier-Stokes fluid mechanics, vortex shedding, and buoyancy-driven thermal convection at authentic Reynolds numbers.',
    mechanisms: 'Relaxation time (tau) sets kinematic fluid viscosity. Gravity/coupling link morphogen density to convective flow.'
  }
};

export function createDefaultEffect(type: EffectType, customName?: string): EffectInstance {
  const info = EFFECT_INFO[type];
  return {
    id: `fx_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    name: customName || info.name,
    enabled: true,
    isMinimized: false,
    params: { ...DEFAULT_EFFECT_PARAMS[type] }
  };
}
