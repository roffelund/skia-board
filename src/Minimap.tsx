import { Rect, Group, RoundedRect } from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { SharedValue, useDerivedValue } from "react-native-reanimated";

import { RegistryItem } from "./types";

// ─── Props ───────────────────────────────────────────────────────────────────

export interface MinimapProps {
  /** Sorted array of all registry items to display. */
  items: RegistryItem[];

  /** Camera scale shared value. */
  scale: SharedValue<number>;
  /** Camera translateX shared value. */
  translateX: SharedValue<number>;
  /** Camera translateY shared value. */
  translateY: SharedValue<number>;

  /** Width of the main canvas view in screen pixels. */
  canvasWidth: number;
  /** Height of the main canvas view in screen pixels. */
  canvasHeight: number;

  /** Width of the minimap in pixels. Default: 140 */
  width?: number;
  /** Height of the minimap in pixels. Default: 100 */
  height?: number;

  /** Position of the minimap on screen. Default: "bottom-right" */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";

  /** Margin from canvas edge. Default: 12 */
  margin?: number;

  /** Background color. Default: "rgba(255,255,255,0.92)" */
  backgroundColor?: string;
  /** Border color. Default: "rgba(0,0,0,0.2)" */
  borderColor?: string;
  /** Item fill color. Default: "rgba(100,100,100,0.6)" */
  itemColor?: string;
  /** Viewport indicator fill. Default: "rgba(59,130,246,0.2)" */
  viewportColor?: string;
  /** Viewport indicator border. Default: "rgba(59,130,246,0.8)" */
  viewportBorderColor?: string;
  /** Corner radius. Default: 6 */
  borderRadius?: number;
}

const PADDING = 8;

/**
 * Minimap rendered as pure Skia elements.
 *
 * Placed inside the main `<Canvas>` but **outside** the camera-transform
 * `<Group>` so it stays fixed in screen-space.
 */
export const Minimap = ({
  items,
  scale,
  translateX,
  translateY,
  canvasWidth,
  canvasHeight,
  width = 140,
  height = 100,
  position = "bottom-right",
  margin = 12,
  backgroundColor = "rgba(255,255,255,0.92)",
  borderColor = "rgba(0,0,0,0.2)",
  itemColor = "rgba(100,100,100,0.6)",
  viewportColor = "rgba(59,130,246,0.2)",
  viewportBorderColor = "rgba(59,130,246,0.8)",
  borderRadius = 6,
}: MinimapProps) => {
  // ─── Anchor position ──────────────────────────────────────────────

  const ox = useMemo(() => {
    if (position === "top-left" || position === "bottom-left") return margin;
    return canvasWidth - width - margin;
  }, [position, canvasWidth, width, margin]);

  const oy = useMemo(() => {
    if (position === "top-left" || position === "top-right") return margin;
    return canvasHeight - height - margin;
  }, [position, canvasHeight, height, margin]);

  // ─── World bounds (union of all items + current viewport) ──────

  const worldBounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Include all items
    for (const item of items) {
      const ix = item.x.value;
      const iy = item.y.value;
      const iw = item.width.value;
      const ih = item.height.value;
      if (ix < minX) minX = ix;
      if (iy < minY) minY = iy;
      if (ix + iw > maxX) maxX = ix + iw;
      if (iy + ih > maxY) maxY = iy + ih;
    }

    // Include the current viewport so it's never outside the minimap
    const vpLeft = -translateX.value / scale.value;
    const vpTop = -translateY.value / scale.value;
    const vpRight = vpLeft + canvasWidth / scale.value;
    const vpBottom = vpTop + canvasHeight / scale.value;

    if (vpLeft < minX) minX = vpLeft;
    if (vpTop < minY) minY = vpTop;
    if (vpRight > maxX) maxX = vpRight;
    if (vpBottom > maxY) maxY = vpBottom;

    // Fallback for empty boards
    if (!isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 1000;
      maxY = 1000;
    }

    // Add proportional padding
    const rangeX = maxX - minX || 100;
    const rangeY = maxY - minY || 100;
    const px = rangeX * 0.08;
    const py = rangeY * 0.08;
    return {
      minX: minX - px,
      minY: minY - py,
      maxX: maxX + px,
      maxY: maxY + py,
    };
  }, [items, scale, translateX, translateY, canvasWidth, canvasHeight]);

  // ─── Scale ────────────────────────────────────────────────────────

  const drawW = width - PADDING * 2;
  const drawH = height - PADDING * 2;
  const worldW = worldBounds.maxX - worldBounds.minX;
  const worldH = worldBounds.maxY - worldBounds.minY;

  const mScale = useMemo(() => {
    if (worldW <= 0 || worldH <= 0) return 1;
    return Math.min(drawW / worldW, drawH / worldH);
  }, [drawW, drawH, worldW, worldH]);

  // ─── Item rects ───────────────────────────────────────────────────

  const itemRects = useMemo(
    () =>
      items.map((item) => ({
        x: ox + PADDING + (item.x.value - worldBounds.minX) * mScale,
        y: oy + PADDING + (item.y.value - worldBounds.minY) * mScale,
        w: Math.max(item.width.value * mScale, 2),
        h: Math.max(item.height.value * mScale, 2),
      })),
    [items, worldBounds, mScale, ox, oy],
  );

  // ─── Viewport (driven by shared values → animates) ────────────────

  const vpX = useDerivedValue(() => {
    const originX = -translateX.value / scale.value;
    return ox + PADDING + (originX - worldBounds.minX) * mScale;
  });

  const vpY = useDerivedValue(() => {
    const originY = -translateY.value / scale.value;
    return oy + PADDING + (originY - worldBounds.minY) * mScale;
  });

  const vpW = useDerivedValue(() => (canvasWidth / scale.value) * mScale);
  const vpH = useDerivedValue(() => (canvasHeight / scale.value) * mScale);

  if (canvasWidth <= 0 || canvasHeight <= 0) return null;

  return (
    <Group>
      {/* Background */}
      <RoundedRect
        x={ox}
        y={oy}
        width={width}
        height={height}
        r={borderRadius}
        color={backgroundColor}
      />

      {/* Border */}
      <RoundedRect
        x={ox}
        y={oy}
        width={width}
        height={height}
        r={borderRadius}
        color={borderColor}
        style="stroke"
        strokeWidth={1}
      />

      {/* Items */}
      {itemRects.map((r, i) => (
        <Rect
          key={items[i]?.id ?? i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          color={itemColor}
        />
      ))}

      {/* Viewport fill */}
      <Rect x={vpX} y={vpY} width={vpW} height={vpH} color={viewportColor} />

      {/* Viewport border */}
      <Rect
        x={vpX}
        y={vpY}
        width={vpW}
        height={vpH}
        color={viewportBorderColor}
        style="stroke"
        strokeWidth={1.5}
      />
    </Group>
  );
};
