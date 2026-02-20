import React, { useMemo } from "react";
import {
  Group,
  Paragraph,
  RoundedRect,
  Rect,
  DashPathEffect,
  Skia,
} from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { RegistryItem, TextBoardItem } from "./types";

export interface SkiaTextItemProps {
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

const PADDING = 12;

/**
 * Renders a text note on the Skia canvas with an optional background color.
 * Uses the Skia Paragraph API with system fonts.
 */
export const SkiaTextItem = ({
  item,
  isSelected,
  isMultiSelected,
  selectionColor = "#2196F3",
  multiSelectionColor = "#FF9800",
  groupColor = "#9C27B0",
}: SkiaTextItemProps) => {
  const data = item.data as TextBoardItem;

  const paragraph = useMemo(() => {
    const fontSize = data.fontSize ?? 16;
    const fontColor = data.fontColor ?? "#333333";
    const layoutWidth = Math.max((data.width ?? 200) - PADDING * 2, 50);

    const p = Skia.ParagraphBuilder.Make({
      textStyle: {
        fontSize,
        color: Skia.Color(fontColor),
      },
    })
      .addText(data.text)
      .build();

    p.layout(layoutWidth);
    return p;
  }, [data.text, data.fontSize, data.fontColor, data.width]);

  const textX = useDerivedValue(() => item.x.value + PADDING);
  const textY = useDerivedValue(() => item.y.value + PADDING);
  const textWidth = useDerivedValue(() =>
    Math.max(item.width.value - PADDING * 2, 50),
  );

  return (
    <Group>
      {/* Background */}
      <RoundedRect
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        r={8}
        color={data.backgroundColor ?? "#FFFDE7"}
      />

      {/* Text content */}
      <Paragraph paragraph={paragraph} x={textX} y={textY} width={textWidth} />

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
