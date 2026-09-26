import * as THREE from 'three';

/**
 * Dedicated 3D Rocket Lander Mesh and Touchdown Controller.
 * Features:
 * 1. Distinct 3D rocket lander (THREE.Group) featuring:
 *    - Metallic white body (fuselage + command nosecone + visor)
 *    - Electric purple aerodynamic fins and trim collars
 *    - Articulated titanium landing legs with circular footpads
 *    - Glowing thruster light (THREE.PointLight) and engine nozzle
 *    - Luminous retro-burn thruster exhaust and surface touchdown halo
 * 2. Precise Scaling & Depth Testing:
 *    - Scaled relative to target planet radius (e.g., rocket.scale.set(0.15, 0.15, 0.15))
 *    - renderOrder = 999 and depthTest = true on all materials so it renders cleanly
 *      in front of the Neural Core, planet glow auras, and starfield without clipping.
 * 3. Surface Touchdown Positioning:
 *    - Landed footpads rest at y = 0 locally, so positioning at
 *      lander.position.set(planet.position.x, planet.position.y + planetRadius, planet.position.z)
 *      places it directly on the planet's top pole surface.
 * 4. Touchdown State Cleanup & Unmount:
 *    - Brief thrust-off flare-and-fade animation before cleanly removing and disposing.
 */

export interface RocketFlightParams {
  startPos?: THREE.Vector3;
  targetPos: THREE.Vector3;
  targetRadius: number;
  duration?: number;
  onComplete?: () => void;
  stationed?: boolean;
}

export class PlanetaryRocket {
  public group: THREE.Group;
  public thrusterLight: THREE.PointLight;
  public thrusterPlume: THREE.Mesh;
  public touchdownBeacon: THREE.Mesh;
  public targetRadius: number;
  public rocketScale: number;

  private targetPos: THREE.Vector3;
  private isFinished: boolean = false;
  private isThrustingOff: boolean = false;
  private thrustOffProgress: number = 0;
  private thrustOffDuration: number = 0.24; // 240ms quick thrust-off animation
  private onThrustOffComplete?: () => void;
  private parentScene?: THREE.Scene;

  // Track all created geometries & materials for leak-free disposal
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  constructor(params: RocketFlightParams) {
    this.group = new THREE.Group();
    this.targetPos = params.targetPos.clone();
    this.targetRadius = params.targetRadius;

    // Scale lander relative to target planet radius (e.g., ~0.15 for standard radius ~0.90)
    // Scaled relative to planet radius: scale = targetRadius * 0.165 (clamped between 0.14 and 0.26)
    this.rocketScale = Math.max(0.14, Math.min(0.26, this.targetRadius * 0.165));
    this.group.scale.set(this.rocketScale, this.rocketScale, this.rocketScale);

    // Ensure entire root lander group has top render order
    this.group.renderOrder = 999;

    // -------------------------------------------------------------
    // 1. Rocket Lander Sub-Components Construction
    // Coordinates: Footpads sit squarely at y = 0.0
    // Total unscaled height: ~2.1 units from footpads (y=0) to nose tip (y=2.1)
    // -------------------------------------------------------------

    // --- A. Fuselage Body (Metallic White) ---
    const bodyGeo = new THREE.CylinderGeometry(0.30, 0.40, 1.15, 20);
    this.geometries.push(bodyGeo);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Metallic white (#F8FAFC)
      metalness: 0.88,
      roughness: 0.18,
      depthTest: true,
      depthWrite: true,
    });
    this.materials.push(bodyMat);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.95;
    bodyMesh.renderOrder = 999;
    this.group.add(bodyMesh);

    // --- B. Command Capsule / Nosecone (Metallic White + Chrome) ---
    const noseGeo = new THREE.ConeGeometry(0.30, 0.60, 20);
    this.geometries.push(noseGeo);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.92,
      roughness: 0.15,
      depthTest: true,
      depthWrite: true,
    });
    this.materials.push(noseMat);
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.position.y = 1.525 + 0.30; // Base at 1.525, tip at 2.125
    noseMesh.renderOrder = 999;
    this.group.add(noseMesh);

    // Nosecone decorative electric purple ring collar
    const collarGeo = new THREE.TorusGeometry(0.302, 0.024, 8, 24);
    collarGeo.rotateX(Math.PI / 2);
    this.geometries.push(collarGeo);
    const purpleCollarMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7, // Electric purple (#A855F7)
      emissive: 0x581c87,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.25,
      depthTest: true,
      depthWrite: true,
    });
    this.materials.push(purpleCollarMat);
    const collarMesh = new THREE.Mesh(collarGeo, purpleCollarMat);
    collarMesh.position.y = 1.525;
    collarMesh.renderOrder = 999;
    this.group.add(collarMesh);

    // Visor / Sensor Porthole Window
    const visorGeo = new THREE.SphereGeometry(0.10, 12, 12);
    visorGeo.scale(1.0, 0.65, 0.45);
    this.geometries.push(visorGeo);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Deep slate-black sensor visor
      metalness: 0.95,
      roughness: 0.08,
      depthTest: true,
      depthWrite: true,
    });
    this.materials.push(visorMat);
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 1.62, 0.27);
    visorMesh.renderOrder = 999;
    this.group.add(visorMesh);

    // --- C. Electric Purple Aerodynamic Fins (4 radially spaced at 90°) ---
    const finShape = new THREE.BoxGeometry(0.06, 0.65, 0.42);
    this.geometries.push(finShape);
    const finMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7, // Electric Purple (#A855F7)
      emissive: 0x6b21a8,
      emissiveIntensity: 0.4,
      metalness: 0.75,
      roughness: 0.22,
      depthTest: true,
      depthWrite: true,
    });
    this.materials.push(finMat);

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const fin = new THREE.Mesh(finShape, finMat);
      fin.position.set(Math.sin(angle) * 0.46, 0.85, Math.cos(angle) * 0.46);
      fin.rotation.y = -angle;
      fin.renderOrder = 999;
      this.group.add(fin);
    }

    // --- D. Landing Legs (4 Articulated Struts with Footpads at y = 0) ---
    const strutMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Slate Titanium Strut
      metalness: 0.85,
      roughness: 0.25,
      depthTest: true,
      depthWrite: true,
    });
    this.materials.push(strutMat);

    const padMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark slate titanium footpad
      metalness: 0.9,
      roughness: 0.2,
      depthTest: true,
      depthWrite: true,
    });
    this.materials.push(padMat);

    const footpadGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16);
    this.geometries.push(footpadGeo);

    const strutGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.72, 8);
    this.geometries.push(strutGeo);

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4; // Offset 45° from fins
      const legGroup = new THREE.Group();

      // Footpad positioned so the bottom is exactly at y = 0.0 (height 0.04, center at 0.02)
      const pad = new THREE.Mesh(footpadGeo, padMat);
      pad.position.set(0, 0.02, 0);
      pad.renderOrder = 999;
      legGroup.add(pad);

      // Angled diagonal shock-absorber strut reaching up to the lower fuselage
      const strut = new THREE.Mesh(strutGeo, strutMat);
      strut.position.set(0, 0.35, -0.16);
      strut.rotation.x = 0.48; // Angle backward toward fuselage
      strut.renderOrder = 999;
      legGroup.add(strut);

      // Position footpad outward radially from center
      const radialDist = 0.62;
      legGroup.position.set(Math.sin(angle) * radialDist, 0, Math.cos(angle) * radialDist);
      legGroup.rotation.y = -angle;
      legGroup.renderOrder = 999;
      this.group.add(legGroup);
    }

    // --- E. Thruster Engine Nozzle (Dark Titanium) ---
    const nozzleGeo = new THREE.CylinderGeometry(0.24, 0.18, 0.26, 16);
    this.geometries.push(nozzleGeo);
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.96,
      roughness: 0.12,
      depthTest: true,
      depthWrite: true,
    });
    this.materials.push(nozzleMat);
    const nozzleMesh = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzleMesh.position.y = 0.28;
    nozzleMesh.renderOrder = 999;
    this.group.add(nozzleMesh);

    // --- F. Glowing Thruster Light (THREE.PointLight) ---
    // Emits warm electric purple/cyan glow near the nozzle
    this.thrusterLight = new THREE.PointLight(0xa855f7, 0.85, 7, 2);
    this.thrusterLight.position.set(0, 0.15, 0);
    this.group.add(this.thrusterLight);

    // --- G. Thruster Exhaust Flame / Retro Glow ---
    const plumeGeo = new THREE.ConeGeometry(0.16, 0.32, 16);
    plumeGeo.rotateX(Math.PI);
    this.geometries.push(plumeGeo);
    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc, // Electric Lilac Flame
      transparent: true,
      opacity: 0.85,
      depthTest: true,
      depthWrite: true,
      blending: THREE.AdditiveBlending,
    });
    this.materials.push(plumeMat);
    this.thrusterPlume = new THREE.Mesh(plumeGeo, plumeMat);
    this.thrusterPlume.position.y = 0.10;
    this.thrusterPlume.renderOrder = 999;
    this.group.add(this.thrusterPlume);

    // --- H. Surface Touchdown Halo Ring at footpad ground plane (y = 0.01) ---
    const beaconGeo = new THREE.RingGeometry(0.38, 0.72, 32);
    beaconGeo.rotateX(-Math.PI / 2);
    this.geometries.push(beaconGeo);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
    });
    this.materials.push(beaconMat);
    this.touchdownBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    this.touchdownBeacon.position.y = 0.01;
    this.touchdownBeacon.renderOrder = 999;
    this.group.add(this.touchdownBeacon);

    // Enforce depthTest, depthWrite, and renderOrder = 999 across all children
    this.applyDepthTestAndRenderOrder();

    // If stationed mode requested, set initial position on top pole surface
    if (params.stationed) {
      this.positionOnSurface(this.targetPos, this.targetRadius);
      this.isFinished = true;
      this.thrusterPlume.scale.set(0.4, 0.4, 0.4);
      this.thrusterLight.intensity = 0.35;
      if (params.onComplete) {
        params.onComplete();
      }
    } else if (params.startPos) {
      this.group.position.copy(params.startPos);
    }
  }

  /**
   * Recursively ensures renderOrder = 999 and depthTest = true on all lander materials
   * so it renders cleanly in front of the Neural Core and planet glow without clipping.
   */
  private applyDepthTestAndRenderOrder(): void {
    this.group.renderOrder = 999;
    this.group.traverse((child) => {
      child.renderOrder = 999;
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.renderOrder = 999;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            mat.depthTest = true;
            mat.depthWrite = true;
          });
        } else if (mesh.material) {
          mesh.material.depthTest = true;
          mesh.material.depthWrite = true;
        }
      }
    });
  }

  /**
   * Top-Pole Surface Docking:
   * Positions the rocket lander directly on the planet surface along its vertical local Y-axis offset:
   * lander.position.set(planet.position.x, planet.position.y + planetRadius, planet.position.z)
   */
  public positionOnSurface(planetPos: THREE.Vector3, planetRadius: number): void {
    this.group.position.set(
      planetPos.x,
      planetPos.y + planetRadius,
      planetPos.z
    );
    this.group.rotation.set(0, 0, 0);
  }

  /**
   * Triggers a brief thrust-off flare-and-fade animation and disposes the mesh.
   */
  public triggerThrustOffAnimation(scene: THREE.Scene, onComplete?: () => void): void {
    this.isThrustingOff = true;
    this.thrustOffProgress = 0;
    this.parentScene = scene;
    this.onThrustOffComplete = onComplete;

    // Flare up thruster light for immediate visual responsiveness
    this.thrusterLight.intensity = 1.2;
    this.thrusterPlume.visible = true;
    this.thrusterPlume.scale.set(1.4, 1.4, 1.4);
  }

  /**
   * Frame update for idle subtle thruster flicker or thrust-off animation.
   */
  public update(delta: number, elapsedTime: number): boolean {
    if (this.isThrustingOff) {
      this.thrustOffProgress += delta / this.thrustOffDuration;
      const t = Math.min(1.0, this.thrustOffProgress);

      // Brief thrust-off animation: flare then extinguish, lift off slightly, fade beacon
      const flareDown = Math.max(0, 1.0 - t);
      this.thrusterLight.intensity = 1.2 * flareDown;
      this.thrusterPlume.scale.set(flareDown, flareDown, flareDown);

      // Gentle upward push before disappearance
      this.group.position.y += delta * 1.6;

      const beaconMat = this.touchdownBeacon.material as THREE.MeshBasicMaterial;
      if (beaconMat) {
        beaconMat.opacity = 0.52 * flareDown;
      }

      if (t >= 1.0) {
        if (this.parentScene && this.group.parent) {
          this.parentScene.remove(this.group);
        }
        this.dispose();
        if (this.onThrustOffComplete) {
          this.onThrustOffComplete();
        }
        return true;
      }
      return false;
    }

    // Idle landed state: gentle subtle thruster breathing
    if (this.isFinished) {
      const pulse = 0.85 + 0.15 * Math.sin(elapsedTime * 6.0);
      this.thrusterLight.intensity = 0.35 * pulse;
      const beaconMat = this.touchdownBeacon.material as THREE.MeshBasicMaterial;
      if (beaconMat) {
        beaconMat.opacity = 0.40 + 0.15 * Math.sin(elapsedTime * 4.0);
      }
      return false;
    }

    return false;
  }

  /**
   * Complete memory cleanup: disposes all geometries and materials.
   */
  public dispose(): void {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }

    this.geometries.forEach((geo) => {
      try {
        geo.dispose();
      } catch {
        // ignore already disposed
      }
    });
    this.geometries = [];

    this.materials.forEach((mat) => {
      try {
        mat.dispose();
      } catch {
        // ignore already disposed
      }
    });
    this.materials = [];
  }
}
