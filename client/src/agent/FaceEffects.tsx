import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const DNA_HEAD_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uVoice;
  varying vec3 vPos;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;

  void main() {
    vPos = position;
    vec3 displaced = position;

    // Anatomical mandible & lower-lip articulation when speaking (y in [-0.21 .. -0.68])
    float frontMask = smoothstep(0.08, 0.62, position.z);
    float jawMask = smoothstep(-0.20, -0.28, position.y) * (1.0 - smoothstep(-0.56, -0.82, position.y));
    displaced.y -= uVoice * 0.078 * jawMask * frontMask;
    displaced.z -= uVoice * 0.012 * jawMask * frontMask;

    // Subtle living neural-DNA wave pulse along normals
    float angle = atan(position.x, max(0.001, position.z));
    float dnaPulse = sin(position.y * 6.5 - angle * 2.0 - uTime * 2.1) * 0.0028;
    displaced += normal * dnaPulse;

    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vNormalDir = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Luminous electric #5BC0DE Human-DNA anatomical wireframe (front-emphasized so anatomy & internal DNA stay crisp)
const DNA_WIRE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uVoice;
  uniform float uBaseOpacity;
  uniform float uFeatureBoost;
  varying vec3 vPos;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;

  void main() {
    float az = atan(vPos.x, vPos.z);
    float helixA = pow(0.5 + 0.5 * sin(vPos.y * 7.2 + az * 2.0 - uTime * 2.4), 3.0);
    float helixB = pow(0.5 + 0.5 * sin(vPos.y * 7.2 - az * 2.0 - uTime * 1.9 + 3.14159), 3.0);
    float dnaWave = clamp(helixA + helixB, 0.0, 1.0);

    // Keep rear cranium delicate while front face & lateral jaw/cranium silhouette shine clearly in bright blue
    float frontFocus = smoothstep(-0.58, 0.62, vPos.z);
    float fresnel = pow(1.0 - abs(dot(normalize(vNormalDir), normalize(vViewDir))), 1.35);

    vec3 deepElectricBlue = vec3(0.110, 0.520, 0.740);
    vec3 brightCyanBlue   = vec3(0.357, 0.753, 0.871); // #5BC0DE
    vec3 radiantHelixBlue = vec3(0.565, 0.925, 1.000); // Bright #90ECFF DNA crest

    vec3 col = mix(deepElectricBlue, brightCyanBlue, 0.36 + 0.64 * frontFocus);
    col = mix(col, radiantHelixBlue, clamp(dnaWave * 0.56 + fresnel * 0.34 + uFeatureBoost * 0.42 + uVoice * 0.32, 0.0, 1.0));
    col *= (1.28 + frontFocus * 0.48 + dnaWave * 0.45 + uFeatureBoost * 0.38 + uVoice * 0.40);

    float alpha = clamp(
      uBaseOpacity * (0.28 + 0.72 * frontFocus) + dnaWave * 0.20 + fresnel * 0.16 + uFeatureBoost * 0.28,
      0.16,
      1.0
    );
    gl_FragColor = vec4(col, alpha);
  }
`;

// Translucent bright blue anatomical skin/hologram shell beneath the wireframe
const DNA_SHELL_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uVoice;
  varying vec3 vPos;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;

  void main() {
    vec3 N = normalize(vNormalDir);
    vec3 V = normalize(vViewDir);
    float fresnel = pow(1.0 - abs(dot(N, V)), 1.75);
    float frontLight = clamp(dot(N, normalize(vec3(0.0, 0.25, 1.0))) * 0.5 + 0.5, 0.0, 1.0);
    float az = atan(vPos.x, vPos.z);
    float dnaGlow = 0.5 + 0.5 * sin(vPos.y * 6.5 + az * 2.0 - uTime * 2.1);

    vec3 shellBlue  = vec3(0.145, 0.590, 0.790);
    vec3 brightBlue = vec3(0.357, 0.753, 0.871); // #5BC0DE
    vec3 col = mix(shellBlue, brightBlue, frontLight * 0.45 + fresnel * 0.75);
    col *= (0.85 + dnaGlow * 0.30 + uVoice * 0.26);

    float alpha = clamp(0.06 + fresnel * 0.28 + frontLight * 0.04 + uVoice * 0.07, 0.05, 0.40);
    gl_FragColor = vec4(col, alpha);
  }
`;

function gaussian2(x: number, muX: number, sx: number, y: number, muY: number, sy: number): number {
  const dx = (x - muX) / sx;
  const dy = (y - muY) / sy;
  return Math.exp(-0.5 * (dx * dx + dy * dy));
}

function gaussian1(x: number, mu: number, s: number): number {
  const d = (x - mu) / s;
  return Math.exp(-0.5 * d * d);
}

/**
 * Parametrically evaluates an anatomically proportioned 3D human head & tapered neck surface.
 * u in [-PI, PI] (u = 0 is dead-center +Z face), v in [0, 1] (0 = crown apex, 1 = collar base).
 * Produces a rounded cranial dome -> cheekbones -> tapered human V-jawline & chin -> submental neck.
 */
function evalHumanHeadVertex(u: number, v: number): THREE.Vector3 {
  const absU = Math.abs(u);
  const sinU = Math.sin(u);
  const cosU = Math.cos(u);

  let y = 0.0;
  let rx = 0.0;
  let rz = 0.0;
  let zCenter = 0.0;

  if (v < 0.34) {
    // Spherical-ellipsoid cranial vault (y = +1.06 rounded apex smoothly curving to brow at y = +0.32)
    const theta = Math.max(0.015, (v / 0.34) * Math.PI * 0.5);
    y = 0.32 + 0.74 * Math.cos(theta);
    const domeWidth = Math.sin(theta);
    rx = 0.70 * domeWidth;
    rz = 0.85 * domeWidth;
    zCenter = -0.05;
  } else if (v < 0.78) {
    // Mid-face -> cheekbones -> tapering human V-oval jawline -> chin (y = +0.32 down to -0.58)
    const t = (v - 0.34) / 0.44;
    y = 0.32 - 0.90 * t;
    // Slight temple narrowing then zygoma curve, cleanly tapering to sculpted human chin
    const templeCheek = 0.03 * Math.sin(Math.min(1, t * 2.5) * Math.PI);
    rx = 0.70 * (1 - 0.60 * Math.pow(t, 1.48)) + templeCheek;
    rz = 0.85 * (1 - 0.54 * Math.pow(t, 1.42));
    zCenter = -0.05 + 0.04 * Math.sin(t * Math.PI * 0.75) - 0.06 * Math.pow(t, 2.2);
  } else {
    // Submental under-chin shadow notch flowing cleanly into tapered human neck (y = -0.58 down to -1.04)
    const t = (v - 0.78) / 0.22;
    y = -0.58 - 0.46 * t;
    rx = 0.30 + 0.075 * Math.pow(t, 0.9);
    rz = 0.39 - 0.03 * Math.sin(t * Math.PI) + 0.05 * t;
    zCenter = -0.14 - 0.08 * Math.min(1, t * 1.6);
  }

  let x = rx * sinU;
  let z = rz * cosU + zCenter;

  // Elongate posterior occiput slightly for realistic human skull depth
  if (cosU < 0 && v < 0.76) {
    const occiputWeight = Math.sin(Math.min(1, v / 0.76) * Math.PI * 0.85);
    z += cosU * 0.10 * occiputWeight;
  }

  // Facial anatomical sculpting across anterior face (cosU > 0)
  if (cosU > 0.02 && v > 0.20 && v < 0.83) {
    // Sculpted zygomatic cheekbones (around y = +0.01, absU = 0.64)
    const cheek = gaussian2(absU, 0.64, 0.26, y, 0.01, 0.13);
    z += cheek * 0.062;
    x += Math.sign(u) * cheek * 0.032;

    // Gentle buccal hollow beneath cheekbones (carves jawline definition)
    const cheekHollow = gaussian2(absU, 0.56, 0.22, y, -0.19, 0.12);
    z -= cheekHollow * 0.052;

    // Supraorbital brow ridges cleanly above each orbital eye socket
    const browRidge = gaussian2(absU, 0.31, 0.19, y, 0.295, 0.060);
    z += browRidge * 0.062;

    // Deeply recessed anatomical eye sockets framing the glowing lava eyes
    const eyeSocket = gaussian2(absU, 0.34, 0.155, y, 0.16, 0.086);
    z -= eyeSocket * 0.145;

    // Prominent, crisp sculpted human nose bridge (y = +0.25 down to -0.075)
    const noseBridgeSpan =
      y <= 0.25 && y >= -0.085
        ? Math.sin(Math.min(1, Math.max(0, (0.25 - y) / 0.335)) * Math.PI * 0.84)
        : 0;
    const noseCenter = gaussian1(u, 0, 0.082);
    z += noseBridgeSpan * noseCenter * 0.205;

    // Sculpted rounded human nasal tip
    const noseTip = gaussian2(u, 0, 0.088, y, -0.045, 0.048);
    z += noseTip * 0.105;

    // Alar wings / human nostrils smoothly integrated left & right of nasal tip
    const nostrils = gaussian2(absU, 0.135, 0.052, y, -0.065, 0.038);
    z += nostrils * 0.075;
    x += Math.sign(u) * nostrils * 0.018;

    // Philtrum & natural lip topography (upper lip Cupid's bow + lower lip fullness)
    const philtrum = gaussian2(u, 0, 0.042, y, -0.145, 0.032);
    z -= philtrum * 0.022;

    const cupidsBowY = -0.195 - 0.011 * Math.cos(Math.min(1, absU / 0.17) * Math.PI);
    const upperLip = gaussian2(absU, 0, 0.175, y, cupidsBowY, 0.022);
    const lipPart = gaussian2(absU, 0, 0.165, y, -0.230, 0.013);
    const lowerLip = gaussian2(absU, 0, 0.155, y, -0.264, 0.026);
    z += upperLip * 0.058 - lipPart * 0.030 + lowerLip * 0.054;

    // Pointed human chin (mentum) & defined jaw corner
    const chin = gaussian2(u, 0, 0.20, y, -0.50, 0.10);
    z += chin * 0.085;

    const jawAngle = gaussian2(absU, 0.86, 0.22, y, -0.37, 0.10);
    x += Math.sign(u) * jawAngle * 0.028;
  }

  // Subtle ear helix contour on sides for realistic 3/4 turns
  const earBump = gaussian2(absU, 1.54, 0.14, y, 0.07, 0.13);
  x += Math.sign(u) * earBump * 0.048;

  return new THREE.Vector3(x, y, z);
}

/**
 * Renders a bright #5BC0DE Anatomical 3D Human Head + Internal 3D Human DNA Double-Helix.
 * Zero white stars, zero twinkles, zero outer rings/decorations.
 */
export const AnatomicalHumanHeadDNA: React.FC<{ voiceRef: React.MutableRefObject<number> }> = ({
  voiceRef,
}) => {
  const dnaCoreRef = useRef<THREE.Group>(null);

  const { surfaceGeometry, wireframeGeometry, featureGeometry } = useMemo(() => {
    const vSteps = 46;
    const uSteps = 64;
    const grid: THREE.Vector3[][] = [];

    for (let vi = 0; vi <= vSteps; vi++) {
      const v = vi / vSteps;
      const row: THREE.Vector3[] = [];
      for (let ui = 0; ui <= uSteps; ui++) {
        const u = -Math.PI + (ui / uSteps) * Math.PI * 2;
        row.push(evalHumanHeadVertex(u, v));
      }
      grid.push(row);
    }

    const surfPositions: number[] = [];
    const surfIndices: number[] = [];
    for (let vi = 0; vi <= vSteps; vi++) {
      for (let ui = 0; ui <= uSteps; ui++) {
        const p = grid[vi][ui];
        surfPositions.push(p.x, p.y, p.z);
      }
    }
    const stride = uSteps + 1;
    for (let vi = 0; vi < vSteps; vi++) {
      for (let ui = 0; ui < uSteps; ui++) {
        const a = vi * stride + ui;
        const b = a + 1;
        const c = (vi + 1) * stride + ui;
        const d = c + 1;
        surfIndices.push(a, c, b, b, c, d);
      }
    }
    const surfGeo = new THREE.BufferGeometry();
    surfGeo.setAttribute("position", new THREE.Float32BufferAttribute(surfPositions, 3));
    surfGeo.setIndex(surfIndices);
    surfGeo.computeVertexNormals();

    const surfNormals = surfGeo.getAttribute("normal");
    const wireVerts: number[] = [];
    const wireNorms: number[] = [];
    const pushSeg = (vi1: number, ui1: number, vi2: number, ui2: number) => {
      const p1 = grid[vi1][ui1];
      const p2 = grid[vi2][ui2];
      const i1 = vi1 * stride + ui1;
      const i2 = vi2 * stride + ui2;
      wireVerts.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      wireNorms.push(
        surfNormals.getX(i1),
        surfNormals.getY(i1),
        surfNormals.getZ(i1),
        surfNormals.getX(i2),
        surfNormals.getY(i2),
        surfNormals.getZ(i2)
      );
    };

    // Clean horizontal anatomical rings + meridians
    for (let vi = 1; vi <= vSteps; vi++) {
      for (let ui = 0; ui < uSteps; ui++) {
        pushSeg(vi, ui, vi, ui + 1);
      }
    }
    for (let vi = 0; vi < vSteps; vi++) {
      for (let ui = 0; ui < uSteps; ui += 2) {
        pushSeg(vi, ui, vi + 1, ui);
      }
    }

    const wireGeo = new THREE.BufferGeometry();
    wireGeo.setAttribute("position", new THREE.Float32BufferAttribute(wireVerts, 3));
    wireGeo.setAttribute("normal", new THREE.Float32BufferAttribute(wireNorms, 3));

    // Crisp anatomical feature highlight paths sampled directly from the sculpted face surface (nose, brows, cheekbones, jaw)
    const featVerts: number[] = [];
    const featNorms: number[] = [];
    const pushSurfaceCurve = (samples: Array<[number, number]>, zLift = 0.004) => {
      for (let i = 0; i < samples.length - 1; i++) {
        const [u1, v1] = samples[i];
        const [u2, v2] = samples[i + 1];
        const p1 = evalHumanHeadVertex(u1, v1);
        const p2 = evalHumanHeadVertex(u2, v2);
        featVerts.push(p1.x, p1.y, p1.z + zLift, p2.x, p2.y, p2.z + zLift);
        featNorms.push(0, 0, 1, 0, 0, 1);
      }
    };

    // 1. Center sculpted nose ridge + left & right lateral nasal walls & nostril alar rims
    const noseBridgePts: Array<[number, number]> = [];
    const noseLeftWall: Array<[number, number]> = [];
    const noseRightWall: Array<[number, number]> = [];
    for (let i = 0; i <= 10; i++) {
      const vv = 0.35 + (i / 10) * 0.165;
      noseBridgePts.push([0, vv]);
      const spread = 0.055 + 0.08 * Math.pow(i / 10, 1.5);
      noseLeftWall.push([-spread, vv]);
      noseRightWall.push([spread, vv]);
    }
    pushSurfaceCurve(noseBridgePts, 0.008);
    pushSurfaceCurve(noseLeftWall, 0.005);
    pushSurfaceCurve(noseRightWall, 0.005);

    // Sculpted alar nostril wing contour across nasal base
    const nostrilBasePts: Array<[number, number]> = [];
    for (let i = 0; i <= 12; i++) {
      const uu = -0.175 + (i / 12) * 0.35;
      const arcV = 0.515 - 0.012 * Math.cos((uu / 0.175) * Math.PI * 0.5);
      nostrilBasePts.push([uu, arcV]);
    }
    pushSurfaceCurve(nostrilBasePts, 0.007);

    // 2. Supraorbital brow ridges & sculpted lower orbital rims
    for (const side of [-1, 1]) {
      const browPts: Array<[number, number]> = [];
      const orbitLowerPts: Array<[number, number]> = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const uu = side * (0.12 + t * 0.42);
        const browV = 0.355 - 0.016 * Math.sin(t * Math.PI);
        const orbitV = 0.438 + 0.016 * Math.sin(t * Math.PI);
        browPts.push([uu, browV]);
        orbitLowerPts.push([uu, orbitV]);
      }
      pushSurfaceCurve(browPts, 0.007);
      pushSurfaceCurve(orbitLowerPts, 0.005);
    }

    // 3. Sculpted V-jawline & chin contour trace
    const jawTracePts: Array<[number, number]> = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const uu = -1.18 + t * 2.36;
      const vv = 0.77 - 0.06 * Math.pow(Math.abs(uu) / 1.18, 1.4);
      jawTracePts.push([uu, vv]);
    }
    pushSurfaceCurve(jawTracePts, 0.006);

    const featGeo = new THREE.BufferGeometry();
    featGeo.setAttribute("position", new THREE.Float32BufferAttribute(featVerts, 3));
    featGeo.setAttribute("normal", new THREE.Float32BufferAttribute(featNorms, 3));

    return { surfaceGeometry: surfGeo, wireframeGeometry: wireGeo, featureGeometry: featGeo };
  }, []);

  // Internal 3D Human DNA Double-Helix Spine inside brain + neck core
  const { strandAGeo, strandBGeo, rungsGeo } = useMemo(() => {
    const ptsA: THREE.Vector3[] = [];
    const ptsB: THREE.Vector3[] = [];
    const rungVerts: number[] = [];

    const totalSteps = 84;
    const turns = 2.6;
    const radius = 0.21;
    const yStart = -0.96;
    const yEnd = 0.78;

    for (let i = 0; i <= totalSteps; i++) {
      const t = i / totalSteps;
      const y = yStart + (yEnd - yStart) * t;
      const rScale = t < 0.22 ? 0.66 + 0.34 * (t / 0.22) : t > 0.82 ? 1.0 - 0.38 * ((t - 0.82) / 0.18) : 1.0;
      const r = radius * rScale;
      const theta = t * Math.PI * 2 * turns;
      const zBias = -0.06;

      const ax = Math.cos(theta) * r;
      const az = Math.sin(theta) * r + zBias;
      const bx = Math.cos(theta + Math.PI) * r;
      const bz = Math.sin(theta + Math.PI) * r + zBias;

      ptsA.push(new THREE.Vector3(ax, y, az));
      ptsB.push(new THREE.Vector3(bx, y, bz));

      if (i % 3 === 0 && i > 2 && i < totalSteps - 2) {
        rungVerts.push(ax, y, az, bx, y, bz);
      }
    }

    const curveA = new THREE.CatmullRomCurve3(ptsA);
    const curveB = new THREE.CatmullRomCurve3(ptsB);
    const sAGeo = new THREE.TubeGeometry(curveA, 96, 0.0125, 8, false);
    const sBGeo = new THREE.TubeGeometry(curveB, 96, 0.0125, 8, false);
    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute("position", new THREE.Float32BufferAttribute(rungVerts, 3));

    return { strandAGeo: sAGeo, strandBGeo: sBGeo, rungsGeo: rGeo };
  }, []);

  const wireMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uVoice: { value: 0 },
          uBaseOpacity: { value: 0.66 },
          uFeatureBoost: { value: 0.0 },
        },
        vertexShader: DNA_HEAD_VERT,
        fragmentShader: DNA_WIRE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    []
  );

  const featureMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uVoice: { value: 0 },
          uBaseOpacity: { value: 0.94 },
          uFeatureBoost: { value: 1.0 },
        },
        vertexShader: DNA_HEAD_VERT,
        fragmentShader: DNA_WIRE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    []
  );

  const shellMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uVoice: { value: 0 },
        },
        vertexShader: DNA_HEAD_VERT,
        fragmentShader: DNA_SHELL_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    []
  );

  const dnaStrandMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const dnaRungMatRef = useRef<THREE.LineBasicMaterial>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const v = voiceRef.current;

    wireMaterial.uniforms.uTime.value = t;
    wireMaterial.uniforms.uVoice.value = v;
    featureMaterial.uniforms.uTime.value = t;
    featureMaterial.uniforms.uVoice.value = v;
    shellMaterial.uniforms.uTime.value = t;
    shellMaterial.uniforms.uVoice.value = v;

    if (dnaCoreRef.current) {
      dnaCoreRef.current.rotation.y = t * 0.72;
    }
    if (dnaStrandMatRef.current) {
      dnaStrandMatRef.current.opacity = 0.82 + v * 0.18;
    }
    if (dnaRungMatRef.current) {
      dnaRungMatRef.current.opacity = 0.68 + 0.2 * Math.sin(t * 2.4) + v * 0.2;
    }
  });

  return (
    <group>
      {/* Translucent luminous #5BC0DE anatomical skull/face surface */}
      <mesh geometry={surfaceGeometry} material={shellMaterial} />

      {/* Bright electric #5BC0DE anatomical human wireframe scan with DNA waves */}
      <lineSegments geometry={wireframeGeometry} material={wireMaterial} />

      {/* Highlighted anatomical facial contour lines (nose bridge, nostrils, brow, orbits, jawline) */}
      <lineSegments geometry={featureGeometry} material={featureMaterial} />

      {/* Central 3D Human DNA Double-Helix rotating vertically inside the skull & neck core */}
      <group ref={dnaCoreRef}>
        <mesh geometry={strandAGeo}>
          <meshBasicMaterial
            ref={dnaStrandMatRef}
            color="#85EBFF"
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh geometry={strandBGeo}>
          <meshBasicMaterial
            color="#5BC0DE"
            transparent
            opacity={0.86}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <lineSegments geometry={rungsGeo}>
          <lineBasicMaterial
            ref={dnaRungMatRef}
            color="#96F0FF"
            transparent
            opacity={0.74}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </lineSegments>
      </group>
    </group>
  );
};

/**
 * Anatomically contoured 3D Human Lips sampled directly from the sculpted facial surface
 * so upper Cupid's bow and lower lip curve match the 3D head mesh with zero asymmetry.
 */
export const AnatomicalMouthSync: React.FC<{ voiceRef: React.MutableRefObject<number> }> = ({
  voiceRef,
}) => {
  const lowerLipRef = useRef<THREE.Group>(null);
  const upperLipRef = useRef<THREE.Group>(null);
  const cavityMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const { upperLipGeo, lowerLipGeo, cavityGeo, mouthCenter } = useMemo(() => {
    const centerPt = evalHumanHeadVertex(0, 0.592);
    const upperPts: THREE.Vector3[] = [];
    const lowerPts: THREE.Vector3[] = [];
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const s = (f - 0.5) * 2; // -1..1
      const uu = s * 0.24;
      const arch = 1 - s * s;

      // Sample exact skull-face surface along the lip contours and compute relative to mouthCenter
      const vUp = 0.586 - 0.008 * Math.cos(Math.min(1, Math.abs(s) * 2.1) * Math.PI) * arch;
      const pUp = evalHumanHeadVertex(uu, vUp);
      upperPts.push(
        new THREE.Vector3(
          pUp.x - centerPt.x,
          pUp.y - centerPt.y + 0.011 * arch,
          pUp.z - centerPt.z + 0.008
        )
      );

      const vLow = 0.598 + 0.015 * arch;
      const pLow = evalHumanHeadVertex(uu, vLow);
      lowerPts.push(
        new THREE.Vector3(
          pLow.x - centerPt.x,
          pLow.y - centerPt.y - 0.011 * arch,
          pLow.z - centerPt.z + 0.008
        )
      );
    }

    const uCurve = new THREE.CatmullRomCurve3(upperPts);
    const lCurve = new THREE.CatmullRomCurve3(lowerPts);
    const uGeo = new THREE.TubeGeometry(uCurve, 28, 0.0072, 8, false);
    const lGeo = new THREE.TubeGeometry(lCurve, 28, 0.0082, 8, false);
    const cavGeo = new THREE.CircleGeometry(0.115, 24);

    return {
      upperLipGeo: uGeo,
      lowerLipGeo: lGeo,
      cavityGeo: cavGeo,
      mouthCenter: [centerPt.x, centerPt.y, centerPt.z] as [number, number, number],
    };
  }, []);

  useFrame(() => {
    const v = voiceRef.current;
    const openDrop = v * 0.072;
    const widthScale = 1 + v * 0.04;

    if (upperLipRef.current) {
      upperLipRef.current.position.y = v * 0.008;
      upperLipRef.current.scale.set(widthScale, 1, 1);
    }
    if (lowerLipRef.current) {
      lowerLipRef.current.position.y = -openDrop;
      lowerLipRef.current.scale.set(widthScale, 1 + v * 0.08, 1);
    }
    if (cavityMatRef.current) {
      cavityMatRef.current.opacity = Math.min(0.68, v * 0.65);
    }
  });

  return (
    <group position={mouthCenter}>
      <mesh geometry={cavityGeo} scale={[1.05, 0.42, 1]} position={[0, -0.016, -0.004]}>
        <meshBasicMaterial
          ref={cavityMatRef}
          color="#02111A"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <group ref={upperLipRef}>
        <mesh geometry={upperLipGeo}>
          <meshBasicMaterial
            color="#8CEBFF"
            transparent
            opacity={0.95}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>
      <group ref={lowerLipRef}>
        <mesh geometry={lowerLipGeo}>
          <meshBasicMaterial
            color="#5BC0DE"
            transparent
            opacity={0.92}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
};
