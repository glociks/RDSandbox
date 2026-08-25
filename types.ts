
export type BoundaryType = 'periodic' | 'open' | 'closed';

export type EngineMode = 'gpu' | 'worker' | 'cpu';

export type ColorMap = 'magma' | 'electric' | 'bio' | 'thermal' | 'rgb' | 'custom';

export interface GradientStop {
  pos: number;
  color: string;
}

export interface CustomColorConfig {
  mode: 'scalar' | 'rgb';
  scalarGradient: GradientStop[];
  rgbMultipliers: { r: number; g: number; b: number };
  rgbBias: { r: number; g: number; b: number };
}

export interface RGBPostProcessingConfig {
  exposure: number;     // 0.2 to 3.0, default 1.0
  contrast: number;     // 0.2 to 2.5, default 1.0
  gamma: number;        // 0.4 to 2.5, default 1.0
  saturation: number;   // 0.0 to 2.5, default 1.0
  brightness: number;   // -0.5 to 0.5, default 0.0
  tint: { r: number; g: number; b: number }; // 0.0 to 2.0, default {r:1, g:1, b:1}
}

export interface ReliefLightingConfig {
  enabled: boolean;
  bump: number;          // 0.0 to 3.0, default 1.0
  specular: number;      // 0.0 to 3.0, default 1.2
  lightAngle: number;    // 0.0 to 2*PI, default 0.8
  fresnel: number;       // 0.0 to 2.0, default 0.6
}

export interface UITheme {
  accentColor: string;
  primaryColor: string;
}

export type ModType = 'lfo' | 'sequencer' | 'audio' | 'keyframe' | 'adsr' | 'midi';

export interface ModTarget {
  id: string;
  paramKey: string;
  gain: number;
  offset: number;
}

export interface AutomationModule {
  id: string;
  type: ModType;
  name: string;
  enabled: boolean;
  isMinimized: boolean;
  gain: number;
  offset: number;
  minVal: number;
  maxVal: number;
  useMapping: boolean;
  bpm: number;
  frequency: number;
  targets: ModTarget[];
  lfo?: { shape: 'sine' | 'triangle' | 'square' | 'noise', width: number, phase: number, smoothness?: number };
  sequencer?: { steps: number[], count: number, smoothness: number };
  audio?: {
    sourceId: string;
    filterType: string;
    filterFreq: number;
    gain: number;
    smoothing: number;
    deviceId?: string;
  };
  keyframe?: { timelineLength: number, loop: boolean, keyframes: any[], editor: any };
  adsr?: { inputSourceId: string, threshold: number, attack: number, decay: number, sustain: number, release: number, triggerState: boolean, triggerTime: number, releaseTime: number, lastValue: number };
  midi?: {
    deviceId?: string;
    channel: number; // 0 for any, 1-16 for specific
    type: 'note' | 'cc';
    ccNumber?: number;
    lastEventTime: number;
    smoothness: number;
  };
}

export interface StabilizerConfig {
  enabled: boolean;
  targetDensity: number;
  strength: number;
  adjustKOff: boolean;
  adjustKRec: boolean;
  adjustKOn: boolean;
  adjustFeed: boolean;
}

export type SeedType = 'random' | 'shapes' | 'perlin' | 'grid' | 'math' | 'text';

export interface InitialSeedConfig {
  type: SeedType;
  intensity: number;
  seedTarget?: { u: number; v: number; w: number };
  randomThreshold: number;
  // Perlin
  perlinScale: number;
  perlinThreshold: number;
  perlinOctaves: number;
  perlinSeed: number;
  perlinGradient?: boolean;
  // Grid
  gridSpacingX: number;
  gridSpacingY: number;
  gridDotSize: number;
  gridOffset: boolean;
  // Shapes
  shapeType?: 'circle' | 'rect' | 'star';
  shapeMode?: 'single' | 'scatter';
  shapeCount?: number;
  shapeSize: number;
  shapeEdgeFade?: number;
  shapeHollow: boolean;
  shapePosX?: number;
  shapePosY?: number;
  // Math
  formula?: string;
  mathExpression?: string;
  mathParamA?: number;
  mathParamB?: number;
  mathScale?: number;
  mathThreshold?: number;
  // Text
  textContent?: string;
  textString?: string;
  textFont?: string;
  textSize?: number;
  textAngle?: number;
  textPosX?: number;
  textPosY?: number;
  [key: string]: unknown;
}

export interface MediaConfig {
  type: 'image' | 'video' | 'webcam';
  element: HTMLImageElement | HTMLVideoElement | null;
  opacity: number;
  playbackSpeed: number;
  keepAspect: boolean;
  seedOnReset: boolean;
}

export interface BlendIfGradient {
  enabled: boolean;
  points: { pos: number; val: number; id: string }[];
  smoothness: number;
}

export type ContinuousSeedType = SeedType | 'image' | 'video' | 'webcam';

export interface ContinuousSeed {
  id: string;
  name: string;
  type: ContinuousSeedType;
  enabled: boolean;
  isMinimized: boolean;
  opacity: number;
  blendMode: 'add' | 'subtract' | 'multiply' | 'screen' | 'overlay' | 'replace';
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  blendIf: BlendIfGradient;
  seedConfig?: InitialSeedConfig;
  mediaConfig?: MediaConfig;
  isStartingSeed?: boolean; // When true, acts as starting/initial seed applied upon Reset/Re-Seed instead of continuous injection
}

export interface ContinuousSeedData {
  seed: ContinuousSeed;
  data: Float32Array | Uint8ClampedArray;
  width: number;
  height: number;
  isRGB: boolean;
}

export interface GridDimensions {
  width: number;
  height: number;
}

export type EffectType = 
  // Core physics & reactions
  | 'physics' 
  | 'grayScott' 
  // Fluid dynamics & mechanics
  | 'flow' 
  | 'vortex'
  | 'turbulence'
  | 'gravity' 
  | 'lga' 
  // Cellular automata & discrete lattices
  | 'gol' 
  | 'soca'
  | 'fractal' 
  | 'walker' 
  // System control & signal processing
  | 'stabilizer' 
  | 'chromatic'
  | 'excitable'
  | 'sharpen'
  | 'multiDim'
  // Advanced physics & chemical dynamics
  | 'reactionKinetics'
  | 'electricArcs'
  | 'quantumPhase'
  | 'thermalConvection'
  | 'crystalSnowflake'
  | 'surfaceTension'
  // Emergent Artificial Life & Micro-Hydrodynamics Suite
  | 'lenia'
  | 'physarum'
  | 'lbm';

export type RenderStage = EffectType | 'media' | 'advection';

export interface EffectInstance {
  id: string;
  type: EffectType;
  name: string;
  enabled: boolean;
  isMinimized?: boolean;
  params: Record<string, any>;
}

export interface SimulationParams {
  // Global Toggle for Standard RD Physics
  usePhysics: boolean;
  physicsInfluence: number;
  useGpu?: boolean;
  clampMode: boolean;
  stabilityThreshold: number;
  fadeOutRate?: number;
  rgbPostProcessing?: RGBPostProcessingConfig;
  reliefLighting?: ReliefLightingConfig;
  renderStyle: 'pixelated' | 'smooth';
  renderOrder: RenderStage[];

  // Diffusion coefficients
  Dm: number; // U
  Dc: number; // V
  Dw: number; // W

  // Reaction rates
  kOn: number;
  kRec: number;
  kSat: number;
  kOff: number;

  // System properties
  feedRate: number;
  totalDensity: number;
  boundaryType: BoundaryType;

  // Advection (Flow)
  flowX: number;
  flowY: number;
  flowScale: number; // Zoom Feedback: 0.1 to 2.0
  turbDirX?: number;
  turbDirY?: number;
  vortexAngle?: number;
  vortexFeedback?: number;
  turbFeedback?: number;

  // Random Walker / Noise
  useWalker: boolean;
  jitterChance: number;
  jitterStrength: number;
  noise: number;
  walkerMask: boolean; // Use color as mask
  walkerMaskColor: string; // Hex
  walkerMaskTol: number; // Tolerance 0-1
  walkerMaskInvert: boolean;

  // Gravity Mode (Inertial Advection)
  useGravity: boolean;
  gravityStrength: number;
  gravityAngle: number; // 0 = down, PI = up
  gravityFriction: number; // 0 to 1
  gravityMassThreshold: number; // Min density to be affected

  // Advanced Cellular Automata (GoL)
  useGoL: boolean;
  golBirth: number[];
  golSurvive: number[];
  golInfluence: number;

  // Second Order CA (Inertial Reaction)
  useSoCA: boolean;
  socaDamping: number;
  socaSpring: number;
  socaDtScale: number;
  socaSmoothness: number;
  socaSmoothnessEnabled: boolean;
  socaReactionMix: number;

  // Lattice Gas Automaton
  useLGA: boolean;
  lgaProbability: number;
  lgaAdvection: number;
  lgaViscosity: number;
  lgaBarrier: number;
  lgaNoise: number;
  lgaFlowX: number;
  lgaFlowY: number;
  lgaWallColor: string; // Hex for wall reflection
  lgaWallTol: number; // Tolerance
  lgaInfluence: number;
  lgaVerticalFactor: number;

  // Fractal Automata
  useFractal: boolean;
  fractalDepth: number;
  fractalBlockSize: number;
  fractalBirth: number[];
  fractalSurvive: number[];
  fractalInfluence: number;
  fractalThreshold: number;

  // Gray-Scott Model
  useGrayScott: boolean;
  gsDa: number;
  gsDb: number;
  gsFeed: number;
  gsKill: number;
  gsTimeScale: number; // Multiplier for dt
  gsClamp: boolean; // Specific clamp for GS
  gsInfluence: number; // Opacity for GS

  // Multidimensionality
  useMultiDim: boolean;
  coupling: number;
  multiDimZoom: number; // Scale of 3rd dim influence
  multiDimCrossDiff: number; // Cross diffusion
  multiDimInfluence: number; // Opacity for MultiDim

  // Laplacian Sharpen
  sharpenStrength?: number;
  sharpenInfluence?: number;
  negativeDiffusion?: number;
  edgeBlend?: number;

  // Interaction
  brushStrength: number;

  // Physics Simulation Constants
  dt: number;
  colorMap: ColorMap;
}

export interface SceneState {
  name?: string;
  desc?: string;
  params: SimulationParams;
  automation: AutomationModule[];
  stabilizer: StabilizerConfig;
  stabilizeConfig?: StabilizerConfig;
  effects?: EffectInstance[];
  gridSize?: GridDimensions;
  seedConfig?: InitialSeedConfig;
  continuousSeeds?: ContinuousSeed[];
  reliefLighting?: ReliefLightingConfig;
  customColorConfig?: CustomColorConfig;
}

export interface PresetData {
  name: string;
  desc?: string;
  params: SimulationParams;
  effects?: EffectInstance[];
  seedConfig?: InitialSeedConfig;
  stabilizeConfig?: StabilizerConfig;
  stabilizer?: StabilizerConfig;
  automation?: AutomationModule[];
  continuousSeeds?: ContinuousSeed[];
  gridSize?: GridDimensions;
  reliefLighting?: ReliefLightingConfig;
  customColorConfig?: CustomColorConfig;
}

export type BrushMode = 'inject' | 'remove' | 'smudge';
export type BrushType = 'circle' | 'square' | 'gaussian' | 'splatter';

export interface RenderConfig {
  durationFrames: number;
  warmupFrames: number;
  simSpeed: number;
  fps: number;
  fileName?: string;
}

export interface UIVisibility {
  quickAccess: boolean;
  brushes: boolean;
  zoomControls: boolean;
  quickTheme: boolean;
  autoCloseAccordions: boolean;
}

export interface SerializableContinuousSeed extends Omit<ContinuousSeed, 'mediaConfig'> {
  mediaConfig?: Omit<MediaConfig, 'element'>;
}

export interface FileDropdownProps {
  onSaveScene: () => void;
  onOpenScene: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportVideo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportWebcam: () => void;
  onImportPreset: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportSnapshot: () => void;
}

