import * as THREE from 'three';
import { ThoughtType, ThoughtNode } from '../types';
import { getPlanetRingTexture } from './planetTextures';

/**
 * STRICT 60:30:20 ASTRAL COLOR MATRIX
 * 60% Bright Clean White (#FFFFFF): Main UI card background fills, primary buttons, panel headers, card text, icons, and active UI highlights.
 * 30% Deep Electric Purple (#6D28D9 / #7C3AED): Secondary accents, glowing border strokes, active tab indicators, and slider tracks/thumbs.
 * 20% Obsidian Black (#090A0F / #000000): Dark contrast text, subtle panel drop shadows (rgba(0,0,0,0.8)), and dark button labels on white cards.
 * 
 * Main 3D space canvas: Pure obsidian cosmic void (#030508) with glowing central celestial star, planetary thought nodes, faint orbital tracks, and white synapse sparks (#FFFFFF).
 */
export const PALETTE = {
  astral: {
    white: '#FFFFFF',
    purple: '#7C3AED',
    deepPurple: '#6D28D9',
    lightPurple: '#A855F7',
    black: '#090A0F',
    trueBlack: '#000000',
    purpleGlow: 'rgba(124, 58, 237, 0.45)',
  },
  void: {
    deep: 0x030508, // Pure deep space obsidian
    canvas: 0x030508,
    surface: 0x0a0e17,
    fog: 0x030508,
  },
  graphite: {
    dark: 0x0f1420,
    base: 0x141b2b,
    border: 0x1e2638,
    steelText: '#64748B',
    steelColor: 0x64748b,
    dimmedNode: 0x141b28,
    edgeLine: 0x1e2638,
  },
  accents: {
    gold: {
      hex: '#F59E0B',
      glowHex: '#D97706',
      three: new THREE.Color('#F59E0B'),
      glowThree: new THREE.Color('#D97706'),
      label: 'Physics & Cosmology',
    },
    teal: {
      hex: '#14B8A6',
      glowHex: '#0D9488',
      three: new THREE.Color('#14B8A6'),
      glowThree: new THREE.Color('#0D9488'),
      label: 'Philosophy & Ethics',
    },
    violet: {
      hex: '#C084FC',
      glowHex: '#9333EA',
      three: new THREE.Color('#C084FC'),
      glowThree: new THREE.Color('#9333EA'),
      label: 'Code & AI Architecture',
    },
    amber: {
      hex: '#FBBF24',
      glowHex: '#D97706',
      three: new THREE.Color('#FBBF24'),
      glowThree: new THREE.Color('#D97706'),
      label: 'Diary & Timeline',
    },
    cyan: {
      hex: '#22D3EE',
      glowHex: '#0891B2',
      three: new THREE.Color('#22D3EE'),
      glowThree: new THREE.Color('#0891B2'),
      label: 'Goals & Milestones',
    },
    textbook: {
      hex: '#38BDF8',
      glowHex: '#0284C7',
      three: new THREE.Color('#38BDF8'),
      glowThree: new THREE.Color('#0284C7'),
      label: 'Textbook & PDF',
    },
  },
} as const;

export type AccentTheme = typeof PALETTE.accents[keyof typeof PALETTE.accents];

export const NODE_TYPE_ACCENT_MAP: Record<ThoughtType, AccentTheme> = {
  note: PALETTE.accents.violet,
  diary: PALETTE.accents.amber,
  goal: PALETTE.accents.cyan,
};

export function getNodeTheme(thought: ThoughtNode): AccentTheme {
  if (thought.isTextbook) return PALETTE.accents.textbook;

  const cleanTags = (thought.tags || []).map(t => t.replace(/^#/, '').toLowerCase());
  const folder = (thought.folder || '').toLowerCase();

  if (cleanTags.includes('physics') || cleanTags.includes('quantum') || cleanTags.includes('space') || folder.includes('physics')) {
    return PALETTE.accents.gold;
  }
  if (cleanTags.includes('philosophy') || cleanTags.includes('ethics') || cleanTags.includes('mind') || folder.includes('philosophy')) {
    return PALETTE.accents.teal;
  }
  if (cleanTags.includes('code') || cleanTags.includes('graphics') || cleanTags.includes('ai') || folder.includes('code')) {
    return PALETTE.accents.violet;
  }

  return NODE_TYPE_ACCENT_MAP[thought.type] || PALETTE.accents.violet;
}

// ---------------------------------------------------------------------------
// 0. Central Star Nucleus (Neural Core) Shaders & Materials (Dynamic Thought-Gradient)
// ---------------------------------------------------------------------------
export interface CategoryColorRatios {
  physics: number;    // Physics (Gold: #F59E0B)
  philosophy: number; // Philosophy (Teal: #14B8A6)
  code: number;       // Code / Graphics / AI (Electric Violet: #7C3AED)
  aux: number;        // Diary, Goals, Textbooks
}

const CentralStarShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      vec4 mvPosition = viewMatrix * worldPos;
      vViewDir = normalize(-mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorPhysics;     // Solar Gold (#F59E0B)
    uniform vec3 uColorPhilosophy;  // Ethereal Teal (#14B8A6)
    uniform vec3 uColorCode;        // Electric Violet (#7C3AED)
    uniform vec3 uColorAux;         // Aux / Cyan (#06B6D4)
    uniform vec4 uCategoryRatios;   // (physics, philosophy, code, aux)
    uniform float uEmissiveIntensity; // 40% emissive glow cap

    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      // Normalize active category ratios
      float rPhys = max(0.005, uCategoryRatios.x);
      float rPhil = max(0.005, uCategoryRatios.y);
      float rCode = max(0.005, uCategoryRatios.z);
      float rAux  = max(0.005, uCategoryRatios.w);
      float total = rPhys + rPhil + rCode + rAux;

      float p1 = rPhys / total;
      float p2 = p1 + (rPhil / total);
      float p3 = p2 + (rCode / total);

      // Spherical coordinate angle across the sphere surface
      float phi = atan(vNormal.z, vNormal.x) / 6.2831853 + 0.5; // [0, 1]
      float theta = vNormal.y * 0.5 + 0.5;                      // [0, 1]

      // Swirling animated plasma turbulence
      float swirl = sin(phi * 6.283 + uTime * 0.35) * 0.08 + cos(theta * 6.283 - uTime * 0.25) * 0.06;
      float coord = fract(phi + uTime * 0.02 + swirl);

      // Proportional multi-category chromatic blend across the sphere:
      // Physics (Gold), Philosophy (Teal), and Code/Graphics (Electric Violet)
      float w = 0.08;
      vec3 col;
      if (coord < p1) {
        float t = smoothstep(max(0.0, p1 - w), p1, coord);
        col = mix(uColorPhysics, uColorPhilosophy, t);
      } else if (coord < p2) {
        float t = smoothstep(p2 - w, p2, coord);
        col = mix(uColorPhilosophy, uColorCode, t);
      } else if (coord < p3) {
        float t = smoothstep(p3 - w, p3, coord);
        col = mix(uColorCode, uColorAux, t);
      } else {
        float t = smoothstep(1.0 - w, 1.0, coord);
        col = mix(uColorAux, uColorPhysics, t);
      }

      // Animated surface plasma waves
      float wave = sin(vUv.x * 22.0 + uTime * 1.1) * cos(vUv.y * 22.0 - uTime * 0.85);
      vec3 surfaceCol = col * (0.86 + 0.26 * wave);

      // Soft limb brightening / Fresnel rim
      float NdotV = max(0.0, dot(vNormal, vViewDir));
      float rim = pow(1.0 - NdotV, 2.0);

      // Luminous stellar core fusion highlight
      vec3 coreHotspot = mix(surfaceCol, vec3(1.0, 0.96, 0.88), rim * 0.32 + 0.12 * sin(uTime * 1.6));

      // Strictly calibrated 40% emissive glow (uEmissiveIntensity = 0.40)
      vec3 finalColor = coreHotspot * uEmissiveIntensity;
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

export function createCentralStarMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: CentralStarShader.vertexShader,
    fragmentShader: CentralStarShader.fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uColorPhysics: { value: new THREE.Color('#f59e0b') },    // Solar Gold (#F59E0B)
      uColorPhilosophy: { value: new THREE.Color('#14b8a6') }, // Ethereal Teal (#14B8A6)
      uColorCode: { value: new THREE.Color('#7c3aed') },       // Electric Violet (#7C3AED)
      uColorAux: { value: new THREE.Color('#06b6d4') },        // Cyan / Aux (#06B6D4)
      uCategoryRatios: { value: new THREE.Vector4(0.33, 0.33, 0.34, 0.0) }, // Dynamic ratios
      uEmissiveIntensity: { value: 0.40 },                    // 40% Emissive Glow
    },
    transparent: false,
  });
}

const StarCoronaShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = viewMatrix * modelMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uCoronaTint;
    varying vec3 vNormal;
    varying vec3 vViewDir;

    void main() {
      float NdotV = max(0.0, dot(vNormal, vViewDir));
      float fresnel = pow(1.0 - NdotV, 2.5);

      // Gentle coronal breathing pulse
      float flare = 0.85 + 0.15 * sin(uTime * 2.0);
      vec3 color = mix(uCoronaTint, vec3(1.0, 0.95, 0.80), fresnel * 0.35);
      float alpha = fresnel * flare * 0.40;

      // Soft coronal atmosphere with 40% intensity limit
      gl_FragColor = vec4(color * 0.40, alpha * 0.40);
    }
  `,
};

export function createCentralStarCoronaMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: StarCoronaShader.vertexShader,
    fragmentShader: StarCoronaShader.fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uCoronaTint: { value: new THREE.Color('#a855f7') }, // Dynamic tint matched to vault
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
}

// ---------------------------------------------------------------------------
// 0c. Neural Core Tether Material (Dedicated Glowing Synapses to Center)
// ---------------------------------------------------------------------------
export function createNeuralCoreTetherMaterial(options: {
  isHighlighted?: boolean;
  isDimmed?: boolean;
} = {}): THREE.LineBasicMaterial {
  const { isHighlighted = false, isDimmed = false } = options;

  if (isDimmed) {
    return new THREE.LineBasicMaterial({
      color: 0x422006,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    });
  }

  if (isHighlighted) {
    return new THREE.LineBasicMaterial({
      color: 0xfef08a, // Radiant yellow-white
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  return new THREE.LineBasicMaterial({
    color: 0xeab308, // Glowing golden radial synapse line
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

// ---------------------------------------------------------------------------
// 0d. Tag-Based Orbital Shell Rings (Faint Glowing Purple/Cyan Bands)
// ---------------------------------------------------------------------------
export function createTagOrbitalRingMaterial(
  colorHex: string = '#7c3aed',
  options: { isHighlighted?: boolean } = {}
): THREE.LineBasicMaterial {
  const { isHighlighted = false } = options;
  return new THREE.LineBasicMaterial({
    color: new THREE.Color(colorHex),
    transparent: true,
    opacity: isHighlighted ? 0.65 : 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

// ---------------------------------------------------------------------------
// 0b. Planetary Ring & Orbital Track Materials
// ---------------------------------------------------------------------------
export function createPlanetaryRingMaterial(thought: ThoughtNode, isSelected: boolean = false): THREE.MeshBasicMaterial {
  const theme = getNodeTheme(thought);
  const ringTexture = getPlanetRingTexture(theme.hex);

  return new THREE.MeshBasicMaterial({
    map: ringTexture,
    color: isSelected ? new THREE.Color('#ffffff') : theme.three.clone(),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: isSelected ? 0.95 : 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function createOrbitalPathMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: 0x7c3aed, // Deep electric purple
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

// ---------------------------------------------------------------------------
// 1. Planetary Textured Physical Material
// ---------------------------------------------------------------------------
export function createPlanetPhysicalMaterial(
  thought: ThoughtNode,
  texture: THREE.Texture,
  options: {
    isSelected?: boolean;
    isMatch?: boolean;
    isDimmed?: boolean;
  } = {}
): THREE.MeshPhysicalMaterial {
  const theme = getNodeTheme(thought);
  const { isSelected = false, isMatch = false, isDimmed = false } = options;

  let emissiveColor = theme.glowThree.clone();
  let emissiveIntensity = 0.35;
  let roughness = 0.42;
  let metalness = 0.15;
  let clearcoat = 0.7;
  let clearcoatRoughness = 0.18;
  let opacity = 1.0;

  if (isDimmed) {
    emissiveColor = new THREE.Color(0x05070a);
    emissiveIntensity = 0.02;
    roughness = 0.9;
    metalness = 0.05;
    clearcoat = 0.0;
    opacity = 0.22;
  } else if (isSelected) {
    emissiveColor = theme.three.clone();
    emissiveIntensity = 0.42; // Capped to prevent canvas bloom blowout while staying luminous
    roughness = 0.15;
    metalness = 0.35;
    clearcoat = 1.0;
    clearcoatRoughness = 0.05;
  } else if (isMatch) {
    emissiveColor = theme.three.clone();
    emissiveIntensity = 0.65;
    roughness = 0.25;
  }

  return new THREE.MeshPhysicalMaterial({
    map: texture,
    emissive: emissiveColor,
    emissiveIntensity,
    roughness,
    metalness,
    clearcoat,
    clearcoatRoughness,
    transparent: isDimmed,
    opacity,
    depthWrite: !isDimmed,
    envMapIntensity: 1.2,
  });
}

// ---------------------------------------------------------------------------
// 1. MeshPhysicalMaterial Matrix (PBR + High-Luminance Emissive for Bloom)
// ---------------------------------------------------------------------------
export function createNodePhysicalMaterial(
  thought: ThoughtNode,
  options: {
    isSelected?: boolean;
    isMatch?: boolean;
    isDimmed?: boolean;
  } = {}
): THREE.MeshPhysicalMaterial {
  const theme = getNodeTheme(thought);
  const { isSelected = false, isMatch = false, isDimmed = false } = options;

  let baseColor = theme.three.clone();
  let emissiveColor = theme.glowThree.clone();
  let emissiveIntensity = 1.35;
  let roughness = 0.18;
  let metalness = 0.22;
  let clearcoat = 1.0;
  let clearcoatRoughness = 0.12;
  let opacity = 1.0;

  if (isDimmed) {
    baseColor = new THREE.Color(PALETTE.graphite.dimmedNode);
    emissiveColor = new THREE.Color(0x05070a);
    emissiveIntensity = 0.04;
    roughness = 0.85;
    metalness = 0.05;
    clearcoat = 0.0;
    opacity = 0.20; // Strictly drops to 20% opacity for non-matching nodes
  } else if (isSelected) {
    baseColor = theme.three.clone();
    emissiveColor = theme.glowThree.clone();
    emissiveIntensity = 1.25; // Controlled to avoid bloom blinding blowout
    roughness = 0.18;
    metalness = 0.35;
    clearcoat = 1.0;
    clearcoatRoughness = 0.05;
  } else if (isMatch) {
    baseColor = theme.three.clone();
    emissiveColor = theme.glowThree.clone();
    emissiveIntensity = 2.8;
    roughness = 0.1;
  } else if (thought.isTextbook) {
    emissiveIntensity = 1.9;
    roughness = 0.12;
    metalness = 0.3;
  }

  return new THREE.MeshPhysicalMaterial({
    color: baseColor,
    emissive: emissiveColor,
    emissiveIntensity,
    roughness,
    metalness,
    clearcoat,
    clearcoatRoughness,
    transparent: isDimmed,
    opacity,
    depthWrite: !isDimmed,
    envMapIntensity: 1.2,
  });
}

// ---------------------------------------------------------------------------
// 2. Custom GLSL Atmosphere Aura Shader around Nodes
//    Pulses subtly using time uniforms (uTime) with Fresnel edge falloff
// ---------------------------------------------------------------------------
const AuraShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      vec4 mvPosition = viewMatrix * worldPos;
      vViewDir = normalize(-mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform vec3 uGlowColor;
    uniform float uTime;
    uniform float uPulseOffset;
    uniform float uIntensity;
    uniform float uFresnelPower;

    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      // Fresnel edge calculation for atmospheric limb brightening
      float NdotV = max(0.0, dot(vNormal, vViewDir));
      float fresnel = pow(1.0 - NdotV, uFresnelPower);

      // Subtle atmospheric pulsation using time uniform uTime
      float primaryPulse = 0.82 + 0.18 * sin(uTime * 2.4 + uPulseOffset);
      float microCorona = 0.9 + 0.1 * cos(uTime * 3.8 + uPulseOffset * 1.6);

      // Gradient from inner core color to radiant outer glow color
      vec3 atmosphericTint = mix(uColor, uGlowColor, fresnel * 0.85);

      // Controlled luminance so selective bloom on active nodes does not wash out canvas
      vec3 finalColor = atmosphericTint * (0.85 + fresnel * 0.55 * microCorona);

      float alpha = fresnel * primaryPulse * uIntensity;
      alpha = clamp(alpha, 0.0, 1.0);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

export function createAuraShaderMaterial(
  thought: ThoughtNode,
  options: {
    intensityMultiplier?: number;
    pulseOffset?: number;
    isSelected?: boolean;
    isMatch?: boolean;
  } = {}
): THREE.ShaderMaterial {
  const theme = getNodeTheme(thought);
  const {
    intensityMultiplier = 1.0,
    pulseOffset = 0.0,
    isSelected = false,
    isMatch = false,
  } = options;

  const baseIntensity = isSelected ? 0.60 : isMatch ? 0.55 : 0.38;
  const intensity = baseIntensity * intensityMultiplier;

  return new THREE.ShaderMaterial({
    vertexShader: AuraShader.vertexShader,
    fragmentShader: AuraShader.fragmentShader,
    uniforms: {
      uColor: { value: theme.three.clone() },
      uGlowColor: { value: theme.glowThree.clone() },
      uTime: { value: 0 },
      uPulseOffset: { value: pulseOffset },
      uIntensity: { value: intensity },
      uFresnelPower: { value: isSelected ? 2.0 : 2.6 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

// ---------------------------------------------------------------------------
// 3. Spotlight Beacon Procedural Shader:
//    #FFFFFF Radiant Core with Atmospheric Cyan/Violet Edge Halo
// ---------------------------------------------------------------------------
const SpotlightBeamShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPosition.xyz;
      vec4 mvPosition = viewMatrix * worldPosition;
      vViewDir = normalize(-mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uHaloCyan;
    uniform vec3 uHaloViolet;
    uniform float uBaseIntensity;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;

    void main() {
      // vUv.y: 0.0 at base (node center), 1.0 at sky beacon apex
      float height = vUv.y;

      // Vertical atmospheric attenuation (smooth quadratic fade to sky apex)
      float verticalFade = pow(clamp(1.0 - height, 0.0, 1.0), 1.35);

      // Core alignment: View ray grazing cylinder center produces luminous laser beam
      float rim = 1.0 - abs(dot(vNormal, vViewDir));
      float coreFactor = pow(clamp(rim, 0.0, 1.0), 5.5);

      // Cyan-to-violet volumetric atmospheric sheath gradient
      float gradientMix = clamp(height * 1.4 + 0.15 * sin(uTime * 2.0), 0.0, 1.0);
      vec3 atmosphericHalo = mix(uHaloCyan, uHaloViolet, gradientMix);

      // Dynamic upward harmonic energy ripples along the beacon
      float ripple = sin(height * 28.0 - uTime * 6.5) * 0.12;
      float microPulse = sin(height * 60.0 - uTime * 12.0) * 0.06;

      // Pure White (#FFFFFF) Radiant Core blend
      vec3 pureWhite = vec3(1.0, 1.0, 1.0);
      vec3 beamColor = mix(atmosphericHalo, pureWhite, coreFactor * 0.92);

      // Core intensity + soft atmospheric glow
      float pulseIntensity = 0.85 + 0.18 * sin(uTime * 3.8);
      float alpha = (coreFactor * 0.95 + pow(rim, 2.0) * 0.45 + ripple + microPulse)
                    * verticalFade
                    * pulseIntensity
                    * uBaseIntensity;

      alpha = clamp(alpha, 0.0, 1.0);

      gl_FragColor = vec4(beamColor * (1.1 + coreFactor * 0.6), alpha);
    }
  `,
};

export function createSpotlightBeaconMaterial(intensity = 1.0): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: SpotlightBeamShader.vertexShader,
    fragmentShader: SpotlightBeamShader.fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uHaloCyan: { value: PALETTE.accents.cyan.three.clone() },
      uHaloViolet: { value: PALETTE.accents.violet.glowThree.clone() },
      uBaseIntensity: { value: intensity },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

// ---------------------------------------------------------------------------
// 4. Procedural Ground Aura Ripple Disk (Expanding wave halo under beacon)
// ---------------------------------------------------------------------------
const GroundRippleShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;

    varying vec2 vUv;

    void main() {
      // Center coordinates (-1 to 1)
      vec2 p = vUv * 2.0 - 1.0;
      float dist = length(p);
      if (dist > 1.0) discard;

      // Concentric expanding shockwaves
      float wave1 = sin(dist * 18.0 - uTime * 4.0);
      float wave2 = cos(dist * 30.0 - uTime * 6.5);
      float ring = smoothstep(0.0, 0.95, 1.0 - dist) * pow(clamp(wave1 * 0.5 + 0.5, 0.0, 1.0), 2.5);

      vec3 color = mix(uColorA, uColorB, dist);
      float alpha = ring * (1.0 - dist) * 0.85;

      gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
    }
  `,
};

export function createGroundRippleMaterial(
  colorA: THREE.Color = PALETTE.accents.cyan.three,
  colorB: THREE.Color = PALETTE.accents.violet.glowThree
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: GroundRippleShader.vertexShader,
    fragmentShader: GroundRippleShader.fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: colorA.clone() },
      uColorB: { value: colorB.clone() },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

// ---------------------------------------------------------------------------
// 5. Flowing Synaptic Edge Lines & Particle Trail Materials
// ---------------------------------------------------------------------------
export function createSynapseEdgeMaterial(
  similarity: number,
  options: {
    isDimmed?: boolean;
    isHighlighted?: boolean;
    accentColor?: THREE.Color;
  } = {}
): THREE.LineBasicMaterial {
  const { isDimmed = false, isHighlighted = false, accentColor } = options;

  if (isDimmed) {
    return new THREE.LineBasicMaterial({
      color: 0x111622,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    });
  }

  if (isHighlighted) {
    return new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  // Smooth blend from Kinetic Graphite (#1E2638) up to Cyan/Violet resonance based on similarity
  const resonanceColor = similarity > 0.62 ? PALETTE.accents.cyan.three : PALETTE.accents.violet.three;
  const baseColor = accentColor
    ? accentColor.clone()
    : new THREE.Color(PALETTE.graphite.edgeLine).lerp(resonanceColor, similarity * 0.75);

  const opacity = Math.min(0.88, 0.18 + similarity * 0.70);

  return new THREE.LineBasicMaterial({
    color: baseColor,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function createSynapseSparkMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

// ---------------------------------------------------------------------------
export { SpotlightBeacon, type SpotlightBeaconOptions } from './spotlightBeacon';
// ---------------------------------------------------------------------------
export function updateVisualUniforms(rootObject: THREE.Object3D, elapsedTime: number) {
  rootObject.traverse(child => {
    if (child instanceof THREE.Mesh && child.material) {
      const mat = child.material;
      if (mat instanceof THREE.ShaderMaterial && mat.uniforms && mat.uniforms.uTime) {
        mat.uniforms.uTime.value = elapsedTime;
      }
    }
  });
}
