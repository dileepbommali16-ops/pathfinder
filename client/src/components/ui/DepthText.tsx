import React, { useRef, useEffect, useState, useMemo } from "react";
import gsap from "gsap";

export interface DepthTextProps {
  text: string;
  layers?: number;
  depth?: number;
  depthColor?: string;
  gradientDepth?: boolean;
  hoverPush?: number;
  float?: boolean;
  tilt?: number;
  pointerTracking?: boolean;
  smoothing?: number;
  perspective?: number;
  autoOrbit?: boolean;
  orbitSpeed?: number;
  fontSize?: string;
  fontWeight?: number | string;
  shadow?: boolean;
  outline?: boolean;
  intro?: boolean;
  className?: string;
}

export const DepthText: React.FC<DepthTextProps> = ({
  text,
  layers = 34,
  depth = 2.4,
  depthColor = "#7c3aed",
  gradientDepth = false,
  hoverPush = 0.5,
  float = false,
  tilt = 7.5,
  pointerTracking = true,
  smoothing = 0.14,
  perspective = 900,
  autoOrbit = true,
  orbitSpeed = 0.35,
  fontSize = "clamp(2.5rem, 8vw, 5.5rem)",
  fontWeight = 900,
  shadow = true,
  outline = false,
  intro = true,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textStageRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Generate layers array
  const layerIndices = useMemo(() => {
    return Array.from({ length: layers }, (_, i) => i);
  }, [layers]);

  useEffect(() => {
    const stage = textStageRef.current;
    const container = containerRef.current;
    if (!stage || !container) return;

    // GSAP context for clean garbage collection on unmount
    const ctx = gsap.context(() => {
      // 1. Intro Animation
      if (intro) {
        gsap.fromTo(
          stage.children,
          {
            scale: 0.85,
            opacity: 0,
            y: 30,
          },
          {
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.008,
            ease: "back.out(1.6)",
          }
        );
      }

      // 2. Auto Orbit (subtle 3D continuous oscillation)
      let orbitTween: gsap.core.Tween | null = null;
      if (autoOrbit) {
        orbitTween = gsap.to(stage, {
          rotationY: 10,
          rotationX: -6,
          duration: 3 / Math.max(orbitSpeed, 0.05),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }

      // 3. Floating animation
      let floatTween: gsap.core.Tween | null = null;
      if (float) {
        floatTween = gsap.to(stage, {
          y: -10,
          duration: 2.2,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
        });
      }

      // 4. Pointer Tracking & Tilt
      if (pointerTracking) {
        const setRotX = gsap.quickTo(stage, "rotationX", {
          duration: smoothing,
          ease: "power2.out",
        });
        const setRotY = gsap.quickTo(stage, "rotationY", {
          duration: smoothing,
          ease: "power2.out",
        });

        const handleMouseMove = (e: MouseEvent) => {
          const rect = container.getBoundingClientRect();
          const normX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
          const normY = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5

          if (orbitTween && orbitTween.isActive()) {
            orbitTween.pause();
          }

          setRotY(normX * tilt * 2);
          setRotX(-normY * tilt * 2);
        };

        const handleMouseLeave = () => {
          gsap.to(stage, {
            rotationX: 0,
            rotationY: 0,
            duration: 0.6,
            ease: "elastic.out(1, 0.5)",
            onComplete: () => {
              if (orbitTween && autoOrbit) {
                orbitTween.resume();
              }
            },
          });
        };

        container.addEventListener("mousemove", handleMouseMove);
        container.addEventListener("mouseleave", handleMouseLeave);

        return () => {
          container.removeEventListener("mousemove", handleMouseMove);
          container.removeEventListener("mouseleave", handleMouseLeave);
        };
      }
    }, containerRef);

    return () => ctx.revert();
  }, [intro, autoOrbit, orbitSpeed, float, pointerTracking, tilt, smoothing]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative inline-flex items-center justify-center select-none py-4 px-6 overflow-visible ${className}`}
      style={{
        perspective: `${perspective}px`,
        perspectiveOrigin: "50% 50%",
        containerType: "inline-size",
      }}
    >
      <div
        ref={textStageRef}
        className="relative transform-style-preserve-3d transition-transform duration-300 will-change-transform"
        style={{
          transformStyle: "preserve-3d",
          transform: isHovered ? `scale(${1 + hoverPush * 0.05})` : "scale(1)",
        }}
      >
        {layerIndices.map((index) => {
          const isTopLayer = index === layers - 1;
          const zOffset = -(layers - 1 - index) * depth;
          const layerOpacity = gradientDepth
            ? 0.2 + (index / (layers - 1)) * 0.8
            : 0.85 + (index / (layers - 1)) * 0.15;

          // Color calculation: interpolate between depthColor and front white
          const color = isTopLayer
            ? "#f8fafc"
            : depthColor;

          return (
            <span
              key={index}
              aria-hidden={!isTopLayer}
              className={`block absolute top-0 left-0 whitespace-nowrap leading-none transition-colors duration-200 ${
                isTopLayer ? "relative z-20" : "pointer-events-none"
              }`}
              style={{
                fontSize,
                fontWeight,
                fontFamily: "'Space Grotesk', 'Outfit', sans-serif",
                color,
                opacity: isTopLayer ? 1 : layerOpacity,
                transform: `translate3d(0, 0, ${zOffset}px)`,
                textShadow:
                  shadow && !isTopLayer && index === 0
                    ? `0 ${depth * 8}px ${depth * 14}px rgba(0, 0, 0, 0.7), 0 0 25px ${depthColor}40`
                    : "none",
                WebkitTextStroke: outline ? `1px ${depthColor}` : "none",
                filter:
                  isTopLayer
                    ? "drop-shadow(0 2px 8px rgba(255, 255, 255, 0.25))"
                    : undefined,
              }}
            >
              {text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default DepthText;
