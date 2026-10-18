/**
 * 3D Face Mesh Geometry & UV Mapping (client/src/voice/avatar/faceMesh.ts)
 * Generates anatomical cranial geometry and sets up split wireframe vs solid material partitioning.
 */

import * as THREE from "three";

export interface MeshParts {
  headGroup: THREE.Group;
  solidHead: THREE.Mesh;
  wireHead: THREE.Mesh;
  solidMat: THREE.MeshPhysicalMaterial;
  wireMat: THREE.MeshBasicMaterial;
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

  // 1. Anatomical Cranial Geometry
  const headGeo = new THREE.SphereGeometry(1.15, 64, 64);
  headGeo.scale(1.0, 1.34, 1.14);

  // Material 1: Solid Glossy Metallic Blue (Right side of face)
  const solidMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#185a9d"),
    metalness: 0.55,
    roughness: 0.22,
    clearcoat: 0.9,
    clearcoatRoughness: 0.15,
    reflectivity: 0.85,
    emissive: new THREE.Color("#0c2340"),
    emissiveIntensity: 0.25,
  });

  if (texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    solidMat.map = texture;
    solidMat.needsUpdate = true;
  }

  const solidHead = new THREE.Mesh(headGeo, solidMat);
  headGroup.add(solidHead);

  // Material 2: Cyan Wireframe Matrix (Left side of face)
  const wireMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#38bdf8"),
    wireframe: true,
    transparent: true,
    opacity: 0.72,
  });
  const wireHead = new THREE.Mesh(headGeo, wireMat);
  wireHead.scale.set(1.003, 1.003, 1.003);
  headGroup.add(wireHead);

  // Split Local Clipping Planes
  const leftClipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
  const rightClipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  solidMat.clippingPlanes = [leftClipPlane];
  wireMat.clippingPlanes = [rightClipPlane];

  // 2. Glowing Inner Core
  const coreGeo = new THREE.SphereGeometry(0.92, 32, 32);
  coreGeo.scale(0.92, 1.22, 0.92);
  const coreMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#0284c7"),
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  headGroup.add(coreMesh);

  // 3. Anatomical Neck
  const neckGeo = new THREE.CylinderGeometry(0.55, 0.75, 0.85, 32);
  const neckMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#0f2744"),
    metalness: 0.4,
    roughness: 0.35,
  });
  const neckMesh = new THREE.Mesh(neckGeo, neckMat);
  neckMesh.position.set(0, -1.5, -0.1);
  headGroup.add(neckMesh);

  // 4. Eyes
  const eyeGeo = new THREE.SphereGeometry(0.135, 32, 32);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f0f9ff"),
    emissive: new THREE.Color("#0284c7"),
    emissiveIntensity: 0.4,
    roughness: 0.1,
    metalness: 0.2,
  });

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.36, 0.19, 0.96);
  headGroup.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.36, 0.19, 0.96);
  headGroup.add(rightEye);

  // 5. Upper Eyelids
  const eyelidGeo = new THREE.SphereGeometry(0.142, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const eyelidMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#185a9d"),
    roughness: 0.25,
    metalness: 0.4,
  });

  const leftEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
  leftEyelid.position.set(-0.36, 0.22, 0.97);
  leftEyelid.rotation.x = Math.PI * 0.18;
  headGroup.add(leftEyelid);

  const rightEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
  rightEyelid.position.set(0.36, 0.22, 0.97);
  rightEyelid.rotation.x = Math.PI * 0.18;
  headGroup.add(rightEyelid);

  // 6. Mouth Group & Cavity
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.45, 0.98);
  headGroup.add(mouthGroup);

  const mouthGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 32);
  mouthGeo.scale(1.0, 0.5, 0.35);
  const mouthMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#060a14"),
    emissive: new THREE.Color("#0284c7"),
    emissiveIntensity: 0.3,
    roughness: 0.6,
  });
  const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
  mouthMesh.rotation.x = Math.PI * 0.5;
  mouthGroup.add(mouthMesh);

  // Upper Lip
  const upperLipGeo = new THREE.TorusGeometry(0.23, 0.038, 16, 32, Math.PI);
  const upperLipMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#1e40af"),
    roughness: 0.35,
    metalness: 0.3,
  });
  const upperLip = new THREE.Mesh(upperLipGeo, upperLipMat);
  upperLip.position.set(0, 0.03, 0.02);
  upperLip.rotation.x = Math.PI;
  mouthGroup.add(upperLip);

  // Lower Lip
  const lowerLipGeo = new THREE.TorusGeometry(0.23, 0.038, 16, 32, Math.PI);
  const lowerLip = new THREE.Mesh(lowerLipGeo, upperLipMat);
  lowerLip.position.set(0, -0.03, 0.02);
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
