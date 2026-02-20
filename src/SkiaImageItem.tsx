import React from "react";
import { Group, Image, Rect, DashPathEffect } from "@shopify/react-native-skia";
import { RegistryItem } from "./types";

export interface SkiaImageItemProps {
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
 * Renders a single board image on the Skia canvas.
 * All transforms are read directly from the registry's shared values,
 * so gesture mutations cause immediate re-renders on the UI thread.
 */
export const SkiaImageItem = ({
  item,
  isSelected,
  isMultiSelected,
  selectionColor = "#2196F3",
  multiSelectionColor = "#FF9800",
  groupColor = "#9C27B0",
}: SkiaImageItemProps) => {
  if (!item.image) return null;

  return (
    <Group>
      <Image
        image={item.image}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        fit="cover"
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

      {/* Group border (solid, thinner) — only when not selected */}
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
