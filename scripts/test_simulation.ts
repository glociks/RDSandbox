// Comprehensive Unit & Integration Verification Suite for McRD VFX Engine

import { McRDSolver } from '../utils/solver';
import { renderGridToBuffer, packRGBA32 } from '../utils/colors';
import { generateSeed } from '../utils/seeding';
import { importImage, injectSignal, perturb } from '../utils/interaction';
import { DEFAULT_PARAMS, REGIME_PRESETS } from '../constants';
import { EffectInstance, CustomColorConfig, EffectType } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
    if (condition) {
        console.log(`  ✓ ${msg}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${msg}`);
        failed++;
    }
}

console.log("=== Running McRD Simulation & Color Engine Tests ===\n");

// Test 1: Color Packing & RangeError Safety in renderGridToBuffer
console.log("Test 1: Colors & Buffer Packing Safety");
const testW = 200;
const testH = 200;
const testSize = testW * testH;
const u = new Float32Array(testSize).fill(1.0);
const v = new Float32Array(testSize).fill(0.5);
const w = new Float32Array(testSize).fill(0.2);

const outData = new Uint8ClampedArray(testSize * 4);

// Test preset colormaps
renderGridToBuffer(u, v, w, outData, 'magma');
assert(outData[3] === 255, "Magma renders alpha 255");
assert(outData[0] > 0 || outData[1] > 0 || outData[2] > 0, "Magma output has color");

renderGridToBuffer(u, v, w, outData, 'electric');
assert(outData[3] === 255, "Electric renders alpha 255");

renderGridToBuffer(u, v, w, outData, 'bio');
assert(outData[3] === 255, "Bio renders alpha 255");

renderGridToBuffer(u, v, w, outData, 'thermal');
assert(outData[3] === 255, "Thermal renders alpha 255");

renderGridToBuffer(u, v, w, outData, 'rgb');
assert(outData[3] === 255, "RGB mode renders alpha 255");

// Test custom scalar gradient
const customScalar: CustomColorConfig = {
    mode: 'scalar',
    scalarGradient: [
        { pos: 0.0, color: '#000000' },
        { pos: 0.5, color: '#ff00ff' },
        { pos: 1.0, color: '#ffffff' }
    ],
    rgbMultipliers: { r: 1, g: 1, b: 1 },
    rgbBias: { r: 0, g: 0, b: 0 }
};
renderGridToBuffer(u, v, w, outData, 'custom', customScalar);
assert(outData[3] === 255, "Custom scalar gradient renders successfully");

// Test custom RGB multipliers
const customRGB: CustomColorConfig = {
    mode: 'rgb',
    scalarGradient: [],
    rgbMultipliers: { r: 2, g: 1.5, b: 0.8 },
    rgbBias: { r: 10, g: 20, b: 30 }
};
renderGridToBuffer(u, v, w, outData, 'custom', customRGB);
assert(outData[3] === 255, "Custom RGB mode renders successfully");

// Test RangeError safety on undersized / mismatched buffer
const smallBuffer = new Uint8ClampedArray(100);
try {
    renderGridToBuffer(u, v, w, smallBuffer, 'magma');
    assert(true, "Undersized buffer did NOT throw RangeError");
} catch (e: any) {
    assert(false, `Undersized buffer threw error: ${e.message}`);
}

// Test 2: Physics Modes in McRDSolver
console.log("\nTest 2: Physics Stencil & Effect Stack Verification");
const solver = new McRDSolver(100, 100);
solver.initialize(6.0, true);
assert(solver.u[0] === 1.0 && solver.v[0] === 0.0, "Clean baseline initialization");

// Test all 25 effect modes on CPU solver
const allModes: EffectType[] = [
    'physics', 'grayScott', 'lenia', 'physarum', 'lbm', 'thermalConvection',
    'surfaceTension', 'lga', 'fractal', 'walker', 'chromatic', 'sharpen',
    'electricArcs', 'crystalSnowflake', 'soca', 'gol', 'vortex', 'quantumPhase',
    'multiDim', 'excitable', 'reactionKinetics', 'turbulence', 'flow', 'gravity', 'stabilizer'
];

for (const mode of allModes) {
    const effects: EffectInstance[] = [{
        id: `test_${mode}`,
        name: mode,
        type: mode,
        enabled: true,
        isMinimized: false,
        params: {}
    }];

    try {
        solver.stepOptimized(DEFAULT_PARAMS, undefined, undefined, effects);
        let hasNaN = false;
        for (let i = 0; i < 100; i++) {
            if (Number.isNaN(solver.u[i]) || Number.isNaN(solver.v[i]) || Number.isNaN(solver.w[i])) {
                hasNaN = true; break;
            }
        }
        assert(!hasNaN, `Effect '${mode}' executed stably without NaNs`);
    } catch (e: any) {
        assert(false, `Effect '${mode}' failed: ${e.message}`);
    }
}

// Test 3: Resizing Lifecycle
console.log("\nTest 3: Resizing Lifecycle");
solver.resize(300, 150, 6.0);
assert(solver.width === 300 && solver.height === 150, "Solver resized to 300x150");
assert(solver.u.length === 45000, "Solver buffer length matches 300x150 (45,000 floats)");

// Test 4: Seeding Engine
console.log("\nTest 4: Seeding Engine");
const seedRandom = generateSeed(100, 100, {
    type: 'random',
    intensity: 1.0,
    randomThreshold: 0.05,
    perlinScale: 10,
    perlinThreshold: 0.5,
    perlinOctaves: 2,
    perlinSeed: 42,
    gridSpacingX: 10,
    gridSpacingY: 10,
    gridDotSize: 2,
    gridOffset: false,
    shapeSize: 20,
    shapeHollow: false
});
assert(seedRandom.length === 10000, "Random seed generated with correct length");

// Test 5: Interaction & Image Import
console.log("\nTest 5: Interaction & Image Import");
const testImg = new Uint8ClampedArray(50 * 50 * 4).fill(128);
importImage(solver, testImg, 50, 50, 6.0, false);
assert(solver.v[0] > 0, "Image imported into solver chemistry grid");

perturb(solver, 50, 50, 5.0, 10, 'inject', 'circle', { r: 255, g: 0, b: 0 });
assert(solver.u[50 * 300 + 50] > 1.0, "Perturb brush injected concentration onto U channel");

// Test 6: Empty Effect Stack Behavior (No Ghost Physics)
console.log("\nTest 6: Empty Effect Stack Behavior");
const emptySolver = new McRDSolver(50, 50);
emptySolver.initialize(6.0, true);
const uInit = emptySolver.u[0];
const vInit = emptySolver.v[0];
emptySolver.stepOptimized(DEFAULT_PARAMS, undefined, undefined, []);
assert(emptySolver.v[0] === vInit, "Empty effect array does not trigger ghost physics");

// Test 7: Parameter Aliases & ALife Integration
console.log("\nTest 7: Parameter Aliases & ALife Integration");
const alifeSolver = new McRDSolver(60, 60);
alifeSolver.initialize(6.0, false);
perturb(alifeSolver, 30, 30, 6.0, 5, 'inject', 'circle');

// Lenia step
alifeSolver.stepOptimized(DEFAULT_PARAMS, undefined, undefined, [{
    id: 'test_lenia',
    name: 'Lenia',
    type: 'lenia',
    enabled: true,
    isMinimized: false,
    params: { radius: 10, mu: 0.15, sigma: 0.015, dt: 0.1, influence: 1.0 }
}]);
assert(!Number.isNaN(alifeSolver.u[30 * 60 + 30]), "Lenia normalized step succeeded without NaNs");

// Excitable Waves with UI Aliases
alifeSolver.stepOptimized(DEFAULT_PARAMS, undefined, undefined, [{
    id: 'test_excitable',
    name: 'Excitable',
    type: 'excitable',
    enabled: true,
    isMinimized: false,
    params: { fnA: 0.7, fnB: 0.8, fnEpsilon: 0.08, fnStimulus: 0.1, fnInfluence: 0.9 }
}]);
assert(!Number.isNaN(alifeSolver.u[30 * 60 + 30]), "Excitable with fnA/fnB/fnEpsilon aliases stepped cleanly");

// SoCA with UI Aliases
alifeSolver.stepOptimized(DEFAULT_PARAMS, undefined, undefined, [{
    id: 'test_soca',
    name: 'SoCA',
    type: 'soca',
    enabled: true,
    isMinimized: false,
    params: { socaDtScale: 1.2, socaSpring: 0.05, socaReactionMix: 1.0, socaDamping: 0.99 }
}]);
assert(!Number.isNaN(alifeSolver.v[30 * 60 + 30]), "SoCA with UI aliases stepped cleanly");

// Game of Life with Rule Arrays
alifeSolver.stepOptimized(DEFAULT_PARAMS, undefined, undefined, [{
    id: 'test_gol',
    name: 'GoL',
    type: 'gol',
    enabled: true,
    isMinimized: false,
    params: { golBirth: [3], golSurvive: [2, 3], golThreshold: 0.35, golBlend: 0.8 }
}]);
assert(!Number.isNaN(alifeSolver.u[30 * 60 + 30]), "GoL with array rules stepped cleanly");

// Curl Turbulence with Flow Direction Sliders
alifeSolver.stepOptimized(DEFAULT_PARAMS, undefined, undefined, [{
    id: 'test_turbulence_dir',
    name: 'Curl Turbulence Directional',
    type: 'turbulence',
    enabled: true,
    isMinimized: false,
    params: { turbScale: 0.03, turbSpeed: 1.2, turbStrength: 1.5, turbDirX: 1.0, turbDirY: -0.5, turbInfluence: 1.0 }
}]);
assert(!Number.isNaN(alifeSolver.u[30 * 60 + 30]), "Curl Turbulence with turbDirX/Y stepped cleanly without NaNs");

// Test 8: All Regime Presets Execute Stably
console.log("\nTest 8: Built-in Regime Presets Suite Verification");
assert(REGIME_PRESETS.length >= 3, `Regime presets populated (${REGIME_PRESETS.length} presets found)`);

for (const p of REGIME_PRESETS) {
    const presetSolver = new McRDSolver(64, 64);
    presetSolver.initialize(p.params.totalDensity || 6.0, false);
    presetSolver.stepOptimized(p.params, undefined, undefined, p.effects || []);
    const midVal = presetSolver.u[32 * 64 + 32];
    assert(!Number.isNaN(midVal) && Number.isFinite(midVal), `Preset "${p.name}" (${(p.effects || []).map(e => e.type).join(' + ')}) executed cleanly without NaNs`);
}

console.log(`\n=== Test Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
