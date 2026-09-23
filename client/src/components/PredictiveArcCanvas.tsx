import { DataPixelArcCanvas, type DataPixelArcCanvasProps } from "./predictive-arc/DataPixelArcCanvas";

type PredictiveArcCanvasProps = DataPixelArcCanvasProps & {
  variant?: "data-pixel";
};

export function PredictiveArcCanvas({ variant = "data-pixel", ...props }: PredictiveArcCanvasProps) {
  if (variant !== "data-pixel") return null;
  return <DataPixelArcCanvas {...props} />;
}
