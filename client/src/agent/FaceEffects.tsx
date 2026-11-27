import React, { useMemo } from "react";
import * as THREE from "three";

export interface HologramUniforms {
  uTime: { value: number };
  uVoice: { value: number };
  uBlink: { value: number };
  uJawOpen: { value: number };
}

/**
 * High-resolution cyan horizontal-scanline hologram shader matched to the Sketchfab reference bust
 * while preserving Three.js r186 morph targets (#include <morphtarget_vertex>) for 3D lip-sync and blinks.
 * Uses true linear-space RGB values so SRGB output matches #5BC0DE / #00F0FF without pastel washout,
 * plus recessed oral cavity shading (aMouthCavity) and jaw-tracked lower teeth (aLowerTooth).
 */
export function createHologramScanMaterial(
  sharedUniforms: HologramUniforms,
  options?: { isHead?: boolean; isTeeth?: boolean; isShoulders?: boolean }
): THREE.MeshPhongMaterial {
  const isHead = Boolean(options?.isHead);
  const isTeeth = Boolean(options?.isTeeth);
  const isShoulders = Boolean(options?.isShoulders);

  const mat = new THREE.MeshPhongMaterial({
    color: new THREE.Color("#5BC0DE"),
    emissive: new THREE.Color("#005577"),
    transparent: true,
    depthWrite: true,
    side: THREE.FrontSide,
    toneMapped: false,
  });

  const variantKey = isHead ? "head" : isTeeth ? "teeth" : isShoulders ? "shoulders" : "base";
  mat.customProgramCacheKey = () => `holo-scan-${variantKey}`;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedUniforms.uTime;
    shader.uniforms.uVoice = sharedUniforms.uVoice;
    shader.uniforms.uBlink = sharedUniforms.uBlink;
    shader.uniforms.uJawOpen = sharedUniforms.uJawOpen;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         varying vec3 vHoloWorldPos;
         ${isHead ? "attribute float aMouthCavity;\nattribute float aLipRim;\nvarying float vMouthCavity;\nvarying float vLipRim;" : ""}
         ${isTeeth ? "attribute float aLowerTooth;\nuniform float uJawOpen;" : ""}
         ${isShoulders ? "attribute float aBustFade;\nvarying float vBustFade;" : ""}`
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
         vec4 holoWorld4 = modelMatrix * vec4(transformed, 1.0);
         ${isTeeth
          ? `float jawDrop = clamp(uJawOpen, 0.0, 1.0) * aLowerTooth;
                holoWorld4.y -= jawDrop * 0.195;
                holoWorld4.z -= jawDrop * 0.080;
                mvPosition = viewMatrix * holoWorld4;
                gl_Position = projectionMatrix * mvPosition;`
          : ""
        }
         vHoloWorldPos = holoWorld4.xyz;
         ${isHead ? "vMouthCavity = aMouthCavity;\nvLipRim = aLipRim;" : ""}
         ${isShoulders ? "vBustFade = aBustFade;" : ""}`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uTime;
         uniform float uVoice;
         varying vec3 vHoloWorldPos;
         ${isHead ? "varying float vMouthCavity;\nvarying float vLipRim;" : ""}
         ${isShoulders ? "varying float vBustFade;" : ""}`
      )
      .replace(
        "#include <opaque_fragment>",
        `
        vec3 holoN = normalize(normal);
        vec3 holoV = normalize(vViewPosition);
        float ndv = clamp(abs(dot(holoN, holoV)), 0.0, 1.0);
        float fresnel = pow(1.0 - ndv, 1.7);

        // Soft 3D sculptural shading so brows, nose bridge, nostrils, philtrum, sculpted lips, cheekbones & clavicles read sharply
        float keySculpt = clamp(dot(holoN, normalize(vec3(0.05, 0.36, 0.93))), 0.0, 1.0);
        float fillSculpt = clamp(dot(holoN, normalize(vec3(-0.35, -0.10, 0.85))), 0.0, 1.0);
        float rimSculpt = pow(1.0 - ndv, 2.6);

        // Ultra-fine horizontal holographic light slicing (~140-170 crisp slices across the bust) + delicate vertical micro-matrix
        float rawBand = 0.5 + 0.5 * sin(vHoloWorldPos.y * 500.0 - uTime * 2.2);
        float scanLine = smoothstep(0.16, 0.84, rawBand);
        float microGrid = 0.88 + 0.12 * sin(vHoloWorldPos.x * 480.0 + vHoloWorldPos.z * 165.0);
        float sweepPulse = pow(0.5 + 0.5 * sin(vHoloWorldPos.y * 4.8 + uTime * 1.9), 6.0);

        // True linear RGB palette calibrated for Three.js r186 SRGB output (#006D8F -> #5BC0DE -> #00F0FF)
        vec3 troughCyan = vec3(0.001, 0.036, 0.068);
        vec3 deepCyan   = vec3(0.004, 0.210, 0.375);
        vec3 midCyan    = vec3(0.055, 0.540, 0.760);
        vec3 crestCyan  = vec3(0.085, 0.840, 1.000);

        float sculptedKey = pow(keySculpt, 1.25);
        float shapeWeight = clamp(sculptedKey * 0.68 + fillSculpt * 0.20 + fresnel * 0.42 + rimSculpt * 0.18, 0.0, 1.0);
        float boost = clamp(0.90 + shapeWeight * 0.62 + sweepPulse * 0.22, 0.72, 1.65);

        vec3 cyanBody = mix(deepCyan, midCyan, clamp(sculptedKey * 0.76 + fillSculpt * 0.24, 0.0, 1.0));
        cyanBody = mix(cyanBody, crestCyan, clamp(fresnel * 0.60 + sweepPulse * 0.28, 0.0, 1.0));

        vec3 col = mix(troughCyan * (0.55 + 0.45 * sculptedKey), cyanBody * boost, scanLine * microGrid);
        col += crestCyan * fresnel * 0.12;
        ${isTeeth ? "col *= (0.14 + 0.12 * sculptedKey);" : ""}

        ${isHead
          ? `float cavityMask = clamp(vMouthCavity, 0.0, 1.0);
               col *= mix(1.0, 0.08, cavityMask);
               col += crestCyan * clamp(vLipRim, 0.0, 1.0) * 0.14;
               diffuseColor.a = mix(clamp(0.95 + scanLine * 0.05, 0.94, 1.0), 0.99, cavityMask);`
          : isShoulders
            ? "float bustEdge = smoothstep(0.0, 0.90, vBustFade);\ncol *= bustEdge;\ndiffuseColor.a = clamp(0.96 * bustEdge, 0.0, 1.0);"
            : isTeeth
              ? "diffuseColor.a = 0.88;"
              : "diffuseColor.a = clamp(0.95 + scanLine * 0.05, 0.94, 1.0);"
        }
        outgoingLight = col;
        #include <opaque_fragment>`
      );
  };

  return mat;
}

/**
 * Molten glowing crimson-ruby eyes (#F23456 + #A80139) applied strictly to facecap.glb's eyeLeft & eyeRight.
 * Uses calibrated linear-space crimson RGB (low green/blue channels) so the eyes blaze rich ruby-red
 * without washing out to pink/white, and naturally close behind blinking 3D eyelids.
 */
export function createMoltenRedEyeMaterial(sharedUniforms: HologramUniforms): THREE.MeshPhongMaterial {
  const mat = new THREE.MeshPhongMaterial({
    color: new THREE.Color("#F23456"),
    emissive: new THREE.Color("#A80139"),
    transparent: false,
    depthWrite: true,
    toneMapped: false,
  });

  mat.customProgramCacheKey = () => "molten-red-eye";

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedUniforms.uTime;
    shader.uniforms.uVoice = sharedUniforms.uVoice;
    shader.uniforms.uBlink = sharedUniforms.uBlink;

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
         uniform float uBlink;
         varying vec3 vEyeWorldPos;`
      )
      .replace(
        "#include <opaque_fragment>",
        `
        vec3 eyeN = normalize(normal);
        vec3 eyeV = normalize(vViewPosition);
        float centerDot = clamp(dot(eyeN, eyeV), 0.0, 1.0);
        float irisCore = pow(centerDot, 3.0);
        float outerIris = smoothstep(0.12, 0.94, centerDot);

        float swirl = sin(vEyeWorldPos.x * 110.0 + uTime * 4.2 + cos(vEyeWorldPos.y * 120.0 - uTime * 3.4))
                    + cos(vEyeWorldPos.y * 105.0 - uTime * 3.6 + sin(vEyeWorldPos.x * 95.0 + uTime * 2.8));
        float vein = 0.5 + 0.5 * sin(swirl * 1.5 + uTime * 2.6);

        // True linear RGB equivalents of #A80139 and #F23456 -> blazing ruby/crimson red with zero pastel blowout
        vec3 deepRuby    = vec3(0.220, 0.000, 0.020);
        vec3 rubyMagma   = vec3(0.400, 0.000, 0.041); // #A80139 linear
        vec3 crimsonLava = vec3(0.892, 0.034, 0.093); // #F23456 linear
        vec3 hotCrimson  = vec3(1.280, 0.045, 0.115); // Pure blazing neon crimson core

        vec3 eyeCol = mix(deepRuby, rubyMagma, clamp(outerIris * 0.75 + vein * 0.35, 0.0, 1.0));
        eyeCol = mix(eyeCol, crimsonLava, clamp(outerIris * (0.45 + 0.55 * vein), 0.0, 1.0));
        eyeCol = mix(eyeCol, hotCrimson, irisCore * 0.72);
        eyeCol *= (1.08 + irisCore * 0.35);
        eyeCol *= (1.0 - smoothstep(0.10, 0.56, uBlink));

        outgoingLight = eyeCol;
        diffuseColor.a = 1.0;
        #include <opaque_fragment>`
      );
  };

  return mat;
}

const DEFAULT_BUST_POS: [number, number, number] = [0, 0, 0];

/**
 * Anatomically fitted holographic neck, sternocleidomastoid muscles, collarbones, trapezius & curved shoulders bust.
 * Upper rim tucks flush inside facecap.glb's jaw/submental throat (-0.24), mastoid/ears (-0.11), and occiput (+0.02)
 * so there is zero air gap under the chin from any viewing/rotation angle.
 */
export const HologramShouldersBust: React.FC<{
  sharedUniforms: HologramUniforms;
  position?: [number, number, number];
}> = React.memo(({ sharedUniforms, position = DEFAULT_BUST_POS }) => {
  const { geometry, material } = useMemo(() => {
    const vSteps = 44;
    const uSteps = 64;
    const positions: number[] = [];
    const fades: number[] = [];
    const indices: number[] = [];

    for (let vi = 0; vi <= vSteps; vi++) {
      const v = vi / vSteps; // 0 = tucked inside jaw/occiput, 1 = soft faded lower chest/deltoid cut

      // Neck-to-shoulder flare: steady muscular neck (0..0.38), curved trapezius & convex deltoid shoulders (0.38..1.0)
      const smoothFlare = Math.pow(Math.sin(v * Math.PI * 0.5), 1.85);
      const midNeck = THREE.MathUtils.smoothstep(v, 0.0, 0.35);

      // Radius grows from compact neck (0.245) to curved male shoulders (~0.98 wide)
      const rx = 0.242 + 0.735 * smoothFlare + 0.015 * Math.sin(v * Math.PI);
      const rz = 0.248 + 0.095 * smoothFlare - 0.025 * Math.sin(v * Math.PI * 0.8);
      const zCenter = -0.075 - 0.035 * midNeck;

      // Soft bottom bust fade cleanly above UI overlay
      const bottomAlpha = 1.0 - THREE.MathUtils.smoothstep(v, 0.64, 1.0);

      for (let ui = 0; ui <= uSteps; ui++) {
        const u = -Math.PI + (ui / uSteps) * Math.PI * 2;
        const sinU = Math.sin(u);
        const cosU = Math.cos(u);

        const lateral = Math.abs(sinU);
        const backWeight = 0.5 - 0.5 * cosU; // 0 at front throat, 1 at occiput nape

        // Unified C1-continuous height curve: front throat tucks behind chin (-0.23), back nape behind occiput (+0.01),
        // smoothly converging into level collarbone (-0.53) and fading lower deltoids (-0.95) with zero seams.
        const topAnchorY = -0.23 + 0.24 * backWeight;
        const targetSlopeY = -0.23 - v * 0.72;
        const neckBlend = THREE.MathUtils.smoothstep(v, 0.0, 0.42);
        let y = THREE.MathUtils.lerp(topAnchorY - v * 0.32, targetSlopeY, neckBlend);

        const x = rx * sinU;
        let z = rz * cosU + zCenter;

        // Convex shoulder slope rounding down outward toward deltoids
        y -= 0.10 * Math.pow(lateral, 1.85) * smoothFlare;

        // Subtle anatomical sternocleidomastoid tendons, collarbones, & sternal notch in front
        if (cosU > 0) {
          const neckBand = (1.0 - THREE.MathUtils.smoothstep(v, 0.35, 0.62)) * Math.exp(-Math.pow((lateral - 0.38) / 0.24, 2));
          z += neckBand * 0.016;

          const clavicleBand = Math.exp(-Math.pow((v - 0.56) / 0.13, 2));
          z += clavicleBand * 0.032 * Math.sin(lateral * Math.PI * 0.88);

          const sternalPit = Math.exp(-Math.pow((v - 0.50) / 0.11, 2)) * Math.exp(-Math.pow(u / 0.26, 2));
          z -= sternalPit * 0.034;

          y -= 0.045 * Math.pow(Math.max(0, cosU), 1.4) * Math.pow(v, 1.4);
        }

        // Gentle back-of-shoulder vignette fade so front collar/shoulders dominate
        const sideFade = 1.0 - 0.32 * Math.pow(Math.max(0, -cosU), 2.0) * smoothFlare;

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
