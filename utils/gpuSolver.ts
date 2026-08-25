/**
 * High-Performance WebGL2 GPGPU Real-Time Simulation Pipeline & Hardware Shaders.
 *
 * Executes multi-pass simulation stencils, all 25 generative modes, color lookup grading,
 * and normal-field surface relief lighting directly in GPU VRAM via ping-pong framebuffers
 * at 60+ FPS on arbitrary grid resolutions.
 */

import { SimulationParams, ColorMap, CustomColorConfig, EffectInstance, ReliefLightingConfig, RGBPostProcessingConfig } from '../types';
import { PhysarumEngine } from './alifeEngines';

// Vertex shader for full-screen quad
const QUAD_VS = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// GPGPU Interactive Brush Shader (Circle, Square, Gaussian, Splatter with Periodic Wrapping)
const BRUSH_FS = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_currentTexture;
uniform vec2 u_resolution;
uniform vec2 u_brushPos;
uniform float u_brushRadius;
uniform float u_brushStrength;
uniform vec3 u_brushTarget;
uniform int u_blendMode;    // 0: add, 1: replace, 2: smooth
uniform int u_brushType;    // 0: circle, 1: square, 2: gaussian, 3: splatter
uniform int u_boundaryType; // 0: periodic, 1: clamped

float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec4 current = texture2D(u_currentTexture, v_uv);
    vec2 pixelPos = v_uv * u_resolution;
    vec2 diff = abs(pixelPos - u_brushPos);

    if (u_boundaryType == 0) { // Toroidal periodic distance for seamless brush wrapping
        diff.x = min(diff.x, u_resolution.x - diff.x);
        diff.y = min(diff.y, u_resolution.y - diff.y);
    }

    float dist = length(diff);
    float factor = 0.0;
    float rad = max(1.0, u_brushRadius);

    if (u_brushType == 1) { // Square
        if (diff.x <= rad && diff.y <= rad) {
            factor = u_brushStrength;
        }
    } else if (u_brushType == 2) { // Gaussian
        float sigma = rad * 0.5;
        factor = exp(-(dist * dist) / (2.0 * sigma * sigma)) * u_brushStrength;
    } else if (u_brushType == 3) { // Splatter
        if (dist <= rad) {
            float n = rand(v_uv * 100.0 + u_brushPos * 0.1);
            if (n > 0.4) {
                factor = (1.0 - dist / rad) * u_brushStrength * n * 1.5;
            }
        }
    } else { // Circle
        if (dist <= rad) {
            factor = (1.0 - smoothstep(rad * 0.7, rad, dist)) * u_brushStrength;
        }
    }

    if (factor <= 0.0001) {
        gl_FragColor = current;
        return;
    }

    vec3 res = current.rgb;
    if (u_blendMode == 1) {
        res = mix(current.rgb, u_brushTarget, clamp(factor, 0.0, 1.0));
    } else {
        res += u_brushTarget * factor;
    }

    gl_FragColor = vec4(clamp(res, 0.0, 50.0), current.a);
}
`;

// GPGPU High-Performance Zero-Readback Seed & Video Injection Shader
const SEED_INJECT_FS = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_currentTexture;
uniform sampler2D u_seedTexture;
uniform vec2 u_resolution;
uniform vec2 u_seedResolution;
uniform vec2 u_seedOffset;     // Normalized screen offset (-1 to 1)
uniform vec2 u_seedScale;      // scaleX, scaleY
uniform float u_seedRotation;  // radians
uniform float u_opacity;       // 0 to 1
uniform int u_blendMode;       // 0: add, 1: replace, 2: subtract, 3: multiply, 4: screen
uniform int u_dataType;        // 0: float (single channel with seedTarget), 1: uint8 (RGBA)
uniform int u_isRGB;           // 1: RGB 3-channel, 0: scalar luminance
uniform float u_totalDensity;  // density scale (e.g. 6.0)
uniform vec3 u_seedTarget;     // targetU, targetV, targetW
uniform int u_blendIfEnabled;
uniform vec2 u_blendIfRange;   // low, high
uniform float u_blendIfSmoothness;

void main() {
    vec4 current = texture2D(u_currentTexture, v_uv);
    
    // Pixel coordinate in screen space (px: 0 to W, py: 0 to H)
    vec2 p = vec2(v_uv.x * u_resolution.x, (1.0 - v_uv.y) * u_resolution.y);
    
    // Translation target
    vec2 center = u_resolution * 0.5;
    vec2 targetPos = center + vec2(u_seedOffset.x * center.x, u_seedOffset.y * center.y);
    vec2 d = p - targetPos;
    
    // Rotation
    float cosR = cos(u_seedRotation);
    float sinR = sin(u_seedRotation);
    vec2 rotD = vec2(d.x * cosR - d.y * sinR, d.x * sinR + d.y * cosR);
    
    // Scaling
    vec2 sc = max(vec2(0.001), u_seedScale);
    vec2 seedPix = (rotD / sc) + (u_seedResolution * 0.5);
    vec2 seedUV = seedPix / u_seedResolution;
    
    // Outside seed bounding box
    if (seedUV.x < 0.0 || seedUV.x > 1.0 || seedUV.y < 0.0 || seedUV.y > 1.0) {
        gl_FragColor = current;
        return;
    }
    
    vec4 seedSample = texture2D(u_seedTexture, seedUV);
    
    float srcU = 0.0;
    float srcV = 0.0;
    float srcW = 0.0;
    
    if (u_dataType == 1) { // RGBA image/video data
        if (u_isRGB == 1) {
            srcU = seedSample.r * u_totalDensity;
            srcV = seedSample.g * u_totalDensity;
            srcW = seedSample.b * u_totalDensity;
        } else {
            float lum = dot(seedSample.rgb, vec3(0.299, 0.587, 0.114));
            srcV = lum * u_totalDensity;
            srcU = srcV;
            srcW = 0.0;
        }
    } else { // Float single channel procedural seed
        float val = seedSample.r;
        srcU = val * u_totalDensity * u_seedTarget.x;
        srcV = val * u_totalDensity * u_seedTarget.y;
        srcW = val * u_totalDensity * u_seedTarget.z;
    }
    
    float vOp = u_opacity;
    
    // BlendIf range masking
    if (u_blendIfEnabled == 1) {
        float currentV = current.g / max(0.001, u_totalDensity);
        float low = u_blendIfRange.x;
        float high = u_blendIfRange.y;
        float sm = max(0.0001, u_blendIfSmoothness);
        float factor = 1.0;
        if (currentV < low - sm || currentV > high + sm) factor = 0.0;
        else if (currentV < low) factor = (currentV - (low - sm)) / sm;
        else if (currentV > high) factor = ((high + sm) - currentV) / sm;
        
        vOp *= factor;
    }
    
    if (vOp <= 0.0001) {
        gl_FragColor = current;
        return;
    }
    
    float nextU = current.r;
    float nextV = current.g;
    float nextW = current.b;
    float invTD = 1.0 / max(0.001, u_totalDensity);
    
    if (u_blendMode == 0) { // Add
        nextU = current.r + srcU * vOp;
        nextV = current.g + srcV * vOp;
        nextW = current.b + srcW * vOp;
    } else if (u_blendMode == 2) { // Subtract
        nextU = max(0.0, current.r - srcU * vOp);
        nextV = max(0.0, current.g - srcV * vOp);
        nextW = max(0.0, current.b - srcW * vOp);
    } else if (u_blendMode == 3) { // Multiply
        nextU = current.r * ((1.0 - vOp) + (srcU * invTD) * vOp);
        nextV = current.g * ((1.0 - vOp) + (srcV * invTD) * vOp);
        nextW = current.b * ((1.0 - vOp) + (srcW * invTD) * vOp);
    } else if (u_blendMode == 4) { // Screen
        float cVU = current.r * invTD;
        float cVV = current.g * invTD;
        float cVW = current.b * invTD;
        float sU = srcU * invTD;
        float sV = srcV * invTD;
        float sW = srcW * invTD;
        nextU = ((1.0 - (1.0 - cVU) * (1.0 - sU)) * u_totalDensity - current.r) * vOp + current.r;
        nextV = ((1.0 - (1.0 - cVV) * (1.0 - sV)) * u_totalDensity - current.g) * vOp + current.g;
        nextW = ((1.0 - (1.0 - cVW) * (1.0 - sW)) * u_totalDensity - current.b) * vOp + current.b;
    } else { // Replace / stamp
        if (u_isRGB == 1 || u_dataType == 0) {
            nextU = current.r + (srcU - current.r) * vOp;
            nextV = current.g + (srcV - current.g) * vOp;
            nextW = current.b + (srcW - current.b) * vOp;
        } else {
            nextV = current.g + (srcV - current.g) * vOp;
        }
    }
    
    gl_FragColor = vec4(clamp(nextU, 0.0, 50.0), clamp(nextV, 0.0, 50.0), clamp(nextW, 0.0, 50.0), current.a);
}
`;

// GPGPU Comprehensive Simulation Fragment Shader (All 25 Physics & Alife Modes)
const SIMULATION_FS = `
precision highp float;
varying vec2 v_uv;

uniform sampler2D u_currentTexture;
uniform sampler2D u_prevTexture;
uniform vec2 u_resolution;
uniform float u_dt;
uniform float u_time;
uniform float u_totalDensity;

// Reaction-Diffusion Core Parameters
uniform float u_Dm, u_Dc, u_Dw;
uniform float u_kRec, u_kOn, u_kOff, u_kSat, u_feedRate;
uniform float u_flowX, u_flowY, u_flowScale;
uniform int u_boundaryType; // 0: periodic, 1: clamped
uniform float u_noise;
uniform float u_fadeOutRate;

// Mode Toggles & Specific Parameters
uniform bool u_usePhysics;
uniform bool u_useGrayScott;
uniform float u_gsDa, u_gsDb, u_gsFeed, u_gsKill;

uniform bool u_useLenia;
uniform float u_leniaRadius, u_leniaMu, u_leniaSigma, u_leniaKernelMu, u_leniaKernelSigma, u_leniaDt, u_leniaInfluence, u_leniaStep;

uniform bool u_usePhysarum;
uniform float u_physarumSensorAngle, u_physarumSensorDist, u_physarumRotation, u_physarumStepSize, u_physarumDeposit, u_physarumDecay, u_physarumDiff, u_physarumInfluence, u_physarumGridCoupling;
uniform sampler2D u_slimeTexture;
uniform int u_hasSlimeTexture;

uniform bool u_useLBM;
uniform float u_lbmTau, u_lbmGravityX, u_lbmGravityY, u_lbmCoupling, u_lbmInfluence;

uniform bool u_useThermalConvection;
uniform float u_thermalBuoyancy, u_heatSource, u_thermalCooling, u_thermalDiff, u_thermalInfluence;

uniform bool u_useSurfaceTension;
uniform float u_surfaceMobility, u_interfacialTension, u_phaseSeparation, u_coalescenceRate, u_tensionInfluence;

uniform bool u_useLGA;
uniform float u_lgaInfluence, u_lgaViscosity, u_lgaProbability, u_lgaAdvection, u_lgaBarrier, u_lgaNoise, u_lgaFlowX, u_lgaFlowY;

uniform bool u_useFractal;
uniform float u_fractalZoom, u_fractalInfluence, u_fractalThreshold;
uniform int u_fractalDepth, u_fractalBlockSize;

uniform bool u_useWalker;
uniform float u_walkerCount, u_walkerSpeed, u_walkerTrail;

uniform bool u_useChromatic;
uniform float u_chromaticDispX, u_chromaticDispY, u_chromaticBlend;

uniform bool u_useSharpen;
uniform float u_sharpenStrength, u_sharpenInfluence;

uniform bool u_useElectricArcs;
uniform float u_arcBranching, u_arcDecay, u_arcIntensity, u_arcJitter, u_arcDriftAngle, u_arcInfluence;

uniform bool u_useCrystalSnowflake;
uniform float u_anisotropyOrder, u_anisotropyStrength, u_freezingRate, u_snowflakeGrowth, u_crystalInfluence;

uniform bool u_useSoCA;
uniform float u_socaSpeed, u_socaDamping, u_socaCoupling, u_socaMassThreshold, u_socaInfluence;

uniform bool u_useGoL;
uniform float u_golThreshold, u_golBlend;
uniform int u_golBirthMask, u_golSurviveMask;

uniform bool u_useVortex;
uniform float u_vortexSpeed, u_vortexRadius, u_vortexAngle, u_vortexFeedback, u_vortexBlend;
uniform vec2 u_vortexCenter;

uniform bool u_useQuantumPhase;
uniform float u_quantumHbar, u_quantumCoupling, u_quantumPotential, u_quantumPhaseSpeed, u_quantumInterference, u_quantumInfluence;

uniform bool u_useMultiDim;
uniform float u_multiDimZoom, u_multiDimCoupling, u_multiDimCrossDiff, u_multiDimInfluence;

uniform bool u_useExcitable;
uniform float u_excitableThreshold, u_excitableEps, u_excitableRecovery, u_excitableSpeed, u_excitableInfluence, u_excitableStimulus;

uniform bool u_useReactionKinetics;
uniform float u_bzEpsilon, u_bzMu, u_bzQ, u_bzF, u_bzSpeed, u_bzDiffusion, u_bzInfluence;

uniform bool u_useTurbulence;
uniform float u_turbScale, u_turbSpeed, u_turbStrength, u_turbFeedback, u_turbInfluence, u_turbDirX, u_turbDirY;

uniform bool u_useGravity;
uniform float u_gravityAngle, u_gravityStrength, u_gravityMassThreshold;

// Multi-Channel RGB Coupling & Mode Uniforms
uniform vec3 u_modeCouplingRGB;
uniform bool u_isRgbMode;

// Fast Pseudo-Random Hash
float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

// Boundary Wrapping Sampler
vec4 sampleWrap(vec2 uv) {
    if (u_boundaryType == 0) {
        uv = fract(fract(uv) + 1.0);
    } else {
        uv = clamp(uv, vec2(0.0001), vec2(0.9999));
    }
    return texture2D(u_currentTexture, uv);
}

// 2D Simplex Noise for Procedural Flow and Curl Turbulence
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

vec2 curlNoise(vec2 p, float t) {
    const float eps = 0.05;
    float n1 = snoise(p + vec2(0.0, eps) + vec2(t * 0.2, t * 0.1));
    float n2 = snoise(p - vec2(0.0, eps) + vec2(t * 0.2, t * 0.1));
    float n3 = snoise(p + vec2(eps, 0.0) + vec2(t * 0.1, -t * 0.2));
    float n4 = snoise(p - vec2(eps, 0.0) + vec2(t * 0.1, -t * 0.2));
    return vec2((n1 - n2) / (2.0 * eps), -(n3 - n4) / (2.0 * eps));
}

void main() {
    vec2 dx = vec2(1.0 / u_resolution.x, 0.0);
    vec2 dy = vec2(0.0, 1.0 / u_resolution.y);

    // Initial state
    vec4 center = texture2D(u_currentTexture, v_uv);
    float u = center.r;
    float v = center.g;
    float w = center.b;
    float oldU = center.r;
    float oldV = center.g;
    float oldW = center.b;
    float prevU = (center.a > 0.0) ? center.a : center.r;
    float prevV = (center.a > 0.0) ? center.a : center.g;
    float prevW = (center.a > 0.0) ? center.a : center.b;
    float du = 0.0;
    float dv = 0.0;
    float dw = 0.0;

    // 1. Semi-Lagrangian Advection & Zoom Feedback: Collect total fluid & motion velocity
    vec2 flowVelocity = vec2(u_flowX, -u_flowY);

    if (u_useTurbulence) {
        vec2 dirOffset = vec2(u_turbDirX, -u_turbDirY) * u_time * u_turbSpeed * 2.0;
        vec2 turb = curlNoise((v_uv + dirOffset * 0.05) * u_turbScale * 100.0, u_time * u_turbSpeed) * u_turbStrength * u_turbInfluence;
        turb += vec2(u_turbDirX, -u_turbDirY) * u_turbSpeed * 10.0 * u_turbInfluence;
        if (abs(u_turbFeedback - 1.0) > 0.001) {
            vec2 cDiff = (v_uv - 0.5) * u_resolution;
            turb += cDiff * (u_turbFeedback - 1.0) * 0.5;
        }
        flowVelocity += vec2(turb.x, -turb.y);
    }

    if (u_useVortex) {
        vec2 vDiff = (v_uv - vec2(u_vortexCenter.x, 1.0 - u_vortexCenter.y)) * u_resolution;
        float rSq = dot(vDiff, vDiff);
        float rPix = u_vortexRadius * min(u_resolution.x, u_resolution.y);
        float falloff = exp(-rSq / max(1.0, 2.0 * rPix * rPix));
        float vSpeed = u_vortexSpeed * 0.5;
        vec2 rawV = vec2(-vDiff.y, vDiff.x) * vSpeed * falloff;
        float rad = u_vortexAngle * 3.14159265 / 180.0;
        vec2 rotV = vec2(rawV.x * cos(rad) - rawV.y * sin(rad), rawV.x * sin(rad) + rawV.y * cos(rad));
        if (abs(u_vortexFeedback - 1.0) > 0.001) {
            rotV += vDiff * (u_vortexFeedback - 1.0) * 0.5;
        }
        flowVelocity += rotV * u_vortexBlend;
    }

    if (u_useGravity) {
        float rad = u_gravityAngle * 3.14159265 / 180.0;
        vec2 gravDir = vec2(sin(rad), -cos(rad));
        if (u > u_gravityMassThreshold) {
            flowVelocity += gravDir * u_gravityStrength * 15.0;
        }
    }

    if (u_useThermalConvection) {
        if (v_uv.y < 0.04) {
            w = max(w, u_heatSource * u_totalDensity);
            u = max(u, u_heatSource * u_totalDensity * 0.4);
        }
        float temp = w;
        float buoyancy = temp * 0.03 * u_thermalBuoyancy;
        flowVelocity.y += buoyancy * 15.0 * u_thermalInfluence;
    }

    if (u_useLBM) {
        vec4 leftB   = sampleWrap(v_uv - dx);
        vec4 rightB  = sampleWrap(v_uv + dx);
        vec4 upB     = sampleWrap(v_uv + dy);
        vec4 downB   = sampleWrap(v_uv - dy);
        vec2 pressGrad = vec2(rightB.r + rightB.g * 0.5 - (leftB.r + leftB.g * 0.5), upB.r + upB.g * 0.5 - (downB.r + downB.g * 0.5)) * 0.5;
        float nu = max(0.01, (2.0 * u_lbmTau - 1.0) / 6.0);
        vec2 fluidForce = vec2(u_lbmGravityX * 40.0, -u_lbmGravityY * 40.0 + (w + v * 0.2) * 0.05 * u_lbmCoupling * 10.0);
        vec2 lbmVel = (fluidForce - pressGrad * 2.0) / (1.0 + nu * 2.0);
        float vMag = length(lbmVel);
        if (vMag > 8.0) lbmVel = (lbmVel / vMag) * 8.0;
        flowVelocity += lbmVel * u_lbmInfluence;
    }

    if (u_useLGA) {
        vec2 pHash = vec2(rand(v_uv * 100.0 + fract(u_time * 19.3)), rand(v_uv * 100.0 + fract(u_time * 29.7))) - 0.5;
        vec2 lgaBaseVel = vec2(u_lgaFlowX, -u_lgaFlowY) + pHash * u_lgaNoise * 20.0;
        float barrier = u_lgaBarrier > 0.1 ? u_lgaBarrier : 8.0;
        vec4 nbSample = sampleWrap(v_uv - (lgaBaseVel * u_lgaAdvection * 8.0) / u_resolution);
        if (u >= barrier || nbSample.r >= barrier) {
            lgaBaseVel *= -0.5 * (1.0 - u_lgaViscosity);
        } else {
            lgaBaseVel *= (1.0 - u_lgaViscosity * 0.5);
        }
        float hopProb = rand(v_uv * 50.0 + floor(u_time * 30.0));
        if (hopProb < u_lgaProbability) {
            flowVelocity += lgaBaseVel * u_lgaAdvection * 8.0 * u_lgaInfluence;
            du += (nbSample.r - u) * u_lgaProbability * 0.3 * u_lgaInfluence;
            dv += (nbSample.g - v) * u_lgaProbability * 0.3 * u_lgaInfluence;
        }
    }

    // Apply combined Semi-Lagrangian Advection & Zoom Feedback
    vec2 advUV = (v_uv - 0.5) / max(0.01, u_flowScale) + 0.5 - (flowVelocity * u_dt * 8.0) / u_resolution;
    if (abs(u_flowScale - 1.0) > 0.0001 || length(flowVelocity) > 0.0001) {
        vec4 advSample = sampleWrap(advUV);
        u = advSample.r;
        v = advSample.g;
        w = advSample.b;
    }

    // Compute 5-point discrete Laplacian stencil after advection & zoom
    vec2 baseUV = (abs(u_flowScale - 1.0) > 0.0001 || length(flowVelocity) > 0.0001) ? advUV : v_uv;
    vec4 left   = sampleWrap(baseUV - dx);
    vec4 right  = sampleWrap(baseUV + dx);
    vec4 up     = sampleWrap(baseUV + dy);
    vec4 down   = sampleWrap(baseUV - dy);

    float lapU = left.r + right.r + up.r + down.r - 4.0 * u;
    float lapV = left.g + right.g + up.g + down.g - 4.0 * v;
    float lapW = left.b + right.b + up.b + down.b - 4.0 * w;

    // 2. MCRD Reaction-Diffusion Physics
    if (u_usePhysics) {
        float uSq = u * u;
        float recruitment = (u_kRec * uSq) / (1.0 + u_kSat * uSq);
        float reaction = v * (u_kOn + recruitment) - u_kOff * u;

        du += (u_Dm * lapU + reaction) * u_modeCouplingRGB.r;
        dv += (u_Dc * lapV - reaction + (u_feedRate > 0.0 ? u_feedRate * (u_totalDensity * 0.5 - v) : 0.0)) * u_modeCouplingRGB.g;
        dw += (u_Dw * lapW + 0.01 * u - 0.05 * w) * u_modeCouplingRGB.b;
    }

    // 3. Gray-Scott Autocatalysis
    if (u_useGrayScott) {
        float safeU = clamp(u, 0.0, 1.5);
        float safeV = clamp(v, 0.0, 1.5);
        float reactionGS = safeU * safeV * safeV;
        du += (u_gsDa * lapU - reactionGS + u_gsFeed * (1.0 - safeU)) * u_modeCouplingRGB.r;
        dv += (u_gsDb * lapV + reactionGS - (u_gsFeed + u_gsKill) * safeV) * u_modeCouplingRGB.g;
        dw += (u_gsDa * lapW - 0.05 * w) * u_modeCouplingRGB.b;
    }

    // 4. Lenia Continuous Cellular Automata (Isotropic Concentric Polar Ring Convolution - High Performance)
    if (u_useLenia) {
        float rF = clamp(u_leniaRadius, 3.0, 14.0);
        float kMu = u_leniaKernelMu > 0.01 ? u_leniaKernelMu : 0.5;
        float kSigma = u_leniaKernelSigma > 0.005 ? u_leniaKernelSigma : 0.15;
        float twoKSigmaSq = 2.0 * kSigma * kSigma;
        float invDens = 1.0 / max(0.1, u_totalDensity);
        vec2 pix = 1.0 / u_resolution;

        vec3 conv = vec3(0.0);
        float sumW = 0.0;
        float isFast = (u_leniaStep > 1.5) ? 1.0 : 0.0;

        // Center sample
        float w0 = exp(-(kMu * kMu) / twoKSigmaSq);
        if (w0 > 0.0001) {
            conv += sampleWrap(v_uv).rgb * w0;
            sumW += w0;
        }

        if (isFast > 0.5) {
            // Fast mode: 3 concentric rings (42 total samples, ~0.08ms GPU time, smooth gapless sampling)
            for (float ring = 1.0; ring <= 3.0; ring += 1.0) {
                float distNorm = ring / 3.0;
                float rDist = distNorm * rF;
                float diff = distNorm - kMu;
                float wRing = exp(-(diff * diff) / twoKSigmaSq);
                if (wRing > 0.0001) {
                    float nPts = ring * 6.0 + 2.0; // 8, 14, 20 points
                    float dAngle = 6.2831853 / nPts;
                    for (float a = 0.0; a < 20.0; a += 1.0) {
                        if (a >= nPts) break;
                        float angle = a * dAngle;
                        vec2 off = vec2(cos(angle), sin(angle)) * (rDist * pix);
                        conv += sampleWrap(v_uv + off).rgb * wRing;
                        sumW += wRing;
                    }
                }
            }
        } else {
            // Quality mode: 5 concentric rings (70 total samples, continuous isotropic Euclidean convolution)
            for (float ring = 1.0; ring <= 5.0; ring += 1.0) {
                float distNorm = ring / 5.0;
                float rDist = distNorm * rF;
                float diff = distNorm - kMu;
                float wRing = exp(-(diff * diff) / twoKSigmaSq);
                if (wRing > 0.0001) {
                    float nPts = ring * 4.0 + 2.0; // 6, 10, 14, 18, 22 points
                    float dAngle = 6.2831853 / nPts;
                    for (float a = 0.0; a < 22.0; a += 1.0) {
                        if (a >= nPts) break;
                        float angle = a * dAngle;
                        vec2 off = vec2(cos(angle), sin(angle)) * (rDist * pix);
                        conv += sampleWrap(v_uv + off).rgb * wRing;
                        sumW += wRing;
                    }
                }
            }
        }

        vec3 potential = clamp((conv / max(0.0001, sumW)) * invDens, vec3(0.0), vec3(1.0));
        float sigmaVal = max(0.005, u_leniaSigma > 0.001 ? u_leniaSigma : 0.035);
        vec3 growthDiff = potential - vec3(u_leniaMu);
        vec3 growth = 2.0 * exp(-(growthDiff * growthDiff) / (2.0 * sigmaVal * sigmaVal)) - vec3(1.0);
        vec3 curA = clamp(vec3(u, v, w) * invDens, vec3(0.0), vec3(1.0));
        vec3 nextA = clamp(curA + growth * u_leniaDt, vec3(0.0), vec3(1.0));
        vec3 targetLenia = nextA * u_totalDensity;
        u = mix(u, targetLenia.r, u_leniaInfluence * u_modeCouplingRGB.r);
        v = mix(v, targetLenia.g, u_leniaInfluence * u_modeCouplingRGB.g);
        w = mix(w, targetLenia.b, u_leniaInfluence * u_modeCouplingRGB.b);
    }

    // 5. Physarum Polycephalum Slime Mold Chemotaxis & Trail Diffusion
    if (u_usePhysarum) {
        float inf = clamp(u_physarumInfluence, 0.0, 1.0);
        float coupling = clamp(u_physarumGridCoupling, 0.0, 2.0);
        if (u_hasSlimeTexture == 1 && inf > 0.001) {
            vec4 slimeSample = texture2D(u_slimeTexture, v_uv);
            float slimeAgents = slimeSample.r;
            float slimeTrail = slimeSample.g;

            // Bidirectional feedback between slime mold pheromone trail and morphogens
            v = mix(v, v + slimeTrail * 1.5 * coupling * u_modeCouplingRGB.g, inf);
            u = mix(u, max(0.0, u + (slimeAgents - 0.1) * 1.2 * coupling * u_modeCouplingRGB.r), inf);
            w = mix(w, max(0.0, w + (slimeAgents * 0.8 + slimeTrail * 0.6) * coupling * u_modeCouplingRGB.b), inf);
        }

        // Continuous trail diffusion & decay on GPU
        float avgV = (left.g + right.g + up.g + down.g) * 0.25;
        float diffV = mix(v, avgV, u_physarumDiff);
        float decayedV = diffV * u_physarumDecay;
        dv += (decayedV - v) / max(0.001, u_dt) * u_modeCouplingRGB.g;
        du += u_physarumDiff * 0.15 * lapU * u_modeCouplingRGB.r;
        dw += u_physarumDiff * 0.15 * lapW * u_modeCouplingRGB.b;
    }

    // 6. Thermal Convection Diffusion Pass
    if (u_useThermalConvection) {
        float temp = w;
        dw += (u_thermalDiff * lapW - u_thermalCooling * temp) * u_thermalInfluence * u_modeCouplingRGB.b;
        du += (u_thermalDiff * lapU * 0.5 + u_thermalBuoyancy * temp * 0.01) * u_thermalInfluence * u_modeCouplingRGB.r;
        dv += (u_thermalDiff * lapV * 0.5) * u_thermalInfluence * u_modeCouplingRGB.g;
    }

    // 7. Surface Tension (Cahn-Hilliard Phase Separation)
    if (u_useSurfaceTension) {
        float phiU = (u / max(0.1, u_totalDensity)) * 2.0 - 1.0;
        float muU = (phiU * phiU * phiU - phiU) * u_phaseSeparation - (u_interfacialTension / max(0.1, u_totalDensity)) * lapU;
        float nextUVal = clamp(u + (u_surfaceMobility * 0.5 * lapU - muU * 0.5) * u_dt * u_totalDensity, 0.0, u_totalDensity * 1.5);
        u = mix(u, nextUVal, u_tensionInfluence * u_modeCouplingRGB.r);

        float phiV = (v / max(0.1, u_totalDensity)) * 2.0 - 1.0;
        float muV = (phiV * phiV * phiV - phiV) * u_phaseSeparation - (u_interfacialTension / max(0.1, u_totalDensity)) * lapV;
        float nextVVal = clamp(v + (u_surfaceMobility * 0.5 * lapV - muV * 0.5) * u_dt * u_totalDensity, 0.0, u_totalDensity * 1.5);
        v = mix(v, nextVVal, u_tensionInfluence * u_modeCouplingRGB.g);

        float phiW = (w / max(0.1, u_totalDensity)) * 2.0 - 1.0;
        float muW = (phiW * phiW * phiW - phiW) * u_phaseSeparation - (u_interfacialTension / max(0.1, u_totalDensity)) * lapW;
        float nextWVal = clamp(w + (u_surfaceMobility * 0.5 * lapW - muW * 0.5) * u_dt * u_totalDensity, 0.0, u_totalDensity * 1.5);
        w = mix(w, nextWVal, u_tensionInfluence * u_modeCouplingRGB.b);
    }

    // 8. Hierarchical Multi-Scale Fractal Cellular Automata
    if (u_useFractal) {
        float bSize = max(2.0, float(u_fractalBlockSize));
        vec2 pix = v_uv * u_resolution;
        vec3 fracActive = vec3(0.0);
        
        vec2 m1 = floor(pix / bSize);
        vec2 m1_uv = (m1 + 0.5) * bSize / u_resolution;
        vec3 m1_val = sampleWrap(m1_uv).rgb / max(0.1, u_totalDensity);
        vec2 step1 = bSize / u_resolution;
        
        vec3 n1 = vec3(0.0);
        if (sampleWrap(m1_uv + vec2(step1.x, 0.0)).r / max(0.1, u_totalDensity) > u_fractalThreshold) n1.r += 1.0;
        if (sampleWrap(m1_uv - vec2(step1.x, 0.0)).r / max(0.1, u_totalDensity) > u_fractalThreshold) n1.r += 1.0;
        if (sampleWrap(m1_uv + vec2(0.0, step1.y)).r / max(0.1, u_totalDensity) > u_fractalThreshold) n1.r += 1.0;
        if (sampleWrap(m1_uv - vec2(0.0, step1.y)).r / max(0.1, u_totalDensity) > u_fractalThreshold) n1.r += 1.0;
        if (sampleWrap(m1_uv + step1).r / max(0.1, u_totalDensity) > u_fractalThreshold) n1.r += 1.0;
        if (sampleWrap(m1_uv - step1).r / max(0.1, u_totalDensity) > u_fractalThreshold) n1.r += 1.0;
        if (sampleWrap(m1_uv + vec2(step1.x, -step1.y)).r / max(0.1, u_totalDensity) > u_fractalThreshold) n1.r += 1.0;
        if (sampleWrap(m1_uv + vec2(-step1.x, step1.y)).r / max(0.1, u_totalDensity) > u_fractalThreshold) n1.r += 1.0;

        if (sampleWrap(m1_uv + vec2(step1.x, 0.0)).g / max(0.1, u_totalDensity) > u_fractalThreshold) n1.g += 1.0;
        if (sampleWrap(m1_uv - vec2(step1.x, 0.0)).g / max(0.1, u_totalDensity) > u_fractalThreshold) n1.g += 1.0;
        if (sampleWrap(m1_uv + vec2(0.0, step1.y)).g / max(0.1, u_totalDensity) > u_fractalThreshold) n1.g += 1.0;
        if (sampleWrap(m1_uv - vec2(0.0, step1.y)).g / max(0.1, u_totalDensity) > u_fractalThreshold) n1.g += 1.0;
        if (sampleWrap(m1_uv + step1).g / max(0.1, u_totalDensity) > u_fractalThreshold) n1.g += 1.0;
        if (sampleWrap(m1_uv - step1).g / max(0.1, u_totalDensity) > u_fractalThreshold) n1.g += 1.0;
        if (sampleWrap(m1_uv + vec2(step1.x, -step1.y)).g / max(0.1, u_totalDensity) > u_fractalThreshold) n1.g += 1.0;
        if (sampleWrap(m1_uv + vec2(-step1.x, step1.y)).g / max(0.1, u_totalDensity) > u_fractalThreshold) n1.g += 1.0;

        if (sampleWrap(m1_uv + vec2(step1.x, 0.0)).b / max(0.1, u_totalDensity) > u_fractalThreshold) n1.b += 1.0;
        if (sampleWrap(m1_uv - vec2(step1.x, 0.0)).b / max(0.1, u_totalDensity) > u_fractalThreshold) n1.b += 1.0;
        if (sampleWrap(m1_uv + vec2(0.0, step1.y)).b / max(0.1, u_totalDensity) > u_fractalThreshold) n1.b += 1.0;
        if (sampleWrap(m1_uv - vec2(0.0, step1.y)).b / max(0.1, u_totalDensity) > u_fractalThreshold) n1.b += 1.0;
        if (sampleWrap(m1_uv + step1).b / max(0.1, u_totalDensity) > u_fractalThreshold) n1.b += 1.0;
        if (sampleWrap(m1_uv - step1).b / max(0.1, u_totalDensity) > u_fractalThreshold) n1.b += 1.0;
        if (sampleWrap(m1_uv + vec2(step1.x, -step1.y)).b / max(0.1, u_totalDensity) > u_fractalThreshold) n1.b += 1.0;
        if (sampleWrap(m1_uv + vec2(-step1.x, step1.y)).b / max(0.1, u_totalDensity) > u_fractalThreshold) n1.b += 1.0;
        
        bool alive1R = (m1_val.r > u_fractalThreshold) ? (n1.r >= 2.0 && n1.r <= 3.0) : (n1.r >= 3.0 && n1.r <= 3.5);
        bool alive1G = (m1_val.g > u_fractalThreshold) ? (n1.g >= 2.0 && n1.g <= 3.0) : (n1.g >= 3.0 && n1.g <= 3.5);
        bool alive1B = (m1_val.b > u_fractalThreshold) ? (n1.b >= 2.0 && n1.b <= 3.0) : (n1.b >= 3.0 && n1.b <= 3.5);
        if (alive1R) fracActive.r += 0.6;
        if (alive1G) fracActive.g += 0.6;
        if (alive1B) fracActive.b += 0.6;
        
        vec3 targetFrac = fracActive * u_totalDensity * 0.8;
        du += (targetFrac.r - u * 0.2) * u_fractalInfluence * u_modeCouplingRGB.r;
        dv += (targetFrac.g - v * 0.2) * u_fractalInfluence * u_modeCouplingRGB.g;
        dw += (targetFrac.b - w * 0.2) * u_fractalInfluence * u_modeCouplingRGB.b;
    }

    // 9. Random Walker Stochastic Jitter
    if (u_useWalker) {
        float pHash = rand(v_uv * 1000.0 + fract(u_time * 17.13));
        if (pHash < u_walkerCount * 0.03) {
            float noise = (rand(v_uv * 500.0 + fract(u_time * 31.7)) - 0.5) * u_walkerTrail;
            u += noise * 0.5 * u_modeCouplingRGB.r;
            v += noise * u_modeCouplingRGB.g;
            w += noise * 0.7 * u_modeCouplingRGB.b;
        }
    }

    // 10. Chromatic Dispersion
    if (u_useChromatic) {
        vec2 disp = vec2(u_chromaticDispX, u_chromaticDispY) / u_resolution;
        float shiftedU = sampleWrap(v_uv + disp).r;
        float shiftedW = sampleWrap(v_uv - disp).b;
        du += (shiftedU - u) * u_chromaticBlend * u_modeCouplingRGB.r;
        dw += (shiftedW - w) * u_chromaticBlend * u_modeCouplingRGB.b;
    }

    // 11. Laplacian Sharpen (Unconditionally Stable Unsharp Mask)
    if (u_useSharpen) {
        float boost = clamp(u_sharpenStrength * 0.08, 0.0, 0.15) * u_sharpenInfluence;
        du -= lapU * boost * u_modeCouplingRGB.r;
        dv -= lapV * boost * u_modeCouplingRGB.g;
        dw -= lapW * boost * u_modeCouplingRGB.b;
    }

    // 12. Electric Discharge Arcs
    if (u_useElectricArcs) {
        dw -= w * (1.0 - u_arcDecay) * 0.1;
        float sparkProb = rand(v_uv * 100.0 + floor(u_time * 25.0));
        float charge = (v + u * 0.5 + w * 0.3) / max(0.1, u_totalDensity);
        if (sparkProb > (1.0 - u_arcBranching * 0.008) && charge > 0.3) {
            float spark = u_arcIntensity * u_arcInfluence * (1.0 + sparkProb * 2.0);
            du += spark * u_modeCouplingRGB.r;
            dv += spark * 0.4 * u_modeCouplingRGB.g;
            dw += spark * u_modeCouplingRGB.b;
        }
    }

    // 13. Crystal Dendrites Solidification
    if (u_useCrystalSnowflake) {
        float phi = v;
        vec2 gradPhi = vec2(right.g - left.g, up.g - down.g) * 0.5;
        float theta = atan(gradPhi.y, gradPhi.x);
        float anisotropy = 1.0 + u_anisotropyStrength * cos(u_anisotropyOrder * theta);
        float m = phi * (1.0 - phi) * (phi - 0.5 + u_freezingRate * (1.0 - u / max(0.01, u_totalDensity)));
        float dPhi = (anisotropy * anisotropy * lapV + m) * u_snowflakeGrowth * u_crystalInfluence;
        dv += dPhi * u_modeCouplingRGB.g;
        du -= dPhi * 0.5 * u_modeCouplingRGB.r;
        dw += dPhi * 0.8 * u_modeCouplingRGB.b;
    }

    // 14. 2nd-Order Wave Cellular Automata (SoCA Acoustic Propagation via 1-Step Alpha Memory)
    if (u_useSoCA) {
        float velU = (oldU - prevU) * u_socaDamping;
        float accU = (lapU * u_socaSpeed * u_socaSpeed * 0.25 - u_socaCoupling * (oldU - 1.0));
        float nextUVal = max(0.0, oldU + velU + accU * u_dt);
        u = mix(oldU, nextUVal, u_socaInfluence * u_modeCouplingRGB.r);

        float velV = (oldV - prevV) * u_socaDamping;
        float accV = (lapV * u_socaSpeed * u_socaSpeed * 0.25 - u_socaCoupling * oldV + (oldU - 1.0) * 0.3);
        float nextVVal = max(0.0, oldV + velV + accV * u_dt);
        v = mix(oldV, nextVVal, u_socaInfluence * u_modeCouplingRGB.g);

        float velW = (oldW - prevW) * u_socaDamping;
        float accW = (lapW * u_socaSpeed * u_socaSpeed * 0.25 - u_socaCoupling * oldW + (oldV - 1.0) * 0.3);
        float nextWVal = max(0.0, oldW + velW + accW * u_dt);
        w = mix(oldW, nextWVal, u_socaInfluence * u_modeCouplingRGB.b);
    }

    // 15. Classic CA / Game of Life (Direct Unrolled 8-Neighbor Bitmask Evaluation)
    if (u_useGoL) {
        float thresh = u_totalDensity * 0.25;
        
        // Channel U (Red)
        float nR = (left.r > thresh ? 1.0 : 0.0) + (right.r > thresh ? 1.0 : 0.0) +
                   (up.r > thresh ? 1.0 : 0.0) + (down.r > thresh ? 1.0 : 0.0) +
                   (sampleWrap(v_uv + dx + dy).r > thresh ? 1.0 : 0.0) +
                   (sampleWrap(v_uv - dx + dy).r > thresh ? 1.0 : 0.0) +
                   (sampleWrap(v_uv + dx - dy).r > thresh ? 1.0 : 0.0) +
                   (sampleWrap(v_uv - dx - dy).r > thresh ? 1.0 : 0.0);
        int countR = int(nR + 0.5);
        bool isAliveR = u > thresh;
        float pwrR = exp2(float(countR));
        bool nextAliveR = isAliveR ? (mod(floor(float(u_golSurviveMask) / pwrR), 2.0) > 0.5) : (mod(floor(float(u_golBirthMask) / pwrR), 2.0) > 0.5);
        float targetU = nextAliveR ? (u_totalDensity * 0.5) : 0.0;
        u = mix(u, targetU, u_golBlend * u_modeCouplingRGB.r);

        // Channel V (Green)
        float nG = (left.g > thresh ? 1.0 : 0.0) + (right.g > thresh ? 1.0 : 0.0) +
                   (up.g > thresh ? 1.0 : 0.0) + (down.g > thresh ? 1.0 : 0.0) +
                   (sampleWrap(v_uv + dx + dy).g > thresh ? 1.0 : 0.0) +
                   (sampleWrap(v_uv - dx + dy).g > thresh ? 1.0 : 0.0) +
                   (sampleWrap(v_uv + dx - dy).g > thresh ? 1.0 : 0.0) +
                   (sampleWrap(v_uv - dx - dy).g > thresh ? 1.0 : 0.0);
        int countG = int(nG + 0.5);
        bool isAliveG = v > thresh;
        float pwrG = exp2(float(countG));
        bool nextAliveG = isAliveG ? (mod(floor(float(u_golSurviveMask) / pwrG), 2.0) > 0.5) : (mod(floor(float(u_golBirthMask) / pwrG), 2.0) > 0.5);
        float targetV = nextAliveG ? (u_totalDensity * 0.5) : 0.0;
        v = mix(v, targetV, u_golBlend * u_modeCouplingRGB.g);

        // Channel W (Blue)
        float nB = (left.b > thresh ? 1.0 : 0.0) + (right.b > thresh ? 1.0 : 0.0) +
                   (up.b > thresh ? 1.0 : 0.0) + (down.b > thresh ? 1.0 : 0.0) +
                   (sampleWrap(v_uv + dx + dy).b > thresh ? 1.0 : 0.0) +
                   (sampleWrap(v_uv - dx + dy).b > thresh ? 1.0 : 0.0) +
                   (sampleWrap(v_uv + dx - dy).b > thresh ? 1.0 : 0.0) +
                   (sampleWrap(v_uv - dx - dy).b > thresh ? 1.0 : 0.0);
        int countB = int(nB + 0.5);
        bool isAliveB = w > thresh;
        float pwrB = exp2(float(countB));
        bool nextAliveB = isAliveB ? (mod(floor(float(u_golSurviveMask) / pwrB), 2.0) > 0.5) : (mod(floor(float(u_golBirthMask) / pwrB), 2.0) > 0.5);
        float targetW = nextAliveB ? (u_totalDensity * 0.5) : 0.0;
        w = mix(w, targetW, u_golBlend * u_modeCouplingRGB.b);
    }

    // 16. Quantum Phase Fluid (Schrödinger Non-Linear Wave)
    if (u_useQuantumPhase) {
        float re = u;
        float im = v;
        float prob = (re * re + im * im) / (u_totalDensity * u_totalDensity + 0.01);
        float nonLinearPot = u_quantumPotential + u_quantumCoupling * prob;

        float dRe = (0.5 * u_quantumHbar * lapV - nonLinearPot * im) * u_quantumPhaseSpeed;
        float dIm = (-0.5 * u_quantumHbar * lapU + nonLinearPot * re) * u_quantumPhaseSpeed;

        du += dRe * u_quantumInfluence * u_modeCouplingRGB.r;
        dv += dIm * u_quantumInfluence * u_modeCouplingRGB.g;
        dw += sin(atan(im, re + 0.001) * 3.0) * prob * u_totalDensity * 0.3 * u_quantumInterference * u_modeCouplingRGB.b;
    }

    // 17. Hyper-Dimensional Coupling
    if (u_useMultiDim) {
        float rotUV = (v - u) * u_multiDimCoupling;
        float rotVW = (w - v) * u_multiDimCoupling;
        float rotWU = (u - w) * u_multiDimCoupling;

        du += (lapU * 0.1 + rotUV) * u_multiDimZoom * u_multiDimInfluence * u_modeCouplingRGB.r;
        dv += (lapV * 0.1 + rotVW) * u_multiDimZoom * u_multiDimInfluence * u_modeCouplingRGB.g;
        dw += (lapW * 0.1 + rotWU) * u_multiDimZoom * u_multiDimInfluence * u_modeCouplingRGB.b;

        if (u_multiDimCrossDiff > 0.0) {
            du += u_multiDimCrossDiff * lapV * u_modeCouplingRGB.r;
            dv += u_multiDimCrossDiff * lapW * u_modeCouplingRGB.g;
            dw += u_multiDimCrossDiff * lapU * u_modeCouplingRGB.b;
        }
    }

    // 18. Excitable FitzHugh-Nagumo Waves
    if (u_useExcitable) {
        float dU_fn = (u_excitableSpeed * lapU + u * (1.0 - u) * (u - u_excitableThreshold) - v + u_excitableStimulus) * u_excitableInfluence;
        float dV_fn = (u_excitableEps * (u_excitableRecovery * u - v)) * u_excitableInfluence;
        float dW_fn = (u_excitableEps * (u_excitableRecovery * v - w)) * u_excitableInfluence;
        du += dU_fn * u_modeCouplingRGB.r;
        dv += dV_fn * u_modeCouplingRGB.g;
        dw += dW_fn * u_modeCouplingRGB.b;
    }

    // 19. Oregonator Belousov-Zhabotinsky Reaction Kinetics (with Linearly-Implicit Stabilization)
    if (u_useReactionKinetics) {
        float denom = u + u_bzQ + 1e-5;
        float fReact = (u * (1.0 - u) - u_bzF * v * (u - u_bzQ) / denom) / max(0.001, u_bzEpsilon);
        float df_du = (1.0 - 2.0 * u - (u_bzF * v * 2.0 * u_bzQ) / (denom * denom)) / max(0.001, u_bzEpsilon);
        float stabFactor = 1.0 / (1.0 - min(0.0, df_du) * u_dt * u_bzSpeed * u_bzInfluence);
        float du_bz = (fReact + lapU * 0.2) * u_bzSpeed * u_bzInfluence * stabFactor;
        float dv_bz = (u - v + lapV * 0.1) * u_bzSpeed * u_bzInfluence;
        du += du_bz * u_modeCouplingRGB.r;
        dv += dv_bz * u_modeCouplingRGB.g;
        dw += (v - w + lapW * 0.1) * u_bzSpeed * u_bzInfluence * u_modeCouplingRGB.b;
    }

    // 20. Turbulence Force Injection
    if (u_useTurbulence) {
        vec2 tUV = v_uv * u_turbScale * 100.0;
        float nX = rand(tUV + vec2(u_time * u_turbSpeed * 0.1, 0.0)) - 0.5;
        float nY = rand(tUV + vec2(0.0, u_time * u_turbSpeed * 0.1)) - 0.5;
        vec2 turbForce = (vec2(nX, nY) * u_turbStrength + vec2(u_turbDirX, u_turbDirY)) * 0.05;
        du += turbForce.x * u_turbInfluence * u_modeCouplingRGB.r;
        dv += turbForce.y * u_turbInfluence * u_modeCouplingRGB.g;
        dw += (turbForce.x + turbForce.y) * 0.5 * u_turbInfluence * u_modeCouplingRGB.b;
    }

    // Fade-out Dissipation / Retention
    if (abs(u_fadeOutRate - 0.8) > 0.01) {
        if (u_fadeOutRate < 0.8) {
            float retain = 1.0 + (0.8 - u_fadeOutRate) * 0.06 * u_dt;
            v *= retain;
            w *= retain;
        } else {
            float dissipate = max(0.0, 1.0 - (u_fadeOutRate - 0.8) * 0.25 * u_dt);
            v *= dissipate;
            w *= dissipate;
        }
    }

    // Numerical Integration Step
    float nextU = clamp(u + du * u_dt, 0.0, 50.0);
    float nextV = clamp(v + dv * u_dt, 0.0, 50.0);
    float nextW = clamp(w + dw * u_dt, 0.0, 50.0);

    // Alpha channel saves incoming U for 2nd order SoCA in next frame
    gl_FragColor = vec4(nextU, nextV, nextW, oldU);
}
`;

// Presentation & Direct Screen Rendering Fragment Shader (1:1 CPU Color Transfer & Multi-Stop Gradients)
const PRESENT_FS = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_simTexture;
uniform vec2 u_gridResolution;
uniform int u_colorMap; // 0: magma, 1: electric, 2: bio, 3: thermal, 4: rgb, 5: custom_rgb, 6: custom_scalar

// Multi-Stop Custom Scalar Gradient (up to 8 stops)
uniform int u_gradCount;
uniform vec3 u_gradColors[8];
uniform float u_gradPositions[8];

// Color Multipliers & Post-Processing
uniform vec3 u_rgbMultipliers;
uniform vec3 u_rgbBias;
uniform float u_exposure, u_contrast, u_gamma, u_saturation, u_brightness;
uniform vec3 u_tint;

// Relief Shading
uniform int u_reliefEnabled;
uniform float u_reliefBump, u_reliefSpecular, u_reliefLightAngle, u_reliefFresnel;

vec3 evalScalarGradient(float t) {
    if (u_gradCount <= 0) return vec3(t);
    if (t <= u_gradPositions[0]) return u_gradColors[0];
    
    vec3 result = u_gradColors[0];
    for (int i = 0; i < 7; i++) {
        if (i < u_gradCount - 1) {
            float posA = u_gradPositions[i];
            float posB = u_gradPositions[i + 1];
            if (t >= posA && t <= posB) {
                float range = max(0.0001, posB - posA);
                float localT = (t - posA) / range;
                return mix(u_gradColors[i], u_gradColors[i + 1], localT);
            }
            result = u_gradColors[i + 1];
        }
    }
    return result;
}

void main() {
    vec4 sim = texture2D(u_simTexture, v_uv);
    float u = sim.r;
    float v = sim.g;
    float w = sim.b;

    vec3 color = vec3(0.0);

    if (u_colorMap == 4) { // RGB Direct with exact CPU Tone Mapping
        vec3 c = vec3(u, v, w) / 6.0;
        color = (c * (1.0 + c * 0.18)) / (1.0 + c * 0.75);
    } else if (u_colorMap == 5) { // Custom RGB Multipliers & Bias with Tone Mapping
        vec3 c = (vec3(u, v, w) / 6.0) * u_rgbMultipliers + (u_rgbBias / 255.0);
        vec3 posC = max(c, vec3(0.0));
        color = (posC * (vec3(1.0) + posC * 0.18)) / (vec3(1.0) + posC * 0.75);
    } else if (u_colorMap == 6) { // Custom Scalar Multi-Stop Gradient
        float norm = clamp(max(u, v * 0.5) / 8.0, 0.0, 1.0);
        color = evalScalarGradient(norm);
    } else { // Preset Colormaps matching CPU LUTs exactly
        float norm = clamp(max(u, v * 0.5) / 8.0, 0.0, 1.0);
        float t = pow(norm, 0.7);

        if (u_colorMap == 0) { // Magma (Exact piecewise mapping)
            if (t < 0.2) {
                float localT = t / 0.2;
                color = mix(vec3(10.0, 10.0, 20.0), vec3(70.0, 30.0, 120.0), localT) / 255.0;
            } else if (t < 0.5) {
                float localT = (t - 0.2) / 0.3;
                color = mix(vec3(70.0, 30.0, 120.0), vec3(255.0, 80.0, 0.0), localT) / 255.0;
            } else {
                float localT = (t - 0.5) / 0.5;
                color = mix(vec3(255.0, 80.0, 0.0), vec3(255.0, 255.0, 255.0), localT) / 255.0;
            }
        } else if (u_colorMap == 1) { // Electric
            if (t < 0.33) {
                float localT = t / 0.33;
                color = mix(vec3(0.0, 0.0, 0.0), vec3(0.0, 50.0, 150.0), localT) / 255.0;
            } else if (t < 0.66) {
                float localT = (t - 0.33) / 0.33;
                color = mix(vec3(0.0, 50.0, 150.0), vec3(0.0, 255.0, 255.0), localT) / 255.0;
            } else {
                float localT = (t - 0.66) / 0.34;
                color = mix(vec3(0.0, 255.0, 255.0), vec3(255.0, 255.0, 255.0), localT) / 255.0;
            }
        } else if (u_colorMap == 2) { // Bio
            if (t < 0.5) {
                float localT = t / 0.5;
                color = mix(vec3(0.0, 20.0, 20.0), vec3(50.0, 150.0, 20.0), localT) / 255.0;
            } else {
                float localT = (t - 0.5) / 0.5;
                color = mix(vec3(50.0, 150.0, 20.0), vec3(255.0, 255.0, 20.0), localT) / 255.0;
            }
        } else if (u_colorMap == 3) { // Thermal
            if (t < 0.33) {
                float localT = t / 0.33;
                color = mix(vec3(0.0, 0.0, 50.0), vec3(0.0, 0.0, 255.0), localT) / 255.0;
            } else if (t < 0.66) {
                float localT = (t - 0.33) / 0.33;
                color = mix(vec3(0.0, 0.0, 255.0), vec3(255.0, 0.0, 0.0), localT) / 255.0;
            } else {
                float localT = (t - 0.66) / 0.34;
                color = mix(vec3(255.0, 0.0, 0.0), vec3(255.0, 255.0, 0.0), localT) / 255.0;
            }
        }
    }

    // Color Grading & Post-Processing
    color = color * u_exposure * u_tint + u_brightness;
    color = (color - 0.5) * u_contrast + 0.5;

    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(lum), color, u_saturation);
    color = pow(max(vec3(0.0), color), vec3(1.0 / max(0.1, u_gamma)));

    // Surface Relief Lighting
    if (u_reliefEnabled == 1) {
        vec2 d = 1.0 / u_gridResolution;
        float hL = texture2D(u_simTexture, v_uv - vec2(d.x, 0.0)).g;
        float hR = texture2D(u_simTexture, v_uv + vec2(d.x, 0.0)).g;
        float hD = texture2D(u_simTexture, v_uv - vec2(0.0, d.y)).g;
        float hU = texture2D(u_simTexture, v_uv + vec2(0.0, d.y)).g;

        vec3 normal = normalize(vec3((hL - hR) * u_reliefBump, (hD - hU) * u_reliefBump, 1.0));
        vec3 lightDir = normalize(vec3(cos(u_reliefLightAngle), sin(u_reliefLightAngle), 0.7));

        float diffuse = max(0.0, dot(normal, lightDir));
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(0.0, dot(normal, halfDir)), 32.0) * u_reliefSpecular;

        color = color * (0.4 + 0.6 * diffuse) + vec3(spec);
    }

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

function hexToVec3(hex: string): [number, number, number] {
    if (!hex) return [1, 1, 1];
    const clean = hex.startsWith('#') ? hex.slice(1) : hex;
    const bigint = parseInt(clean, 16);
    return [((bigint >> 16) & 255) / 255.0, ((bigint >> 8) & 255) / 255.0, (bigint & 255) / 255.0];
}

export class GPUSimulationEngine {
    canvas: HTMLCanvasElement;
    gl: WebGLRenderingContext | WebGL2RenderingContext | null;
    width: number;
    height: number;

    simProgram: WebGLProgram | null = null;
    brushProgram: WebGLProgram | null = null;
    seedProgram: WebGLProgram | null = null;
    presentProgram: WebGLProgram | null = null;

    textures: (WebGLTexture | null)[] = [null, null];
    framebuffers: (WebGLFramebuffer | null)[] = [null, null];
    prevTextures: (WebGLTexture | null)[] = [null, null];
    prevFramebuffers: (WebGLFramebuffer | null)[] = [null, null];
    seedTexture: WebGLTexture | null = null;
    slimeTexture: WebGLTexture | null = null;

    currentIdx: number = 0;
    positionBuffer: WebGLBuffer | null = null;
    isSupported: boolean = false;
    tick: number = 0;

    physarumEngine: PhysarumEngine | null = null;
    private _physarumTrailBuf: Float32Array = new Float32Array(0);
    private _physarumUBuf: Float32Array = new Float32Array(0);
    private _slimeUploadBuf: Float32Array = new Float32Array(0);
    private _emptySlimeBuf: Float32Array = new Float32Array(0);
    private _prevHasPhysarum: boolean = false;

    private _uniformCache: Map<string, WebGLUniformLocation | null> = new Map();
    private _programIds: WeakMap<WebGLProgram, number> = new WeakMap();
    private _nextProgramId: number = 1;
    private _rgbaUploadBuf: Float32Array = new Float32Array(0);
    private _rgbaReadbackBuf: Float32Array = new Float32Array(0);

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;

        // Try WebGL2 first for float textures and high-speed memory buffers
        const gl = this.canvas.getContext('webgl2', { alpha: false, depth: false, antialias: false, preserveDrawingBuffer: true }) ||
                   this.canvas.getContext('webgl', { alpha: false, depth: false, antialias: false, preserveDrawingBuffer: true });

        this.gl = gl as (WebGLRenderingContext | WebGL2RenderingContext | null);

        if (!this.gl) {
            console.warn("WebGL not available for hardware GPU acceleration.");
            this.isSupported = false;
            return;
        }

        const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && this.gl instanceof WebGL2RenderingContext;

        if (isWebGL2) {
            this.gl.getExtension('EXT_color_buffer_float');
            this.gl.getExtension('OES_texture_float_linear');
            this.isSupported = true;
        } else {
            const extFloat = this.gl.getExtension('OES_texture_float');
            const extHalfFloat = this.gl.getExtension('OES_texture_half_float');
            this.gl.getExtension('WEBGL_color_buffer_float');
            this.gl.getExtension('OES_texture_float_linear');

            if (!extFloat && !extHalfFloat) {
                console.warn("Floating point texture support not available on WebGL1.");
                this.isSupported = false;
                return;
            }
            this.isSupported = true;
        }

        this.initShaders();
        this.initBuffers();
        this.initTextures();
    }

    private getCachedUniformLocation(program: WebGLProgram, name: string): WebGLUniformLocation | null {
        const id = this._programIds.get(program) || 0;
        const key = `${id}_${name}`;
        if (this._uniformCache.has(key)) {
            return this._uniformCache.get(key)!;
        }
        const loc = this.gl!.getUniformLocation(program, name);
        this._uniformCache.set(key, loc);
        return loc;
    }

    createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Shader compile failed:", gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    createProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string): WebGLProgram | null {
        const vs = this.createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fs = this.createShader(gl, gl.FRAGMENT_SHADER, fsSource);
        if (!vs || !fs) return null;

        const program = gl.createProgram();
        if (!program) return null;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program link failed:", gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        this._programIds.set(program, this._nextProgramId++);
        return program;
    }

    initShaders() {
        const gl = this.gl;
        if (!gl) return;

        this.simProgram = this.createProgram(gl, QUAD_VS, SIMULATION_FS);
        this.brushProgram = this.createProgram(gl, QUAD_VS, BRUSH_FS);
        this.seedProgram = this.createProgram(gl, QUAD_VS, SEED_INJECT_FS);
        this.presentProgram = this.createProgram(gl, QUAD_VS, PRESENT_FS);

        if (!this.simProgram || !this.brushProgram || !this.seedProgram || !this.presentProgram) {
            console.error("Failed to compile one or more GPU shader programs. Disabling GPU solver.");
            this.isSupported = false;
        }
    }

    initBuffers() {
        const gl = this.gl;
        if (!gl) return;

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0,
        ]), gl.STATIC_DRAW);
    }

    initTextures() {
        const gl = this.gl;
        if (!gl) return;

        this.cleanupTextures();

        const w = this.width;
        const h = this.height;

        const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
        const internalFormat = isWebGL2 ? (gl as WebGL2RenderingContext).RGBA32F : gl.RGBA;
        const type = gl.FLOAT;

        for (let i = 0; i < 2; i++) {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, gl.RGBA, type, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            const fb = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

            this.textures[i] = tex;
            this.framebuffers[i] = fb;

            const prevTex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, prevTex);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, gl.RGBA, type, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            const prevFb = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, prevFb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, prevTex, 0);

            this.prevTextures[i] = prevTex;
            this.prevFramebuffers[i] = prevFb;
        }

        if (this.slimeTexture) { gl.deleteTexture(this.slimeTexture); this.slimeTexture = null; }
        this.slimeTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.slimeTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, gl.RGBA, type, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    cleanupTextures() {
        const gl = this.gl;
        if (!gl) return;

        for (let i = 0; i < 2; i++) {
            if (this.textures[i]) { gl.deleteTexture(this.textures[i]); this.textures[i] = null; }
            if (this.framebuffers[i]) { gl.deleteFramebuffer(this.framebuffers[i]); this.framebuffers[i] = null; }
            if (this.prevTextures[i]) { gl.deleteTexture(this.prevTextures[i]); this.prevTextures[i] = null; }
            if (this.prevFramebuffers[i]) { gl.deleteFramebuffer(this.prevFramebuffers[i]); this.prevFramebuffers[i] = null; }
        }
        if (this.seedTexture) {
            gl.deleteTexture(this.seedTexture);
            this.seedTexture = null;
        }
        if (this.slimeTexture) {
            gl.deleteTexture(this.slimeTexture);
            this.slimeTexture = null;
        }
    }

    resetAlife() {
        if (this.physarumEngine) {
            this.physarumEngine = null;
        }
        this._physarumTrailBuf = new Float32Array(0);
        this._physarumUBuf = new Float32Array(0);
        this._slimeUploadBuf = new Float32Array(0);
        this._emptySlimeBuf = new Float32Array(0);
        if (this.slimeTexture && this.gl) {
            this.gl.deleteTexture(this.slimeTexture);
            this.slimeTexture = null;
        }
    }

    destroy() {
        const gl = this.gl;
        if (!gl) return;
        this.cleanupTextures();
        if (this.positionBuffer) { gl.deleteBuffer(this.positionBuffer); this.positionBuffer = null; }
        if (this.simProgram) { gl.deleteProgram(this.simProgram); this.simProgram = null; }
        if (this.brushProgram) { gl.deleteProgram(this.brushProgram); this.brushProgram = null; }
        if (this.seedProgram) { gl.deleteProgram(this.seedProgram); this.seedProgram = null; }
        if (this.presentProgram) { gl.deleteProgram(this.presentProgram); this.presentProgram = null; }
        const loseCtx = gl.getExtension('WEBGL_lose_context');
        if (loseCtx) loseCtx.loseContext();
        this.gl = null;
        this.isSupported = false;
    }

    resize(width: number, height: number) {
        if (this.width === width && this.height === height) return;
        this.width = width;
        this.height = height;
        this.currentIdx = 0;
        this._uniformCache.clear();
        if (this.gl) {
            this.canvas.width = width;
            this.canvas.height = height;
            this.initTextures();
        }
    }

    uploadBuffers(u: Float32Array, v: Float32Array, w: Float32Array, width?: number, height?: number) {
        if (width && height && (this.width !== width || this.height !== height)) {
            this.resize(width, height);
        } else if (u.length !== this.width * this.height) {
            const calculatedSide = Math.round(Math.sqrt(u.length));
            if (calculatedSide * calculatedSide === u.length) {
                this.resize(calculatedSide, calculatedSide);
            }
        }
        const gl = this.gl;
        if (!gl || !this.isSupported) return;

        const W = this.width;
        const H = this.height;
        const size = W * H;
        const totalElements = size * 4;
        if (this._rgbaUploadBuf.length !== totalElements) {
            this._rgbaUploadBuf = new Float32Array(totalElements);
        }
        const rgba = this._rgbaUploadBuf;

        // Flip Y on upload: row 0 of CPU (top) -> row H-1 in WebGL texture (V=1.0, top)
        for (let y = 0; y < H; y++) {
            const srcRow = y * W;
            const dstRow = (H - 1 - y) * W;
            for (let x = 0; x < W; x++) {
                const srcIdx = srcRow + x;
                const dstIdx = (dstRow + x) * 4;
                rgba[dstIdx] = u[srcIdx] || 0;
                rgba[dstIdx + 1] = v[srcIdx] || 0;
                rgba[dstIdx + 2] = w[srcIdx] || 0;
                rgba[dstIdx + 3] = u[srcIdx] || 0; // Alpha stores initial prevU
            }
        }

        for (let i = 0; i < 2; i++) {
            if (this.textures[i]) {
                gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H, gl.RGBA, gl.FLOAT, rgba);
            }
            if (this.prevTextures[i]) {
                gl.bindTexture(gl.TEXTURE_2D, this.prevTextures[i]);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H, gl.RGBA, gl.FLOAT, rgba);
            }
        }
        this.currentIdx = 0;
    }

    readbackBuffers(u: Float32Array, v: Float32Array, w: Float32Array) {
        const gl = this.gl;
        if (!gl || !this.isSupported || !this.framebuffers[this.currentIdx]) return;

        const W = this.width;
        const H = this.height;
        const size = W * H;
        const totalElements = size * 4;
        if (this._rgbaReadbackBuf.length !== totalElements) {
            this._rgbaReadbackBuf = new Float32Array(totalElements);
        }
        const rgba = this._rgbaReadbackBuf;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[this.currentIdx]);
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, rgba);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // readPixels returns row 0 (V=0, bottom of texture) first.
        // Map row V=0 to bottom row of CPU (y = H-1), and row V=1 to top row of CPU (y = 0).
        for (let y = 0; y < H; y++) {
            const dstRow = y * W;
            const srcRow = (H - 1 - y) * W;
            for (let x = 0; x < W; x++) {
                const dstIdx = dstRow + x;
                const srcIdx = (srcRow + x) * 4;
                if (dstIdx < u.length) {
                    u[dstIdx] = rgba[srcIdx];
                    v[dstIdx] = rgba[srcIdx + 1];
                    w[dstIdx] = rgba[srcIdx + 2];
                }
            }
        }
    }

    // Interactive Brush Injection (Circle, Square, Gaussian, Splatter with RGB channels and Periodic Wrapping)
    injectBrush(
        x: number,
        y: number,
        radius: number,
        strength: number,
        targetU: number,
        targetV: number,
        targetW: number,
        blendMode: number = 0,
        brushType: 'circle' | 'square' | 'gaussian' | 'splatter' = 'circle',
        boundaryType: number = 0
    ) {
        const gl = this.gl;
        if (!gl || !this.brushProgram || !this.isSupported) return;

        const nextIdx = 1 - this.currentIdx;
        gl.viewport(0, 0, this.width, this.height);
        gl.useProgram(this.brushProgram);

        // Wrap x and y into [0, width) and [0, height) for infinite view compatibility
        const wrapX = ((x % this.width) + this.width) % this.width;
        // Invert Y for texture space where V=1.0 is TOP (y=0) and V=0.0 is BOTTOM (y=H)
        const wrapY = this.height - 1.0 - (((y % this.height) + this.height) % this.height);

        const set2f = (n: string, xVal: number, yVal: number) => {
            const loc = this.getCachedUniformLocation(this.brushProgram!, n);
            if (loc) gl.uniform2f(loc, xVal, yVal);
        };
        const set1f = (n: string, val: number) => {
            const loc = this.getCachedUniformLocation(this.brushProgram!, n);
            if (loc) gl.uniform1f(loc, val);
        };
        const set3f = (n: string, xVal: number, yVal: number, zVal: number) => {
            const loc = this.getCachedUniformLocation(this.brushProgram!, n);
            if (loc) gl.uniform3f(loc, xVal, yVal, zVal);
        };
        const set1i = (n: string, val: number) => {
            const loc = this.getCachedUniformLocation(this.brushProgram!, n);
            if (loc) gl.uniform1i(loc, val);
        };

        set2f('u_resolution', this.width, this.height);
        set2f('u_brushPos', wrapX, wrapY);
        set1f('u_brushRadius', radius);
        set1f('u_brushStrength', strength);
        set3f('u_brushTarget', targetU, targetV, targetW);
        set1i('u_blendMode', blendMode);
        set1i('u_boundaryType', boundaryType);

        let typeIdx = 0;
        if (brushType === 'square') typeIdx = 1;
        else if (brushType === 'gaussian') typeIdx = 2;
        else if (brushType === 'splatter') typeIdx = 3;
        set1i('u_brushType', typeIdx);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentIdx]);
        const locTex = this.getCachedUniformLocation(this.brushProgram, 'u_currentTexture');
        if (locTex) gl.uniform1i(locTex, 0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[nextIdx]);

        const posLoc = gl.getAttribLocation(this.brushProgram, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        if (this.physarumEngine) {
            this.physarumEngine.injectTrail(wrapX, wrapY, radius, strength * 4.0);
        }

        this.currentIdx = nextIdx;
    }

    // High-Performance Zero-Readback GPGPU Seed & Video Injection
    injectContinuousSeed(
        seedData: Float32Array | Uint8ClampedArray,
        seedWidth: number,
        seedHeight: number,
        isRGB: boolean,
        isUint8: boolean,
        opacity: number,
        offsetX: number,
        offsetY: number,
        scaleX: number,
        scaleY: number,
        rotation: number,
        blendModeStr: string = 'replace',
        totalDensity: number = 6.0,
        targetU: number = 1.0,
        targetV: number = 0.0,
        targetW: number = 0.0,
        blendIf?: { enabled: boolean, smoothness: number, points: Array<{ pos: number }> }
    ) {
        const gl = this.gl;
        if (!gl || !this.seedProgram || !this.isSupported || opacity <= 0.0001) return;

        if (!this.seedTexture) {
            this.seedTexture = gl.createTexture();
        }
        gl.bindTexture(gl.TEXTURE_2D, this.seedTexture);

        const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;

        if (isUint8) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, seedWidth, seedHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, seedData as Uint8ClampedArray);
        } else {
            if (isWebGL2) {
                gl.texImage2D(gl.TEXTURE_2D, 0, (gl as WebGL2RenderingContext).R32F, seedWidth, seedHeight, 0, (gl as WebGL2RenderingContext).RED, gl.FLOAT, seedData as Float32Array);
            } else {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, seedWidth, seedHeight, 0, gl.LUMINANCE, gl.FLOAT, seedData as Float32Array);
            }
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const nextIdx = 1 - this.currentIdx;
        gl.viewport(0, 0, this.width, this.height);
        gl.useProgram(this.seedProgram);

        const set2f = (n: string, xVal: number, yVal: number) => {
            const loc = this.getCachedUniformLocation(this.seedProgram!, n);
            if (loc) gl.uniform2f(loc, xVal, yVal);
        };
        const set1f = (n: string, val: number) => {
            const loc = this.getCachedUniformLocation(this.seedProgram!, n);
            if (loc) gl.uniform1f(loc, val);
        };
        const set3f = (n: string, xVal: number, yVal: number, zVal: number) => {
            const loc = this.getCachedUniformLocation(this.seedProgram!, n);
            if (loc) gl.uniform3f(loc, xVal, yVal, zVal);
        };
        const set1i = (n: string, val: number) => {
            const loc = this.getCachedUniformLocation(this.seedProgram!, n);
            if (loc) gl.uniform1i(loc, val);
        };

        let blendModeInt = 1; // replace
        if (blendModeStr === 'add') blendModeInt = 0;
        else if (blendModeStr === 'subtract') blendModeInt = 2;
        else if (blendModeStr === 'multiply') blendModeInt = 3;
        else if (blendModeStr === 'screen') blendModeInt = 4;

        const rad = (rotation * Math.PI) / 180.0;

        set2f('u_resolution', this.width, this.height);
        set2f('u_seedResolution', seedWidth, seedHeight);
        set2f('u_seedOffset', offsetX, offsetY);
        set2f('u_seedScale', scaleX, scaleY);
        set1f('u_seedRotation', rad);
        set1f('u_opacity', opacity);
        set1i('u_blendMode', blendModeInt);
        set1i('u_dataType', isUint8 ? 1 : 0);
        set1i('u_isRGB', isRGB ? 1 : 0);
        set1f('u_totalDensity', totalDensity);
        set3f('u_seedTarget', targetU, targetV, targetW);

        if (blendIf && blendIf.enabled && blendIf.points && blendIf.points.length >= 2) {
            set1i('u_blendIfEnabled', 1);
            set2f('u_blendIfRange', blendIf.points[0].pos, blendIf.points[1].pos);
            set1f('u_blendIfSmoothness', blendIf.smoothness || 0.1);
        } else {
            set1i('u_blendIfEnabled', 0);
            set2f('u_blendIfRange', 0.0, 1.0);
            set1f('u_blendIfSmoothness', 0.1);
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentIdx]);
        set1i('u_currentTexture', 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.seedTexture);
        set1i('u_seedTexture', 1);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[nextIdx]);

        const posLoc = gl.getAttribLocation(this.seedProgram, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.currentIdx = nextIdx;
    }

    // High-Performance Full HD & 4K GPGPU Simulation Step
    stepSimulation(params: SimulationParams, effects?: EffectInstance[]) {
        const gl = this.gl;
        if (!gl || !this.simProgram || !this.isSupported) return;

        const prevIdx = this.currentIdx;
        this.tick++;
        const nextIdx = 1 - this.currentIdx;

        gl.viewport(0, 0, this.width, this.height);
        gl.useProgram(this.simProgram);

        const set1f = (name: string, val: number) => {
            const loc = this.getCachedUniformLocation(this.simProgram!, name);
            if (loc) gl.uniform1f(loc, val);
        };
        const set1i = (name: string, val: number) => {
            const loc = this.getCachedUniformLocation(this.simProgram!, name);
            if (loc) gl.uniform1i(loc, val);
        };
        const set2f = (name: string, x: number, y: number) => {
            const loc = this.getCachedUniformLocation(this.simProgram!, name);
            if (loc) gl.uniform2f(loc, x, y);
        };
        const set3f = (name: string, x: number, y: number, z: number) => {
            const loc = this.getCachedUniformLocation(this.simProgram!, name);
            if (loc) gl.uniform3f(loc, x, y, z);
        };

        const activeEffects = effects !== undefined ? effects.filter(e => e.enabled) : null;

        if (activeEffects !== null && activeEffects.length === 0) {
            // Modular stack mode with 0 active effects: grid remains inert/static
            if (this._prevHasPhysarum) {
                this.resetAlife();
                this._prevHasPhysarum = false;
            }
            return;
        }

        const hasPhysarumInStack = activeEffects !== null ? activeEffects.some(e => e.type === 'physarum') : false;
        if (!hasPhysarumInStack && this._prevHasPhysarum) {
            this.resetAlife();
        }
        this._prevHasPhysarum = hasPhysarumInStack;

        const passes = activeEffects !== null ? activeEffects : [null];

        for (let passIdx = 0; passIdx < passes.length; passIdx++) {
            const eff = passes[passIdx];
            const isLast = (passIdx === passes.length - 1);
            const prevIdx = (this.currentIdx + 1) % 2;
            const nextIdx = (this.currentIdx + 1) % 2;

            gl.viewport(0, 0, this.width, this.height);
            gl.useProgram(this.simProgram);

            const isRGB = params.colorMap === 'rgb' || params.colorMap === 'custom';
            let coupR = 1.0;
            let coupG = 1.0;
            let coupB = 1.0;

            if (eff !== null) {
                const p = eff.params || {};
                const baseCoup = typeof p.gridCoupling === 'number'
                    ? p.gridCoupling
                    : (p.gridCoupling === false ? 0.0 : 1.0);
                coupR = (typeof p.gridCouplingR === 'number' ? p.gridCouplingR : 1.0) * baseCoup;
                coupG = (typeof p.gridCouplingG === 'number' ? p.gridCouplingG : 1.0) * baseCoup;
                coupB = (typeof p.gridCouplingB === 'number' ? p.gridCouplingB : 1.0) * baseCoup;
            }

            set3f('u_modeCouplingRGB', coupR, coupG, coupB);
            set1i('u_isRgbMode', isRGB ? 1 : 0);

            set2f('u_resolution', this.width, this.height);
            set1f('u_time', this.tick * 0.02);
            set1f('u_dt', params.dt || 0.08);
            set1f('u_Dm', params.Dm ?? 0.1);
            set1f('u_Dc', params.Dc ?? 1.0);
            set1f('u_Dw', params.Dw ?? 5.0);
            set1f('u_kOn', params.kOn ?? 0.05);
            set1f('u_kRec', params.kRec ?? 0.08);
            set1f('u_kSat', params.kSat ?? 0.05);
            set1f('u_kOff', params.kOff ?? 0.8);
            set1f('u_feedRate', params.feedRate ?? 0.0);
            set1f('u_totalDensity', params.totalDensity ?? 6.0);
            set1f('u_flowX', 0);
            set1f('u_flowY', 0);
            set1f('u_flowScale', 1.0);
            set1f('u_noise', params.noise ?? 0);
            set1f('u_fadeOutRate', isLast ? (params.fadeOutRate ?? 0.8) : 0.8);
            set1i('u_boundaryType', params.boundaryType === 'periodic' ? 0 : 1);

            // Effect stack mode flags
            let hasPhysics = false;
            let hasGrayScott = false;
            let hasLenia = false;
            let hasPhysarum = false;
            let physarumParams: any = null;
            let hasLBM = false;
            let hasThermal = false;
            let hasTension = false;
            let hasLGA = false;
            let hasFractal = false;
            let hasWalker = false;
            let hasChromatic = false;
            let hasSharpen = false;
            let hasArcs = false;
            let hasCrystal = false;
            let hasSoCA = false;
            let hasGoL = false;
            let hasVortex = false;
            let hasQuantum = false;
            let hasMultiDim = false;
            let hasExcitable = false;
            let hasReaction = false;
            let hasTurb = false;
            let hasGravity = false;

            if (eff !== null) {
                const p = eff.params || {};

                switch (eff.type) {
                    case 'physics':
                        hasPhysics = true;
                        if (p.Dm !== undefined) set1f('u_Dm', p.Dm);
                        if (p.Dc !== undefined) set1f('u_Dc', p.Dc);
                        if (p.Dw !== undefined) set1f('u_Dw', p.Dw);
                        if (p.kOn !== undefined) set1f('u_kOn', p.kOn);
                        if (p.kRec !== undefined) set1f('u_kRec', p.kRec);
                        if (p.kSat !== undefined) set1f('u_kSat', p.kSat);
                        if (p.kOff !== undefined) set1f('u_kOff', p.kOff);
                        if (p.feedRate !== undefined) set1f('u_feedRate', p.feedRate);
                        break;
                    case 'grayScott':
                        hasGrayScott = true;
                        set1f('u_gsDa', p.gsDa ?? 1.0);
                        set1f('u_gsDb', p.gsDb ?? 0.5);
                        set1f('u_gsFeed', p.gsFeed ?? 0.055);
                        set1f('u_gsKill', p.gsKill ?? 0.062);
                        break;
                    case 'lenia':
                        hasLenia = true;
                        set1f('u_leniaRadius', p.radius ?? 13);
                        set1f('u_leniaMu', p.mu ?? 0.15);
                        set1f('u_leniaSigma', p.sigma ?? 0.035);
                        set1f('u_leniaKernelMu', p.kernelMu ?? 0.5);
                        set1f('u_leniaKernelSigma', p.kernelSigma ?? 0.15);
                        set1f('u_leniaDt', p.leniaDt ?? p.dt ?? 0.1);
                        set1f('u_leniaInfluence', p.leniaInfluence ?? p.influence ?? 1.0);
                        set1f('u_leniaStep', p.sampleStep ?? 1.0);
                        break;
                    case 'physarum':
                        hasPhysarum = true;
                        physarumParams = p;
                        set1f('u_physarumSensorAngle', p.sensorAngle ?? 0.45);
                        set1f('u_physarumSensorDist', p.sensorDistance ?? 8.0);
                        set1f('u_physarumRotation', p.rotationAngle ?? 0.4);
                        set1f('u_physarumStepSize', p.stepSize ?? 1.5);
                        set1f('u_physarumDeposit', p.depositAmount ?? 1.8);
                        set1f('u_physarumDecay', p.decayFactor ?? 0.96);
                        set1f('u_physarumDiff', p.diffuseFactor ?? 0.2);
                        set1f('u_physarumInfluence', p.physarumInfluence ?? p.influence ?? 1.0);
                        break;
                    case 'lbm':
                        hasLBM = true;
                        set1f('u_lbmTau', p.tau ?? 0.8);
                        set1f('u_lbmGravityX', p.gravityX ?? 0.0);
                        set1f('u_lbmGravityY', p.gravityY ?? -0.005);
                        set1f('u_lbmCoupling', p.coupling ?? 1.0);
                        set1f('u_lbmInfluence', p.lbmInfluence ?? p.influence ?? 1.0);
                        break;
                    case 'thermalConvection':
                        hasThermal = true;
                        set1f('u_thermalBuoyancy', p.buoyancy ?? 1.4);
                        set1f('u_heatSource', p.heatSource ?? 0.8);
                        set1f('u_thermalCooling', p.coolingRate ?? 0.05);
                        set1f('u_thermalDiff', p.thermalDiff ?? 0.2);
                        set1f('u_thermalInfluence', p.convectionInfluence ?? p.thermalInfluence ?? 1.0);
                        break;
                    case 'surfaceTension':
                        hasTension = true;
                        set1f('u_surfaceMobility', p.surfaceMobility ?? 0.4);
                        set1f('u_interfacialTension', p.interfacialTension ?? 0.15);
                        set1f('u_phaseSeparation', p.phaseSeparation ?? 1.0);
                        set1f('u_coalescenceRate', p.coalescenceRate ?? 0.8);
                        set1f('u_tensionInfluence', p.tensionInfluence ?? 1.0);
                        break;
                    case 'lga':
                        hasLGA = true;
                        set1f('u_lgaInfluence', p.lgaInfluence ?? 1.0);
                        set1f('u_lgaViscosity', p.lgaViscosity ?? 0.1);
                        set1f('u_lgaProbability', p.lgaProbability ?? 0.5);
                        set1f('u_lgaAdvection', p.lgaAdvection ?? 1.0);
                        set1f('u_lgaBarrier', p.lgaBarrier ?? 8.0);
                        set1f('u_lgaNoise', p.lgaNoise ?? 0.05);
                        set1f('u_lgaFlowX', p.lgaFlowX ?? 0);
                        set1f('u_lgaFlowY', p.lgaFlowY ?? 0);
                        break;
                    case 'fractal':
                        hasFractal = true;
                        set1f('u_fractalZoom', p.fractalZoom ?? 1.0);
                        set1f('u_fractalInfluence', p.fractalInfluence ?? 1.0);
                        set1f('u_fractalThreshold', p.fractalThreshold ?? 0.35);
                        set1i('u_fractalDepth', p.fractalDepth ?? 2);
                        set1i('u_fractalBlockSize', p.fractalBlockSize ?? 3);
                        break;
                    case 'walker':
                        hasWalker = true;
                        set1f('u_walkerCount', p.walkerCount ?? 20);
                        set1f('u_walkerSpeed', p.walkerSpeed ?? (p.jitterStrength ? p.jitterStrength * 5.0 : 2.5));
                        set1f('u_walkerTrail', p.walkerTrail ?? (p.jitterChance ? p.jitterChance * 3.0 : 2.0));
                        break;
                    case 'chromatic':
                        hasChromatic = true;
                        set1f('u_chromaticDispX', p.chromaticDispersionX ?? 1.0);
                        set1f('u_chromaticDispY', p.chromaticDispersionY ?? 0.0);
                        set1f('u_chromaticBlend', p.chromaticBlend ?? 0.8);
                        break;
                    case 'sharpen':
                        hasSharpen = true;
                        set1f('u_sharpenStrength', p.sharpenStrength ?? 0.5);
                        set1f('u_sharpenInfluence', p.sharpenInfluence ?? p.influence ?? 1.0);
                        break;
                    case 'electricArcs':
                        hasArcs = true;
                        set1f('u_arcBranching', p.arcBranching ?? 0.6);
                        set1f('u_arcDecay', p.arcDecay ?? 0.92);
                        set1f('u_arcIntensity', p.arcIntensity ?? 1.5);
                        set1f('u_arcJitter', p.arcJitter ?? 0.4);
                        set1f('u_arcDriftAngle', p.arcDriftAngle ?? 0.0);
                        set1f('u_arcInfluence', p.arcInfluence ?? 1.0);
                        break;
                    case 'crystalSnowflake':
                        hasCrystal = true;
                        set1f('u_anisotropyOrder', p.anisotropyOrder ?? 6);
                        set1f('u_anisotropyStrength', p.snowflakeAnisotropy ?? p.anisotropyStrength ?? 0.05);
                        set1f('u_freezingRate', p.snowflakeSupercooling ?? p.freezingRate ?? 0.7);
                        set1f('u_snowflakeGrowth', p.snowflakeGrowthSpeed ?? 1.2);
                        set1f('u_crystalInfluence', p.snowflakeInfluence ?? p.crystalInfluence ?? 1.0);
                        break;
                    case 'soca':
                        hasSoCA = true;
                        set1f('u_socaSpeed', p.socaSpeed ?? p.socaDtScale ?? 1.0);
                        set1f('u_socaDamping', p.socaDamping ?? 0.995);
                        set1f('u_socaCoupling', p.socaCoupling ?? p.socaSpring ?? 0.5);
                        set1f('u_socaMassThreshold', p.socaMassThreshold ?? 1.5);
                        set1f('u_socaInfluence', p.socaInfluence ?? p.socaReactionMix ?? 1.0);
                        break;
                    case 'gol':
                        hasGoL = true;
                        set1f('u_golThreshold', p.golThreshold ?? 0.35);
                        set1f('u_golBlend', p.golBlend ?? 0.5);
                        {
                            let birthMask = 0;
                            let surviveMask = 0;
                            if (Array.isArray(p.golBirth)) {
                                for (const b of p.golBirth) birthMask |= (1 << b);
                            } else {
                                const birthLow = p.golBirthLow ?? 3;
                                const birthHigh = p.golBirthHigh ?? 3;
                                for (let b = birthLow; b <= birthHigh; b++) birthMask |= (1 << b);
                            }
                            if (Array.isArray(p.golSurvive)) {
                                for (const s of p.golSurvive) surviveMask |= (1 << s);
                            } else {
                                const survivalLow = p.golSurvivalLow ?? 2;
                                const survivalHigh = p.golSurvivalHigh ?? 3;
                                for (let sv = survivalLow; sv <= survivalHigh; sv++) surviveMask |= (1 << sv);
                            }
                            set1i('u_golBirthMask', birthMask);
                            set1i('u_golSurviveMask', surviveMask);
                        }
                        break;
                    case 'vortex':
                        hasVortex = true;
                        set1f('u_vortexSpeed', p.vortexSpeed ?? 1.0);
                        set1f('u_vortexRadius', p.vortexRadius ?? 0.4);
                        set1f('u_vortexAngle', p.vortexAngle ?? 0.0);
                        set1f('u_vortexFeedback', p.vortexFeedback ?? 1.0);
                        set2f('u_vortexCenter', p.vortexCenterX ?? 0.5, p.vortexCenterY ?? 0.5);
                        set1f('u_vortexBlend', p.vortexBlend ?? 1.0);
                        break;
                    case 'quantumPhase':
                        hasQuantum = true;
                        set1f('u_quantumHbar', p.quantumHbar ?? 1.0);
                        set1f('u_quantumCoupling', p.quantumCoupling ?? 0.8);
                        set1f('u_quantumPotential', p.quantumPotential ?? 0.5);
                        set1f('u_quantumPhaseSpeed', p.quantumPhaseSpeed ?? 1.0);
                        set1f('u_quantumInterference', p.quantumInterference ?? 0.8);
                        set1f('u_quantumInfluence', p.quantumInfluence ?? 1.0);
                        break;
                    case 'multiDim':
                        hasMultiDim = true;
                        set1f('u_multiDimZoom', p.multiDimZoom ?? 1.0);
                        set1f('u_multiDimCoupling', p.dimCoupling ?? p.coupling ?? 0.5);
                        set1f('u_multiDimCrossDiff', p.multiDimCrossDiff ?? 0.0);
                        set1f('u_multiDimInfluence', p.multiDimInfluence ?? 1.0);
                        break;
                    case 'excitable':
                        hasExcitable = true;
                        set1f('u_excitableThreshold', p.fnA ?? p.excitableThreshold ?? 0.7);
                        set1f('u_excitableEps', p.fnEpsilon ?? p.excitableEpsilon ?? 0.08);
                        set1f('u_excitableRecovery', p.fnB ?? p.excitableRecoveryRate ?? 0.8);
                        set1f('u_excitableSpeed', p.excitableWaveSpeed ?? 1.0);
                        set1f('u_excitableInfluence', p.fnInfluence ?? p.excitableInfluence ?? 0.8);
                        set1f('u_excitableStimulus', p.fnStimulus ?? 0.0);
                        break;
                    case 'reactionKinetics':
                        hasReaction = true;
                        set1f('u_bzEpsilon', p.oregonatorEps ?? p.bzEpsilon ?? 0.04);
                        set1f('u_bzMu', p.bzMu ?? 0.002);
                        set1f('u_bzQ', p.oregonatorQ ?? p.bzQ ?? 0.002);
                        set1f('u_bzF', p.oregonatorF ?? p.bzF ?? 1.0);
                        set1f('u_bzSpeed', p.reactionSpeed ?? p.bzSpeed ?? 1.0);
                        set1f('u_bzDiffusion', p.bzDiffusion ?? 0.2);
                        set1f('u_bzInfluence', p.reactionInfluence ?? p.bzInfluence ?? 1.0);
                        break;
                    case 'turbulence':
                        hasTurb = true;
                        set1f('u_turbScale', p.turbScale ?? 0.03);
                        set1f('u_turbSpeed', p.turbSpeed ?? 0.8);
                        set1f('u_turbStrength', (p.turbStrength ?? 1.2) * 20.0);
                        set1f('u_turbFeedback', p.turbFeedback ?? 1.0);
                        set1f('u_turbInfluence', p.turbInfluence ?? 1.0);
                        set1f('u_turbDirX', p.turbDirX ?? 0.0);
                        set1f('u_turbDirY', p.turbDirY ?? 0.0);
                        break;
                    case 'flow':
                        if (p.flowX !== undefined) set1f('u_flowX', p.flowX);
                        if (p.flowY !== undefined) set1f('u_flowY', p.flowY);
                        if (p.flowScale !== undefined) set1f('u_flowScale', p.flowScale);
                        break;
                    case 'gravity':
                        hasGravity = true;
                        set1f('u_gravityAngle', p.gravityAngle ?? 0);
                        set1f('u_gravityStrength', p.gravityStrength ?? 0.5);
                        set1f('u_gravityMassThreshold', p.gravityMassThreshold ?? 2.0);
                        break;
                }
            } else {
                hasPhysics = params.usePhysics !== false;
                hasGrayScott = !!params.useGrayScott;
                hasMultiDim = !!params.useMultiDim;
                hasGoL = !!params.useGoL;
                hasSoCA = !!params.useSoCA;
                hasGravity = !!params.useGravity;
                set1f('u_flowX', params.flowX ?? 0);
                set1f('u_flowY', params.flowY ?? 0);
                set1f('u_flowScale', params.flowScale ?? 1.0);
            }

            set1i('u_usePhysics', hasPhysics ? 1 : 0);
            set1i('u_useGrayScott', hasGrayScott ? 1 : 0);
            set1i('u_useLenia', hasLenia ? 1 : 0);
            set1i('u_usePhysarum', hasPhysarum ? 1 : 0);
            set1i('u_useLBM', hasLBM ? 1 : 0);
            set1i('u_useThermalConvection', hasThermal ? 1 : 0);
            set1i('u_useSurfaceTension', hasTension ? 1 : 0);
            set1i('u_useLGA', hasLGA ? 1 : 0);
            set1i('u_useFractal', hasFractal ? 1 : 0);
            set1i('u_useWalker', hasWalker ? 1 : 0);
            set1i('u_useChromatic', hasChromatic ? 1 : 0);
            set1i('u_useSharpen', hasSharpen ? 1 : 0);
            set1i('u_useElectricArcs', hasArcs ? 1 : 0);
            set1i('u_useCrystalSnowflake', hasCrystal ? 1 : 0);
            set1i('u_useSoCA', hasSoCA ? 1 : 0);
            set1i('u_useGoL', hasGoL ? 1 : 0);
            set1i('u_useVortex', hasVortex ? 1 : 0);
            set1i('u_useQuantumPhase', hasQuantum ? 1 : 0);
            set1i('u_useMultiDim', hasMultiDim ? 1 : 0);
            set1i('u_useExcitable', hasExcitable ? 1 : 0);
            set1i('u_useReactionKinetics', hasReaction ? 1 : 0);
            set1i('u_useTurbulence', hasTurb ? 1 : 0);
            set1i('u_useGravity', hasGravity ? 1 : 0);

            if (hasPhysarum && physarumParams) {
                if (!this.physarumEngine || this.physarumEngine.width !== this.width || this.physarumEngine.height !== this.height) {
                    this.physarumEngine = new PhysarumEngine(this.width, this.height, physarumParams.agentCount ?? 12000);
                    this._physarumTrailBuf = new Float32Array(this.width * this.height);
                    this._physarumUBuf = new Float32Array(this.width * this.height);
                }
                if (!this.slimeTexture) {
                    const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
                    const internalFormat = isWebGL2 ? (gl as WebGL2RenderingContext).RGBA32F : gl.RGBA;
                    this.slimeTexture = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_2D, this.slimeTexture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                }
                const coupling = typeof physarumParams.gridCoupling === 'number'
                    ? physarumParams.gridCoupling
                    : (physarumParams.gridCoupling === false ? 0.0 : 1.0);
                set1f('u_physarumGridCoupling', coupling);
                this.physarumEngine.stepDirect(this._physarumTrailBuf, this._physarumUBuf, {
                    ...physarumParams,
                    gridCoupling: coupling
                });

                const total = this.width * this.height;
                if (this._slimeUploadBuf.length !== total * 4) {
                    this._slimeUploadBuf = new Float32Array(total * 4);
                }
                const upload = this._slimeUploadBuf;
                const trail = this._physarumTrailBuf;
                const uBuf = this._physarumUBuf;
                for (let i = 0; i < total; i++) {
                    const base = i * 4;
                    upload[base] = uBuf[i];         // R: agent density
                    upload[base + 1] = trail[i];    // G: slime trail
                    upload[base + 2] = 0.0;
                    upload[base + 3] = 1.0;
                }
                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, this.slimeTexture);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, gl.RGBA, gl.FLOAT, upload);
                set1i('u_slimeTexture', 2);
                set1i('u_hasSlimeTexture', 1);
            } else {
                set1i('u_hasSlimeTexture', 0);
            }

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentIdx]);
            set1i('u_currentTexture', 0);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.prevTextures[prevIdx]);
            set1i('u_prevTexture', 1);

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[nextIdx]);

            const posLoc = gl.getAttribLocation(this.simProgram, 'a_position');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            this.currentIdx = nextIdx;
        }
    }

    // Render the current simulation state to the internal canvas at grid resolution with exact 1:1 color parity.
    renderToCanvas(
        colorMap: ColorMap,
        customConfig?: CustomColorConfig,
        rgbPostProcessing?: RGBPostProcessingConfig,
        reliefLighting?: ReliefLightingConfig
    ) {
        const gl = this.gl;
        if (!gl || !this.presentProgram || !this.isSupported) return;

        // Ensure internal canvas matches grid resolution
        if (this.canvas.width !== this.width || this.canvas.height !== this.height) {
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        }

        gl.viewport(0, 0, this.width, this.height);
        gl.useProgram(this.presentProgram);

        const set1f = (n: string, v: number) => {
            const loc = this.getCachedUniformLocation(this.presentProgram!, n);
            if (loc) gl.uniform1f(loc, v);
        };
        const set1i = (n: string, v: number) => {
            const loc = this.getCachedUniformLocation(this.presentProgram!, n);
            if (loc) gl.uniform1i(loc, v);
        };
        const set2f = (n: string, x: number, y: number) => {
            const loc = this.getCachedUniformLocation(this.presentProgram!, n);
            if (loc) gl.uniform2f(loc, x, y);
        };
        const set3f = (n: string, x: number, y: number, z: number) => {
            const loc = this.getCachedUniformLocation(this.presentProgram!, n);
            if (loc) gl.uniform3f(loc, x, y, z);
        };

        set2f('u_gridResolution', this.width, this.height);

        let mapIdx = 0;
        if (colorMap === 'electric') mapIdx = 1;
        else if (colorMap === 'bio') mapIdx = 2;
        else if (colorMap === 'thermal') mapIdx = 3;
        else if (colorMap === 'rgb') mapIdx = 4;
        else if (colorMap === 'custom') {
            if (customConfig && customConfig.mode === 'rgb') {
                mapIdx = 5;
            } else {
                mapIdx = 6;
            }
        }
        set1i('u_colorMap', mapIdx);

        if (customConfig) {
            if (customConfig.mode === 'rgb') {
                set3f('u_rgbMultipliers', customConfig.rgbMultipliers.r, customConfig.rgbMultipliers.g, customConfig.rgbMultipliers.b);
                set3f('u_rgbBias', customConfig.rgbBias.r, customConfig.rgbBias.g, customConfig.rgbBias.b);
            } else if (customConfig.scalarGradient && customConfig.scalarGradient.length > 0) {
                const stops = [...customConfig.scalarGradient].sort((a, b) => a.pos - b.pos).slice(0, 8);
                set1i('u_gradCount', stops.length);
                for (let s = 0; s < stops.length; s++) {
                    const rgb = hexToVec3(stops[s].color);
                    set3f(`u_gradColors[${s}]`, rgb[0], rgb[1], rgb[2]);
                    set1f(`u_gradPositions[${s}]`, stops[s].pos);
                }
            }
        }

        // Post-Processing
        const pp = rgbPostProcessing;
        set1f('u_exposure', pp?.exposure ?? 1.0);
        set1f('u_contrast', pp?.contrast ?? 1.0);
        set1f('u_gamma', pp?.gamma ?? 1.0);
        set1f('u_saturation', pp?.saturation ?? 1.0);
        set1f('u_brightness', pp?.brightness ?? 0.0);
        set3f('u_tint', pp?.tint?.r ?? 1.0, pp?.tint?.g ?? 1.0, pp?.tint?.b ?? 1.0);

        // Surface Relief
        const isRelief = reliefLighting?.enabled ?? false;
        set1i('u_reliefEnabled', isRelief ? 1 : 0);
        if (isRelief) {
            set1f('u_reliefBump', reliefLighting?.bump ?? 1.0);
            set1f('u_reliefSpecular', reliefLighting?.specular ?? 1.2);
            set1f('u_reliefLightAngle', reliefLighting?.lightAngle ?? 0.8);
            set1f('u_reliefFresnel', reliefLighting?.fresnel ?? 0.6);
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentIdx]);
        const locTex = this.getCachedUniformLocation(this.presentProgram, 'u_simTexture');
        if (locTex) gl.uniform1i(locTex, 0);

        // Render to default WebGL canvas framebuffer at grid resolution
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        const posLoc = gl.getAttribLocation(this.presentProgram, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // Convert current scalar concentrations to direct RGB simulation channels using active colormap
    bakeColorMapToRGB(prevColorMap: ColorMap, customConfig?: CustomColorConfig) {
        const gl = this.gl;
        if (!gl || !this.presentProgram || !this.isSupported || prevColorMap === 'rgb') return;

        const nextIdx = (this.currentIdx + 1) % 2;
        gl.viewport(0, 0, this.width, this.height);
        gl.useProgram(this.presentProgram);

        const set1f = (n: string, v: number) => {
            const loc = this.getCachedUniformLocation(this.presentProgram!, n);
            if (loc) gl.uniform1f(loc, v);
        };
        const set1i = (n: string, v: number) => {
            const loc = this.getCachedUniformLocation(this.presentProgram!, n);
            if (loc) gl.uniform1i(loc, v);
        };
        const set2f = (n: string, x: number, y: number) => {
            const loc = this.getCachedUniformLocation(this.presentProgram!, n);
            if (loc) gl.uniform2f(loc, x, y);
        };
        const set3f = (n: string, x: number, y: number, z: number) => {
            const loc = this.getCachedUniformLocation(this.presentProgram!, n);
            if (loc) gl.uniform3f(loc, x, y, z);
        };

        set2f('u_gridResolution', this.width, this.height);

        let mapIdx = 0;
        if (prevColorMap === 'electric') mapIdx = 1;
        else if (prevColorMap === 'bio') mapIdx = 2;
        else if (prevColorMap === 'thermal') mapIdx = 3;
        else if (prevColorMap === 'custom') {
            if (customConfig && customConfig.mode === 'rgb') mapIdx = 5;
            else mapIdx = 6;
        }
        set1i('u_colorMap', mapIdx);

        if (customConfig) {
            if (customConfig.mode === 'rgb') {
                set3f('u_rgbMultipliers', customConfig.rgbMultipliers.r, customConfig.rgbMultipliers.g, customConfig.rgbMultipliers.b);
                set3f('u_rgbBias', customConfig.rgbBias.r, customConfig.rgbBias.g, customConfig.rgbBias.b);
            } else if (customConfig.scalarGradient && customConfig.scalarGradient.length > 0) {
                const stops = [...customConfig.scalarGradient].sort((a, b) => a.pos - b.pos).slice(0, 8);
                set1i('u_gradCount', stops.length);
                for (let s = 0; s < stops.length; s++) {
                    const rgb = hexToVec3(stops[s].color);
                    set3f(`u_gradColors[${s}]`, rgb[0], rgb[1], rgb[2]);
                    set1f(`u_gradPositions[${s}]`, stops[s].pos);
                }
            }
        }

        // Standard 1:1 bake without extra post-processing distortion
        set1f('u_exposure', 1.0);
        set1f('u_contrast', 1.0);
        set1f('u_gamma', 1.0);
        set1f('u_saturation', 1.0);
        set1f('u_brightness', 0.0);
        set3f('u_tint', 1.0, 1.0, 1.0);
        set1i('u_reliefEnabled', 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentIdx]);
        const locTex = this.getCachedUniformLocation(this.presentProgram, 'u_simTexture');
        if (locTex) gl.uniform1i(locTex, 0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[nextIdx]);

        const posLoc = gl.getAttribLocation(this.presentProgram, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        this.currentIdx = nextIdx;
        this.tick++;
    }
}
