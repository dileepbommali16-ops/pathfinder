/**
 * 3D Face Mesh Geometry & UV Mapping (client/src/voice/avatar/faceMesh.ts)
 * Creates the sleek Cobalt Blue & Cyan 3D Cybernetic Humanoid Face.
 * Features:
 * - Anatomical human DNA facial contours: Cranium, Defined Nose Bridge, Tip & Nostrils
 * - Sculpted Upper (Cupid's Bow) & Lower Real Human Lips
 * - Glowing Luminous Crimson Red Eyes with Pulsating Ocular Core
 * - Anatomical Hemispherical Eyelid Shutters for Realistic Eye Blinking
 * - Responsive Lip-Sync Jaw & Mouth Morphing
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
  leftPupil: THREE.Mesh;
  rightPupil: THREE.Mesh;
  leftEyelid: THREE.Mesh;
  rightEyelid: THREE.Mesh;
  noseBridge: THREE.Mesh;
  noseTip: THREE.Mesh;
  leftNostril: THREE.Mesh;
  rightNostril: THREE.Mesh;
  mouthGroup: THREE.Group;
  mouthMesh: THREE.Mesh;
  upperLip: THREE.Mesh;
  lowerLip: THREE.Mesh;
}

export function createFaceMesh(texture?: THREE.Texture | null): MeshParts {
  const headGroup = new THREE.Group();

  // 1. Anatomical Cranial Geometry (Realistic Male Head Proportion)
  const headGeo = new THREE.SphereGeometry(1.15, 40, 40);
  headGeo.scale(1.0, 1.35, 1.12);

  // Material 1: Cobalt Blue & Cyan Wireframe Grid (#00d8ff / #2C3480)
  const wireMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#00d8ff"),
    wireframe: true,
    emissive: new THREE.Color("#0284c7"),
    emissiveIntensity: 0.4,
    roughness: 0.3,
    metalness: 0.85,
    transparent: true,
    opacity: 0.75,
  });

  const wireHead = new THREE.Mesh(headGeo, wireMat);
  headGroup.add(wireHead);

  // Material 2: Deep Obsidian Metallic Core (#030712)
  const solidMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#030712"),
    roughness: 0.25,
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

  const innerGeo = new THREE.SphereGeometry(1.10, 32, 32);
  innerGeo.scale(0.98, 1.32, 1.08);
  const solidHead = new THREE.Mesh(innerGeo, solidMat);
  headGroup.add(solidHead);

  // 2. Cognitive Matrix Core (Electric Cyan Pulsing Lattice)
  const coreGeo = new THREE.IcosahedronGeometry(0.8, 2);
  const coreMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#00f0ff"),
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  headGroup.add(coreMesh);

  // 3. Anatomical Cybernetic Neck & Trapezius Wireframe
  const neckGeo = new THREE.CylinderGeometry(0.55, 0.88, 0.85, 24, 6, true);
  const neckMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#0284c7"),
    wireframe: true,
    transparent: true,
    opacity: 0.45,
  });
  const neckMesh = new THREE.Mesh(neckGeo, neckMat);
  neckMesh.position.set(0, -1.45, -0.05);
  headGroup.add(neckMesh);

  // =========================================================================
  // 4. ANATOMICAL REAL HUMAN NOSE (Bridge, Tip, Nostrils)
  // =========================================================================
  const noseMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0284c7"),
    roughness: 0.25,
    metalness: 0.9,
    emissive: new THREE.Color("#0369a1"),
    emissiveIntensity: 0.35,
    wireframe: false,
  });

  // Nose Bridge (Sleek tapered cylindrical prism from brow to tip)
  const bridgeGeo = new THREE.CylinderGeometry(0.045, 0.08, 0.38, 16);
  const noseBridge = new THREE.Mesh(bridgeGeo, noseMat);
  noseBridge.position.set(0, 0.04, 1.16);
  noseBridge.rotation.x = 0.28;
  headGroup.add(noseBridge);

  // Nose Tip (Anatomical rounded apex)
  const tipGeo = new THREE.SphereGeometry(0.085, 20, 20);
  const noseTip = new THREE.Mesh(tipGeo, noseMat);
  noseTip.position.set(0, -0.14, 1.25);
  noseTip.scale.set(1.15, 0.95, 1.05);
  headGroup.add(noseTip);

  // Nostrils (Left and Right alar wings)
  const nostrilGeo = new THREE.SphereGeometry(0.05, 16, 16);
  const nostrilMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#00d8ff"),
    wireframe: true,
    emissive: new THREE.Color("#0284c7"),
    emissiveIntensity: 0.5,
  });

  const leftNostril = new THREE.Mesh(nostrilGeo, nostrilMat);
  leftNostril.position.set(-0.09, -0.16, 1.18);
  headGroup.add(leftNostril);

  const rightNostril = new THREE.Mesh(nostrilGeo, nostrilMat);
  rightNostril.position.set(0.09, -0.16, 1.18);
  headGroup.add(rightNostril);

  // =========================================================================
  // 5. GLOWING LUMINOUS CRIMSON RED EYES & PUPILS
  // =========================================================================
  const eyeSocketGeo = new THREE.SphereGeometry(0.15, 28, 28);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#ff0033"),
    roughness: 0.1,
    metalness: 0.8,
    emissive: new THREE.Color("#ff0033"),
    emissiveIntensity: 3.2,
  });

  // Left Eye Iris
  const leftEye = new THREE.Mesh(eyeSocketGeo, eyeMat);
  leftEye.position.set(-0.35, 0.22, 1.05);
  leftEye.scale.set(1.1, 0.72, 0.45);
  headGroup.add(leftEye);

  // Right Eye Iris
  const rightEye = new THREE.Mesh(eyeSocketGeo, eyeMat);
  rightEye.position.set(0.35, 0.22, 1.05);
  rightEye.scale.set(1.1, 0.72, 0.45);
  headGroup.add(rightEye);

  // Glowing High-Intensity Crimson Pupils
  const pupilGeo = new THREE.SphereGeometry(0.05, 16, 16);
  const pupilMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#ffffff"),
  });

  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
  leftPupil.position.set(-0.35, 0.22, 1.13);
  headGroup.add(leftPupil);

  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
  rightPupil.position.set(0.35, 0.22, 1.13);
  headGroup.add(rightPupil);

  // =========================================================================
  // 6. ANATOMICAL EYELIDS (Realistic Curving Blinking Shutters)
  // =========================================================================
  const eyelidGeo = new THREE.SphereGeometry(0.165, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const eyelidMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0284c7"),
    wireframe: true,
    emissive: new THREE.Color("#0369a1"),
    emissiveIntensity: 0.6,
    side: THREE.DoubleSide,
  });

  // Left Eyelid Shell
  const leftEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
  leftEyelid.position.set(-0.35, 0.22, 1.05);
  leftEyelid.rotation.x = -Math.PI * 0.55; // Tucked open above eye
  headGroup.add(leftEyelid);

  // Right Eyelid Shell
  const rightEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
  rightEyelid.position.set(0.35, 0.22, 1.05);
  rightEyelid.rotation.x = -Math.PI * 0.55; // Tucked open above eye
  headGroup.add(rightEyelid);

  // =========================================================================
  // 7. REAL HUMAN DNA CONTOURED LIPS & MOUTH
  // =========================================================================
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.42, 1.08);
  headGroup.add(mouthGroup);

  // Inner Oral Cavity
  const mouthCavityGeo = new THREE.PlaneGeometry(0.44, 0.12);
  const mouthCavityMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#00f0ff"),
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });
  const mouthMesh = new THREE.Mesh(mouthCavityGeo, mouthCavityMat);
  mouthMesh.position.set(0, 0, -0.02);
  mouthGroup.add(mouthMesh);

  // Anatomical Lip Material: Metallic Cyan/Cobalt with Sleek Human Texture
  const lipMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0284c7"),
    wireframe: true,
    emissive: new THREE.Color("#00d8ff"),
    emissiveIntensity: 0.65,
    roughness: 0.3,
    metalness: 0.8,
  });

  // Upper Lip (Sculpted Curved M-Shape / Cupid's Bow)
  const upperLipGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.44, 20);
  upperLipGeo.scale(1.0, 1.0, 0.45);
  const upperLip = new THREE.Mesh(upperLipGeo, lipMat);
  upperLip.position.set(0, 0.04, 0.02);
  upperLip.rotation.z = Math.PI * 0.5;
  mouthGroup.add(upperLip);

  // Lower Lip (Plump Curved Crescent Anatomy)
  const lowerLipGeo = new THREE.CylinderGeometry(0.05, 0.055, 0.40, 20);
  lowerLipGeo.scale(1.0, 1.0, 0.5);
  const lowerLip = new THREE.Mesh(lowerLipGeo, lipMat);
  lowerLip.position.set(0, -0.04, 0.02);
  lowerLip.rotation.z = Math.PI * 0.5;
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
    leftPupil,
    rightPupil,
    leftEyelid,
    rightEyelid,
    noseBridge,
    noseTip,
    leftNostril,
    rightNostril,
    mouthGroup,
    mouthMesh,
    upperLip,
    lowerLip,
  };
}
