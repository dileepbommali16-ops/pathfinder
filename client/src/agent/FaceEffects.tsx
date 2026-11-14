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

    // Anatomical mandible / lower-lip articulation when speaking
    float frontMask = smoothstep(0.12, 0.72, position.z);
    float jawMask = smoothstep(-0.19, -0.27, position.y) * (1.0 - smoothstep(-0.58, -0.86, position.y));
    displaced.y -= uVoice * 0.088 * jawMask * frontMask;
    displaced.z -= uVoice * 0.014 * jawMask * frontMask;

    // Subtle organic neural-DNA pulse along vertex normals
    float angle = atan(position.x, max(0.001, position.z));
    float dnaPulse = sin(position.y * 6.5 - angle * 2.0 - uTime * 2.2) * 0.0035;
    displaced += normal * dnaPulse;

    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vNormalDir = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Radiant #5BC0DE Human-DNA electric blue wireframe with spiraling helical energy bands (NO white stars/decorations)
const DNA_WIRE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uVoice;
  uniform float uBaseOpacity;
  varying vec3 vPos;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;

  void main() {
    float az = atan(vPos.x, vPos.z);
    // Counter-rotating double-helix DNA energy waves tracing the human head topology
    float helixA = pow(0.5 + 0.5 * sin(vPos.y * 7.2 + az * 2.0 - uTime * 2.4), 3.0);
    float helixB = pow(0.5 + 0.5 * sin(vPos.y * 7.2 - az * 2.0 - uTime * 1.9 + 3.14159), 3.0);
    float dnaWave = clamp(helixA + helixB, 0.0, 1.0);

    // Front facial feature emphasis so brow, eye sockets, nose, lips & jaw pop cleanly in bright #5BC0DE blue
    float frontFocus = smoothstep(-0.35, 0.85, vPos.z);
    float fresnel = pow(1.0 - abs(dot(normalize(vNormalDir), normalize(vViewDir))), 1.35);

    vec3 deepElectricBlue = vec3(0.118, 0.545, 0.750);
    vec3 brightCyanBlue   = vec3(0.357, 0.753, 0.871); // #5BC0DE
    vec3 radiantHelixBlue = vec3(0.510, 0.905, 1.000); // Luminous #82E7FF DNA crest

    vec3 col = mix(deepElectricBlue, brightCyanBlue, 0.42 + 0.58 * frontFocus);
    col = mix(col, radiantHelixBlue, clamp(dnaWave * 0.62 + fresnel * 0.38 + uVoice * 0.35, 0.0, 1.0));
    col *= (1.38 + frontFocus * 0.36 + dnaWave * 0.48 + uVoice * 0.42);

    float alpha = clamp(uBaseOpacity + frontFocus * 0.24 + dnaWave * 0.22 + fresnel * 0.16, 0.36, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

// Translucent bright blue anatomical skin/hologram surface beneath the wireframe
const DNA_SHELL_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uVoice;
  varying vec3 vPos;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;

  void main() {
    vec3 N = normalize(vNormalDir);
    vec3 V = normalize(vViewDir);
    float fresnel = pow(1.0 - abs(dot(N, V)), 1.65);
    float frontLight = clamp(dot(N, normalize(vec3(0.0, 0.2, 1.0))) * 0.5 + 0.5, 0.0, 1.0);
    float az = atan(vPos.x, vPos.z);
    float dnaGlow = 0.5 + 0.5 * sin(vPos.y * 6.5 + az * 2.0 - uTime * 2.1);

    vec3 shellBlue = vec3(0.165, 0.625, 0.820);
    vec3 brightBlue = vec3(0.357, 0.753, 0.871); // #5BC0DE
    vec3 col = mix(shellBlue, brightBlue, frontLight * 0.55 + fresnel * 0.65);
    col *= (0.95 + dnaGlow * 0.32 + uVoice * 0.28);

    float alpha = clamp(0.11 + fresnel * 0.29 + frontLight * 0.06 + uVoice * 0.08, 0.08, 0.48);
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
 * Parametrically evaluates an anatomically proportioned 3D human head & upper neck surface.
 * u in [-PI, PI] (u = 0 is dead-center +Z face), v in [0, 1] (0 = top of crown, 1 = lower neck collar).
 */
function evalHumanHeadVertex(u: number, v: number): THREE.Vector3 {
  const absU = Math.abs(u);
  const sinU = Math.sin(u);
  const cosU = Math.cos(u);

  // 1. Vertical anatomical axis from top of cranium (+1.16) to neck base (-1.12)
  // Concentrate slightly more rings across the facial plane (v = 0.28..0.76)
  const y = 1.16 - 2.28 * v;

  // 2. Smooth lateral width rx(v) & depth rz(v) silhouette of a human skull -> mandible -> neck
  let rx = 0.0;
  let rz = 0.0;
  let zCenter = 0.0;

  if (v < 0.16) {
    // Cranial vault dome
    const t = Math.max(0.008, v / 0.16);
    const dome = Math.sqrt(Math.sin(t * Math.PI * 0.5));
    rx = 0.74 * dome;
    rz = 0.90 * dome;
    zCenter = -0.05;
  } else if (v < 0.42) {
    // Forehead to temples & brow plane
    const t = (v - 0.16) / 0.26;
    rx = 0.74 + 0.03 * Math.sin(t * Math.PI);
    rz = 0.90 - 0.02 * t;
    zCenter = -0.05 + 0.04 * t;
  } else if (v < 0.58) {
    // Mid-face: cheekbones (zygoma) & occipital curve
    const t = (v - 0.42) / 0.16;
    rx = 0.74 - 0.06 * t;
    rz = 0.88 - 0.04 * t;
    zCenter = -0.01 + 0.02 * t;
  } else if (v < 0.77) {
    // Lower face: cheeks tapering neatly into defined jawline & chin
    const t = (v - 0.58) / 0.19;
    rx = 0.68 * (1 - 0.38 * t * t);
    rz = 0.84 * (1 - 0.30 * Math.pow(t, 1.35));
    zCenter = 0.01 - 0.11 * Math.pow(t, 1.8);
  } else {
    // Submental under-chin transition & human neck cylinder
    const t = (v - 0.77) / 0.23;
    const neckPinch = 1 - 0.18 * Math.sin(Math.min(1, t * 2.1) * Math.PI * 0.5);
    rx = 0.43 * neckPinch + 0.05 * Math.pow(t, 2.0);
    rz = 0.54 * neckPinch + 0.03 * Math.pow(t, 2.0);
    zCenter = -0.10 - 0.14 * Math.min(1, t * 1.4);
  }

  let x = rx * sinU;
  let z = rz * cosU + zCenter;

  // Elongate human cranium toward the back (-Z) above neck level
  if (cosU < 0 && v < 0.76) {
    const occiputWeight = Math.sin(Math.min(1, v / 0.76) * Math.PI * 0.82);
    z += cosU * 0.11 * occiputWeight;
  }

  // Facial anatomical sculpting across anterior face (cosU > 0)
  if (cosU > 0.02 && v > 0.15 && v < 0.84) {
    // Cheekbones (zygomatic arch highlight around y = +0.01, absU = 0.68)
    const cheek = gaussian2(absU, 0.68, 0.28, y, 0.02, 0.14);
    z += cheek * 0.055;
    x += Math.sign(u) * cheek * 0.032;

    // Gentle hollow beneath cheekbones (buccal contour around y = -0.18, absU = 0.56)
    const cheekHollow = gaussian2(absU, 0.56, 0.24, y, -0.19, 0.12);
    z -= cheekHollow * 0.045;

    // Supraorbital brow ridge above each eye
    const browRidge = gaussian2(absU, 0.31, 0.20, y, 0.305, 0.065);
    z += browRidge * 0.058;

    // Recessed anatomical eye sockets (orbits) framing left & right molten eyes
    const eyeSocket = gaussian2(absU, 0.32, 0.155, y, 0.165, 0.088);
    z -= eyeSocket * 0.135;

    // Sculpted human nose bridge (y = +0.23 down to -0.08 along u = 0)
    const noseBridgeSpan =
      y <= 0.26 && y >= -0.095
        ? Math.sin(Math.min(1, Math.max(0, (0.26 - y) / 0.355)) * Math.PI * 0.88)
        : 0;
    const noseCenter = gaussian1(u, 0, 0.088);
    z += noseBridgeSpan * noseCenter * 0.165;

    // Sculpted nasal tip & subtle under-nose septum curve
    const noseTip = gaussian2(u, 0, 0.095, y, -0.055, 0.052);
    z += noseTip * 0.082;

    // Alar wings / human nostrils integrated softly left & right of nasal tip
    const nostrils = gaussian2(absU, 0.125, 0.055, y, -0.075, 0.042);
    z += nostrils * 0.055;
    x += Math.sign(u) * nostrils * 0.014;

    // Subtle philtrum indention below nose
    const philtrum = gaussian2(u, 0, 0.045, y, -0.155, 0.035);
    z -= philtrum * 0.018;

    // Sculpted human upper lip (with Cupid's bow modulation) & lower lip cushion
    const cupidsBowY = -0.208 - 0.012 * Math.cos(Math.min(1, absU / 0.18) * Math.PI);
    const upperLip = gaussian2(absU, 0, 0.18, y, cupidsBowY, 0.024);
    const lipPart = gaussian2(absU, 0, 0.17, y, -0.242, 0.014);
    const lowerLip = gaussian2(absU, 0, 0.16, y, -0.278, 0.028);
    z += upperLip * 0.056 - lipPart * 0.028 + lowerLip * 0.052;

    // Chin (mentum) eminence & defined mandible corner angle
    const chin = gaussian2(u, 0, 0.22, y, -0.515, 0.11);
    z += chin * 0.075;

    const jawAngle = gaussian2(absU, 0.86, 0.25, y, -0.40, 0.12);
    x += Math.sign(u) * jawAngle * 0.036;
  }

  // Subtle side ear silhouettes for realistic 3/4 turn
  const earBump = gaussian2(absU, 1.54, 0.14, y, 0.08, 0.14);
  x += Math.sign(u) * earBump * 0.055;

  return new THREE.Vector3(x, y, z);
}

/** Builds clean structured quad wireframe + smooth holographic surface + real 3D Human DNA core. */
export const AnatomicalHumanHeadDNA: React.FC<{ voiceRef: React.MutableRefObject<number> }> = ({
  voiceRef,
}) => {
  const dnaCoreRef = useRef<THREE.Group>(null);

  const { surfaceGeometry, wireframeGeometry } = useMemo(() => {
    const vSteps = 44;
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

    // Smooth surface BufferGeometry for subtle translucent interior plasma depth
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

    // Clean structured anatomical LineSegments: meridians + horizontal contour rings (zero messy icosahedron diagonals)
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

    // Every horizontal anatomical contour ring (44 rings) + every meridian (32 cleanly spaced vertical contours)
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
    // Add extra fine vertical detail right across center face (nose/mouth/eye zone) so sculpted nose & lips read sharply
    for (let vi = 10; vi < 35; vi++) {
      for (let ui = 25; ui <= 39; ui += 2) {
        pushSeg(vi, ui, vi + 1, ui);
      }
    }

    const wireGeo = new THREE.BufferGeometry();
    wireGeo.setAttribute("position", new THREE.Float32BufferAttribute(wireVerts, 3));
    wireGeo.setAttribute("normal", new THREE.Float32BufferAttribute(wireNorms, 3));

    return { surfaceGeometry: surfGeo, wireframeGeometry: wireGeo };
  }, []);

  // Internal 3D Human DNA Double-Helix Spine rising cleanly through neck + brain core (#5BC0DE)
  const { strandAGeo, strandBGeo, rungsGeo } = useMemo(() => {
    const ptsA: THREE.Vector3[] = [];
    const ptsB: THREE.Vector3[] = [];
    const rungVerts: number[] = [];

    const totalSteps = 84;
    const turns = 2.65;
    const radius = 0.255;
    const yStart = -1.06;
    const yEnd = 0.88;

    for (let i = 0; i <= totalSteps; i++) {
      const t = i / totalSteps;
      const y = yStart + (yEnd - yStart) * t;
      // Taper gently into brain crown and down through neck center
      const rScale = t < 0.22 ? 0.68 + 0.32 * (t / 0.22) : t > 0.85 ? 1.0 - 0.32 * ((t - 0.85) / 0.15) : 1.0;
      const r = radius * rScale;
      const theta = t * Math.PI * 2 * turns;
      // Slight backward Z bias to center cleanly inside cranium/neck volume
      const zBias = -0.05;

      const ax = Math.cos(theta) * r;
      const az = Math.sin(theta) * r + zBias;
      const bx = Math.cos(theta + Math.PI) * r;
      const bz = Math.sin(theta + Math.PI) * r + zBias;

      ptsA.push(new THREE.Vector3(ax, y, az));
      ptsB.push(new THREE.Vector3(bx, y, bz));

      if (i % 3 === 0 && i > 1 && i < totalSteps - 1) {
        rungVerts.push(ax, y, az, bx, y, bz);
      }
    }

    const curveA = new THREE.CatmullRomCurve3(ptsA);
    const curveB = new THREE.CatmullRomCurve3(ptsB);
    const sAGeo = new THREE.TubeGeometry(curveA, 96, 0.015, 8, false);
    const sBGeo = new THREE.TubeGeometry(curveB, 96, 0.015, 8, false);
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
          uBaseOpacity: { value: 0.64 },
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
    shellMaterial.uniforms.uTime.value = t;
    shellMaterial.uniforms.uVoice.value = v;

    if (dnaCoreRef.current) {
      dnaCoreRef.current.rotation.y = t * 0.72;
    }
    if (dnaStrandMatRef.current) {
      dnaStrandMatRef.current.opacity = 0.78 + v * 0.22;
    }
    if (dnaRungMatRef.current) {
      dnaRungMatRef.current.opacity = 0.66 + 0.2 * Math.sin(t * 2.4) + v * 0.2;
    }
  });

  return (
    <group>
      {/* Translucent luminous #5BC0DE anatomical skull/face volume */}
      <mesh geometry={surfaceGeometry} material={shellMaterial} />

      {/* Bright pure electric #5BC0DE anatomical human wireframe scan with traveling DNA wave bands */}
      <lineSegments geometry={wireframeGeometry} material={wireMaterial} />

      {/* Central 3D Human DNA Double-Helix twisting vertically inside the skull & neck core */}
      <group ref={dnaCoreRef}>
        <mesh geometry={strandAGeo}>
          <meshBasicMaterial
            ref={dnaStrandMatRef}
            color="#7AE4FF"
            transparent
            opacity={0.86}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh geometry={strandBGeo}>
          <meshBasicMaterial
            color="#5BC0DE"
            transparent
            opacity={0.82}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <lineSegments geometry={rungsGeo}>
          <lineBasicMaterial
            ref={dnaRungMatRef}
            color="#8EEBFF"
            transparent
            opacity={0.72}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </lineSegments>
      </group>
    </group>
  );
};

/**
 * Anatomically contoured 3D Human Lips + Mouth Interior aligned directly onto the sculpted facial curvature.
 */
export const AnatomicalMouthSync: React.FC<{ voiceRef: React.MutableRefObject<number> }> = ({
  voiceRef,
}) => {
  const lowerLipRef = useRef<THREE.Group>(null);
  const upperLipRef = useRef<THREE.Group>(null);
  const cavityMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const { upperLipGeo, lowerLipGeo, cavityGeo } = useMemo(() => {
    // Upper lip arch with subtle anatomical Cupid's bow contoured along skull curvature (z ~ 0.87 -> 0.80)
    const upperPts: THREE.Vector3[] = [];
    const lowerPts: THREE.Vector3[] = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const f = i / steps; // 0..1 left to right
      const s = (f - 0.5) * 2; // -1..1
      const x = s * 0.145;
      const arch = 1 - s * s;
      // Gentle M-curve Cupid's bow on upper lip
      const bow = 0.011 * Math.cos(Math.min(1, Math.abs(s) * 2.1) * Math.PI) * arch;
      const yUpper = 0.014 * arch + bow;
      const zCurve = 0.036 * arch;
      upperPts.push(new THREE.Vector3(x, yUpper, zCurve));

      const yLower = -0.026 * Math.pow(arch, 0.78);
      lowerPts.push(new THREE.Vector3(x, yLower, zCurve * 0.96));
    }

    const uCurve = new THREE.CatmullRomCurve3(upperPts);
    const lCurve = new THREE.CatmullRomCurve3(lowerPts);
    const uGeo = new THREE.TubeGeometry(uCurve, 28, 0.0105, 8, false);
    const lGeo = new THREE.TubeGeometry(lCurve, 28, 0.012, 8, false);
    const cavGeo = new THREE.CircleGeometry(0.11, 24);

    return { upperLipGeo: uGeo, lowerLipGeo: lGeo, cavityGeo: cavGeo };
  }, []);

  useFrame(() => {
    const v = voiceRef.current;
    const openDrop = v * 0.082;
    const widthScale = 1 + v * 0.05;

    if (upperLipRef.current) {
      upperLipRef.current.position.y = 0.008 + v * 0.012;
      upperLipRef.current.scale.set(widthScale, 1, 1);
    }
    if (lowerLipRef.current) {
      lowerLipRef.current.position.y = -0.006 - openDrop;
      lowerLipRef.current.scale.set(widthScale, 1 + v * 0.08, 1);
    }
    if (cavityMatRef.current) {
      cavityMatRef.current.opacity = Math.min(0.68, v * 0.65);
    }
  });

  return (
    // Flush onto the sculpted mouth curve (v ~ 0.615 -> y = -0.242, z = +0.848)
    <group position={[0, -0.242, 0.848]}>
      {/* Dark interior shadow during speech */}
      <mesh geometry={cavityGeo} scale={[1.05, 0.42, 1]} position={[0, -0.015, 0.005]}>
        <meshBasicMaterial
          ref={cavityMatRef}
          color="#041926"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* Anatomically contoured upper & lower human lips in bright luminous #5BC0DE blue */}
      <group ref={upperLipRef}>
        <mesh geometry={upperLipGeo}>
          <meshBasicMaterial
            color="#88EAFF"
            transparent
            opacity={0.96}
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
            opacity={0.94}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
};
