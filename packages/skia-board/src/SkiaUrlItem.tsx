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
import { RegistryItem, UrlBoardItem } from "./types";

export interface SkiaUrlItemProps {
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
const ACCENT_WIDTH = 4;

/**
 * Renders a URL/link card on the Skia canvas.
 * Displays a white card with a colored accent bar, title, and URL text.
 */
export const SkiaUrlItem = ({
  item,
  isSelected,
  isMultiSelected,
  selectionColor = "#2196F3",
  multiSelectionColor = "#FF9800",
  groupColor = "#9C27B0",
}: SkiaUrlItemProps) => {
  const data = item.data as UrlBoardItem;
  const contentWidth = Math.max(
    (data.width ?? 200) - PADDING * 2 - ACCENT_WIDTH,
    50,
  );

  // Title paragraph (bold, larger)
  const titleParagraph = useMemo(() => {
    const p = Skia.ParagraphBuilder.Make({
      maxLines: 2,
      ellipsis: "…",
      textStyle: {
        fontSize: 14,
        fontStyle: { weight: 700 },
        color: Skia.Color("#1a1a1a"),
      },
    })
      .addText(data.title || data.url)
      .build();

    p.layout(contentWidth);
    return p;
  }, [data.title, data.url, contentWidth]);

  // URL paragraph (smaller, dimmer)
  const urlParagraph = useMemo(() => {
    const p = Skia.ParagraphBuilder.Make({
      maxLines: 1,
      ellipsis: "…",
      textStyle: {
        fontSize: 11,
        color: Skia.Color("#888888"),
      },
    })
      .addText(data.url)
      .build();

    p.layout(contentWidth);
    return p;
  }, [data.url, contentWidth]);

  // Description paragraph (optional)
  const descParagraph = useMemo(() => {
    if (!data.description) return null;

    const p = Skia.ParagraphBuilder.Make({
      maxLines: 3,
      ellipsis: "…",
      textStyle: {
        fontSize: 12,
        color: Skia.Color("#555555"),
      },
    })
      .addText(data.description)
      .build();

    p.layout(contentWidth);
    return p;
  }, [data.description, contentWidth]);

  // Pre-computed paragraph heights for layout
  const titleHeight = titleParagraph.getHeight();
  const descHeight = descParagraph?.getHeight() ?? 0;

  // Derived positions using shared values
  const accentY = useDerivedValue(() => item.y.value + 8);
  const accentHeight = useDerivedValue(() => item.height.value - 16);

  const titleX = useDerivedValue(() => item.x.value + ACCENT_WIDTH + PADDING);
  const titleY = useDerivedValue(() => item.y.value + PADDING);
  const textWidth = useDerivedValue(() =>
    Math.max(item.width.value - PADDING * 2 - ACCENT_WIDTH, 50),
  );

  const descY = useDerivedValue(() => item.y.value + PADDING + titleHeight + 4);
  const urlY = useDerivedValue(
    () =>
      item.y.value +
      PADDING +
      titleHeight +
      (descHeight > 0 ? descHeight + 8 : 4),
  );

  return (
    <Group>
      {/* Card background */}
      <RoundedRect
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        r={8}
        color="#FFFFFF"
      />

      {/* Left accent bar */}
      <RoundedRect
        x={item.x}
        y={accentY}
        width={ACCENT_WIDTH}
        height={accentHeight}
        r={2}
        color="#2196F3"
      />

      {/* Title */}
      <Paragraph
        paragraph={titleParagraph}
        x={titleX}
        y={titleY}
        width={textWidth}
      />

      {/* Description (optional) */}
      {descParagraph && (
        <Paragraph
          paragraph={descParagraph}
          x={titleX}
          y={descY}
          width={textWidth}
        />
      )}

      {/* URL */}
      <Paragraph
        paragraph={urlParagraph}
        x={titleX}
        y={urlY}
        width={textWidth}
      />

      {/* Card subtle border */}
      <RoundedRect
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        r={8}
        style="stroke"
        strokeWidth={1}
        color="#E0E0E0"
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
