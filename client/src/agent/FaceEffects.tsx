import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CYAN_PRIMARY = new THREE.Color("#5BC0DE");

const SOLAR_FACE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uVoice;
  varying vec3 vPos;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;

  void main() {
    vPos = position;
    // Subtle solar breathing & plasma surface ripple along vertex normal
    float wave = sin(position.y * 4.5 - uTime * 2.6) * cos(position.x * 4.0 + uTime * 1.9);
    vec3 displaced = position + normal * (wave * 0.013 + uVoice * 0.022);

    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vNormalDir = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SOLAR_WIRE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uVoice;
  uniform float uBaseOpacity;
  varying vec3 vPos;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash31(i), hash31(i + vec3(1, 0, 0)), f.x),
          mix(hash31(i + vec3(0, 1, 0)), hash31(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash31(i + vec3(0, 0, 1)), hash31(i + vec3(1, 0, 1)), f.x),
          mix(hash31(i + vec3(0, 1, 1)), hash31(i + vec3(1, 1, 1)), f.x), f.y),
      f.z
    );
  }

  float fbm3(vec3 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 3; i++) {
      v += a * noise3(p);
      p = p * 2.08 + vec3(1.7, 9.2, 4.3);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Flowing solar-plasma motion strictly within #5BC0DE cyan family (no orange)
    vec3 flowPos = vPos * 2.2 + vec3(sin(uTime * 0.8), uTime * 1.15, cos(uTime * 0.7));
    float plasma = fbm3(flowPos);
    float secondary = fbm3(vPos * 4.1 - vec3(uTime * 1.4, uTime * 0.9, -uTime * 1.1));
    float energy = smoothstep(0.28, 0.86, plasma * 0.68 + secondary * 0.48);

    // Rapid glittering sparkle crest along geometry flow lines
    float glintWave = sin(vPos.y * 14.0 - uTime * 6.5 + secondary * 10.0)
                    * cos(vPos.x * 13.0 + uTime * 5.2 - plasma * 8.0);
    float sparkle = pow(clamp(glintWave * 0.5 + 0.5, 0.0, 1.0), 5.0);

    float fresnel = pow(1.0 - abs(dot(normalize(vNormalDir), normalize(vViewDir))), 1.55);

    vec3 deepCyan = vec3(0.145, 0.495, 0.620);
    vec3 baseCyan = vec3(0.357, 0.753, 0.871); // Exact #5BC0DE
    vec3 solarMint = vec3(0.660, 0.925, 0.990); // Hot #5BC0DE solar filament crest

    vec3 col = mix(deepCyan, baseCyan, 0.45 + 0.55 * energy);
    col = mix(col, solarMint, clamp(sparkle * 0.85 + fresnel * 0.45 + uVoice * 0.4, 0.0, 1.0));
    col *= (1.18 + sparkle * 0.65 + uVoice * 0.35);

    float alpha = clamp(uBaseOpacity + energy * 0.25 + sparkle * 0.35 + fresnel * 0.25, 0.28, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

const SOLAR_SHELL_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uVoice;
  varying vec3 vPos;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;

  void main() {
    float fresnel = pow(1.0 - abs(dot(normalize(vNormalDir), normalize(vViewDir))), 2.2);
    float scan = sin(vPos.y * 16.0 - uTime * 4.0) * 0.5 + 0.5;
    float aura = sin(vPos.x * 7.0 + vPos.y * 5.0 + uTime * 2.4) * 0.5 + 0.5;
    vec3 baseCyan = vec3(0.357, 0.753, 0.871); // Exact #5BC0DE
    vec3 brightCyan = vec3(0.580, 0.890, 0.980);
    vec3 col = mix(baseCyan, brightCyan, clamp(fresnel * 0.7 + aura * 0.3, 0.0, 1.0)) * (1.1 + uVoice * 0.45);
    float alpha = (fresnel * 0.34 + 0.03 + scan * 0.04) * (0.85 + uVoice * 0.55);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.48));
  }
`;

const SPARKLE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uVoice;
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  varying float vTwinkle;

  void main() {
    vec3 pos = position;
    // Gentle helical drift around head
    float angle = uTime * aSpeed * 0.35 + aPhase;
    float s = sin(angle);
    float c = cos(angle);
    pos.xz = mat2(c, -s, s, c) * pos.xz;
    pos.y += sin(uTime * aSpeed + aPhase * 2.0) * 0.055;

    float twinkle = pow(sin(uTime * (2.6 + aSpeed) + aPhase * 7.0) * 0.5 + 0.5, 3.0);
    vTwinkle = clamp(twinkle + uVoice * 0.4, 0.15, 1.25);

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = clamp(aSize * (16.0 / -mvPos.z) * (0.65 + vTwinkle * 0.85), 2.0, 32.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const SPARKLE_FRAG = /* glsl */ `
  varying float vTwinkle;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv);
    if (dist > 0.5) discard;

    // Sharp 4-point solar diffraction star + radiant core in #5BC0DE
    float core = exp(-dist * 9.0);
    float crossRay = exp(-abs(uv.x) * 26.0) * exp(-abs(uv.y) * 5.5)
                   + exp(-abs(uv.y) * 26.0) * exp(-abs(uv.x) * 5.5);
    float intensity = clamp(core + crossRay * 0.75, 0.0, 1.4) * vTwinkle;

    vec3 cyan = vec3(0.357, 0.753, 0.871); // #5BC0DE
    vec3 glint = vec3(0.84, 0.97, 1.0);
    vec3 col = mix(cyan, glint, clamp(core, 0.0, 1.0)) * (1.2 + vTwinkle * 0.55);

    gl_FragColor = vec4(col, clamp(intensity, 0.0, 0.98));
  }
`;

/**
 * Builds a tapered cylindrical tube around a 3D spline so lip contours taper
 * naturally into crisp delicate mouth corners.
 */
function buildTaperedLipGeometry(
  curve: THREE.CatmullRomCurve3,
  segments: number,
  radialSegments: number,
  maxRadius: number,
  minRadius: number,
  cupidDipSuppression = 0
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const center = curve.getPointAt(u);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    // Smooth dome taper: 0 at mouth corners -> full in middle
    const edgeTaper = Math.sin(u * Math.PI);
    const subtleCupidThin =
      cupidDipSuppression > 0 ? 1.0 - cupidDipSuppression * Math.exp(-Math.pow((u - 0.5) * 9.0, 2)) : 1.0;
    const radius = (minRadius + (maxRadius - minRadius) * Math.pow(edgeTaper, 0.75)) * subtleCupidThin;

    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);

      normal.x = cos * N.x + sin * B.x;
      normal.y = cos * N.y + sin * B.y;
      normal.z = cos * N.z + sin * B.z;
      normal.normalize();

      // Slightly flatter depth than height for refined human lip proportions
      vertex.x = center.x + radius * normal.x;
      vertex.y = center.y + radius * 1.1 * normal.y;
      vertex.z = center.z + radius * 0.78 * normal.z;

      positions.push(vertex.x, vertex.y, vertex.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(u, j / radialSegments);
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = (i + 1) * (radialSegments + 1) + j;
      const c = (i + 1) * (radialSegments + 1) + (j + 1);
      const d = i * (radialSegments + 1) + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

export const SolarFaceEffects: React.FC<{ voiceRef: React.MutableRefObject<number> }> = ({
  voiceRef,
}) => {
  const sparklePointsRef = useRef<THREE.Points>(null);

  const wireMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uVoice: { value: 0 },
          uBaseOpacity: { value: 0.74 },
        },
        vertexShader: SOLAR_FACE_VERT,
        fragmentShader: SOLAR_WIRE_FRAG,
        wireframe: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    []
  );

  const shellMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uVoice: { value: 0 },
        },
        vertexShader: SOLAR_FACE_VERT,
        fragmentShader: SOLAR_SHELL_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    []
  );

  const sparkleMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uVoice: { value: 0 },
        },
        vertexShader: SPARKLE_VERT,
        fragmentShader: SPARKLE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    []
  );

  const { sparkleGeo, browLineGeo, noseBridgeGeo, cheekLeftGeo, cheekRightGeo } = useMemo(() => {
    // 260 3D twinkling cyan sparks distributed over face cranium & halo orbit
    const count = 260;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const shellScale = i % 3 === 0 ? 1.24 : 1.03;
      const rx = 0.85 * shellScale;
      const ry = 1.06 * shellScale;
      const rz = 0.89 * shellScale;

      positions[i * 3] = rx * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = ry * Math.cos(phi);
      positions[i * 3 + 2] = rz * Math.sin(phi) * Math.sin(theta);

      sizes[i] = i % 5 === 0 ? 14.5 : 8.5 + (i % 4) * 1.8;
      phases[i] = (i * 1.618) % (Math.PI * 2);
      speeds[i] = 0.45 + (i % 7) * 0.16;
    }

    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    sGeo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    sGeo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    sGeo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));

    // Delicate facial contour tubes to sharpen human facial readability in #5BC0DE
    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.56, 0.25, 0.72),
      new THREE.Vector3(-0.32, 0.33, 0.88),
      new THREE.Vector3(0, 0.27, 0.94),
      new THREE.Vector3(0.32, 0.33, 0.88),
      new THREE.Vector3(0.56, 0.25, 0.72),
    ]);
    const noseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.24, 0.95),
      new THREE.Vector3(0, 0.04, 1.02),
      new THREE.Vector3(0, -0.14, 1.05),
      new THREE.Vector3(-0.045, -0.19, 1.00),
      new THREE.Vector3(0, -0.20, 1.02),
      new THREE.Vector3(0.045, -0.19, 1.00),
    ]);
    const cheekLCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.68, 0.08, 0.58),
      new THREE.Vector3(-0.50, -0.18, 0.76),
      new THREE.Vector3(-0.28, -0.52, 0.76),
      new THREE.Vector3(0, -0.78, 0.74),
    ]);
    const cheekRCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.68, 0.08, 0.58),
      new THREE.Vector3(0.50, -0.18, 0.76),
      new THREE.Vector3(0.28, -0.52, 0.76),
      new THREE.Vector3(0, -0.78, 0.74),
    ]);

    return {
      sparkleGeo: sGeo,
      browLineGeo: new THREE.TubeGeometry(browCurve, 32, 0.0065, 6, false),
      noseBridgeGeo: new THREE.TubeGeometry(noseCurve, 28, 0.006, 6, false),
      cheekLeftGeo: new THREE.TubeGeometry(cheekLCurve, 24, 0.0055, 6, false),
      cheekRightGeo: new THREE.TubeGeometry(cheekRCurve, 24, 0.0055, 6, false),
    };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const v = voiceRef.current;
    wireMat.uniforms.uTime.value = t;
    wireMat.uniforms.uVoice.value = v;
    shellMat.uniforms.uTime.value = t;
    shellMat.uniforms.uVoice.value = v;
    sparkleMat.uniforms.uTime.value = t;
    sparkleMat.uniforms.uVoice.value = v;
  });

  return (
    <>
      {/* Molten flowing solar-cyan outer wireframe lattice (#5BC0DE) */}
      <mesh scale={[0.85, 1.06, 0.89]} material={wireMat}>
        <icosahedronGeometry args={[1.15, 2]} />
      </mesh>

      {/* Translucent holographic plasma rim veil (#5BC0DE) */}
      <mesh scale={[0.82, 1.03, 0.86]} material={shellMat}>
        <icosahedronGeometry args={[1.11, 3]} />
      </mesh>

      {/* Defined cyan facial geometry contours: brow ridge, nose bridge, jawline */}
      <mesh geometry={browLineGeo}>
        <meshBasicMaterial color={CYAN_PRIMARY} transparent opacity={0.92} toneMapped={false} />
      </mesh>
      <mesh geometry={noseBridgeGeo}>
        <meshBasicMaterial color="#8CE2F5" transparent opacity={0.86} toneMapped={false} />
      </mesh>
      <mesh geometry={cheekLeftGeo}>
        <meshBasicMaterial color={CYAN_PRIMARY} transparent opacity={0.78} toneMapped={false} />
      </mesh>
      <mesh geometry={cheekRightGeo}>
        <meshBasicMaterial color={CYAN_PRIMARY} transparent opacity={0.78} toneMapped={false} />
      </mesh>

      {/* 260 glittering 4-point solar diffraction sparkles (#5BC0DE) */}
      <points ref={sparklePointsRef} geometry={sparkleGeo} material={sparkleMat} />
    </>
  );
};

/**
 * Small, anatomically contoured human lips (Cupid's bow upper + soft cushioned lower)
 * with smooth voice-driven articulation and cavity lighting.
 */
export const SculptedHumanLips: React.FC<{ voiceRef: React.MutableRefObject<number> }> = ({
  voiceRef,
}) => {
  const mouthGroupRef = useRef<THREE.Group>(null);
  const upperGroupRef = useRef<THREE.Group>(null);
  const lowerGroupRef = useRef<THREE.Group>(null);
  const cavityRef = useRef<THREE.Mesh>(null);

  const { upperLipGeo, upperBowHighlightGeo, lowerLipGeo, lowerLipHighlightGeo } = useMemo(() => {
    // Small proportional human width: corners at +/-0.095, wrapped cleanly on front Z~0.995
    const upperCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.095, -0.002, -0.026),
      new THREE.Vector3(-0.056, 0.009, -0.004),
      new THREE.Vector3(-0.026, 0.019, 0.008), // Left Cupid crest
      new THREE.Vector3(0.0, 0.011, 0.011), // Center Cupid dip
      new THREE.Vector3(0.026, 0.019, 0.008), // Right Cupid crest
      new THREE.Vector3(0.056, 0.009, -0.004),
      new THREE.Vector3(0.095, -0.002, -0.026),
    ]);

    const lowerCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.092, -0.003, -0.025),
      new THREE.Vector3(-0.048, -0.019, 0.002),
      new THREE.Vector3(0.0, -0.024, 0.012), // Smooth natural center pillow
      new THREE.Vector3(0.048, -0.019, 0.002),
      new THREE.Vector3(0.092, -0.003, -0.025),
    ]);

    const bowLine = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.038, 0.023, 0.011),
      new THREE.Vector3(0.0, 0.015, 0.015),
      new THREE.Vector3(0.038, 0.023, 0.011),
    ]);

    const lowerHighlight = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.036, -0.023, 0.015),
      new THREE.Vector3(0.0, -0.027, 0.021),
      new THREE.Vector3(0.036, -0.023, 0.015),
    ]);

    return {
      upperLipGeo: buildTaperedLipGeometry(upperCurve, 44, 14, 0.0105, 0.0022, 0.16),
      upperBowHighlightGeo: buildTaperedLipGeometry(bowLine, 24, 8, 0.003, 0.001, 0),
      lowerLipGeo: buildTaperedLipGeometry(lowerCurve, 40, 14, 0.0125, 0.0022, 0),
      lowerLipHighlightGeo: buildTaperedLipGeometry(lowerHighlight, 24, 8, 0.0032, 0.001, 0),
    };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const rawV = voiceRef.current;
    // Syllable modulation when voice is active so lips articulate organically
    const syllable = rawV > 0.04 ? 0.65 + 0.35 * Math.sin(t * 21.0) : 0;
    const v = THREE.MathUtils.clamp(rawV * (0.75 + syllable * 0.45), 0, 1);

    if (upperGroupRef.current && lowerGroupRef.current) {
      upperGroupRef.current.position.y = v * 0.018;
      upperGroupRef.current.rotation.x = -v * 0.14;

      lowerGroupRef.current.position.y = -v * 0.068;
      lowerGroupRef.current.position.z = -v * 0.008;
      lowerGroupRef.current.rotation.x = v * 0.24;
    }

    if (mouthGroupRef.current) {
      // Natural slight corner compression on rounded vowels + subtle horizontal articulation
      mouthGroupRef.current.scale.set(1 - v * 0.09, 1 + v * 0.06, 1);
    }

    if (cavityRef.current) {
      const openScaleY = 0.08 + v * 1.45;
      cavityRef.current.scale.set(0.88 + v * 0.16, openScaleY, 1);
      const mat = cavityRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = v > 0.03 ? Math.min(0.88, 0.2 + v * 0.9) : 0.22;
    }
  });

  return (
    <group ref={mouthGroupRef} position={[0, -0.325, 1.005]}>
      {/* Dark mouth aperture + subtle cyan inner harmonic seam */}
      <mesh ref={cavityRef} position={[0, -0.011, -0.01]}>
        <planeGeometry args={[0.135, 0.032]} />
        <meshBasicMaterial color="#020b12" transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>

      {/* Upper lip with delicate Cupid's bow */}
      <group ref={upperGroupRef}>
        <mesh geometry={upperLipGeo}>
          <meshStandardMaterial
            color="#5BC0DE"
            emissive="#5BC0DE"
            emissiveIntensity={0.68}
            roughness={0.28}
            metalness={0.3}
            toneMapped={false}
          />
        </mesh>
        <mesh geometry={upperBowHighlightGeo}>
          <meshBasicMaterial color="#C8F2FC" transparent opacity={0.95} toneMapped={false} />
        </mesh>
      </group>

      {/* Lower fuller curved lip */}
      <group ref={lowerGroupRef}>
        <mesh geometry={lowerLipGeo}>
          <meshStandardMaterial
            color="#439FBA"
            emissive="#5BC0DE"
            emissiveIntensity={0.48}
            roughness={0.32}
            metalness={0.25}
            toneMapped={false}
          />
        </mesh>
        <mesh geometry={lowerLipHighlightGeo}>
          <meshBasicMaterial color="#AEEAF8" transparent opacity={0.85} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
};
