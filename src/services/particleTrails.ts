import * as THREE from 'three';
import { ConnectionEdge, ThoughtNode, ThoughtType } from '../types';
import { PALETTE } from './materialMatrix';

interface OrbitItemLike {
  container: THREE.Group;
  thought: ThoughtNode;
}

export class ParticleTrailsSystem {
  public group: THREE.Group;
  private lineGeometry: THREE.BufferGeometry;
  private lineMaterial: THREE.LineBasicMaterial;
  private lineSegments: THREE.LineSegments | null = null;

  private instancedMesh: THREE.InstancedMesh | null = null;
  private dummy: THREE.Object3D;
  private currentEdges: ConnectionEdge[] = [];
  private particlesPerEdge = 2;
  private maxEdges = 120;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'particle-trails-system';

    this.dummy = new THREE.Object3D();
    this.lineGeometry = new THREE.BufferGeometry();
    this.lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.40,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  /**
   * Reconfigures buffers when connection edges change due to sensitivity slider or filtering.
   */
  public updateEdges(edges: ConnectionEdge[], thoughtsMap: Map<string, OrbitItemLike>) {
    // Cap edges to maxEdges for consistent 60 FPS performance
    const validEdges = edges.filter(e => thoughtsMap.has(e.sourceId) && thoughtsMap.has(e.targetId)).slice(0, this.maxEdges);
    this.currentEdges = validEdges;

    // 1. Rebuild LineSegments
    if (this.lineSegments) {
      this.group.remove(this.lineSegments);
      this.lineSegments.geometry.dispose();
      this.lineSegments = null;
    }

    if (validEdges.length > 0) {
      const positions = new Float32Array(validEdges.length * 6);
      const colors = new Float32Array(validEdges.length * 6);

      validEdges.forEach((edge, idx) => {
        const itemA = thoughtsMap.get(edge.sourceId);
        const itemB = thoughtsMap.get(edge.targetId);

        const colorA = this.getTypeColor(itemA?.thought.type || 'note');
        const colorB = this.getTypeColor(itemB?.thought.type || 'note');

        const i6 = idx * 6;
        colors[i6] = colorA.r;
        colors[i6 + 1] = colorA.g;
        colors[i6 + 2] = colorA.b;
        colors[i6 + 3] = colorB.r;
        colors[i6 + 4] = colorB.g;
        colors[i6 + 5] = colorB.b;
      });

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      this.lineSegments = new THREE.LineSegments(geo, this.lineMaterial);
      this.group.add(this.lineSegments);
    }

    // 2. Rebuild Instanced Flowing Light Particles
    if (this.instancedMesh) {
      this.group.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      (this.instancedMesh.material as THREE.Material).dispose();
      this.instancedMesh = null;
    }

    const totalParticles = validEdges.length * this.particlesPerEdge;
    if (totalParticles > 0) {
      const particleGeo = new THREE.SphereGeometry(0.18, 8, 8);
      const particleMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      this.instancedMesh = new THREE.InstancedMesh(particleGeo, particleMat, totalParticles);
      this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      // Pre-set instance colors
      validEdges.forEach((edge, eIdx) => {
        const itemA = thoughtsMap.get(edge.sourceId);
        const color = this.getTypeColor(itemA?.thought.type || 'note');
        for (let p = 0; p < this.particlesPerEdge; p++) {
          const instanceIdx = eIdx * this.particlesPerEdge + p;
          this.instancedMesh!.setColorAt(instanceIdx, color);
        }
      });

      if (this.instancedMesh.instanceColor) {
        this.instancedMesh.instanceColor.needsUpdate = true;
      }

      this.group.add(this.instancedMesh);
    }
  }

  /**
   * Called every frame in requestAnimationFrame to animate flowing light particles
   * and sync lines with live revolving planet positions.
   */
  public update(
    delta: number,
    elapsedTime: number,
    thoughtsMap: Map<string, OrbitItemLike>,
    hasSearchActive: boolean,
    matchingThoughtIds: Set<string>
  ) {
    if (this.currentEdges.length === 0) return;

    let posAttr: THREE.BufferAttribute | null = null;
    if (this.lineSegments && this.lineSegments.geometry.attributes.position) {
      posAttr = this.lineSegments.geometry.attributes.position as THREE.BufferAttribute;
    }

    const posArray = posAttr ? (posAttr.array as Float32Array) : null;
    let particleIdx = 0;

    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const arc = new THREE.Vector3();
    const currentPos = new THREE.Vector3();

    for (let eIdx = 0; eIdx < this.currentEdges.length; eIdx++) {
      const edge = this.currentEdges[eIdx];
      const itemA = thoughtsMap.get(edge.sourceId);
      const itemB = thoughtsMap.get(edge.targetId);

      if (!itemA || !itemB) continue;

      vA.copy(itemA.container.position);
      vB.copy(itemB.container.position);

      // Update line segment positions
      if (posArray) {
        const i6 = eIdx * 6;
        posArray[i6] = vA.x;
        posArray[i6 + 1] = vA.y;
        posArray[i6 + 2] = vA.z;
        posArray[i6 + 3] = vB.x;
        posArray[i6 + 4] = vB.y;
        posArray[i6 + 5] = vB.z;
      }

      const isConnectedToMatch = matchingThoughtIds.has(edge.sourceId) || matchingThoughtIds.has(edge.targetId);
      const isDimmed = hasSearchActive && !isConnectedToMatch;

      // Update instanced particles flowing along this edge
      if (this.instancedMesh) {
        for (let p = 0; p < this.particlesPerEdge; p++) {
          const instanceIdx = particleIdx++;
          if (isDimmed) {
            // Collapse dimmed particles so they don't visually clutter during search
            this.dummy.position.set(0, -9999, 0);
            this.dummy.scale.set(0.001, 0.001, 0.001);
            this.dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(instanceIdx, this.dummy.matrix);
            continue;
          }

          // Flow progression t from 0 to 1
          const speed = 0.35 + (edge.similarity - 0.3) * 0.25;
          const phase = p / this.particlesPerEdge;
          const t = (elapsedTime * speed + phase) % 1.0;

          // Interpolated position along edge with gentle upward cosmic arc
          currentPos.lerpVectors(vA, vB, t);
          mid.addVectors(vA, vB).multiplyScalar(0.5);
          const arcLift = Math.sin(t * Math.PI) * Math.min(2.5, vA.distanceTo(vB) * 0.12);
          arc.set(0, arcLift, 0);
          currentPos.add(arc);

          this.dummy.position.copy(currentPos);

          // Subtle pulse
          const pulse = 0.85 + 0.35 * Math.sin(elapsedTime * 6.0 + instanceIdx);
          const scale = (isConnectedToMatch ? 1.4 : 1.0) * pulse;
          this.dummy.scale.set(scale, scale, scale);
          this.dummy.updateMatrix();

          this.instancedMesh.setMatrixAt(instanceIdx, this.dummy.matrix);
        }
      }
    }

    if (posAttr) {
      posAttr.needsUpdate = true;
    }

    if (this.instancedMesh) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private getTypeColor(type: ThoughtType): THREE.Color {
    switch (type) {
      case 'diary':
        return PALETTE.accents.amber.three; // Warm Amber
      case 'goal':
        return PALETTE.accents.cyan.three; // Vibrant Cyan
      case 'note':
      default:
        return PALETTE.accents.violet.three; // Electric Violet
    }
  }

  public dispose() {
    if (this.lineSegments) {
      this.group.remove(this.lineSegments);
      this.lineSegments.geometry.dispose();
      this.lineSegments = null;
    }
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();

    if (this.instancedMesh) {
      this.group.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      (this.instancedMesh.material as THREE.Material).dispose();
      this.instancedMesh = null;
    }
  }
}
