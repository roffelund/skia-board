// ─── Main component ──────────────────────────────────────────────────────────
export { BoardCanvas } from "./BoardCanvas";
export type { BoardCanvasProps } from "./BoardCanvas";

// ─── Sub-components (for advanced composition) ───────────────────────────────
export { DefaultItemRenderer } from "./DefaultItemRenderer";
export type { DefaultItemRendererProps } from "./DefaultItemRenderer";

export { SkiaGrid } from "./SkiaGrid";
export type { SkiaGridProps } from "./SkiaGrid";

export { SkiaImageItem } from "./SkiaImageItem";
export type { SkiaImageItemProps } from "./SkiaImageItem";

export { SkiaColorItem } from "./SkiaColorItem";
export type { SkiaColorItemProps } from "./SkiaColorItem";

export { SkiaTextItem } from "./SkiaTextItem";
export type { SkiaTextItemProps } from "./SkiaTextItem";

export { SkiaUrlItem } from "./SkiaUrlItem";
export type { SkiaUrlItemProps } from "./SkiaUrlItem";

export { SelectionOverlay } from "./SelectionOverlay";
export type {
  SelectionOverlayProps,
  SelectionOverlayAction,
} from "./SelectionOverlay";

export { MultiSelectToolbar } from "./MultiSelectToolbar";
export type { MultiSelectToolbarProps } from "./MultiSelectToolbar";

// ─── Hooks (for advanced composition) ────────────────────────────────────────
export { useItemRegistry } from "./useItemRegistry";
export { useCanvasGestureController } from "./useCanvasGestureController";
export type { UseCanvasGestureControllerParams } from "./useCanvasGestureController";
export { useMultiSelect } from "./useMultiSelect";
export type { MultiSelectState } from "./useMultiSelect";
export { useSkiaImageLoader } from "./useSkiaImageLoader";

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  GestureMode,
  BoardItemData,
  ImageBoardItem,
  UrlBoardItem,
  TextBoardItem,
  ColorBoardItem,
  RegistryItem,
  ItemRegistry,
  ItemRenderState,
  Point,
  TransformSnapshot,
  ImageLoader,
  ItemTransform,
  OnTransformEnd,
  BoardActions,
  SelectionAction,
} from "./types";

// ─── Utilities ───────────────────────────────────────────────────────────────
export { mapScreenToCanvas } from "./utils";
