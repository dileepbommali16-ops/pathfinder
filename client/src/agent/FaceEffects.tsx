import React, { useMemo } from "react";
import * as THREE from "three";

export interface HologramUniforms {
  uTime: { value: number };
  uVoice: { value: number };
}

/**
 * Attaches world-space position & anatomical bottom-edge fade attributes cleanly onto
 * MeshPhongMaterial while preserving Three.js r186 morph targets (#include <morphtarget_vertex>)
 * so facecap.glb's 52 ARKit expressions (jawOpen, eyeBlink_L/R, mouthFunnel) animate 3D geometry.
 */
export function createHologramScanMaterial(
  sharedUniforms: HologramUniforms,
  options?: { isTeeth?: boolean; isShoulders?: boolean }
): THREE.MeshPhongMaterial {
  const isTeeth = Boolean(options?.isTeeth);
  const isShoulders = Boolean(options?.isShoulders);

  const mat = new THREE.MeshPhongMaterial({
    color: new THREE.Color("#00E8FF"),
    emissive: new THREE.Color("#004A66"),
    transparent: true,
    depthWrite: !isShoulders,
    side: THREE.FrontSide,
    toneMapped: false,
  });

  if (isShoulders) {
    // Allow subtle blend inside neck junction while still rendering clean front silhouette
    mat.depthWrite = true;
  }

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedUniforms.uTime;
    shader.uniforms.uVoice = sharedUniforms.uVoice;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         varying vec3 vHoloWorldPos;
         ${isShoulders ? "attribute float aBustFade;\nvarying float vBustFade;" : ""}`
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
         vHoloWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
         ${isShoulders ? "vBustFade = aBustFade;" : ""}`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uTime;
         uniform float uVoice;
         varying vec3 vHoloWorldPos;
         ${isShoulders ? "varying float vBustFade;" : ""}`
      )
      .replace(
        "#include <opaque_fragment>",
        `
        vec3 holoN = normalize(normal);
        vec3 holoV = normalize(vViewPosition);
        float ndv = clamp(abs(dot(holoN, holoV)), 0.0, 1.0);
        float fresnel = pow(1.0 - ndv, 1.75);

        // Soft sculpted frontal + subtle top-rim light so nose, brows, cheekbones, lips & collarbones read crisply
        float keySculpt = clamp(dot(holoN, normalize(vec3(0.06, 0.34, 0.94))), 0.0, 1.0);
        float rimSculpt = clamp(1.0 - dot(holoN, normalize(vec3(0.0, 0.15, 0.99))), 0.0, 1.0);

        // Tight horizontal cyan hologram scanlines + delicate micro-dot grid matching the reference bust
        float rawBand = 0.5 + 0.5 * sin(vHoloWorldPos.y * 315.0 - uTime * 2.1);
        float scanLine = smoothstep(0.20, 0.86, rawBand);
        float microGrid = 0.86 + 0.14 * sin(vHoloWorldPos.x * 410.0 + vHoloWorldPos.z * 160.0);
        float sweepPulse = pow(0.5 + 0.5 * sin(vHoloWorldPos.y * 4.6 + uTime * 2.0), 5.0);

        vec3 troughCyan = vec3(0.002, 0.038, 0.058); // Dark trough blends seamlessly over #000000
        vec3 midCyan    = vec3(0.035, 0.660, 0.840); // Deep luminous hologram cyan
        vec3 brightCyan = vec3(0.290, 0.935, 1.000); // Electric cyan #4AEFFF / #5BC0DE crest

        float surfaceLum = clamp(keySculpt * 0.68 + fresnel * 0.72 + rimSculpt * 0.18 + sweepPulse * 0.22 + uVoice * 0.18, 0.08, 1.35);
        vec3 cyanBase = mix(midCyan, brightCyan, clamp(keySculpt * 0.45 + fresnel * 0.55 + sweepPulse * 0.28, 0.0, 1.0));
        vec3 col = mix(troughCyan, cyanBase * (0.95 + surfaceLum * 0.48), scanLine * microGrid);
        col += brightCyan * fresnel * 0.36;
        ${isTeeth ? "col *= 0.55;" : ""}

        ${
          isShoulders
            ? "float bustEdge = smoothstep(0.0, 0.92, vBustFade);\ncol *= bustEdge;\ndiffuseColor.a = clamp(0.95 * bustEdge, 0.0, 1.0);"
            : "diffuseColor.a = clamp(0.84 + scanLine * 0.14 + fresnel * 0.02, 0.82, 0.98);"
        }
        outgoingLight = col;
        #include <opaque_fragment>`
      );
  };

  return mat;
}

/**
 * Molten glowing crimson-ruby eyes (#F23456 + #A80139) applied strictly to facecap.glb's eyeLeft & eyeRight.
 * Centered via view-space normal dot so glowing iris/magma core always faces straight out cleanly inside blinking eyelids.
 */
export function createMoltenRedEyeMaterial(sharedUniforms: HologramUniforms): THREE.MeshPhongMaterial {
  const mat = new THREE.MeshPhongMaterial({
    color: new THREE.Color("#F23456"),
    emissive: new THREE.Color("#A80139"),
    transparent: false,
    depthWrite: true,
    toneMapped: false,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedUniforms.uTime;
    shader.uniforms.uVoice = sharedUniforms.uVoice;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         varying vec3 vEyeWorldPos;`
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
         vEyeWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uTime;
         uniform float uVoice;
         varying vec3 vEyeWorldPos;`
      )
      .replace(
        "#include <opaque_fragment>",
        `
        vec3 eyeN = normalize(normal);
        vec3 eyeV = normalize(vViewPosition);
        float centerDot = clamp(dot(eyeN, eyeV), 0.0, 1.0);
        float irisCore = pow(centerDot, 2.2);
        float outerGlow = smoothstep(0.15, 0.95, centerDot);

        float swirl = sin(vEyeWorldPos.x * 95.0 + uTime * 3.8 + cos(vEyeWorldPos.y * 105.0 - uTime * 3.1))
                    + cos(vEyeWorldPos.y * 90.0 - uTime * 3.2 + sin(vEyeWorldPos.x * 85.0 + uTime * 2.5));
        float vein = 0.5 + 0.5 * sin(swirl * 1.4 + uTime * 2.4);

        vec3 crimsonLava = vec3(0.949, 0.204, 0.337); // #F23456
        vec3 rubyMagma   = vec3(0.659, 0.004, 0.224); // #A80139
        vec3 flareCore   = vec3(1.000, 0.420, 0.520);

        vec3 eyeCol = mix(rubyMagma, crimsonLava, clamp(vein * 0.55 + outerGlow * 0.65, 0.0, 1.0));
        eyeCol = mix(eyeCol, flareCore, irisCore * 0.72);
        eyeCol *= (1.42 + irisCore * 0.85 + vein * 0.28 + uVoice * 0.42);

        outgoingLight = eyeCol;
        diffuseColor.a = 1.0;
        #include <opaque_fragment>`
      );
  };

  return mat;
}

const DEFAULT_BUST_POS: [number, number, number] = [0, 0, 0];

/**
 * Anatomically sculpted holographic neck + collarbone + upper-shoulders bust matched seamlessly beneath facecap.glb
 * so the silhouette & horizontal cyan scanlines replicate the full holographic male bust over pure #000000.
 */
export const HologramShouldersBust: React.FC<{
  sharedUniforms: HologramUniforms;
  position?: [number, number, number];
}> = React.memo(({ sharedUniforms, position = DEFAULT_BUST_POS }) => {
  const { geometry, material } = useMemo(() => {
    const vSteps = 34;
    const uSteps = 56;
    const positions: number[] = [];
    const fades: number[] = [];
    const indices: number[] = [];

    for (let vi = 0; vi <= vSteps; vi++) {
      const v = vi / vSteps; // 0 = inside neck top junction, 1 = bottom shoulder cut

      // Neck rises slightly deeper in back than front, sloping out cleanly into trapezius + deltoid shoulders
      const yBase = -0.34 - v * 0.49;

      // Neck radius (~0.245) flares along S-curve into shoulders (~0.84 width, ~0.34 chest depth)
      const flare = Math.pow(v, 1.65);
      const neckSmooth = Math.sin(Math.min(1, v * 1.35) * Math.PI * 0.5);
      const rx = 0.245 + 0.62 * flare;
      const rz = 0.275 + 0.075 * flare - 0.03 * Math.sin(v * Math.PI);
      const zCenter = -0.10 - 0.03 * neckSmooth;

      // Graceful curved bottom edge fade (matches Sketchfab bust cutout fade at chest/deltoid base)
      const bottomAlpha = 1.0 - THREE.MathUtils.smoothstep(v, 0.72, 1.0);

      for (let ui = 0; ui <= uSteps; ui++) {
        const u = -Math.PI + (ui / uSteps) * Math.PI * 2;
        const sinU = Math.sin(u);
        const cosU = Math.cos(u);

        let x = rx * sinU;
        let z = rz * cosU + zCenter;
        let y = yBase;

        // Lateral shoulder slope drops subtly outward toward deltoids
        const lateral = Math.abs(sinU);
        y -= 0.08 * Math.pow(lateral, 2.0) * flare;

        // Subtle anatomical clavicle & sternal notch contours in front
        if (cosU > 0) {
          const clavicleBand = Math.exp(-Math.pow((v - 0.62) / 0.14, 2));
          z += clavicleBand * 0.032 * Math.sin(lateral * Math.PI * 0.85);
          const sternalPit = Math.exp(-Math.pow((v - 0.56) / 0.12, 2)) * Math.exp(-Math.pow(u / 0.28, 2));
          z -= sternalPit * 0.035;
          // Slightly curved V-contour at lower chest cutout
          y -= 0.05 * Math.pow(Math.max(0, cosU), 1.5) * Math.pow(v, 1.5);
        }

        // Taper back edge softly upward
        const sideFade = 1.0 - 0.35 * Math.pow(Math.max(0, -cosU), 2.0) * flare;

        positions.push(x, y, z);
        fades.push(bottomAlpha * sideFade);
      }
    }

    const stride = uSteps + 1;
    for (let vi = 0; vi < vSteps; vi++) {
      for (let ui = 0; ui < uSteps; ui++) {
        const a = vi * stride + ui;
        const b = a + 1;
        const c = (vi + 1) * stride + ui;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("aBustFade", new THREE.Float32BufferAttribute(fades, 1));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = createHologramScanMaterial(sharedUniforms, { isShoulders: true });
    return { geometry: geo, material: mat };
  }, [sharedUniforms]);

  return (
    <group position={position}>
      <mesh geometry={geometry} material={material} />
    </group>
  );
});
