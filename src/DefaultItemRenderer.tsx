import React from "react";
import { SkTypefaceFontProvider } from "@shopify/react-native-skia";
import { RegistryItem } from "./types";
import { SkiaImageItem } from "./SkiaImageItem";
import { SkiaColorItem } from "./SkiaColorItem";
import { SkiaTextItem } from "./SkiaTextItem";
import { SkiaUrlItem } from "./SkiaUrlItem";

export interface DefaultItemRendererProps {
  item: RegistryItem;
  isSelected: boolean;
  isMultiSelected: boolean;
  /** Single-selection border color. */
  selectionColor?: string;
  /** Multi-selection border color. */
  multiSelectionColor?: string;
  /** Group border color. */
  groupColor?: string;
  /** Font provider for Paragraph text rendering (required on web). */
  fontMgr?: SkTypefaceFontProvider;
}

/**
 * Default item renderer that dispatches to the appropriate
 * type-specific Skia renderer based on `item.data.type`.
 *
 * If `renderItem` is provided on `<BoardCanvas />`, this component
 * is bypassed entirely and the consumer controls all rendering.
 */
export const DefaultItemRenderer = ({
  item,
  isSelected,
  isMultiSelected,
  selectionColor,
  multiSelectionColor,
  groupColor,
  fontMgr,
}: DefaultItemRendererProps) => {
  const borderProps = {
    isSelected,
    isMultiSelected,
    selectionColor,
    multiSelectionColor,
    groupColor,
  };

  switch (item.data.type) {
    case "image":
      return <SkiaImageItem item={item} {...borderProps} />;
    case "color":
      return <SkiaColorItem item={item} {...borderProps} />;
    case "text":
      return <SkiaTextItem item={item} fontMgr={fontMgr} {...borderProps} />;
    case "url":
      return <SkiaUrlItem item={item} fontMgr={fontMgr} {...borderProps} />;
    default:
      // Unknown type — render as a plain image item (graceful fallback)
      return <SkiaImageItem item={item} {...borderProps} />;
  }
};
