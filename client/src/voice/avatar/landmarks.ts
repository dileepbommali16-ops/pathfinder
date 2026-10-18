/**
 * Anatomical Facial Landmarks (client/src/voice/avatar/landmarks.ts)
 * Pre-calibrated landmark mappings for das_head.jpg / das_head.webp.
 */

export interface Landmark2D {
  x: number;
  y: number;
}

export interface FacialLandmarks {
  mouth_left: Landmark2D;
  mouth_right: Landmark2D;
  upper_lip_center: Landmark2D;
  lower_lip_center: Landmark2D;
  mouth_inner_center: Landmark2D;
  chin: Landmark2D;
  jaw_left: Landmark2D;
  jaw_right: Landmark2D;
  nose_tip: Landmark2D;
  nose_bridge: Landmark2D;
  eye_left: Landmark2D;
  eye_right: Landmark2D;
  eyebrow_left: Landmark2D;
  eyebrow_right: Landmark2D;
  forehead_center: Landmark2D;
  head_top: Landmark2D;
}

export const CALIBRATED_LANDMARKS: FacialLandmarks = {
  mouth_left: { x: 0.404, y: 0.757 },
  mouth_right: { x: 0.599, y: 0.757 },
  upper_lip_center: { x: 0.502, y: 0.746 },
  lower_lip_center: { x: 0.502, y: 0.772 },
  mouth_inner_center: { x: 0.502, y: 0.759 },
  chin: { x: 0.502, y: 0.890 },
  jaw_left: { x: 0.261, y: 0.694 },
  jaw_right: { x: 0.739, y: 0.694 },
  nose_tip: { x: 0.502, y: 0.650 },
  nose_bridge: { x: 0.502, y: 0.520 },
  eye_left: { x: 0.348, y: 0.520 },
  eye_right: { x: 0.655, y: 0.520 },
  eyebrow_left: { x: 0.331, y: 0.448 },
  eyebrow_right: { x: 0.662, y: 0.448 },
  forehead_center: { x: 0.502, y: 0.250 },
  head_top: { x: 0.502, y: 0.130 },
};
