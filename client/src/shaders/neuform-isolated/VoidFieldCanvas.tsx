import React, { useEffect, useRef } from "react";

export interface VoidFieldCanvasProps {
  className?: string;
  speed?: number;
  brightness?: number;
  hue?: number;
  saturation?: number;
  style?: React.CSSProperties;
}

const VERTEX_SHADER = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  uniform vec2 iResolution;
  uniform float iTime;
  uniform vec2 uMouse;
  uniform float uSpeed;
  uniform float uBrightness;

  vec2 barrel(vec2 uv, float amt) {
    vec2 cc = uv - 0.5;
    float r = dot(cc, cc);
    return uv + cc * r * amt;
  }

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    
    // Parallax drift based on uMouse
    vec2 mouseOffset = (uMouse - 0.5) * 0.05;
    uv += mouseOffset;

    // Barrel distortion curvature
    uv = barrel(uv, 0.2);

    // Clamp edges
    if(uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    // Dot matrix resolution
    vec2 gridCount = vec2(100.0, 100.0 * (iResolution.y / iResolution.x));
    vec2 gridUv = fract(uv * gridCount);
    vec2 id = floor(uv * gridCount);

    // Radial symmetry distance
    vec2 cc = id / gridCount - 0.5;
    float dist = length(cc);
    
    // Slow breathing pulse
    float pulse = sin(iTime * 1.5 * uSpeed - dist * 10.0) * 0.5 + 0.5;

    // Dot formulation
    float dotSize = 0.35 * pulse;
    float d = length(gridUv - 0.5);
    float circle = smoothstep(dotSize, dotSize - 0.05, d);

    // Digital scanlines
    float scanline = sin(uv.y * 800.0) * 0.03;

    // Randomized flicker
    float flicker = rand(vec2(iTime, id.y)) > 0.98 ? 0.4 : 1.0;

    // Base color compilation: Cyberpunk Violet with subtle Cyan/Emerald edge shimmer
    vec3 tint = mix(vec3(0.72, 0.42, 1.0), vec3(0.25, 0.90, 0.75), dist * 0.6);
    vec3 col = vec3(circle * pulse * flicker);
    col -= scanline * 0.5;
    col *= tint * uBrightness;
    
    // Vignette edge masking
    col *= smoothstep(0.85, 0.15, dist);

    gl_FragColor = vec4(col, circle * (pulse * 0.85 + 0.15));
  }
`;

export const VoidFieldCanvas: React.FC<VoidFieldCanvasProps> = ({
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

    const gl = canvas.getContext("webgl", { alpha: true, antialias: false });
    if (!gl) return;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("Shader compilation error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vert = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const frag = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    );

    const posLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posLocation);
    gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 0, 0);

    const iResLoc = gl.getUniformLocation(program, "iResolution");
    const iTimeLoc = gl.getUniformLocation(program, "iTime");
    const uMouseLoc = gl.getUniformLocation(program, "uMouse");
    const uSpeedLoc = gl.getUniformLocation(program, "uSpeed");
    const uBrightnessLoc = gl.getUniformLocation(program, "uBrightness");

    let mouseX = 0.5;
    let mouseY = 0.5;
    let targetMouseX = 0.5;
    let targetMouseY = 0.5;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX / window.innerWidth;
      targetMouseY = 1.0 - e.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    let animationId = 0;
    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener("resize", resize);
    resize();

    const startTime = performance.now();
    let lastTick = 0;
    const interval = 1000 / 40;

    const render = (time: number) => {
      if (document.hidden) {
        animationId = requestAnimationFrame(render);
        return;
      }
      if (time - lastTick >= interval) {
        lastTick = time - ((time - lastTick) % interval);
        const elapsed = (time - startTime) / 1000.0;

        // Smooth mouse lerp
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        gl.uniform2f(iResLoc, canvas.width, canvas.height);
        gl.uniform1f(iTimeLoc, elapsed);
        gl.uniform2f(uMouseLoc, mouseX, mouseY);
        gl.uniform1f(uSpeedLoc, speed);
        gl.uniform1f(uBrightnessLoc, brightness);

        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, [speed, brightness]);

  return (
    <div
      className={`threeui-background void-field-mount ${className}`}
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
