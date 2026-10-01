export type PredictiveArcMode = "dark" | "light";

export type PredictiveArcOptions = {
  mode: PredictiveArcMode;
  speed: number;
  spacing: number;
  dotSize: number;
  archHeight: number;
  thickness: number;
  brightness: number;
  hue: number;
  saturation: number;
  transparent?: boolean;
};

export const PREDICTIVE_ARC_DEFAULTS: PredictiveArcOptions = {
  mode: "dark",
  speed: 1,
  spacing: 6,
  dotSize: 6,
  archHeight: 0.65,
  thickness: 1.1,
  brightness: 1,
  hue: 0,
  saturation: 1,
  transparent: false,
};

function resolveMode(mode: PredictiveArcOptions["mode"] | number | string | undefined): PredictiveArcMode {
  if (mode === "light" || mode === 1 || mode === "1") return "light";
  return "dark";
}

export function createPredictiveArcRenderer(
  canvas: HTMLCanvasElement,
  getOptions: () => PredictiveArcOptions,
) {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return null;
  let width = 1;
  let height = 1;
  let time = 0;

  const resize = (nextWidth: number, nextHeight: number) => {
    width = Math.max(1, nextWidth);
    height = Math.max(1, nextHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const render = () => {
    const options = getOptions();
    const mode = resolveMode(options.mode);
    const isLight = mode === "light";
    const centerX = width / 2;
    const archPeakY = height * 0.32;
    const archWidth = width * 1.45;
    const archHeight = height * options.archHeight;

    if (options.transparent) {
      context.clearRect(0, 0, width, height);

      // Subtle atmospheric aura for transparent overlay
      const aura = context.createRadialGradient(centerX, archPeakY + 40, 20, centerX, archPeakY + 80, width * 0.55);
      aura.addColorStop(0, "rgba(168, 85, 247, 0.16)");
      aura.addColorStop(0.35, "rgba(6, 182, 212, 0.08)");
      aura.addColorStop(1, "transparent");
      context.fillStyle = aura;
      context.fillRect(0, 0, width, height);
    } else {
      // Cosmic Deep Obsidian Gradient Foundation
      const bgGrad = context.createLinearGradient(0, 0, 0, height);
      if (isLight) {
        bgGrad.addColorStop(0, "#f8fafc");
        bgGrad.addColorStop(0.5, "#f1f5f9");
        bgGrad.addColorStop(1, "#e2e8f0");
      } else {
        bgGrad.addColorStop(0, "#050814");
        bgGrad.addColorStop(0.4, "#03040a");
        bgGrad.addColorStop(1, "#010206");
      }
      context.fillStyle = bgGrad;
      context.fillRect(0, 0, width, height);

      if (!isLight) {
        // Volumetric nebula aura centered around the apex of the predictive arc
        const aura = context.createRadialGradient(centerX, archPeakY + 40, 10, centerX, archPeakY + 80, width * 0.6);
        aura.addColorStop(0, "rgba(168, 85, 247, 0.22)");
        aura.addColorStop(0.35, "rgba(59, 130, 246, 0.12)");
        aura.addColorStop(0.65, "rgba(16, 185, 129, 0.05)");
        aura.addColorStop(1, "transparent");
        context.fillStyle = aura;
        context.fillRect(0, 0, width, height);
      }
    }

    time += 0.016 * options.speed;
    const step = Math.max(8, Math.round(options.spacing * 1.35));
    const effectiveThickness = (160 * options.thickness);

    context.globalCompositeOperation = isLight ? "source-over" : "lighter";

    // Optimized band-limited sampling along the curve
    for (let x = 0; x < width; x += step) {
      const normX = (x - centerX) / (archWidth / 2);
      const curveY = archPeakY + normX * normX * archHeight;
      const thickness = (150 + (1 - Math.abs(normX)) * 80) * options.thickness;

      // Only iterate through the bounding vertical band around the parabolic arc
      const startY = Math.max(0, Math.floor((curveY - thickness) / step) * step);
      const endY = Math.min(height, Math.ceil((curveY + thickness) / step) * step);

      for (let y = startY; y <= endY; y += step) {
        const distanceToCurve = Math.abs(y - curveY);
        if (distanceToCurve >= thickness) continue;

        let intensity = 1 - distanceToCurve / thickness;
        const waveX = Math.sin(x * 0.012 + time * 1.6);
        const waveY = Math.cos(y * 0.015 + time * 0.8);
        intensity = intensity * 0.68 + waveX * waveY * 0.32 * intensity;
        intensity *= Math.max(0, 1 - Math.pow(Math.abs(normX), 2.4));
        if (intensity <= 0.02) continue;

        let r = 0;
        let g = 0;
        let b = 0;
        let alpha = 1;

        if (isLight) {
          r = Math.min(255, 60 * intensity + 90 * Math.pow(intensity, 3));
          g = Math.min(255, 30 * intensity + 50 * Math.pow(intensity, 4));
          b = Math.min(255, 140 * intensity + 115 * Math.pow(intensity, 2));
          alpha = Math.min(1, intensity * 0.95);
        } else {
          // Luminous Cyber Palette: Neon Violet -> Electric Cyan -> Radiant Luminous Core
          if (intensity > 0.65) {
            // Core: Brilliant glowing cyan-white
            const boost = (intensity - 0.65) / 0.35;
            r = Math.min(255, 150 + 105 * boost);
            g = Math.min(255, 190 + 65 * boost);
            b = 255;
            alpha = Math.min(1, 0.85 + boost * 0.15);
          } else if (intensity > 0.3) {
            // Mid-wave: Electric violet to cyber cyan transition
            const tNorm = (intensity - 0.3) / 0.35;
            r = Math.min(255, 140 - 40 * tNorm);
            g = Math.min(255, 70 + 110 * tNorm);
            b = Math.min(255, 230 + 25 * tNorm);
            alpha = Math.min(1, 0.45 + tNorm * 0.35);
          } else {
            // Halo edge: Deep vibrant luminous violet/indigo
            const tNorm = intensity / 0.3;
            r = Math.min(255, 120 * tNorm);
            g = Math.min(255, 45 * tNorm);
            b = Math.min(255, 210 * tNorm);
            alpha = Math.min(1, tNorm * 0.45);
          }
        }

        const bright = options.brightness;
        context.fillStyle = `rgba(${Math.floor(r * bright)}, ${Math.floor(g * bright)}, ${Math.floor(b * bright)}, ${alpha})`;
        const pSize = (options.dotSize * 1.25) * (0.6 + intensity * 0.55);
        context.fillRect(x - pSize / 2, y - pSize / 2, pSize, pSize);
      }
    }

    // Dynamic drifting neural stream nodes along the arc curve
    if (!isLight) {
      for (let i = 0; i < 14; i++) {
        const progress = ((time * 0.06 + i / 14) % 1);
        const nX = (progress * 2 - 1) * 0.92;
        const px = centerX + nX * (archWidth / 2);
        const py = archPeakY + nX * nX * archHeight;
        const pulse = Math.sin(time * 3 + i * 1.5) * 0.5 + 0.5;
        const nodeSize = 3.5 + pulse * 3.5;

        // Outer Glow Aura
        context.fillStyle = i % 2 === 0 ? "rgba(16, 185, 129, 0.35)" : "rgba(168, 85, 247, 0.4)";
        context.beginPath();
        context.arc(px, py, nodeSize * 2.2, 0, Math.PI * 2);
        context.fill();

        // High-energy Core Node
        context.fillStyle = i % 2 === 0 ? "rgba(110, 231, 183, 0.95)" : "rgba(216, 180, 254, 0.95)";
        context.beginPath();
        context.arc(px, py, nodeSize, 0, Math.PI * 2);
        context.fill();
      }
    }

    context.globalCompositeOperation = "source-over";
  };

  return { resize, render };
}
