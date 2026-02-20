import { Group, Line } from "@shopify/react-native-skia";
import React, { Fragment } from "react";

export interface SkiaGridProps {
  /** Distance between grid lines in canvas units. Default 50. */
  gridSize?: number;
  /** Number of grid lines in each direction. Default 40. */
  gridCount?: number;
  /** Grid line color. Default "#ddd". */
  color?: string;
  /** Grid line stroke width. Default 1. */
  strokeWidth?: number;
}

/**
 * Renders a background grid on the Skia canvas.
 */
export const SkiaGrid = ({
  gridSize = 50,
  gridCount = 40,
  color = "#ddd",
  strokeWidth = 1,
}: SkiaGridProps) => {
  return (
    <Group>
      {Array.from({ length: gridCount }).map((_, i) => (
        <Fragment key={i}>
          <Line
            p1={{ x: i * gridSize, y: 0 }}
            p2={{ x: i * gridSize, y: gridCount * gridSize }}
            color={color}
            strokeWidth={strokeWidth}
            style="stroke"
          />
          <Line
            p1={{ x: 0, y: i * gridSize }}
            p2={{ x: gridCount * gridSize, y: i * gridSize }}
            color={color}
            strokeWidth={strokeWidth}
            style="stroke"
          />
        </Fragment>
      ))}
    </Group>
  );
};
