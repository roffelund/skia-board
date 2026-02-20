import { SharedValue } from "react-native-reanimated";
import { SkImage } from "@shopify/react-native-skia";

// ─── Gesture modes ───────────────────────────────────────────────────────────

export type GestureMode =
  | "idle"
  | "panning-canvas"
  | "zooming-canvas"
  | "dragging-item"
  | "resizing-item";

// ─── Board item types ─────────────────────────────────────────────────────────

/** Common fields shared by all board item types. */
interface BoardItemBase {
  id: string;
  groupId?: string | null;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  rotation?: number | null;
  zIndex?: number | null;
}

/** An image item — visual content loaded asynchronously via `loadImage`. */
export interface ImageBoardItem extends BoardItemBase {
  type: "image";
}

/** A URL/link card displayed as a styled card on the canvas. */
export interface UrlBoardItem extends BoardItemBase {
  type: "url";
  url: string;
  title?: string;
  description?: string;
}

/** A text note rendered directly on the canvas. */
export interface TextBoardItem extends BoardItemBase {
  type: "text";
  text: string;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
}

/** A solid color swatch. */
export interface ColorBoardItem extends BoardItemBase {
  type: "color";
  color: string;
  label?: string;
}

/**
 * Discriminated union of all supported board item types.
 * Consumers pass arrays of these to `<BoardCanvas />`.
 */
export type BoardItemData =
  | ImageBoardItem
  | UrlBoardItem
  | TextBoardItem
  | ColorBoardItem;

// ─── Internal registry item ──────────────────────────────────────────────────

/**
 * A single item in the registry, holding all transform shared values.
 * Skia reads these directly for rendering; gestures mutate them.
 */
export interface RegistryItem {
  id: string;
  groupId: string | null;

  // Transform shared values (mutated by gestures, read by Skia)
  x: SharedValue<number>;
  y: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
  rotation: SharedValue<number>;
  zIndex: number;

  // Skia image (loaded async, only for type: "image")
  image: SkImage | null;

  // Original item data (for type-specific rendering)
  data: BoardItemData;
}

/**
 * The full registry: a map of item ID → RegistryItem
 */
export type ItemRegistry = Map<string, RegistryItem>;

// ─── Geometry helpers ────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

/**
 * Transform snapshot for persisting positions back to the consumer.
 */
export interface TransformSnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

// ─── Render state for custom renderItem ──────────────────────────────────────

/**
 * Render state passed to custom `renderItem` functions.
 */
export interface ItemRenderState {
  isSelected: boolean;
  isMultiSelected: boolean;
}

// ─── Callback signatures used by the board canvas ───────────────────────────

/**
 * Loads raw image bytes for a given item id.
 * The consumer is responsible for auth headers, URL building, etc.
 */
export type ImageLoader = (id: string) => Promise<ArrayBuffer>;

/**
 * Called when an item's transform has changed and should be persisted.
 */
export type OnTransformEnd = (id: string, snapshot: TransformSnapshot) => void;

/**
 * Action callbacks the consumer can optionally provide.
 */
export interface BoardActions {
  /** Called when the user taps delete on a selected item */
  onDelete?: (id: string) => void;
  /** Called when the user taps duplicate on a selected item */
  onDuplicate?: (id: string) => void;
  /** Called when the user changes z-index */
  onZIndexChange?: (id: string, direction: "up" | "down") => void;
  /** Called when the user commits / uncommits an item */
  onCommit?: (id: string) => void;
  /** Called when the user groups selected items */
  onGroup?: (ids: string[]) => void;
  /** Called when the user ungroups. Receives the set of group IDs to remove. */
  onUngroup?: (groupIds: string[]) => void;
}

// ─── Selection overlay action config ─────────────────────────────────────────

export interface SelectionAction {
  icon: string;
  color?: string;
  onPress: () => void;
}
