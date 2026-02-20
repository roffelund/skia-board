import { Skia, type SkMatrix } from "@shopify/react-native-skia";

export const mapScreenToCanvas = (
  point: { x: number; y: number },
  canvasMatrix: SkMatrix,
) => {
  "worklet";

  const m = canvasMatrix.get();

  const det =
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6]);

  if (Math.abs(det) < 0.0001) return point;

  const invDet = 1 / det;
  const res = new Array<number>(9);
  res[0] = (m[4] * m[8] - m[5] * m[7]) * invDet;
  res[1] = (m[2] * m[7] - m[1] * m[8]) * invDet;
  res[2] = (m[1] * m[5] - m[2] * m[4]) * invDet;
  res[3] = (m[5] * m[6] - m[3] * m[8]) * invDet;
  res[4] = (m[0] * m[8] - m[2] * m[6]) * invDet;
  res[5] = (m[3] * m[2] - m[0] * m[5]) * invDet;
  res[6] = (m[3] * m[7] - m[4] * m[6]) * invDet;
  res[7] = (m[1] * m[6] - m[0] * m[7]) * invDet;
  res[8] = (m[0] * m[4] - m[1] * m[3]) * invDet;

  const x = point.x;
  const y = point.y;
  const newX = res[0] * x + res[1] * y + res[2];
  const newY = res[3] * x + res[4] * y + res[5];

  return { x: newX, y: newY };
};
