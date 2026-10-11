import React, { useEffect, useRef } from "react";

export interface SparseVoidFieldCanvasProps {
  className?: string;
  speed?: number;
  brightness?: number;
  hue?: number;
  saturation?: number;
  style?: React.CSSProperties;
}

interface Particle {
  x: number;
  y: number;
  baseRadius: number;
  alpha: number;
  speedX: number;
  speedY: number;
  pulsePhase: number;
  pulseSpeed: number;
  colorType: "cyan" | "violet" | "dim";
}

export const SparseVoidFieldCanvas: React.FC<SparseVoidFieldCanvasProps> = ({
  className = "",
  speed = 1.0,
  brightness = 1.0,
  hue = 0,
  saturation = 1.0,
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationId = 0;
    let width = 0;
    let height = 0;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionMultiplier = reducedMotion ? 0.1 : 1.0;

    // Sparse particle pool (low density, high negative space)
    const particleCount = 65;
    const particles: Particle[] = [];

    const initParticles = (w: number, h: number) => {
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        const typeRoll = Math.random();
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          baseRadius: Math.random() * 1.4 + 0.6,
          alpha: Math.random() * 0.45 + 0.15,
          speedX: (Math.random() - 0.5) * 0.15 * speed * motionMultiplier,
          speedY: (Math.random() - 0.5) * 0.15 * speed * motionMultiplier,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.015 + 0.005,
          colorType: typeRoll > 0.75 ? "cyan" : typeRoll > 0.5 ? "violet" : "dim",
        });
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      width = rect.width || window.innerWidth;
      height = rect.height || window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (particles.length === 0) {
        initParticles(width, height);
      }
    };

    window.addEventListener("resize", resize);
    resize();

    // Mouse parallax tracking
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / width - 0.5) * 18;
      targetMouseY = (e.clientY / height - 0.5) * 18;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    let lastTime = performance.now();

    const loop = (time: number) => {
      if (document.hidden) {
        animationId = requestAnimationFrame(loop);
        return;
      }

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Parallax smooth interpolation
      currentMouseX += (targetMouseX - currentMouseX) * 0.04;
      currentMouseY += (targetMouseY - currentMouseY) * 0.04;

      ctx.clearRect(0, 0, width, height);

      // Deep void ambient gradient (sparse & ultra-dark)
      const grad = ctx.createRadialGradient(
        width * 0.5 + currentMouseX,
        height * 0.4 + currentMouseY,
        50,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.85
      );
      grad.addColorStop(0, "rgba(8, 14, 28, 0.45)");
      grad.addColorStop(0.5, "rgba(3, 6, 15, 0.65)");
      grad.addColorStop(1, "rgba(1, 2, 6, 0.95)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render sparse drifting particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!reducedMotion) {
          p.x += p.speedX * (dt * 60);
          p.y += p.speedY * (dt * 60);
          p.pulsePhase += p.pulseSpeed;

          // Wrap boundaries gently
          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          if (p.y < -20) p.y = height + 20;
          if (p.y > height + 20) p.y = -20;
        }

        const pulse = Math.sin(p.pulsePhase) * 0.3 + 0.7;
        const currentAlpha = p.alpha * pulse * brightness;
        const currentRadius = p.baseRadius * (0.85 + pulse * 0.3);

        const drawX = p.x + currentMouseX * 0.4;
        const drawY = p.y + currentMouseY * 0.4;

        ctx.beginPath();
        ctx.arc(drawX, drawY, currentRadius, 0, Math.PI * 2);

        if (p.colorType === "cyan") {
          ctx.fillStyle = `rgba(56, 189, 248, ${currentAlpha * 0.85})`;
          ctx.shadowColor = "rgba(56, 189, 248, 0.6)";
          ctx.shadowBlur = 6 * brightness;
        } else if (p.colorType === "violet") {
          ctx.fillStyle = `rgba(168, 85, 247, ${currentAlpha * 0.8})`;
          ctx.shadowColor = "rgba(168, 85, 247, 0.5)";
          ctx.shadowBlur = 5 * brightness;
        } else {
          ctx.fillStyle = `rgba(148, 163, 184, ${currentAlpha * 0.5})`;
          ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [speed, brightness]);

  return (
    <div
      className={`threeui-background sparse-void-field-mount ${className}`}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        filter: hue || saturation !== 1 ? `hue-rotate(${hue}deg) saturate(${saturation})` : undefined,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
};
