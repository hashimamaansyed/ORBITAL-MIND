import * as THREE from 'three';

export interface SpotlightBeaconOptions {
  height?: number;
  radiusBottom?: number;
  radiusTop?: number;
  colorCyan?: THREE.Color;
  colorViolet?: THREE.Color;
  intensity?: number;
  nodeId?: string;
}

/**
 * Vertical Spotlight Beacon Class
 *
 * Casts a translucent vertical light cylinder projecting upward into space
 * with a fading gradient, radiant pure-white (#FFFFFF) laser core,
 * and atmospheric cyan-to-violet volumetric sheath.
 * Unobstructed seamless 360° void without floor planes or residual grid lines.
 */
export class SpotlightBeacon {
  public group: THREE.Group;
  public beamMesh: THREE.Mesh;
  public pointLight?: THREE.PointLight;
  public beamMaterial: THREE.ShaderMaterial;
  public nodeId?: string;

  private height: number;
  private baseIntensity: number;

  constructor(
    position: THREE.Vector3 | [number, number, number],
    options: SpotlightBeaconOptions = {}
  ) {
    const {
      height = 42,
      radiusBottom = 2.8,
      radiusTop = 0.45,
      colorCyan = new THREE.Color('#22D3EE'),
      colorViolet = new THREE.Color('#C084FC'),
      intensity = 1.0,
      nodeId,
    } = options;

    this.height = height;
    this.baseIntensity = intensity;
    this.nodeId = nodeId;
    this.group = new THREE.Group();

    if (Array.isArray(position)) {
      this.group.position.set(...position);
    } else {
      this.group.position.copy(position);
    }

    // 1. Procedural Cylinder Geometry (translated so origin is at the base of the node)
    const beamGeo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 36, 1, true);
    beamGeo.translate(0, height / 2, 0);

    // 2. Custom GLSL Beam Shader with Vertical Fading Gradient & Glowing Core
    this.beamMaterial = new THREE.ShaderMaterial({
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
          // Vertical atmospheric attenuation (smooth quadratic fade to space apex)
          float heightFactor = vUv.y;
          float verticalFade = pow(clamp(1.0 - heightFactor, 0.0, 1.0), 1.45);

          // Luminous laser beam with balanced falloff (no blinding blowout)
          float rim = 1.0 - abs(dot(vNormal, vViewDir));
          float coreFactor = pow(clamp(rim, 0.0, 1.0), 5.2);

          // Cyan (#06B6D4 / #22D3EE) to Violet (#A855F7 / #C084FC) atmospheric sheath gradient
          float gradientMix = clamp(heightFactor * 1.5 + 0.15 * sin(uTime * 2.2), 0.0, 1.0);
          vec3 atmosphericHalo = mix(uHaloCyan, uHaloViolet, gradientMix);

          // Upward harmonic energy ripples travelling along the vertical beam
          float ripple = sin(heightFactor * 32.0 - uTime * 7.0) * 0.10;
          float microPulse = sin(heightFactor * 65.0 - uTime * 14.0) * 0.05;

          // Radiant white core blend capped to prevent bloom blowout
          vec3 pureWhite = vec3(0.95, 0.95, 1.0);
          vec3 beamColor = mix(atmosphericHalo, pureWhite, coreFactor * 0.70);

          // Dynamic breathing pulse
          float pulseIntensity = 0.85 + 0.15 * sin(uTime * 3.6);

          float alpha = (coreFactor * 0.65 + pow(rim, 2.2) * 0.35 + ripple + microPulse)
                        * verticalFade
                        * pulseIntensity
                        * uBaseIntensity;

          alpha = clamp(alpha, 0.0, 0.85);

          // Controlled luminance so Unreal Bloom does not wash out canvas
          gl_FragColor = vec4(beamColor * (0.85 + coreFactor * 0.35), alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uHaloCyan: { value: colorCyan.clone() },
        uHaloViolet: { value: colorViolet.clone() },
        uBaseIntensity: { value: intensity },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.beamMesh = new THREE.Mesh(beamGeo, this.beamMaterial);
    this.group.add(this.beamMesh);

    // 3. Subtle Base Point Light for spatial immersion on adjacent nodes
    this.pointLight = new THREE.PointLight(colorCyan.getHex(), intensity * 0.8, 16, 2.0);
    this.pointLight.position.set(0, 1.5, 0);
    this.group.add(this.pointLight);
  }

  /**
   * Update the beacon uniforms and slow axial rotation
   */
  public update(elapsedTime: number, delta: number): void {
    if (this.beamMaterial.uniforms?.uTime) {
      this.beamMaterial.uniforms.uTime.value = elapsedTime;
    }
    // Slow atmospheric swirl
    this.group.rotation.y += delta * 0.85;
  }

  /**
   * Set overall intensity multiplier
   */
  public setIntensity(val: number): void {
    this.baseIntensity = val;
    if (this.beamMaterial.uniforms?.uBaseIntensity) {
      this.beamMaterial.uniforms.uBaseIntensity.value = val;
    }
    if (this.pointLight) {
      this.pointLight.intensity = val * 0.8;
    }
  }

  /**
   * Dispose all geometries, materials, and remove from parent
   */
  public dispose(): void {
    if (this.beamMesh) {
      this.beamMesh.geometry.dispose();
      this.beamMaterial.dispose();
    }
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
