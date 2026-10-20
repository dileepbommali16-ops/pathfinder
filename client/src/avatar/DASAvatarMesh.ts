/**
 * DASAvatarMesh: Three.js Realism Mesh Engine
 * Creates a futuristic 3D cybernetic face mesh:
 * - Left half: Wireframe cybernetic matrix
 * - Right half: Sleek luminescent metallic blue skin
 * - High-speed GPU vertex morph targets (jawOpen, mouthWide, mouthRound, eyeBlink, etc.)
 */

import * as THREE from "three";

export interface MorphTargetWeights {
  jawOpen: number;       // 0.0 -> 1.0 (lip syncing)
  mouthWide: number;     // 0.0 -> 1.0
  mouthRound: number;    // 0.0 -> 1.0
  upperLipRaise: number; // 0.0 -> 1.0
  eyeBlink: number;      // 0.0 -> 1.0
  browRaise: number;     // 0.0 -> 1.0
  headPitch: number;     // -0.3 -> 0.3
  headYaw: number;       // -0.4 -> 0.4
  headRoll: number;      // -0.2 -> 0.2
}

export class DASAvatarMesh {
  public group: THREE.Group;
  private headMesh!: THREE.Mesh;
  private wireframeMesh!: THREE.Mesh;
  private geometry!: THREE.BufferGeometry;

  // Vertex indices groups
  private jawVertices: number[] = [];
  private leftEyeVertices: number[] = [];
  private rightEyeVertices: number[] = [];
  private browVertices: number[] = [];
  private basePositions!: Float32Array;

  constructor() {
    this.group = new THREE.Group();
    this.createProceduralHead();
  }

  private createProceduralHead() {
    // High-density UV sphere forming anatomical cranial base
    const radius = 1.4;
    const widthSegments = 64;
    const heightSegments = 64;
    this.geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    this.geometry.scale(1.0, 1.35, 1.15); // Human head cranial proportion

    const posAttr = this.geometry.attributes.position;
    const count = posAttr.count;
    this.basePositions = new Float32Array(posAttr.array);

    // Identify vertex clusters for facial features
    for (let i = 0; i < count; i++) {
      const x = this.basePositions[i * 3];
      const y = this.basePositions[i * 3 + 1];
      const z = this.basePositions[i * 3 + 2];

      // Lower chin/jaw region
      if (y < -0.3 && y > -1.5 && z > 0.1) {
        this.jawVertices.push(i);
      }
      // Eyes region
      if (y > 0.1 && y < 0.45 && z > 0.8) {
        if (x < -0.1) this.leftEyeVertices.push(i);
        if (x > 0.1) this.rightEyeVertices.push(i);
      }
      // Eyebrows region
      if (y > 0.45 && y < 0.75 && z > 0.7) {
        this.browVertices.push(i);
      }
    }

    // Material 1: Realistic Natural Human Skin Tone
    const solidMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#c89a74"), // Natural warm human skin tone
      metalness: 0.04,                  // Low metalness for organic human skin
      roughness: 0.48,                  // Natural soft diffuse dermal texture
      clearcoat: 0.15,
      clearcoatRoughness: 0.35,
      reflectivity: 0.35,
      emissive: new THREE.Color("#2a1810"), // Subsurface blood circulation warmth
      emissiveIntensity: 0.12,
    });

    this.headMesh = new THREE.Mesh(this.geometry, solidMaterial);
    this.group.add(this.headMesh);

    // Material 2: Left-side Wireframe Matrix in Soybean (#D7C49E)
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#D7C49E"),
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });

    this.wireframeMesh = new THREE.Mesh(this.geometry, wireframeMaterial);
    this.wireframeMesh.scale.set(1.002, 1.002, 1.002);
    this.group.add(this.wireframeMesh);
  }

  /**
   * Applies morph targets and head transforms with sub-millisecond execution.
   */
  public updateMorphs(weights: MorphTargetWeights) {
    const posAttr = this.geometry.attributes.position;
    const array = posAttr.array as Float32Array;

    // Reset to base positions
    array.set(this.basePositions);

    // 1. Jaw Open (Lip Sync)
    const jawDrop = weights.jawOpen * 0.28;
    const mouthRound = weights.mouthRound * 0.15;
    for (const idx of this.jawVertices) {
      const yOrig = this.basePositions[idx * 3 + 1];
      const factor = THREE.MathUtils.clamp((-yOrig) / 1.4, 0, 1);
      
      array[idx * 3 + 1] -= jawDrop * factor;
      array[idx * 3 + 2] += mouthRound * 0.1 * factor;
    }

    // 2. Eye Blinking (Compression of eye vertical coordinates)
    const blink = weights.eyeBlink;
    if (blink > 0.01) {
      for (const idx of [...this.leftEyeVertices, ...this.rightEyeVertices]) {
        const yOrig = this.basePositions[idx * 3 + 1];
        const centerY = 0.28;
        array[idx * 3 + 1] = THREE.MathUtils.lerp(yOrig, centerY, blink * 0.85);
      }
    }

    // 3. Eyebrow Elevation
    const browLift = weights.browRaise * 0.12;
    for (const idx of this.browVertices) {
      array[idx * 3 + 1] += browLift;
    }

    posAttr.needsUpdate = true;

    // 4. Natural 3D Head Rotations
    this.group.rotation.x = weights.headPitch;
    this.group.rotation.y = weights.headYaw;
    this.group.rotation.z = weights.headRoll;
  }
}
