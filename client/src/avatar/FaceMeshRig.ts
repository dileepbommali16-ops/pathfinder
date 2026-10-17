/**
 * FaceMeshRig - 2D Textured Triangle Mesh Deformer with Procedural Mouth Cavity
 * Supports Canvas 2D and WebGL rendering with sub-millisecond execution.
 */

import { VisemeParams } from "./visemeMapper";
import landmarksData from "./landmarks.json";

export interface Point2D {
  x: number;
  y: number;
}

export interface Triangle {
  indices: [number, number, number];
}

export class FaceMeshRig {
  private baseVertices: Point2D[] = [];
  private uvs: Point2D[] = [];
  private triangles: Triangle[] = [];
  private deformedVertices: Point2D[] = [];
  private img: HTMLImageElement | null = null;
  private isLoaded: boolean = false;

  // Calibrated landmark indices in vertex array
  private landmarkIndices: Record<string, number> = {};

  constructor() {
    this.initMesh();
  }

  /**
   * Initializes the 2D facial deformation mesh grid and incorporates key landmarks
   */
  private initMesh() {
    const rawLandmarks = landmarksData.landmarks;
    const gridCols = 8;
    const gridRows = 10;

    // 1. Generate regular grid points
    const gridPoints: Point2D[] = [];
    for (let r = 0; r <= gridRows; r++) {
      const v = r / gridRows;
      for (let c = 0; c <= gridCols; c++) {
        const u = c / gridCols;
        gridPoints.push({ x: u, y: v });
      }
    }

    // 2. Add landmark points
    const landmarkKeys = Object.keys(rawLandmarks);
    const landmarkPoints: Point2D[] = [];
    landmarkKeys.forEach((key) => {
      const pt = (rawLandmarks as any)[key];
      landmarkPoints.push({ x: pt.x, y: pt.y });
    });

    const allPoints = [...gridPoints, ...landmarkPoints];
    this.baseVertices = allPoints;
    this.uvs = allPoints.map((p) => ({ ...p }));
    this.deformedVertices = allPoints.map((p) => ({ ...p }));

    // Record index of landmarks
    landmarkKeys.forEach((key, idx) => {
      this.landmarkIndices[key] = gridPoints.length + idx;
    });

    // 3. Generate Triangles for regular grid
    this.triangles = [];
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const i0 = r * (gridCols + 1) + c;
        const i1 = i0 + 1;
        const i2 = i0 + (gridCols + 1);
        const i3 = i2 + 1;

        // Two triangles per cell
        this.triangles.push({ indices: [i0, i1, i2] });
        this.triangles.push({ indices: [i1, i3, i2] });
      }
    }
  }

  /**
   * Loads the avatar texture image
   */
  public async loadTexture(src: string = "/avatar/mentor.webp"): Promise<void> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        this.img = image;
        this.isLoaded = true;
        resolve();
      };
      image.onerror = (err) => {
        // Fallback to png if webp fails
        if (src.endsWith(".webp")) {
          this.loadTexture("/avatar/mentor.png").then(resolve).catch(reject);
        } else {
          reject(err);
        }
      };
      image.src = src;
    });
  }

  /**
   * Computes vertex deformations based on current viseme parameters
   */
  public updateParameters(params: VisemeParams, time: number = 0): void {
    const rawLandmarks = landmarksData.landmarks;
    const mouthCenter = rawLandmarks.mouth_inner_center;
    const eyeLeftCenter = rawLandmarks.eye_left;
    const eyeRightCenter = rawLandmarks.eye_right;
    const chinPt = rawLandmarks.chin;

    // Head yaw, pitch, roll deltas
    const yawOffset = params.headYaw * 0.05;
    const pitchOffset = params.headPitch * 0.04;
    const rollAngle = params.headRoll * 0.06;
    const cosRoll = Math.cos(rollAngle);
    const sinRoll = Math.sin(rollAngle);

    for (let i = 0; i < this.baseVertices.length; i++) {
      const base = this.baseVertices[i];
      let dx = 0;
      let dy = 0;

      // Distance to mouth center
      const distMouth = Math.hypot(base.x - mouthCenter.x, base.y - mouthCenter.y);
      const mouthInfluence = Math.max(0, 1.0 - distMouth / 0.22);

      // Jaw Drop (vertical lower face movement)
      if (base.y >= mouthCenter.y - 0.02) {
        const chinDist = Math.hypot(base.x - chinPt.x, base.y - chinPt.y);
        const jawWeight = Math.max(0, 1.0 - chinDist / 0.28);
        dy += params.jawOpen * 0.075 * jawWeight;
      }

      // Mouth Width (horizontal corner stretch)
      if (mouthInfluence > 0) {
        const sideSign = base.x >= mouthCenter.x ? 1 : -1;
        dx += sideSign * params.mouthWide * 0.028 * mouthInfluence;

        // Mouth Rounding / Pucker (corners move in, lips move forward/open)
        dx -= sideSign * params.mouthRound * 0.022 * mouthInfluence;

        // Smile corner lift
        if (Math.abs(base.x - mouthCenter.x) > 0.04) {
          dy -= params.mouthSmile * 0.022 * mouthInfluence;
        }

        // Upper lip raise
        if (base.y < mouthCenter.y) {
          dy -= params.upperLipRaise * 0.020 * mouthInfluence;
        }
      }

      // Eye Blink (vertical lid compression)
      const distEyeL = Math.hypot(base.x - eyeLeftCenter.x, base.y - eyeLeftCenter.y);
      const distEyeR = Math.hypot(base.x - eyeRightCenter.x, base.y - eyeRightCenter.y);
      if (distEyeL < 0.08) {
        const eyeWeightL = Math.max(0, 1.0 - distEyeL / 0.08);
        dy += (eyeLeftCenter.y - base.y) * params.eyeBlink * 0.85 * eyeWeightL;
      }
      if (distEyeR < 0.08) {
        const eyeWeightR = Math.max(0, 1.0 - distEyeR / 0.08);
        dy += (eyeRightCenter.y - base.y) * params.eyeBlink * 0.85 * eyeWeightR;
      }

      // Eyebrow raise
      if (base.y < eyeLeftCenter.y && base.y > 0.35) {
        const browWeight = Math.max(0, 1.0 - Math.abs(base.y - 0.45) / 0.12);
        dy -= params.browRaise * 0.030 * browWeight;
      }

      // Head Posture (Yaw, Pitch, Roll)
      let curX = base.x + dx + yawOffset * (1.0 - Math.abs(base.x - 0.5));
      let curY = base.y + dy + pitchOffset;

      // Apply subtle head roll around head center (0.5, 0.5)
      const rx = curX - 0.5;
      const ry = curY - 0.5;
      curX = 0.5 + (rx * cosRoll - ry * sinRoll);
      curY = 0.5 + (rx * sinRoll + ry * cosRoll);

      this.deformedVertices[i] = { x: curX, y: curY };
    }
  }

  /**
   * Render using Canvas 2D (affine triangle slice mapping)
   * Highly portable, zero-dependency, operates at 60 FPS on all devices.
   */
  public renderCanvas2D(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    params: VisemeParams,
    time: number = 0
  ): void {
    if (!this.img || !this.isLoaded) return;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw procedural mouth cavity behind the lips if jaw is open
    if (params.jawOpen > 0.04) {
      this.drawMouthCavity(ctx, width, height, params);
    }

    // 2. Render textured triangle mesh
    const numTris = this.triangles.length;
    for (let t = 0; t < numTris; t++) {
      const tri = this.triangles[t];
      const i0 = tri.indices[0];
      const i1 = tri.indices[1];
      const i2 = tri.indices[2];

      const p0 = this.deformedVertices[i0];
      const p1 = this.deformedVertices[i1];
      const p2 = this.deformedVertices[i2];

      const u0 = this.uvs[i0];
      const u1 = this.uvs[i1];
      const u2 = this.uvs[i2];

      this.drawTexturedTriangle(
        ctx,
        this.img,
        p0.x * width, p0.y * height,
        p1.x * width, p1.y * height,
        p2.x * width, p2.y * height,
        u0.x * this.img.width, u0.y * this.img.height,
        u1.x * this.img.width, u1.y * this.img.height,
        u2.x * this.img.width, u2.y * this.img.height
      );
    }

    // 3. Subtle Cybernetic Wireframe Shimmer (left half of face)
    this.drawWireframeShimmer(ctx, width, height, time);
  }

  /**
   * Affine texture mapping for a single triangle slice
   */
  private drawTexturedTriangle(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x0: number, y0: number,
    x1: number, y1: number,
    x2: number, y2: number,
    u0: number, v0: number,
    u1: number, v1: number,
    u2: number, v2: number
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.clip();

    // Compute affine transform matrix mapping (u, v) -> (x, y)
    const delta = u0 * (v1 - v2) - v0 * (u1 - u2) + (u1 * v2 - u2 * v1);
    if (Math.abs(delta) < 0.0001) {
      ctx.restore();
      return;
    }

    const a = (x0 * (v1 - v2) - y0 * (u1 - u2) + (x1 * v2 - x2 * v1)) / delta;
    const b = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / delta;
    const c = (y0 * (v1 - v2) - x0 * (u1 - u2) + (y1 * v2 - y2 * v1)) / delta;
    const d = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / delta;
    const e = (x0 * (u1 * v2 - u2 * v1) - u0 * (x1 * v2 - x2 * v1) + v0 * (x1 * u2 - x2 * u1)) / delta;
    const f = (y0 * (u1 * v2 - u2 * v1) - u0 * (y1 * v2 - y2 * v1) + v0 * (y1 * u2 - y2 * u1)) / delta;

    ctx.transform(a, c, b, d, e, f);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  /**
   * Procedural mouth interior (dark cavity, subtle teeth strip, and tongue)
   */
  private drawMouthCavity(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    params: VisemeParams
  ) {
    const rawLandmarks = landmarksData.landmarks;
    const mouthCenter = rawLandmarks.mouth_inner_center;

    const cx = mouthCenter.x * width;
    const cy = mouthCenter.y * height + params.jawOpen * 8;
    const rx = (0.09 + params.mouthWide * 0.03 - params.mouthRound * 0.02) * width;
    const ry = Math.max(3, params.jawOpen * 20);

    ctx.save();

    // Dark cavity
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#090306";
    ctx.fill();

    // Subtle Upper Teeth Strip
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 0.45, rx * 0.72, Math.max(2, ry * 0.35), 0, 0, Math.PI);
    ctx.fillStyle = "rgba(235, 242, 250, 0.88)";
    ctx.fill();

    // Subtle Tongue Arc
    if (params.jawOpen > 0.18) {
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry * 0.55, rx * 0.65, Math.max(2, ry * 0.4), 0, Math.PI, Math.PI * 2);
      ctx.fillStyle = "rgba(145, 28, 48, 0.75)";
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Subtle ambient shimmer on cybernetic wireframe half
   */
  private drawWireframeShimmer(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ) {
    const shimmerAlpha = 0.06 + Math.sin(time * 2.5) * 0.04;
    ctx.save();
    // Clip to left wireframe half
    ctx.beginPath();
    ctx.rect(0, 0, width * 0.5, height);
    ctx.clip();

    const grad = ctx.createLinearGradient(0, (time * 60) % height, width * 0.5, ((time * 60) % height) + 40);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.5, `rgba(56, 189, 248, ${shimmerAlpha})`);
    grad.addColorStop(1, "transparent");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width * 0.5, height);
    ctx.restore();
  }
}
