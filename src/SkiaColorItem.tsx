import React from "react";
import {
  Group,
  RoundedRect,
  Rect,
  DashPathEffect,
} from "@shopify/react-native-skia";
import { RegistryItem, ColorBoardItem } from "./types";

export interface SkiaColorItemProps {
  item: RegistryItem;
  isSelected: boolean;
  isMultiSelected: boolean;
  /** Single-selection border color. Default "#2196F3". */
  selectionColor?: string;
  /** Multi-selection border color. Default "#FF9800". */
  multiSelectionColor?: string;
  /** Group border color. Default "#9C27B0". */
  groupColor?: string;
}

/**
 * Renders a solid color swatch on the Skia canvas.
 * All transforms are read directly from the registry's shared values.
 */
export const SkiaColorItem = ({
  item,
  isSelected,
  isMultiSelected,
  selectionColor = "#2196F3",
  multiSelectionColor = "#FF9800",
  groupColor = "#9C27B0",
}: SkiaColorItemProps) => {
  const data = item.data as ColorBoardItem;

  return (
    <Group>
      {/* Filled color swatch */}
      <RoundedRect
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        r={8}
        color={data.color}
      />

      {/* Subtle inner border for very light colors */}
      <RoundedRect
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        r={8}
        style="stroke"
        strokeWidth={1}
        color="rgba(0,0,0,0.08)"
      />

      {/* Single-selection border (solid) */}
      {isSelected && !isMultiSelected && (
        <Rect
          x={item.x}
          y={item.y}
          width={item.width}
          height={item.height}
          style="stroke"
          strokeWidth={3}
          color={selectionColor}
        />
      )}

      {/* Multi-selection border (dashed) */}
      {isMultiSelected && (
        <Rect
          x={item.x}
          y={item.y}
          width={item.width}
          height={item.height}
          style="stroke"
          strokeWidth={3}
          color={multiSelectionColor}
        >
          <DashPathEffect intervals={[8, 6]} />
        </Rect>
      )}

      {/* Group border (solid, thinner) */}
      {!isSelected && !isMultiSelected && item.groupId && (
        <Rect
          x={item.x}
          y={item.y}
          width={item.width}
          height={item.height}
          style="stroke"
          strokeWidth={2}
          color={groupColor}
        />
      )}
    </Group>
  );
};
