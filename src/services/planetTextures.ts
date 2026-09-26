import * as THREE from 'three';
import { ThoughtNode, ThoughtType } from '../types';

/**
 * Procedural Alien Planet Texture Generator
 * Generates custom procedural planet surface textures and planetary ring textures
 * onto HTML5 canvas and converts them to THREE.CanvasTexture.
 */

// Texture cache to prevent redundant canvas operations
const textureCache = new Map<string, THREE.CanvasTexture>();
const ringTextureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Simple pseudo-random hash generator based on string seed
 */
function seedHash(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generates a procedural surface texture for an alien planet
 */
export function getPlanetTexture(thought: ThoughtNode): THREE.CanvasTexture {
  const cacheKey = `${thought.id}-${thought.type}-${thought.isTextbook ? 'tb' : 'norm'}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    return fallback;
  }

  const hash = seedHash(thought.id || thought.title);
  const cleanTags = (thought.tags || []).map(t => t.replace(/^#/, '').toLowerCase());
  const isPhysics = cleanTags.includes('physics') || cleanTags.includes('quantum') || cleanTags.includes('space') || (thought.folder && thought.folder.toLowerCase().includes('physics'));
  const isPhilosophy = cleanTags.includes('philosophy') || cleanTags.includes('ethics') || cleanTags.includes('mind') || (thought.folder && thought.folder.toLowerCase().includes('philosophy'));
  const isCode = cleanTags.includes('code') || cleanTags.includes('graphics') || cleanTags.includes('ai') || (thought.folder && thought.folder.toLowerCase().includes('code'));

  if (thought.isTextbook) {
    // Gas Giant with deep indigo & cyan bands + great storm eye
    drawBandedGasGiant(ctx, ['#1e1b4b', '#312e81', '#4338ca', '#0284c7', '#38bdf8', '#0f172a'], hash);
  } else if (isPhysics) {
    // Physics & Cosmology: Stellar Gold, Solar Granulation & Warm Plasma Dunes
    drawDesertDunePlanet(ctx, ['#451a03', '#78350f', '#b45309', '#f59e0b', '#fbbf24', '#fef3c7'], hash);
  } else if (isPhilosophy) {
    // Philosophy & Mind: Ethereal Teal, Deep Oceanic Trenches & Lucid Bioluminescence
    drawBioluminescentPlanet(ctx, ['#042f2e', '#0f766e', '#14b8a6', '#2dd4bf', '#99f6e4'], hash);
  } else if (isCode) {
    // Computer Science & AI: Electric Violet & Amethyst Cyber Crystal Architecture
    drawCrystalPurplePlanet(ctx, ['#1e1035', '#3b0764', '#581c87', '#7c3aed', '#a855f7', '#e9d5ff'], hash);
  } else if (thought.type === 'goal') {
    // Bioluminescent Ocean & Cyber Islands (Cyan / Emerald / Deep Obsidian)
    drawBioluminescentPlanet(ctx, ['#022c22', '#064e3b', '#0891b2', '#22d3ee', '#67e8f9'], hash);
  } else if (thought.type === 'diary') {
    // Stellar Amber & Golden Dunes (Amber / Warm Gold / Molten Sunset)
    drawDesertDunePlanet(ctx, ['#451a03', '#78350f', '#b45309', '#f59e0b', '#fbbf24', '#fef3c7'], hash);
  } else {
    // Deep Purple & Amethyst Crystal Planet (Electric Violet / Deep Purple / Astral Nebula)
    drawCrystalPurplePlanet(ctx, ['#1e1035', '#3b0764', '#581c87', '#7c3aed', '#a855f7', '#e9d5ff'], hash);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * 1. Banded Gas Giant Planet (Turbulent cloud latitudinal bands)
 */
function drawBandedGasGiant(ctx: CanvasRenderingContext2D, colors: string[], hash: number) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  // Base background
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, w, h);

  // Horizontal cloud bands with harmonic sin waves
  const bands = 28;
  for (let b = 0; b < bands; b++) {
    const y = (b / bands) * h;
    const bandHeight = (h / bands) * 1.5;
    const colorIndex = (b + (hash % 3)) % colors.length;
    
    ctx.fillStyle = colors[colorIndex];
    ctx.beginPath();
    ctx.moveTo(0, y);

    for (let x = 0; x <= w; x += 16) {
      const wave1 = Math.sin((x / w) * Math.PI * 8 + b * 0.45) * 4;
      const wave2 = Math.cos((x / w) * Math.PI * 16 + b * 0.9) * 2;
      ctx.lineTo(x, y + wave1 + wave2);
    }

    ctx.lineTo(w, y + bandHeight);
    ctx.lineTo(0, y + bandHeight);
    ctx.closePath();
    ctx.globalAlpha = 0.75 + 0.2 * Math.sin(b);
    ctx.fill();
  }

  // Giant planetary storm oval (Great Eye)
  ctx.globalAlpha = 0.9;
  const stormX = (hash * 37) % (w - 80) + 40;
  const stormY = (hash * 19) % (h - 60) + 30;
  const radGrad = ctx.createRadialGradient(stormX, stormY, 4, stormX, stormY, 28);
  radGrad.addColorStop(0, '#ffffff');
  radGrad.addColorStop(0.3, colors[colors.length - 1]);
  radGrad.addColorStop(0.7, colors[1]);
  radGrad.addColorStop(1, 'transparent');

  ctx.fillStyle = radGrad;
  ctx.beginPath();
  ctx.ellipse(stormX, stormY, 32, 16, Math.PI / 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1.0;
}

/**
 * 2. Bioluminescent Planet (Deep ocean with glowing algorithmic continents)
 */
function drawBioluminescentPlanet(ctx: CanvasRenderingContext2D, colors: string[], hash: number) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  // Deep oceanic base
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, w, h);

  // Continent blobs
  const continentCount = 9;
  for (let c = 0; c < continentCount; c++) {
    const cx = ((hash * (c + 1) * 73) % (w - 60)) + 30;
    const cy = ((hash * (c + 1) * 47) % (h - 60)) + 30;
    const rad = 25 + ((hash * (c + 1)) % 45);

    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
    grad.addColorStop(0, colors[3]); // Vibrant cyan core
    grad.addColorStop(0.4, colors[2]);
    grad.addColorStop(0.8, colors[1]);
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();

    // Bioluminescent coastline cracks
    ctx.strokeStyle = colors[4];
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.75, 0, Math.PI * 1.5);
    ctx.stroke();
  }

  // Atmospheric cloud wisps
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  for (let i = 0; i < 6; i++) {
    const wy = (i / 6) * h + 15;
    ctx.fillRect(0, wy, w, 8);
  }
}

/**
 * 3. Desert & Molten Golden Dune Planet (Amber / Gold)
 */
function drawDesertDunePlanet(ctx: CanvasRenderingContext2D, colors: string[], hash: number) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, w, h);

  const dunes = 20;
  for (let d = 0; d < dunes; d++) {
    const y = (d / dunes) * h;
    const cIdx = (d + (hash % 2)) % colors.length;
    ctx.fillStyle = colors[cIdx];

    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 20) {
      const dy = Math.sin((x / w) * Math.PI * 6 + d * 1.2) * 8;
      ctx.lineTo(x, y + dy);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.globalAlpha = 0.7;
    ctx.fill();
  }

  // Molten glowing fissures
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = colors[colors.length - 1];
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 5; k++) {
    const sx = ((hash * (k + 3) * 53) % w);
    const sy = ((hash * (k + 2) * 31) % h);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 35, sy + 15);
    ctx.lineTo(sx + 70, sy - 5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;
}

/**
 * 4. Deep Amethyst & Electric Purple Crystal Planet
 */
function drawCrystalPurplePlanet(ctx: CanvasRenderingContext2D, colors: string[], hash: number) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  // Deep obsidian purple
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, w, h);

  // Crystalline polygon clusters
  const clusters = 12;
  for (let c = 0; c < clusters; c++) {
    const cx = ((hash * (c + 1) * 89) % (w - 40)) + 20;
    const cy = ((hash * (c + 1) * 41) % (h - 40)) + 20;
    const size = 18 + ((hash * (c + 2)) % 32);

    const grad = ctx.createRadialGradient(cx, cy, 3, cx, cy, size);
    grad.addColorStop(0, '#ffffff'); // Pure crystal highlight
    grad.addColorStop(0.3, colors[4]); // Electric violet
    grad.addColorStop(0.7, colors[2]);
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fill();

    // Geometric facet veins
    ctx.strokeStyle = 'rgba(233, 213, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.5, cy);
    ctx.lineTo(cx + size * 0.5, cy);
    ctx.lineTo(cx, cy - size * 0.6);
    ctx.closePath();
    ctx.stroke();
  }

  // Polar auroral sheen
  const aurora = ctx.createLinearGradient(0, 0, 0, 45);
  aurora.addColorStop(0, 'rgba(168, 85, 247, 0.6)');
  aurora.addColorStop(1, 'transparent');
  ctx.fillStyle = aurora;
  ctx.fillRect(0, 0, w, 45);

  const auroraSouth = ctx.createLinearGradient(0, h - 45, 0, h);
  auroraSouth.addColorStop(0, 'transparent');
  auroraSouth.addColorStop(1, 'rgba(168, 85, 247, 0.6)');
  ctx.fillStyle = auroraSouth;
  ctx.fillRect(0, h - 45, w, 45);
}

/**
 * Generates procedural translucent concentric planetary ring texture
 */
export function getPlanetRingTexture(colorHex: string = '#c084fc'): THREE.CanvasTexture {
  if (ringTextureCache.has(colorHex)) {
    return ringTextureCache.get(colorHex)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Concentric ring density gradient (Cassini-like division bands)
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.12, 'rgba(192, 132, 252, 0.25)');
  grad.addColorStop(0.28, 'rgba(255, 255, 255, 0.7)');
  grad.addColorStop(0.42, 'rgba(124, 58, 237, 0.85)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.05)'); // Cassini gap
  grad.addColorStop(0.68, 'rgba(34, 211, 238, 0.8)');
  grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.5)');
  grad.addColorStop(0.98, 'rgba(192, 132, 252, 0.15)');
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 1);

  const texture = new THREE.CanvasTexture(canvas);
  ringTextureCache.set(colorHex, texture);
  return texture;
}
