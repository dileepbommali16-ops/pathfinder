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
  // 4. SUBTLE, SLEEK HUMANOID NOSE (Delicate, Elegant, No Cartoon Snout)
  // =========================================================================
  const noseMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#00d8ff"),
    wireframe: true,
    emissive: new THREE.Color("#0284c7"),
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.8,
  });

  // Nose Bridge: A delicate, ultra-thin ridge line (no giant cylinder)
  const bridgeGeo = new THREE.CylinderGeometry(0.012, 0.018, 0.28, 8);
  const noseBridge = new THREE.Mesh(bridgeGeo, noseMat);
  noseBridge.position.set(0, 0.05, 1.09);
  noseBridge.rotation.x = 0.15;
  headGroup.add(noseBridge);

  // Subtle Nose Tip: A tiny refined apex flush with cranial contour
  const tipGeo = new THREE.SphereGeometry(0.028, 12, 12);
  tipGeo.scale(1.0, 0.8, 0.8);
  const noseTip = new THREE.Mesh(tipGeo, noseMat);
  noseTip.position.set(0, -0.09, 1.12);
  headGroup.add(noseTip);

  // Subtle Alar Curves: Tiny refined accents (no protruding balls)
  const nostrilGeo = new THREE.SphereGeometry(0.016, 8, 8);
  const leftNostril = new THREE.Mesh(nostrilGeo, noseMat);
  leftNostril.position.set(-0.045, -0.10, 1.09);
  headGroup.add(leftNostril);

  const rightNostril = new THREE.Mesh(nostrilGeo, noseMat);
  rightNostril.position.set(0.045, -0.10, 1.09);
  headGroup.add(rightNostril);

  // =========================================================================
  // 5. ANATOMICAL HUMAN EYE (Sclera, Crimson Iris, Deep Pupil, Glossy Glint)
  // =========================================================================
  // Eye Sclera (Natural Eyeball Base)
  const scleraGeo = new THREE.SphereGeometry(0.12, 24, 24);
  scleraGeo.scale(1.15, 0.70, 0.5);
  const scleraMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0c1524"),
    roughness: 0.2,
    metalness: 0.6,
  });

  const leftEyeSocket = new THREE.Mesh(scleraGeo, scleraMat);
  leftEyeSocket.position.set(-0.35, 0.22, 1.02);
  headGroup.add(leftEyeSocket);

  const rightEyeSocket = new THREE.Mesh(scleraGeo, scleraMat);
  rightEyeSocket.position.set(0.35, 0.22, 1.02);
  headGroup.add(rightEyeSocket);

  // Human Eye Iris: Radiant Crimson/Ruby with Natural Luster
  const irisGeo = new THREE.SphereGeometry(0.065, 24, 24);
  irisGeo.scale(1.0, 1.0, 0.4);
  const irisMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#dc2626"),
    emissive: new THREE.Color("#e11d48"),
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.7,
  });

  // Left Eye Iris
  const leftEye = new THREE.Mesh(irisGeo, irisMat);
  leftEye.position.set(-0.35, 0.22, 1.06);
  headGroup.add(leftEye);

  // Right Eye Iris
  const rightEye = new THREE.Mesh(irisGeo, irisMat.clone());
  rightEye.position.set(0.35, 0.22, 1.06);
  headGroup.add(rightEye);

  // Human Eye Pupil: Deep Obsidian Core
  const pupilGeo = new THREE.SphereGeometry(0.032, 16, 16);
  pupilGeo.scale(1.0, 1.0, 0.3);
  const pupilMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#030712"),
  });

  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
  leftPupil.position.set(-0.35, 0.22, 1.08);
  headGroup.add(leftPupil);

  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
  rightPupil.position.set(0.35, 0.22, 1.08);
  headGroup.add(rightPupil);

  // High-Gloss Specular Eye Reflection (Brings Human Eyes to Life!)
  const glintGeo = new THREE.SphereGeometry(0.012, 10, 10);
  const glintMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffffff") });

  const leftGlint = new THREE.Mesh(glintGeo, glintMat);
  leftGlint.position.set(-0.33, 0.24, 1.09);
  headGroup.add(leftGlint);

  const rightGlint = new THREE.Mesh(glintGeo, glintMat);
  rightGlint.position.set(0.37, 0.24, 1.09);
  headGroup.add(rightGlint);

  // =========================================================================
  // 6. ANATOMICAL EYELIDS (Smooth Realistic Blinking Shells)
  // =========================================================================
  const eyelidGeo = new THREE.SphereGeometry(0.135, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const eyelidMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#030712"),
    roughness: 0.3,
    metalness: 0.85,
    side: THREE.DoubleSide,
  });

  // Left Eyelid Shell
  const leftEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
  leftEyelid.position.set(-0.35, 0.22, 1.04);
  leftEyelid.rotation.x = -Math.PI * 0.52; // Tucked open above eye
  headGroup.add(leftEyelid);

  // Right Eyelid Shell
  const rightEyelid = new THREE.Mesh(eyelidGeo, eyelidMat.clone());
  rightEyelid.position.set(0.35, 0.22, 1.04);
  rightEyelid.rotation.x = -Math.PI * 0.52; // Tucked open above eye
  headGroup.add(rightEyelid);

  // =========================================================================
  // 7. SMOOTH HUMAN LIPS (Curved Cupid's Bow, NO Wireframe Grid/Ladder)
  // =========================================================================
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.40, 1.05);
  headGroup.add(mouthGroup);

  // Inner Oral Cavity (Dark, Non-Grid)
  const mouthCavityGeo = new THREE.PlaneGeometry(0.36, 0.08);
  const mouthCavityMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#020617"),
    side: THREE.DoubleSide,
  });
  const mouthMesh = new THREE.Mesh(mouthCavityGeo, mouthCavityMat);
  mouthMesh.position.set(0, 0, -0.01);
  mouthGroup.add(mouthMesh);

  // Smooth Shaded Human Lip Material (Sleek Cybernetic Cobalt with Gloss Highlight)
  const lipMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0284c7"),
    wireframe: false,
    roughness: 0.25,
    metalness: 0.85,
    emissive: new THREE.Color("#0369a1"),
    emissiveIntensity: 0.45,
  });

  // Upper Lip: Smooth Anatomical Cupid's Bow Curve (Cylinder scale flat and smooth)
  const upperLipGeo = new THREE.CylinderGeometry(0.022, 0.028, 0.36, 24);
  upperLipGeo.scale(1.0, 1.0, 0.4);
  const upperLip = new THREE.Mesh(upperLipGeo, lipMat);
  upperLip.position.set(0, 0.025, 0.02);
  upperLip.rotation.z = Math.PI * 0.5;
  mouthGroup.add(upperLip);

  // Lower Lip: Smooth Curved Crescent Lip
  const lowerLipGeo = new THREE.CylinderGeometry(0.026, 0.030, 0.32, 24);
  lowerLipGeo.scale(1.0, 1.0, 0.45);
  const lowerLip = new THREE.Mesh(lowerLipGeo, lipMat.clone());
  lowerLip.position.set(0, -0.025, 0.02);
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
