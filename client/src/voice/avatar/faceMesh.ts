/**
 * 3D Face Mesh Geometry & UV Mapping (client/src/voice/avatar/faceMesh.ts)
 * Creates the sleek Cobalt Blue & Cyan 3D Cybernetic Wireframe Male Head.
 * Features:
 * - High-density wireframe cranial matrix
 * - Dark inner absorption core for true 3D holographic depth
 * - Eyelid shutter meshes for automated blinking
 * - Separated upper and lower wireframe lip/jaw meshes for real-time lip sync
 * - Orbiting background rings & 3D grid
 */

import * as THREE from "three";

export interface MeshParts {
  headGroup: THREE.Group;
  solidHead: THREE.Mesh;
  wireHead: THREE.Mesh;
  solidMat: THREE.Material;
  wireMat: THREE.Material;
  coreMesh: THREE.Mesh;
  neckMesh: THREE.Mesh;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  leftEyelid: THREE.Mesh;
  rightEyelid: THREE.Mesh;
  mouthGroup: THREE.Group;
  mouthMesh: THREE.Mesh;
  upperLip: THREE.Mesh;
  lowerLip: THREE.Mesh;
}

export function createFaceMesh(texture?: THREE.Texture | null): MeshParts {
  const headGroup = new THREE.Group();

  // 1. Anatomical Cranial Geometry (Realistic Male Head Proportion)
  const headGeo = new THREE.SphereGeometry(1.08, 36, 36);
  headGeo.scale(1.0, 1.34, 1.10);

  // Material 1: Cobalt Blue & Cyan Wireframe Grid (#00d8ff / #2C3480)
  const wireMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#00d8ff"),
    wireframe: true,
    emissive: new THREE.Color("#0284c7"),
    emissiveIntensity: 0.35,
    roughness: 0.3,
    metalness: 0.8,
    transparent: true,
    opacity: 0.75,
  });

  const wireHead = new THREE.Mesh(headGeo, wireMat);
  headGroup.add(wireHead);

  // Material 2: Deep Obsidian Metallic Core (#020617 / #0b1120)
  // Gives solid form behind the wireframe so it feels like a real cybernetic face
  const solidMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#030712"),
    roughness: 0.2,
    metalness: 0.9,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    reflectivity: 0.9,
  });

  if (texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    solidMat.map = texture;
    solidMat.needsUpdate = true;
  }

  const innerGeo = new THREE.SphereGeometry(1.03, 28, 28);
  innerGeo.scale(0.98, 1.30, 1.05);
  const solidHead = new THREE.Mesh(innerGeo, solidMat);
  headGroup.add(solidHead);

  // 2. Cognitive Matrix Core (Electric Cyan Pulsing Lattice)
  const coreGeo = new THREE.IcosahedronGeometry(0.75, 2);
  const coreMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#00f0ff"),
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  headGroup.add(coreMesh);

  // 3. Anatomical Cybernetic Neck & Trapezius Wireframe
  const neckGeo = new THREE.CylinderGeometry(0.52, 0.82, 0.8, 24, 6, true);
  const neckMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#0284c7"),
    wireframe: true,
    transparent: true,
    opacity: 0.45,
  });
  const neckMesh = new THREE.Mesh(neckGeo, neckMat);
  neckMesh.position.set(0, -1.42, -0.05);
  headGroup.add(neckMesh);

  // 4. Cybernetic Optical Sockets & Glowing Luminous Crimson RED Eyes
  const eyeGeo = new THREE.SphereGeometry(0.12, 24, 24);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#ff1744"),
    roughness: 0.15,
    metalness: 0.85,
    emissive: new THREE.Color("#ff0033"),
    emissiveIntensity: 2.4,
  });

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.35, 0.22, 0.98);
  leftEye.scale.set(1.15, 0.72, 0.45);
  headGroup.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.35, 0.22, 0.98);
  rightEye.scale.set(1.15, 0.72, 0.45);
  headGroup.add(rightEye);

  // 5. Automated Eyelid Blinking Shutters (Procedural Cybernetic Blue Shutter)
  const eyelidGeo = new THREE.BoxGeometry(0.32, 0.16, 0.14);
  const eyelidMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0284c7"),
    wireframe: true,
    emissive: new THREE.Color("#0369a1"),
    emissiveIntensity: 0.5,
  });

  const leftEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
  leftEyelid.position.set(-0.35, 0.28, 1.01);
  leftEyelid.scale.set(1.0, 0.05, 1.0);
  headGroup.add(leftEyelid);

  const rightEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
  rightEyelid.position.set(0.35, 0.28, 1.01);
  rightEyelid.scale.set(1.0, 0.05, 1.0);
  headGroup.add(rightEyelid);

  // 6. Jaw & Mouth Mesh Group (Controlled by Viseme / Audio RMS for Lip Sync)
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.42, 0.98);
  headGroup.add(mouthGroup);

  // Inner Oral Cavity with Glowing Cyan Aperture
  const mouthGeo = new THREE.PlaneGeometry(0.42, 0.06);
  const mouthMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#00f0ff"),
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
  mouthMesh.position.set(0, 0, -0.01);
  mouthGroup.add(mouthMesh);

  // Upper Lip
  const upperLipGeo = new THREE.BoxGeometry(0.46, 0.04, 0.08);
  const lipMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#38bdf8"),
    wireframe: true,
  });
  const upperLip = new THREE.Mesh(upperLipGeo, lipMat);
  upperLip.position.set(0, 0.03, 0.01);
  mouthGroup.add(upperLip);

  // Lower Lip
  const lowerLipGeo = new THREE.BoxGeometry(0.44, 0.05, 0.08);
  const lowerLip = new THREE.Mesh(lowerLipGeo, lipMat);
  lowerLip.position.set(0, -0.03, 0.01);
  mouthGroup.add(lowerLip);

  return {
    headGroup,
    solidHead,
    wireHead,
    solidMat,
    wireMat,
    coreMesh,
    neckMesh,
    leftEye,
    rightEye,
    leftEyelid,
    rightEyelid,
    mouthGroup,
    mouthMesh,
    upperLip,
    lowerLip,
  };
}
