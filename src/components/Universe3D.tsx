import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SpotlightBeacon } from '../services/spotlightBeacon';
import { PlanetaryRocket } from '../services/planetaryRocket';
import { ThoughtNode, ThoughtType } from '../types';
import { layoutNodesIn3D, cosineSimilarity, generateLocalEmbedding } from '../services/embedding';
import { getPlanetTexture } from '../services/planetTextures';
import {
  PALETTE,
  createPlanetPhysicalMaterial,
  createCentralStarMaterial,
  createCentralStarCoronaMaterial,
  createPlanetaryRingMaterial,
  createOrbitalPathMaterial,
  createAuraShaderMaterial,
  updateVisualUniforms,
  getNodeTheme,
} from '../services/materialMatrix';
import {
  RotateCcw,
  Sliders,
  Sparkles,
  Search,
  Maximize2,
  Minimize2,
  ExternalLink,
  Zap,
  Compass,
  BookOpen,
  GripHorizontal,
  Rocket,
  Globe2,
} from 'lucide-react';

interface Universe3DProps {
  thoughts: ThoughtNode[];
  onSelectThought: (thought: ThoughtNode) => void;
  onOpenWorkspace: (tab: 'writing' | 'diary' | 'goals', thoughtId?: string) => void;
  highlightedThoughtId?: string | null;
  searchQuery?: string;
}

// Tri-Accent color mapping for reference
export const THOUGHT_COLORS: Record<ThoughtType, { hex: string; three: THREE.Color; label: string; glow: string }> = {
  note: {
    hex: PALETTE.accents.violet.hex,
    three: PALETTE.accents.violet.three,
    label: 'Knowledge (Electric Violet)',
    glow: PALETTE.accents.violet.glowHex,
  },
  diary: {
    hex: PALETTE.accents.amber.hex,
    three: PALETTE.accents.amber.three,
    label: 'Diary (Stellar Amber)',
    glow: PALETTE.accents.amber.glowHex,
  },
  goal: {
    hex: PALETTE.accents.cyan.hex,
    three: PALETTE.accents.cyan.three,
    label: 'Goals (Hyper Cyan)',
    glow: PALETTE.accents.cyan.glowHex,
  },
};

interface PlanetaryOrbitItem {
  id: string;
  thought: ThoughtNode;
  container: THREE.Group;
  mesh: THREE.Mesh;
  ringMesh?: THREE.Mesh;
  radius: number;
  angle: number;
  speed: number;
  yElevation: number;
  rotationSpeed: number;
}

export const Universe3D: React.FC<Universe3DProps> = ({
  thoughts,
  onSelectThought,
  onOpenWorkspace,
  highlightedThoughtId,
  searchQuery,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const universeContainerRef = useRef<HTMLDivElement>(null);

  // User UI State
  const [selectedNode, setSelectedNode] = useState<ThoughtNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ThoughtNode | null>(null);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [internalSearch, setInternalSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<ThoughtType | 'all' | 'textbook'>('all');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Calibrated Unreal Bloom Post-Processing (default 0.45, threshold 0.88 to eliminate blowout)
  const [bloomEnabled, setBloomEnabled] = useState<boolean>(true);
  const [bloomStrength, setBloomStrength] = useState<number>(0.45);
  const bloomEnabledRef = useRef<boolean>(true);
  bloomEnabledRef.current = bloomEnabled;

  // Orbital Revolution Speed Multiplier
  const [orbitSpeedFactor, setOrbitSpeedFactor] = useState<number>(1.0);
  const orbitSpeedFactorRef = useRef<number>(1.0);
  orbitSpeedFactorRef.current = orbitSpeedFactor;

  // Rocket Landing Sequence & Modal Viewport States
  const [isRocketLanding, setIsRocketLanding] = useState<boolean>(false);
  const [rocketLandingTitle, setRocketLandingTitle] = useState<string>('');
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  // Simulation State: Orbital Freeze on planetary node selection
  const [isOrbitPaused, setIsOrbitPaused] = useState<boolean>(false);
  const isOrbitPausedRef = useRef<boolean>(false);
  isOrbitPausedRef.current = isOrbitPaused;

  // Draggable HUD Panel Position (Starts at top: 210px below header and category filter bar)
  const [panelPos, setPanelPos] = useState<{ x: number; y: number }>({ x: 20, y: 210 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ initX: number; initY: number; mouseX: number; mouseY: number }>({
    initX: 20,
    initY: 210,
    mouseX: 0,
    mouseY: 0,
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const labelsContainerRef = useRef<HTMLDivElement>(null);
  const labelElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const selectedNodeIdRef = useRef<string | null>(null);
  selectedNodeIdRef.current = selectedNode?.id || null;

  const handleGrabPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      initX: panelPos.x,
      initY: panelPos.y,
      mouseX: e.clientX,
      mouseY: e.clientY,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleGrabPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.mouseX;
    const deltaY = e.clientY - dragStartRef.current.mouseY;
    const rawX = dragStartRef.current.initX + deltaX;
    const rawY = dragStartRef.current.initY + deltaY;

    const container = universeContainerRef.current;
    const panel = panelRef.current;
    const containerWidth = container ? container.clientWidth : window.innerWidth;
    const containerHeight = container ? container.clientHeight : window.innerHeight;
    const panelWidth = panel ? panel.offsetWidth : 320;
    const panelHeight = panel ? panel.offsetHeight : 280;

    const maxW = containerWidth - panelWidth - 12;
    const maxH = containerHeight - panelHeight - 12;

    const clampedX = Math.max(10, Math.min(Math.max(10, maxW), rawX));
    const clampedY = Math.max(10, Math.min(Math.max(10, maxH), rawY));

    setPanelPos({ x: clampedX, y: clampedY });
  };

  const handleGrabPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Sync external search
  useEffect(() => {
    if (searchQuery !== undefined) {
      setInternalSearch(searchQuery);
    }
  }, [searchQuery]);

  // Three.js Scene References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const nodesGroupRef = useRef<THREE.Group | null>(null);
  const orbitsGroupRef = useRef<THREE.Group | null>(null);
  const centralStarGroupRef = useRef<THREE.Group | null>(null);
  const centralStarMeshRef = useRef<{ core: THREE.Mesh; corona: THREE.Mesh; light: THREE.PointLight } | null>(null);
  const planetsMeshListRef = useRef<PlanetaryOrbitItem[]>([]);
  const beaconsGroupRef = useRef<THREE.Group | null>(null);
  const activeBeaconsRef = useRef<SpotlightBeacon[]>([]);
  const currentRocketRef = useRef<PlanetaryRocket | null>(null);
  const activeDismissingRocketsRef = useRef<PlanetaryRocket[]>([]);
  const lastSearchFlightRef = useRef<string>('');

  // Active continuous tracking state for revolving planetary nodes
  const focusedPlanetRef = useRef<{
    id: string;
    thought: ThoughtNode;
    container: THREE.Group;
    mesh: THREE.Mesh;
    cameraOffset: THREE.Vector3;
    lastPlanetPos: THREE.Vector3;
    isUserInteracting: boolean;
  } | null>(null);

  // Camera flight interpolation reference
  const flightAnimationRef = useRef<{
    active: boolean;
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    startLook: THREE.Vector3;
    targetLook: THREE.Vector3;
    progress: number;
    duration: number;
    targetNodeId?: string;
  } | null>(null);

  // Dynamic Thought-Gradient Ratios across vault categories
  const categoryRatios = useMemo(() => {
    if (!thoughts || thoughts.length === 0) {
      return { notes: 0.4, diary: 0.3, goals: 0.2, textbook: 0.1, total: 0 };
    }
    let notesCount = 0;
    let diaryCount = 0;
    let goalsCount = 0;
    let textbookCount = 0;

    thoughts.forEach(t => {
      if (t.isTextbook) textbookCount++;
      else if (t.type === 'diary') diaryCount++;
      else if (t.type === 'goal') goalsCount++;
      else notesCount++;
    });

    const total = thoughts.length;
    return {
      notes: notesCount / total,
      diary: diaryCount / total,
      goals: goalsCount / total,
      textbook: textbookCount / total,
      total,
      notesCount,
      diaryCount,
      goalsCount,
      textbookCount,
    };
  }, [thoughts]);

  // Ensure all thoughts have embeddings and orbital layout attributes calculated
  const processedThoughts = useMemo(() => {
    if (!thoughts || thoughts.length === 0) return [];
    return layoutNodesIn3D(thoughts);
  }, [thoughts]);

  // Filtered thoughts based on type or textbook
  const filteredThoughts = useMemo(() => {
    if (typeFilter === 'all') return processedThoughts;
    if (typeFilter === 'textbook') return processedThoughts.filter(t => t.isTextbook);
    return processedThoughts.filter(t => t.type === typeFilter);
  }, [processedThoughts, typeFilter]);

  // Matching thoughts for spotlight beacons (scored by keyword and semantic embedding similarity)
  const searchResults = useMemo(() => {
    const q = internalSearch.trim().toLowerCase();
    if (!q) return { matchIds: new Set<string>(), topMatch: null as ThoughtNode | null };
    const matches = new Set<string>();
    const scored: { thought: ThoughtNode; score: number }[] = [];
    const queryVector = generateLocalEmbedding({ title: q, content: q, tags: [q] });

    filteredThoughts.forEach(t => {
      const titleLower = t.title.toLowerCase();
      const contentLower = t.content.toLowerCase();
      const tagMatch = t.tags.some(tag => tag.toLowerCase().includes(q));

      let score = 0;
      if (titleLower === q) score += 100;
      else if (titleLower.startsWith(q)) score += 60;
      else if (titleLower.includes(q)) score += 40;
      if (tagMatch) score += 30;
      if (contentLower.includes(q)) score += 20;

      const thoughtVector = t.embedding || generateLocalEmbedding(t);
      if (queryVector && thoughtVector) {
        const sim = cosineSimilarity(queryVector, thoughtVector);
        if (sim > 0.44) {
          score += sim * 50;
        }
      }

      if (score > 0) {
        matches.add(t.id);
        scored.push({ thought: t, score });
      }
    });

    scored.sort((a, b) => b.score - a.score);
    return {
      matchIds: matches,
      topMatch: scored.length > 0 ? scored[0].thought : null,
    };
  }, [filteredThoughts, internalSearch]);

  const matchingThoughtIds = searchResults.matchIds;
  const topRankedMatch = searchResults.topMatch;

  // Center camera directly on the selected planetary node (filling ~25-30% of upper viewport height)
  const flyToCenteredPlanet = (node: ThoughtNode) => {
    if (!cameraRef.current || !controlsRef.current) return;

    // Retrieve planet's current frozen 3D orbital container position
    const orbitItem = planetsMeshListRef.current.find(p => p.id === node.id);
    const targetNodePos = orbitItem
      ? orbitItem.container.position.clone()
      : (node.position ? new THREE.Vector3(...node.position) : new THREE.Vector3(0, 0, 0));

    // Dynamic radial direction from cosmic center (central star at 0, 0, 0)
    const radial = new THREE.Vector3(targetNodePos.x, 0, targetNodePos.z).normalize();
    if (radial.lengthSq() < 0.01) radial.set(0, 0, 1);

    const planetRadius = node.isTextbook ? 1.6 : (node.type === 'goal' ? 0.96 : (node.type === 'diary' ? 0.90 : 0.85));
    // Camera zoom & distance calibrated so the planet fills ~25-30% of upper viewport height:
    // With FOV = 54°, distance ~6.86 * R centers the planet and rocket prominently in the dead center
    const viewDist = planetRadius * 6.5;
    const elevation = planetRadius * 2.2;

    const centerOffset = new THREE.Vector3(0, planetRadius * 0.12, 0);
    const targetLook = targetNodePos.clone().add(centerOffset);
    const targetPos = targetNodePos.clone().addScaledVector(radial, viewDist).add(new THREE.Vector3(0, elevation, 0)).add(centerOffset);

    flightAnimationRef.current = {
      active: true,
      startPos: cameraRef.current.position.clone(),
      targetPos,
      startLook: controlsRef.current.target.clone(),
      targetLook,
      progress: 0,
      duration: 1.15,
      targetNodeId: node.id,
    };
  };

  // Spawn miniature 3D rocket stationed directly on the top pole of the planet's surface
  const spawnStationedRocket = (targetThought: ThoughtNode) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Immediately clean up any dismissing rockets
    activeDismissingRocketsRef.current.forEach(r => r.dispose());
    activeDismissingRocketsRef.current = [];

    // Clean up previous rocket if active
    if (currentRocketRef.current) {
      if (currentRocketRef.current.group.parent) {
        currentRocketRef.current.group.parent.remove(currentRocketRef.current.group);
      }
      currentRocketRef.current.dispose();
      currentRocketRef.current = null;
    }

    const orbitItem = planetsMeshListRef.current.find(p => p.id === targetThought.id);
    const targetRadius = targetThought.isTextbook ? 1.6 : (targetThought.type === 'goal' ? 0.96 : (targetThought.type === 'diary' ? 0.90 : 0.85));
    const planetPos = orbitItem
      ? orbitItem.container.position.clone()
      : new THREE.Vector3(...(targetThought.position || [0, 0, 0]));

    // Gently lower bloom strength while inspecting planet so surface details and rocket mesh are razor sharp
    if (bloomPassRef.current) {
      bloomPassRef.current.strength = 0.22;
    }

    setIsRocketLanding(false);
    setShowDetailModal(true);

    const rocket = new PlanetaryRocket({
      targetPos: planetPos,
      targetRadius,
      stationed: true,
    });

    // Parent Scene Attachment: Add the lander mesh to the active scene container
    scene.add(rocket.group);
    // Top-Pole Surface Docking: position the rocket lander directly on the planet surface along its vertical local Y-axis offset:
    rocket.group.position.set(planetPos.x, planetPos.y + targetRadius, planetPos.z);
    rocket.group.rotation.set(0, 0, 0);

    currentRocketRef.current = rocket;
  };

  // Node selection handler: freezes orbital motion, centers planet, and docks mini rocket
  const handleSelectPlanetaryNode = (thought: ThoughtNode) => {
    // 1. Orbital Pause on Selection: freeze positions across scene
    setIsOrbitPaused(true);
    isOrbitPausedRef.current = true;

    setSelectedNode(thought);
    onSelectThought(thought);

    // 2. Center focused planet in viewport with optimal camera zoom
    flyToCenteredPlanet(thought);

    // 3. Mini rocket surface touchdown stationed on top pole
    spawnStationedRocket(thought);
  };

  // Resume orbit and reset camera to solar system overview
  const resumeOrbitAndResetCamera = () => {
    // 4. Resume Orbit Behavior: unfreeze simulation and reset camera
    setIsOrbitPaused(false);
    isOrbitPausedRef.current = false;
    setSelectedNode(null);
    setShowDetailModal(false);
    setIsRocketLanding(false);
    focusedPlanetRef.current = null;

    // Restore standard bloom intensity
    if (bloomPassRef.current) {
      bloomPassRef.current.strength = bloomStrength;
    }

    // Touchdown State Cleanup: Trigger a brief thrust-off animation and immediately remove the lander mesh
    if (currentRocketRef.current) {
      const rocket = currentRocketRef.current;
      currentRocketRef.current = null;
      if (sceneRef.current) {
        rocket.triggerThrustOffAnimation(sceneRef.current, () => {
          activeDismissingRocketsRef.current = activeDismissingRocketsRef.current.filter(r => r !== rocket);
        });
        activeDismissingRocketsRef.current.push(rocket);
      } else {
        rocket.dispose();
      }
    }

    if (cameraRef.current && controlsRef.current) {
      flightAnimationRef.current = {
        active: true,
        startPos: cameraRef.current.position.clone(),
        targetPos: new THREE.Vector3(0, 34, 94),
        startLook: controlsRef.current.target.clone(),
        targetLook: new THREE.Vector3(0, 0, 0),
        progress: 0,
        duration: 1.25,
      };
    }
  };

  const handleSelectPlanetaryNodeRef = useRef(handleSelectPlanetaryNode);
  handleSelectPlanetaryNodeRef.current = handleSelectPlanetaryNode;
  const resumeOrbitAndResetCameraRef = useRef(resumeOrbitAndResetCamera);
  resumeOrbitAndResetCameraRef.current = resumeOrbitAndResetCamera;

  // Automatically center camera flight on top-ranked match when query changes
  useEffect(() => {
    const q = internalSearch.trim();
    if (q && q !== lastSearchFlightRef.current && topRankedMatch) {
      lastSearchFlightRef.current = q;
      handleSelectPlanetaryNode(topRankedMatch);
    } else if (!q) {
      lastSearchFlightRef.current = '';
    }
  }, [internalSearch, topRankedMatch]);

  // Alias resetCamera to resumeOrbitAndResetCamera for compatibility
  const resetCamera = resumeOrbitAndResetCamera;

  // Handle external highlight
  useEffect(() => {
    if (highlightedThoughtId) {
      const match = thoughts.find(t => t.id === highlightedThoughtId);
      if (match) {
        handleSelectPlanetaryNode(match);
      }
    }
  }, [highlightedThoughtId, thoughts]);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const getContainerSize = () => {
      const el = containerRef.current;
      const w = el?.clientWidth || window.innerWidth || 800;
      const h = el?.clientHeight || (window.innerHeight - 68) || 600;
      return {
        width: Math.max(w, 320),
        height: Math.max(h, 240),
      };
    };

    const { width: initW, height: initH } = getContainerSize();

    // Scene: 60% Obsidian Void Background (#030508) & Low-Density Cosmic Fog
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(PALETTE.void.deep);
    scene.fog = new THREE.FogExp2(PALETTE.void.fog, 0.0028);

    // Camera
    const camera = new THREE.PerspectiveCamera(54, initW / initH, 0.1, 1200);
    camera.position.set(0, 34, 94);
    cameraRef.current = camera;

    // WebGL Renderer with balanced exposure (1.05) to eliminate canvas blowout
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(initW, initH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05; // Balanced exposure to prevent whiteout
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Selective Unreal Bloom Post-Processing Pipeline
    // Bloom threshold set at 0.88 with strength 0.45:
    // - Space void stays deep obsidian black with zero blooming or wash.
    // - Emissive planetary halos and core pulse softly without blinding blowout.
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(initW, initH),
      bloomStrength, // strength (default 0.45)
      0.40,          // radius
      0.88           // threshold to strictly protect background void
    );
    composer.addPass(bloomPass);
    bloomPassRef.current = bloomPass;

    const outputPass = new OutputPass();
    composer.addPass(outputPass);
    composerRef.current = composer;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 320;
    controls.minDistance = 2.0;
    controlsRef.current = controls;

    const onControlsStart = () => {
      if (focusedPlanetRef.current) {
        focusedPlanetRef.current.isUserInteracting = true;
      }
    };

    const onControlsEnd = () => {
      if (focusedPlanetRef.current && cameraRef.current) {
        focusedPlanetRef.current.isUserInteracting = false;
        focusedPlanetRef.current.cameraOffset
          .copy(cameraRef.current.position)
          .sub(focusedPlanetRef.current.container.position);
      }
    };

    controls.addEventListener('start', onControlsStart);
    controls.addEventListener('end', onControlsEnd);

    // Calibrated Lighting
    const ambientLight = new THREE.AmbientLight(0xdce7f5, 0.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.48);
    keyLight.position.set(30, 50, 30);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x71829d, 0.30);
    rimLight.position.set(-35, -25, -25);
    scene.add(rimLight);

    // Procedural Background Starfield (unobstructed 360° cosmic void)
    const starCount = 2400;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const accentPalette = [
      new THREE.Color(PALETTE.accents.violet.hex),
      new THREE.Color(PALETTE.accents.cyan.hex),
      new THREE.Color(PALETTE.accents.amber.hex),
      new THREE.Color('#cbd5e1'),
      new THREE.Color('#94a3b8'),
      new THREE.Color('#ffffff'),
    ];

    for (let i = 0; i < starCount; i++) {
      const radius = 130 + Math.random() * 280;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      const color = accentPalette[Math.floor(Math.random() * accentPalette.length)];
      const dim = 0.25 + Math.random() * 0.75;
      starColors[i * 3] = color.r * dim;
      starColors[i * 3 + 1] = color.g * dim;
      starColors[i * 3 + 2] = color.b * dim;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Scene Groups
    const orbitsGroup = new THREE.Group();
    scene.add(orbitsGroup);
    orbitsGroupRef.current = orbitsGroup;

    // Central Star (Neural Core with dynamic GLSL thought-gradient shader)
    const centralStarGroup = new THREE.Group();
    scene.add(centralStarGroup);
    centralStarGroupRef.current = centralStarGroup;

    const starCoreGeo = new THREE.SphereGeometry(5.2, 36, 36);
    const starCoreMat = createCentralStarMaterial();
    const starCoreMesh = new THREE.Mesh(starCoreGeo, starCoreMat);
    centralStarGroup.add(starCoreMesh);

    const starCoronaGeo = new THREE.SphereGeometry(8.2, 36, 36);
    const starCoronaMat = createCentralStarCoronaMaterial();
    const starCoronaMesh = new THREE.Mesh(starCoronaGeo, starCoronaMat);
    centralStarGroup.add(starCoronaMesh);

    // PointLight casting gentle soft cosmic light (intensity 0.40 cap)
    const stellarLight = new THREE.PointLight(0xa855f7, 0.40, 320, 1.6);
    stellarLight.position.set(0, 0, 0);
    centralStarGroup.add(stellarLight);

    // Neural Core Cosmic Label
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 340;
    starCanvas.height = 70;
    const sCtx = starCanvas.getContext('2d');
    if (sCtx) {
      sCtx.fillStyle = 'rgba(9, 10, 15, 0.95)';
      if (sCtx.roundRect) sCtx.roundRect(10, 10, 320, 50, 10);
      else sCtx.rect(10, 10, 320, 50);
      sCtx.fill();
      sCtx.strokeStyle = '#7c3aed';
      sCtx.lineWidth = 2;
      sCtx.stroke();
      sCtx.font = 'bold 13px Syncopate, sans-serif';
      sCtx.fillStyle = '#ffffff';
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillText('★ NEURAL CORE', 170, 35);
    }
    const starTex = new THREE.CanvasTexture(starCanvas);
    const starSpriteMat = new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false });
    const starSprite = new THREE.Sprite(starSpriteMat);
    starSprite.position.set(0, 7.8, 0);
    starSprite.scale.set(10.5, 2.3, 1);
    centralStarGroup.add(starSprite);

    centralStarMeshRef.current = {
      core: starCoreMesh,
      corona: starCoronaMesh,
      light: stellarLight,
    };

    const nodesGroup = new THREE.Group();
    scene.add(nodesGroup);
    nodesGroupRef.current = nodesGroup;

    const beaconsGroup = new THREE.Group();
    scene.add(beaconsGroup);
    beaconsGroupRef.current = beaconsGroup;

    // Raycasting for node hover and click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (e: MouseEvent) => {
      pointerDownPos.x = e.clientX;
      pointerDownPos.y = e.clientY;
    };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodesGroup.children, true);

      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData?.thought && obj.parent) {
          obj = obj.parent;
        }
        if (obj?.userData?.thought) {
          setHoveredNode(obj.userData.thought);
          container.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredNode(null);
      container.style.cursor = 'default';
    };

    const handleClick = (e: MouseEvent) => {
      // Differentiate deliberate clicks from camera orbit drags
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 7) return;

      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodesGroup.children, true);

      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData?.thought && obj.parent) {
          obj = obj.parent;
        }
        if (obj?.userData?.thought) {
          const clicked = obj.userData.thought;
          handleSelectPlanetaryNodeRef.current(clicked);
          return;
        }
      }

      // Empty cosmic space click: unfreeze orbital revolution and reset camera
      if (isOrbitPausedRef.current || selectedNodeIdRef.current) {
        resumeOrbitAndResetCameraRef.current();
      }
    };

    container.addEventListener('mousedown', handlePointerDown);
    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('click', handleClick);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const { width, height } = getContainerSize();
      if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        if (composerRef.current) {
          composerRef.current.setSize(width, height);
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);
    const delayTimer = setTimeout(handleResize, 100);

    // Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const elapsedTime = (now - startTime) / 1000;

      // Cosmic background idle rotation
      starField.rotation.y = elapsedTime * 0.007;
      starField.rotation.x = Math.sin(elapsedTime * 0.004) * 0.012;
      starMat.opacity = 0.65 + 0.18 * Math.sin(elapsedTime * 1.6);

      // Update Central Star rotation & plasma shader uniforms (freeze when isOrbitPaused is true)
      if (!isOrbitPausedRef.current && centralStarMeshRef.current) {
        centralStarMeshRef.current.core.rotation.y = elapsedTime * 0.06;
        centralStarMeshRef.current.corona.rotation.z = -elapsedTime * 0.04;
        const coreMat = centralStarMeshRef.current.core.material as THREE.ShaderMaterial;
        if (coreMat.uniforms?.uTime) coreMat.uniforms.uTime.value = elapsedTime;
        const coronaMat = centralStarMeshRef.current.corona.material as THREE.ShaderMaterial;
        if (coronaMat.uniforms?.uTime) coronaMat.uniforms.uTime.value = elapsedTime;
      }

      // Pure Planetary Revolutions:
      // When any planetary node is clicked, isOrbitPaused = true.
      // Freeze positions: stop updating planet.angle in the animation loop so all planets, rings, and Neural Core freeze in place!
      if (!isOrbitPausedRef.current) {
        const speedMult = orbitSpeedFactorRef.current;
        planetsMeshListRef.current.forEach(item => {
          item.angle += item.speed * speedMult * delta;

          const curX = item.radius * Math.cos(item.angle);
          const curZ = item.radius * Math.sin(item.angle);
          const curY = item.yElevation;

          item.container.position.set(curX, curY, curZ);

          // Keep thought.position synced for raycasting, rocket landing, and camera focus
          item.thought.position = [curX, curY, curZ];

          // Axial planetary rotation
          item.mesh.rotation.y += item.rotationSpeed * delta;
          if (item.ringMesh) {
            item.ringMesh.rotation.z += item.rotationSpeed * 0.4 * delta;
          }
        });
      }

      // Update Rocket descent animation or stationed idle pulse
      if (currentRocketRef.current) {
        currentRocketRef.current.update(delta, elapsedTime);
      }

      // Update dismissing rockets thrust-off animation
      if (activeDismissingRocketsRef.current.length > 0) {
        activeDismissingRocketsRef.current.forEach(r => r.update(delta, elapsedTime));
      }

      // Update custom shader uniforms (auras, beacons)
      updateVisualUniforms(scene, elapsedTime);

      // Camera flight interpolation and controls update
      if (flightAnimationRef.current?.active) {
        const anim = flightAnimationRef.current;
        anim.progress += delta / anim.duration;

        const t = anim.progress < 0.5
          ? 4 * anim.progress * anim.progress * anim.progress
          : 1 - Math.pow(-2 * anim.progress + 2, 3) / 2;

        if (anim.progress >= 1.0) {
          camera.position.copy(anim.targetPos);
          controls.target.copy(anim.targetLook);
          anim.active = false;
        } else {
          camera.position.lerpVectors(anim.startPos, anim.targetPos, t);
          controls.target.lerpVectors(anim.startLook, anim.targetLook, t);
        }
        controls.update();
      } else {
        controls.update();
      }

      // Update active SpotlightBeacon instances (shader uniforms & rotation)
      activeBeaconsRef.current.forEach(beacon => {
        beacon.update(elapsedTime, delta);
      });

      // Update crisp HTML Planet Labels in screen-space with distance scaling & Neural Core occlusion fading
      const labelsContainer = labelsContainerRef.current;
      if (labelsContainer && camera) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const camPos = camera.position;
        const camDist = camPos.length();
        const tempVec = new THREE.Vector3();

        planetsMeshListRef.current.forEach(item => {
          const labelEl = labelElementsRef.current.get(item.id);
          if (!labelEl) return;

          const pPos = item.container.position;
          const distToCam = camPos.distanceTo(pPos);

          // Ray from camera to planet
          const camToPlanet = pPos.clone().sub(camPos);
          const rayDir = camToPlanet.clone().normalize();

          // Calculate occlusion behind Neural Core at (0, 0, 0)
          const t = -camPos.dot(rayDir);
          let occlusionFactor = 0;
          if (t > 0 && t < distToCam) {
            const closestPoint = camPos.clone().add(rayDir.clone().multiplyScalar(t));
            const distToOrigin = closestPoint.length();
            const coreRadius = 7.5;
            if (distToOrigin < coreRadius && distToCam > camDist * 0.85) {
              occlusionFactor = Math.min(1, Math.max(0, (coreRadius - distToOrigin) / 3.0));
            }
          }

          const yOffset = item.thought.isTextbook ? 2.5 : 1.7;
          tempVec.set(pPos.x, pPos.y + yOffset, pPos.z);
          tempVec.project(camera);

          const isBehindCamera = tempVec.z > 1.0;
          // If this is the focused/selected planet, hide the floating HTML label pill so it doesn't obscure the stationed miniature rocket!
          if (selectedNodeIdRef.current === item.id) {
            labelEl.style.opacity = '0';
            labelEl.style.pointerEvents = 'none';
            return;
          }

          if (isBehindCamera || occlusionFactor >= 0.95) {
            labelEl.style.opacity = '0';
            labelEl.style.pointerEvents = 'none';
          } else {
            const screenX = (tempVec.x * 0.5 + 0.5) * width;
            const screenY = (-tempVec.y * 0.5 + 0.5) * height;

            if (screenX < -150 || screenX > width + 150 || screenY < -100 || screenY > height + 100) {
              labelEl.style.opacity = '0';
              labelEl.style.pointerEvents = 'none';
            } else {
              // Distance-based scaling: scales gracefully with distance for crisp legibility
              const scale = Math.max(0.75, Math.min(1.15, 42 / Math.max(16, distToCam)));

              // Distance-based fading & Neural Core occlusion
              const isDimmed = item.thought.isDimmed;
              const isSelected = selectedNodeIdRef.current === item.id;
              const baseOpacity = isDimmed ? 0.25 : (isSelected ? 1.0 : 0.95);
              const distFade = distToCam > 85 ? Math.max(0.2, 1 - (distToCam - 85) / 35) : 1.0;
              const finalOpacity = Math.max(0, baseOpacity * (1 - occlusionFactor) * distFade);

              labelEl.style.opacity = finalOpacity.toFixed(3);
              labelEl.style.pointerEvents = finalOpacity > 0.35 ? 'auto' : 'none';
              labelEl.style.transform = `translate(-50%, -100%) translate3d(${screenX}px, ${screenY}px, 0) scale(${scale.toFixed(2)})`;
            }
          }
        });
      }

      // Render through Unreal Bloom Post-Processing Pipeline or direct WebGL
      if (bloomEnabledRef.current && composerRef.current) {
        composerRef.current.render();
      } else {
        renderer.render(scene, camera);
      }
    };

    animate();

    return () => {
      clearTimeout(delayTimer);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('click', handleClick);

      // Clean up beacons
      activeBeaconsRef.current.forEach(b => b.dispose());
      activeBeaconsRef.current = [];

      // Clean up labels
      if (labelsContainerRef.current) {
        labelsContainerRef.current.innerHTML = '';
      }
      labelElementsRef.current.clear();

      // Clean up rocket
      if (currentRocketRef.current) {
        currentRocketRef.current.dispose();
        currentRocketRef.current = null;
      }
      activeDismissingRocketsRef.current.forEach(r => r.dispose());
      activeDismissingRocketsRef.current = [];

      // Clean up composer, controls, and renderer
      controls.removeEventListener('start', onControlsStart);
      controls.removeEventListener('end', onControlsEnd);
      controls.dispose();
      if (composerRef.current) {
        composerRef.current.dispose();
      }
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Dynamic Thought-Gradient Shader on the Central Star (Neural Core)
  useEffect(() => {
    if (!centralStarMeshRef.current) return;
    const { core, corona, light } = centralStarMeshRef.current;

    // Update GLSL uniform category ratios
    const coreMat = core.material as THREE.ShaderMaterial;
    if (coreMat.uniforms?.uCategoryRatios) {
      coreMat.uniforms.uCategoryRatios.value.set(
        categoryRatios.notes,
        categoryRatios.diary,
        categoryRatios.goals,
        categoryRatios.textbook
      );
    }

    // Dynamic Corona tint blended from active vault categories
    const colorNotes = new THREE.Color('#7c3aed');
    const colorDiary = new THREE.Color('#f59e0b');
    const colorGoals = new THREE.Color('#06b6d4');
    const colorTextbook = new THREE.Color('#38bdf8');

    const blendedColor = new THREE.Color(
      colorNotes.r * categoryRatios.notes + colorDiary.r * categoryRatios.diary + colorGoals.r * categoryRatios.goals + colorTextbook.r * categoryRatios.textbook,
      colorNotes.g * categoryRatios.notes + colorDiary.g * categoryRatios.diary + colorGoals.g * categoryRatios.goals + colorTextbook.g * categoryRatios.textbook,
      colorNotes.b * categoryRatios.notes + colorDiary.b * categoryRatios.diary + colorGoals.b * categoryRatios.goals + colorTextbook.b * categoryRatios.textbook
    );

    const coronaMat = corona.material as THREE.ShaderMaterial;
    if (coronaMat.uniforms?.uCoronaTint) {
      coronaMat.uniforms.uCoronaTint.value.copy(blendedColor);
    }
    if (light) {
      light.color.copy(blendedColor);
      light.intensity = 0.40; // 40% glow intensity cap
    }
  }, [categoryRatios]);

  // Update Nodes in 3D Scene with Procedural PBR Textures and Orbital Tracking
  useEffect(() => {
    const nodesGroup = nodesGroupRef.current;
    if (!nodesGroup) return;

    // Clear existing nodes
    while (nodesGroup.children.length > 0) {
      const child = nodesGroup.children[0];
      nodesGroup.remove(child);
      child.traverse(c => {
        if (c instanceof THREE.Mesh || c instanceof THREE.Sprite) {
          c.geometry?.dispose();
          if (Array.isArray(c.material)) {
            c.material.forEach(m => m.dispose());
          } else {
            c.material?.dispose();
          }
        }
      });
    }

    const hasSearchActive = matchingThoughtIds.size > 0;
    planetsMeshListRef.current = [];

    filteredThoughts.forEach((thought, index) => {
      const [px, py, pz] = thought.position || [0, 0, 0];
      const isMatch = matchingThoughtIds.has(thought.id);
      const isDimmed = hasSearchActive && !isMatch;
      const isSelected = selectedNode?.id === thought.id;
      const theme = getNodeTheme(thought);

      let baseRadius = 0.85;
      if (thought.isTextbook) baseRadius = 1.6;
      else if (thought.type === 'goal') baseRadius = 0.96;
      else if (thought.type === 'diary') baseRadius = 0.90;

      const nodeContainer = new THREE.Group();
      nodeContainer.position.set(px, py, pz);
      nodeContainer.userData = {
        thought,
        pulseOffset: index * 0.73,
      };

      // 0. Generous Hit Sphere for fluid pointer interaction (transparent mesh, detectable by Raycaster)
      const hitGeo = new THREE.SphereGeometry(thought.isTextbook ? 2.6 : 1.85, 16, 16);
      const hitMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.userData = { thought };
      nodeContainer.add(hitMesh);

      // 1. Procedural Planetary Surface Sphere (PBR MeshPhysicalMaterial with dynamic texture)
      const planetTexture = getPlanetTexture(thought);
      const coreGeo = new THREE.SphereGeometry(baseRadius, 36, 36);
      const coreMat = createPlanetPhysicalMaterial(thought, planetTexture, { isSelected, isMatch, isDimmed });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.userData = { thought };
      nodeContainer.add(coreMesh);

      // 2. Volumetric Atmospheric Halo Shell
      if (!isDimmed) {
        const auraGeo = new THREE.SphereGeometry(baseRadius * 1.5, 24, 24);
        const auraMat = createAuraShaderMaterial(thought, {
          isSelected,
          isMatch,
          pulseOffset: index * 0.73,
          intensityMultiplier: isSelected ? 1.05 : (thought.isTextbook ? 1.15 : 0.85),
        });
        const auraMesh = new THREE.Mesh(auraGeo, auraMat);
        auraMesh.name = 'glowAura';
        nodeContainer.add(auraMesh);
      }

      // 3. Planetary Celestial Rings (for Selected nodes or Textbook nodes)
      let ringMesh: THREE.Mesh | undefined;
      if ((isSelected || thought.isTextbook) && !isDimmed) {
        const ringGeo = new THREE.RingGeometry(baseRadius * 1.55, baseRadius * 2.35, 48);
        const ringMat = createPlanetaryRingMaterial(thought, isSelected);
        ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.2;
        ringMesh.rotation.y = 0.32;
        nodeContainer.add(ringMesh);
      }

      // 4. Record dimming status for shader and HTML label occlusion
      thought.isDimmed = isDimmed;

      nodesGroup.add(nodeContainer);

      // Track planet for pure orbital revolution along assigned rings
      const radius = thought.orbitalRadius || Math.hypot(px, pz);
      const angle = thought.orbitalAngle !== undefined ? thought.orbitalAngle : Math.atan2(pz, px);
      const speed = thought.orbitalSpeed || (0.042 * Math.sqrt(35 / Math.max(15, radius)));
      const yElevation = thought.yElevation !== undefined ? thought.yElevation : py;

      planetsMeshListRef.current.push({
        id: thought.id,
        thought,
        container: nodeContainer,
        mesh: coreMesh,
        ringMesh,
        radius,
        angle,
        speed,
        yElevation,
        rotationSpeed: 0.22 + (index % 4) * 0.08,
      });
    });

    // Synchronize crisp 2D HTML Planet Labels in the overlay layer
    const labelsContainer = labelsContainerRef.current;
    if (labelsContainer) {
      labelsContainer.innerHTML = '';
      labelElementsRef.current.clear();

      filteredThoughts.forEach((thought) => {
        const isMatch = matchingThoughtIds.has(thought.id);
        const isDimmed = hasSearchActive && !isMatch;
        const isSelected = selectedNode?.id === thought.id;
        const theme = getNodeTheme(thought);

        const labelEl = document.createElement('div');
        labelEl.id = `planet-label-${thought.id}`;
        labelEl.className = 'planet-html-label pointer-events-auto cursor-pointer select-none';
        labelEl.style.position = 'absolute';
        labelEl.style.top = '0';
        labelEl.style.left = '0';
        labelEl.style.whiteSpace = 'nowrap';
        labelEl.style.fontFamily = "'Syncopate', sans-serif";
        labelEl.style.fontSize = '9.5px';
        labelEl.style.fontWeight = '700';
        labelEl.style.letterSpacing = '0.14em';
        labelEl.style.textTransform = 'uppercase';
        labelEl.style.padding = '4px 10px';
        labelEl.style.borderRadius = '8px';
        labelEl.style.display = 'inline-flex';
        labelEl.style.alignItems = 'center';
        labelEl.style.gap = '6px';
        labelEl.style.backdropFilter = 'blur(6px)';
        labelEl.style.transition = 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease';
        labelEl.style.willChange = 'transform, opacity';

        if (isSelected) {
          labelEl.style.background = '#ffffff';
          labelEl.style.color = '#0F172A';
          labelEl.style.border = '2px solid #7c3aed';
          labelEl.style.boxShadow = '0 0 18px rgba(124, 58, 237, 0.75)';
        } else {
          // Semi-transparent dark background (background: rgba(9, 10, 15, 0.85), border: 1px solid rgba(124, 58, 237, 0.4)) with crisp white Astral typography
          labelEl.style.background = 'rgba(9, 10, 15, 0.85)';
          labelEl.style.color = isDimmed ? '#94a3b8' : '#ffffff';
          labelEl.style.border = isMatch
            ? `1.5px solid ${theme.hex}`
            : '1px solid rgba(124, 58, 237, 0.4)';
          labelEl.style.boxShadow = isMatch
            ? `0 0 12px ${theme.hex}88`
            : '0 4px 15px rgba(0, 0, 0, 0.6)';
        }

        const dot = document.createElement('span');
        dot.style.width = '6px';
        dot.style.height = '6px';
        dot.style.borderRadius = '50%';
        dot.style.flexShrink = '0';
        dot.style.backgroundColor = isSelected ? '#7c3aed' : theme.hex;
        dot.style.boxShadow = `0 0 6px ${isSelected ? '#7c3aed' : theme.hex}`;
        labelEl.appendChild(dot);

        const textSpan = document.createElement('span');
        const prefix = thought.isTextbook ? '🪐 ' : '';
        const rawTitle = (prefix + thought.title).toUpperCase();
        const displayTitle = rawTitle.length > 20 ? rawTitle.slice(0, 18) + '…' : rawTitle;
        textSpan.textContent = displayTitle;
        labelEl.appendChild(textSpan);

        labelEl.onpointerenter = () => {
          setHoveredNode(thought);
        };
        labelEl.onpointerleave = () => {
          setHoveredNode(prev => (prev?.id === thought.id ? null : prev));
        };
        labelEl.onclick = (e) => {
          e.stopPropagation();
          handleSelectPlanetaryNode(thought);
        };

        labelsContainer.appendChild(labelEl);
        labelElementsRef.current.set(thought.id, labelEl);
      });
    }
  }, [filteredThoughts, matchingThoughtIds, selectedNode]);

  // Render Faint Glowing Circular Orbital Tracks around the Central Star
  // (Pure planetary revolution guides; all inter-planetary synapse lines & tether lines are removed)
  useEffect(() => {
    const orbitsGroup = orbitsGroupRef.current;
    if (!orbitsGroup) return;

    while (orbitsGroup.children.length > 0) {
      const child = orbitsGroup.children[0];
      orbitsGroup.remove(child);
      if (child instanceof THREE.Line || child instanceof THREE.LineLoop) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    const renderedRadii = new Set<number>();

    filteredThoughts.forEach(thought => {
      const r = Math.round((thought.orbitalRadius || Math.hypot(thought.position?.[0] || 0, thought.position?.[2] || 0)) * 2) / 2;
      if (r < 4.0 || renderedRadii.has(r)) return;
      renderedRadii.add(r);

      const points: THREE.Vector3[] = [];
      const segments = 96;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          r * Math.cos(theta),
          (thought.yElevation || 0) * 0.10,
          r * Math.sin(theta)
        ));
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
      const orbitMat = createOrbitalPathMaterial();
      const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
      orbitsGroup.add(orbitLine);
    });
  }, [filteredThoughts]);

  // Update Procedural Spotlight Beacons:
  // Strictly restricted to active SEARCH QUERY matches with subtle 0.25 intensity.
  // Clicked nodes DO NOT spawn blinding spotlight beacons, curing canvas blowout completely.
  useEffect(() => {
    const beaconsGroup = beaconsGroupRef.current;
    if (!beaconsGroup) return;

    // Clean up previous beacon instances
    activeBeaconsRef.current.forEach(beacon => beacon.dispose());
    activeBeaconsRef.current = [];

    while (beaconsGroup.children.length > 0) {
      beaconsGroup.remove(beaconsGroup.children[0]);
    }

    // Only erect beacons for search matches (not on clicked nodes to avoid blowout)
    if (matchingThoughtIds.size === 0) return;

    matchingThoughtIds.forEach(id => {
      const thought = thoughts.find(t => t.id === id);
      if (!thought || !thought.position) return;

      const [px, py, pz] = thought.position;

      const beacon = new SpotlightBeacon([px, py, pz], {
        height: 40,
        radiusTop: 0.35,
        radiusBottom: 2.2,
        intensity: 0.25, // Toned down to prevent whiteout
        colorCyan: PALETTE.accents.cyan.three,
        colorViolet: PALETTE.accents.violet.three,
        nodeId: id,
      });

      beaconsGroup.add(beacon.group);
      activeBeaconsRef.current.push(beacon);
    });
  }, [matchingThoughtIds, thoughts]);

  return (
    <div
      ref={universeContainerRef}
      id="universe-3d-container"
      className={`relative w-full h-full select-none overflow-hidden bg-[#030508] ${
        isFullscreen ? 'fixed inset-0 z-50' : 'w-full h-full'
      }`}
    >
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        style={{ minHeight: '320px', width: '100%', height: '100%' }}
      />

      {/* 2D HTML Planet Labels Layer with distance scaling & Neural Core occlusion */}
      <div
        ref={labelsContainerRef}
        className="absolute inset-0 pointer-events-none overflow-hidden z-[5]"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Floating Top-Left HUD: Title, Search, and Category Filter Buttons */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-[14px] max-w-sm pointer-events-auto">
        <div
          id="mind-map-header"
          className="astral-card-white border-2 border-[#7c3aed] rounded-2xl p-3 shadow-[0_18px_45px_rgba(0,0,0,0.85)]"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🪐</span>
              <div>
                <span className="font-['Syncopate',sans-serif] font-bold text-[#090a0f] text-xs tracking-[0.16em] block leading-tight">
                  MIND MAP
                </span>
                <span className="text-[9px] text-[#7c3aed] font-['Syncopate',sans-serif] font-bold tracking-[0.18em] uppercase">
                  ALIEN SOLAR SYSTEM
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {matchingThoughtIds.size > 0 && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#7c3aed] text-white font-['Syncopate',sans-serif] font-bold border border-[#6d28d9] flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                  {matchingThoughtIds.size} Beacons
                </span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#090a0f] text-white border border-[#7c3aed]/50 font-mono">
                {filteredThoughts.length} Planets
              </span>
            </div>
          </div>

          {/* Quick 3D Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="universe-search-input"
              type="text"
              value={internalSearch}
              onChange={e => setInternalSearch(e.target.value)}
              placeholder="Search celestial thoughts..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg text-[#090a0f] placeholder:text-gray-400 focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all font-sans"
            />
            {internalSearch && (
              <button
                onClick={() => setInternalSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#090a0f] text-xs px-1 font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 60:30:20 Category Filter Buttons: Positioned directly below #mind-map-header via flex gap-[14px] */}
        <div
          id="category-filters"
          className="flex items-center gap-1 bg-[#090a0f] border-2 border-[#7c3aed]/70 rounded-xl p-1 shadow-xl"
        >
          <button
            id="filter-all-btn"
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 text-[10px] rounded-lg font-['Syncopate',sans-serif] font-bold tracking-[0.14em] uppercase transition-all ${
              typeFilter === 'all'
                ? 'bg-[#7c3aed] text-white shadow-[0_0_12px_rgba(124,58,237,0.7)]'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            All
          </button>
          <button
            id="filter-notes-btn"
            onClick={() => setTypeFilter('note')}
            className={`px-2.5 py-1 text-[10px] rounded-lg font-['Syncopate',sans-serif] font-bold tracking-[0.14em] uppercase flex items-center gap-1.5 transition-all ${
              typeFilter === 'note'
                ? 'bg-[#7c3aed] text-white shadow-[0_0_12px_rgba(124,58,237,0.7)]'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#7c3aed] inline-block shadow-sm shadow-[#7c3aed]" />
            <span>Notes</span>
          </button>
          <button
            id="filter-diary-btn"
            onClick={() => setTypeFilter('diary')}
            className={`px-2.5 py-1 text-[10px] rounded-lg font-['Syncopate',sans-serif] font-bold tracking-[0.14em] uppercase flex items-center gap-1.5 transition-all ${
              typeFilter === 'diary'
                ? 'bg-[#7c3aed] text-white shadow-[0_0_12px_rgba(124,58,237,0.7)]'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#f59e0b] inline-block shadow-sm shadow-[#f59e0b]" />
            <span>Diary</span>
          </button>
          <button
            id="filter-goals-btn"
            onClick={() => setTypeFilter('goal')}
            className={`px-2.5 py-1 text-[10px] rounded-lg font-['Syncopate',sans-serif] font-bold tracking-[0.14em] uppercase flex items-center gap-1.5 transition-all ${
              typeFilter === 'goal'
                ? 'bg-[#7c3aed] text-white shadow-[0_0_12px_rgba(124,58,237,0.7)]'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#06b6d4] inline-block shadow-sm shadow-[#06b6d4]" />
            <span>Goals</span>
          </button>
          <button
            id="filter-textbooks-btn"
            onClick={() => setTypeFilter('textbook')}
            className={`px-2.5 py-1 text-[10px] rounded-lg font-['Syncopate',sans-serif] font-bold tracking-[0.14em] uppercase flex items-center gap-1.5 transition-all ${
              typeFilter === 'textbook'
                ? 'bg-[#7c3aed] text-white shadow-[0_0_12px_rgba(124,58,237,0.7)]'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] inline-block shadow-sm shadow-[#38bdf8]" />
            <span>Books</span>
          </button>
        </div>
      </div>

      {/* Floating Top-Right Controls: Reset Camera, Toggle HUD, Fullscreen */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pointer-events-auto">
        <button
          id="camera-reset-btn"
          onClick={resetCamera}
          title="Reset Camera Overview"
          className="p-2.5 astral-card-white hover:bg-gray-100 border-2 border-[#7c3aed] rounded-xl text-[#090a0f] transition-all shadow-lg flex items-center gap-1.5 text-xs font-['Syncopate',sans-serif] font-bold tracking-wider"
        >
          <RotateCcw className="w-4 h-4 text-[#7c3aed]" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          id="toggle-controls-btn"
          onClick={() => setShowControls(!showControls)}
          title="Toggle Simulation HUD"
          className={`p-2.5 astral-card-white border-2 border-[#7c3aed] rounded-xl transition-all shadow-lg text-xs font-['Syncopate',sans-serif] font-bold ${
            showControls
              ? 'bg-[#7c3aed] text-white shadow-[0_0_12px_rgba(124,58,237,0.5)]'
              : 'text-[#090a0f] hover:bg-gray-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
        </button>

        <button
          id="fullscreen-btn"
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          className="p-2.5 astral-card-white hover:bg-gray-100 border-2 border-[#7c3aed] rounded-xl text-[#090a0f] transition-all shadow-lg"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-[#7c3aed]" /> : <Maximize2 className="w-4 h-4 text-[#7c3aed]" />}
        </button>
      </div>

      {/* Draggable Simulation HUD & Dynamic Neural Core Panel */}
      {showControls && (
        <div
          ref={panelRef}
          id="cosmic-hud"
          style={{
            position: 'absolute',
            left: `${panelPos.x}px`,
            top: `${panelPos.y}px`,
          }}
          className={`z-20 w-84 rounded-2xl p-4 astral-card-white border-2 border-[#7c3aed] pointer-events-auto transition-shadow ${
            isDragging ? 'shadow-[0_28px_80px_rgba(0,0,0,0.95)] scale-[1.01]' : 'shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
          }`}
        >
          {/* Grab Handle Header */}
          <div
            onPointerDown={handleGrabPointerDown}
            onPointerMove={handleGrabPointerMove}
            onPointerUp={handleGrabPointerUp}
            className={`w-full flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#7c3aed]/30 select-none touch-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            title="Click and drag anywhere on this header to reposition the panel"
          >
            <div className="flex items-center gap-2">
              <GripHorizontal className="w-4 h-4 text-[#7c3aed]" />
              <span className="text-xs font-['Syncopate',sans-serif] font-bold text-[#090a0f] tracking-[0.14em] uppercase">
                Cosmic HUD
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-['Syncopate',sans-serif] font-bold text-white bg-[#090a0f] px-2 py-0.5 rounded border border-[#7c3aed]/50 uppercase tracking-wider">
                {isDragging ? 'MOVING' : 'DRAG'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPanelPos({ x: 20, y: 210 });
                }}
                title="Reset panel position"
                className="p-1 text-[#090a0f]/60 hover:text-[#7c3aed] rounded hover:bg-gray-100 transition-colors text-[10px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Orbital Freeze Status Indicator */}
          {isOrbitPaused && (
            <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-300 flex items-center justify-between text-[#090a0f]">
              <span className="flex items-center gap-1.5 text-[10px] font-['Syncopate',sans-serif] font-bold text-amber-900">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Orbit Paused</span>
              </span>
              <button
                onClick={resumeOrbitAndResetCamera}
                className="text-[9px] font-['Syncopate',sans-serif] font-bold px-2 py-0.5 rounded bg-[#090a0f] text-white hover:bg-[#1e293b] transition-all shadow-sm"
              >
                Resume Orbit
              </button>
            </div>
          )}

          {/* Planetary Orbital Revolution Speed Slider */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-['Syncopate',sans-serif] font-bold text-[#090a0f] tracking-[0.12em]">
              <Zap className="w-3.5 h-3.5 text-[#7c3aed]" />
              <span>Orbital Speed</span>
            </div>
            <span className="text-xs font-mono text-white font-bold px-2 py-0.5 rounded bg-[#090a0f] border border-[#7c3aed] shadow-sm">
              {orbitSpeedFactor.toFixed(1)}x
            </span>
          </div>

          <input
            id="orbital-speed-slider"
            type="range"
            min="0.2"
            max="3.0"
            step="0.1"
            value={orbitSpeedFactor}
            onChange={e => setOrbitSpeedFactor(parseFloat(e.target.value))}
            className="astral-slider-purple my-1.5 w-full"
          />

          <div className="flex justify-between text-[9px] text-[#090a0f]/75 mt-0.5 font-['Syncopate',sans-serif] tracking-wider">
            <span>Slow (0.2x)</span>
            <span>Cosmic (3.0x)</span>
          </div>

          {/* Dynamic Neural Core Thought-Gradient Breakdown */}
          <div className="mt-3 pt-2.5 border-t border-[#7c3aed]/20">
            <div className="flex items-center justify-between text-xs font-['Syncopate',sans-serif] font-bold text-[#090a0f] mb-1.5">
              <span className="flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-[#7c3aed]" />
                <span>Core Gradient</span>
              </span>
              <span className="text-[10px] text-[#7c3aed] font-mono font-bold">40% Glow</span>
            </div>

            {/* Visual Color Distribution Bar */}
            <div className="h-2 w-full rounded-full overflow-hidden flex bg-gray-200 my-1 border border-gray-300">
              <div style={{ width: `${categoryRatios.notes * 100}%` }} className="bg-[#a855f7] h-full" title={`Notes: ${Math.round(categoryRatios.notes * 100)}%`} />
              <div style={{ width: `${categoryRatios.diary * 100}%` }} className="bg-[#f59e0b] h-full" title={`Diary: ${Math.round(categoryRatios.diary * 100)}%`} />
              <div style={{ width: `${categoryRatios.goals * 100}%` }} className="bg-[#06b6d4] h-full" title={`Goals: ${Math.round(categoryRatios.goals * 100)}%`} />
              <div style={{ width: `${categoryRatios.textbook * 100}%` }} className="bg-[#38bdf8] h-full" title={`Books: ${Math.round(categoryRatios.textbook * 100)}%`} />
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-2 text-[10px] font-mono text-[#090a0f]/80">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#a855f7]" />
                <span>Notes: {Math.round(categoryRatios.notes * 100)}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                <span>Diary: {Math.round(categoryRatios.diary * 100)}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                <span>Goals: {Math.round(categoryRatios.goals * 100)}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                <span>Books: {Math.round(categoryRatios.textbook * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Selective Unreal Bloom Post-Processing Section */}
          <div className="mt-3 pt-2.5 border-t border-[#7c3aed]/20">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-['Syncopate',sans-serif] font-bold text-[#090a0f] tracking-[0.12em]">
                <Sparkles className="w-3.5 h-3.5 text-[#7c3aed]" />
                <span>Unreal Bloom</span>
              </div>
              <button
                id="toggle-bloom-btn"
                onClick={() => setBloomEnabled(!bloomEnabled)}
                className={`text-[9px] font-['Syncopate',sans-serif] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                  bloomEnabled
                    ? 'bg-[#7c3aed] text-white border-[#6d28d9] shadow-sm shadow-[#7c3aed]/40'
                    : 'bg-gray-100 text-[#090a0f] border-gray-300'
                }`}
              >
                {bloomEnabled ? 'GLOW ON' : 'OFF'}
              </button>
            </div>

            {bloomEnabled && (
              <div className="mt-2 animate-in fade-in">
                <div className="flex items-center justify-between text-[10px] text-[#090a0f]/80 font-['Syncopate',sans-serif] mb-1">
                  <span>Bloom Intensity</span>
                  <span className="text-[#7c3aed] font-bold font-mono text-xs">{bloomStrength.toFixed(2)}</span>
                </div>
                <input
                  id="bloom-intensity-slider"
                  type="range"
                  min="0.10"
                  max="1.20"
                  step="0.05"
                  value={bloomStrength}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setBloomStrength(val);
                    if (bloomPassRef.current) {
                      bloomPassRef.current.strength = val;
                    }
                  }}
                  className="astral-slider-purple my-1 w-full"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rocket Landing Telemetry Banner */}
      {isRocketLanding && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-[#090a0f]/95 border-2 border-[#7c3aed] text-white px-5 py-2 rounded-full shadow-[0_0_25px_rgba(124,58,237,0.7)] flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <Rocket className="w-4 h-4 text-[#38bdf8] animate-pulse" />
          <span className="text-xs font-['Syncopate',sans-serif] font-bold tracking-wider">
            LANDING POD DESCENDING TO {rocketLandingTitle.toUpperCase()}...
          </span>
          <span className="w-2 h-2 rounded-full bg-[#22d3ee] animate-ping" />
        </div>
      )}

      {/* Floating Hover Tooltip */}
      {hoveredNode && !selectedNode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 astral-card-white border-2 border-[#7c3aed] px-4 py-2.5 rounded-xl pointer-events-none flex items-center gap-3 animate-in fade-in shadow-[0_15px_40px_rgba(0,0,0,0.85)]">
          <span
            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: getNodeTheme(hoveredNode).hex }}
          />
          <div>
            <div className="text-xs font-['Syncopate',sans-serif] font-bold text-[#090a0f] flex items-center gap-2 tracking-wide">
              <span>{hoveredNode.isTextbook ? `🪐 ${hoveredNode.title}` : hoveredNode.title}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-[#7c3aed] text-white uppercase tracking-wider">
                {hoveredNode.isTextbook ? 'PLANET' : hoveredNode.type}
              </span>
            </div>
            <div className="text-[11px] text-[#090a0f]/75 font-mono mt-0.5">
              📁 {hoveredNode.filePath} • {hoveredNode.wordCount || 0} words {hoveredNode.pageCount ? `• ${hoveredNode.pageCount} pages` : ''}
            </div>
          </div>
          <span className="text-[10px] text-[#7c3aed] font-['Syncopate',sans-serif] font-bold pl-2 border-l border-[#7c3aed]/40 uppercase tracking-wider">
            Click to Land
          </span>
        </div>
      )}

      {/* Detailed Thought Preview Card:
          Anchored at bottom-center (bottom: 24px, left: 50%, transform: translateX(-50%))
          Compact design (max-width: 400px, reduced padding & typography) keeping upper 75% of viewport open.
          Crisp white background with high-contrast dark charcoal/black text (#0F172A) */}
      {selectedNode && showDetailModal && (
        <div
          id="planetary-node-inspector"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          className="z-20 w-[90%] max-w-[400px] bg-white border-2 border-[#0F172A] rounded-2xl p-3 pointer-events-auto transition-all animate-in fade-in slide-in-from-bottom-4 shadow-[0_20px_50px_rgba(0,0,0,0.92)] text-[#0F172A]"
        >
          {/* Card Header */}
          <div className="flex items-start justify-between gap-2 mb-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0"
                style={{ backgroundColor: getNodeTheme(selectedNode).hex }}
              />
              <div>
                <h3 className="text-xs sm:text-sm font-['Syncopate',sans-serif] font-bold text-[#0F172A] leading-snug flex items-center gap-1.5 tracking-wide">
                  <span>{selectedNode.isTextbook ? `🪐 ${selectedNode.title}` : selectedNode.title}</span>
                  {selectedNode.isTextbook && (
                    <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-[#7c3aed] text-white font-['Syncopate',sans-serif] font-bold">
                      PDF • {selectedNode.pageCount || 1}p
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-[#0F172A] font-mono mt-0.5">
                  <span className="capitalize font-bold text-[#7c3aed]">
                    {selectedNode.isTextbook ? 'Textbook' : selectedNode.type}
                  </span>
                  <span>•</span>
                  <span className="truncate max-w-[170px]">📁 {selectedNode.filePath}</span>
                </div>
              </div>
            </div>

            <button
              id="close-inspector-btn"
              onClick={resumeOrbitAndResetCamera}
              className="text-[#0F172A] hover:bg-slate-100 p-1 rounded-md text-xs font-bold transition-colors border border-slate-200 shrink-0"
              title="Close inspector & resume orbit"
            >
              ✕
            </button>
          </div>

          {/* Snippet Preview with high contrast text */}
          <div className="my-2 text-[10.5px] text-[#0F172A] line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-200 font-mono leading-relaxed max-h-16 overflow-hidden">
            {selectedNode.content.replace(/^#+ /gm, '').slice(0, 180)}...
          </div>

          {/* Tags */}
          {selectedNode.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedNode.tags.slice(0, 4).map(tag => (
                <span
                  key={tag}
                  className="text-[8.5px] font-['Syncopate',sans-serif] px-2 py-0.5 rounded-full bg-slate-100 text-[#0F172A] border border-slate-300 font-semibold tracking-wide"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Planetary Orbital Metrics */}
          <div className="mb-2.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between text-[10px] font-mono text-[#0F172A]">
            <span className="flex items-center gap-1.5">
              <Rocket className="w-3 h-3 text-[#7c3aed]" />
              <span className="font-['Syncopate',sans-serif] font-bold text-[9px]">Lander:</span>
              <span className="text-emerald-700 font-bold">TOP POLE DOCKED</span>
            </span>
            <span>Track: {Math.round(selectedNode.orbitalRadius || 40)} AU</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 gap-1.5">
            <div className="flex items-center gap-1.5">
              <button
                id="orbit-view-btn"
                onClick={resumeOrbitAndResetCamera}
                className="px-2.5 py-1 text-[10px] font-['Syncopate',sans-serif] font-bold rounded-md bg-[#0F172A] hover:bg-[#1E293B] text-white border border-[#0F172A] flex items-center gap-1 transition-all shadow-sm tracking-wider"
                title="Return to orbital overview"
              >
                <Compass className="w-3 h-3 text-[#22d3ee]" />
                <span>Orbit View</span>
              </button>
              {selectedNode.pdfUrl && (
                <a
                  href={selectedNode.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-[10px] font-['Syncopate',sans-serif] font-bold rounded-md bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-slate-300 flex items-center gap-1 transition-all tracking-wider"
                >
                  <BookOpen className="w-3 h-3 text-[#7c3aed]" />
                  <span>PDF</span>
                </a>
              )}
            </div>

            <button
              id="open-in-workspace-btn"
              onClick={() => {
                const targetTab = selectedNode.type === 'diary' ? 'diary' : (selectedNode.type === 'goal' ? 'goals' : 'writing');
                onOpenWorkspace(targetTab, selectedNode.id);
              }}
              className="px-3 py-1 text-[10px] font-['Syncopate',sans-serif] font-bold rounded-md bg-[#7c3aed] hover:bg-[#6d28d9] text-white flex items-center gap-1 transition-all shadow-md shadow-[#7c3aed]/30 active:scale-95 tracking-wider"
            >
              <span>Open in {selectedNode.type === 'diary' ? 'Diary' : (selectedNode.type === 'goal' ? 'Goals' : 'Notes')}</span>
              <ExternalLink className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Hints */}
      <div className="absolute bottom-3 right-4 z-10 hidden sm:flex items-center gap-3 text-[10px] text-white/85 font-['Syncopate',sans-serif] bg-[#090a0f]/90 border border-[#7c3aed]/50 px-3.5 py-1.5 rounded-lg pointer-events-none shadow-lg tracking-wider">
        <span>🖱️ Drag to Orbit</span>
        <span>•</span>
        <span>Scroll to Zoom</span>
        <span>•</span>
        <span>Right-click to Pan</span>
      </div>
    </div>
  );
};
