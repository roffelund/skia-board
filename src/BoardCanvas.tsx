import { Canvas, Group } from "@shopify/react-native-skia";
import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  LayoutChangeEvent,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

import { SkiaGrid, SkiaGridProps } from "./SkiaGrid";
import { DefaultItemRenderer } from "./DefaultItemRenderer";
import { SelectionOverlay, SelectionOverlayAction } from "./SelectionOverlay";
import {
  MultiSelectToolbar,
  MultiSelectToolbarProps,
} from "./MultiSelectToolbar";
import { ZoomControls, ZoomControlsProps } from "./ZoomControls";
import { Minimap, MinimapProps } from "./Minimap";

import { useItemRegistry } from "./useItemRegistry";
import { useCanvasGestureController } from "./useCanvasGestureController";
import { useMultiSelect } from "./useMultiSelect";
import { useSkiaImageLoader } from "./useSkiaImageLoader";
import { useBatchedTransformEnd } from "./useBatchedTransformEnd";

import {
  BoardItemData,
  BoardActions,
  ImageLoader,
  ItemRenderState,
  Point,
  RegistryItem,
  OnTransformEnd,
} from "./types";

// ─── Image loader sub-component ──────────────────────────────────────────────

const ImageLoaderComponent = ({
  itemId,
  loadImage,
  onLoaded,
}: {
  itemId: string;
  loadImage: ImageLoader;
  onLoaded: (id: string, image: any) => void;
}) => {
  useSkiaImageLoader(itemId, loadImage, onLoaded);
  return null;
};

// ─── Main canvas props ───────────────────────────────────────────────────────

export interface BoardCanvasProps {
  /** Array of items to display on the canvas */
  items: BoardItemData[];

  /**
   * Async function that loads raw image bytes for a given item id.
   * Only required when using image-type items.
   */
  loadImage?: ImageLoader;

  /**
   * Called when one or more items have been transformed and should be persisted.
   */
  onTransformEnd?: OnTransformEnd;

  /**
   * Optional action callbacks for item operations.
   */
  actions?: BoardActions;

  /**
   * Build the array of selection overlay actions for a given item.
   * If not provided, no overlay actions are shown.
   */
  selectionActions?: (itemId: string) => SelectionOverlayAction[];

  /**
   * Custom item renderer. Receives the registry item and render state.
   * When provided, replaces the built-in DefaultItemRenderer entirely.
   * Must return Skia elements (not React Native views).
   */
  renderItem?: (item: RegistryItem, state: ItemRenderState) => React.ReactNode;

  /**
   * Custom toolbar renderer for multiselect mode.
   * If provided, replaces the default MultiSelectToolbar.
   */
  renderMultiSelectToolbar?: (
    props: MultiSelectToolbarProps,
  ) => React.ReactNode;

  /**
   * Grid configuration. Pass `false` to hide the grid entirely.
   */
  grid?: SkiaGridProps | false;

  /**
   * Color customization for selection borders.
   */
  colors?: {
    selectionColor?: string;
    multiSelectionColor?: string;
    groupColor?: string;
  };

  /**
   * Show zoom control buttons (+, −, reset).
   * Pass `true` for defaults, or an object to customize appearance/position.
   * Useful on web where pinch-to-zoom is unavailable.
   */
  zoomControls?:
    | boolean
    | Omit<ZoomControlsProps, "scale" | "translateX" | "translateY">;

  /**
   * Show a minimap overlay with a bird's-eye view of all items.
   * Pass `true` for defaults, or an object to customize appearance/position.
   */
  minimap?:
    | boolean
    | Omit<
        MinimapProps,
        | "items"
        | "scale"
        | "translateX"
        | "translateY"
        | "canvasWidth"
        | "canvasHeight"
      >;

  /**
   * Optional children to render inside the canvas container (e.g. FABs, snackbars).
   */
  children?: React.ReactNode;
}

/**
 * Imperative handle exposed via ref on BoardCanvas.
 */
export interface BoardCanvasRef {
  /** Returns the world-space point at the center of the current viewport. */
  getViewportCenter: () => Point;
}

/**
 * A generic, self-contained board canvas built with Skia.
 *
 * Features:
 * - Pan / zoom canvas
 * - Drag items (individually, in groups, or multiselect)
 * - Tap to select, long-press to multiselect
 * - Grouping / ungrouping via callbacks
 * - Fully customizable actions and appearance
 */
export const BoardCanvas = forwardRef<BoardCanvasRef, BoardCanvasProps>(
  (
    {
      items,
      loadImage,
      onTransformEnd,
      actions,
      selectionActions,
      renderItem,
      renderMultiSelectToolbar,
      grid,
      colors,
      zoomControls,
      minimap,
      children,
    },
    ref,
  ) => {
    // ─── Registry ────────────────────────────────────────────────────────

    const {
      getItem,
      getSortedItems,
      findItemAtPoint,
      getGroupItems,
      setImage,
    } = useItemRegistry(items);

    // ─── Selection ───────────────────────────────────────────────────────

    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const multiSelect = useMultiSelect();

    // ─── Canvas layout (needed by minimap) ──────────────────────────────

    const windowDims = useWindowDimensions();
    const [canvasLayout, setCanvasLayout] = useState<{
      width: number;
      height: number;
    } | null>(null);

    const handleCanvasLayout = useCallback((e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setCanvasLayout({ width, height });
    }, []);

    // Use measured layout if available, otherwise fall back to window size
    const canvasSize = canvasLayout ?? windowDims;

    // ─── Camera ──────────────────────────────────────────────────────────

    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const cameraTransform = useDerivedValue(() => [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ]);

    // ─── Imperative handle ─────────────────────────────────────────────

    useImperativeHandle(
      ref,
      () => ({
        getViewportCenter: () => {
          const s = scale.value || 1;
          const cx = (-translateX.value + canvasSize.width / 2) / s;
          const cy = (-translateY.value + canvasSize.height / 2) / s;
          return { x: cx, y: cy };
        },
      }),
      [scale, translateX, translateY, canvasSize],
    );

    // ─── Transform persistence ──────────────────────────────────────────

    const handleItemTransformEnd = useBatchedTransformEnd({
      getItem,
      getGroupItems,
      onTransformEnd,
    });

    // ─── Selection handler ──────────────────────────────────────────────

    const handleItemSelected = useCallback((id: string | null) => {
      setSelectedItemId(id);
    }, []);

    // ─── Minimap pan handler ─────────────────────────────────────────

    const minimapConfig = useMemo(() => {
      if (!minimap) return null;
      const cfg = typeof minimap === "object" ? minimap : {};
      const w = cfg.width ?? 140;
      const h = cfg.height ?? 100;
      const m = cfg.margin ?? 12;
      const pos = cfg.position ?? "bottom-right";
      const pad = 8; // internal PADDING in Minimap.tsx

      const ox =
        pos === "top-left" || pos === "bottom-left"
          ? m
          : canvasSize.width - w - m;
      const oy =
        pos === "top-left" || pos === "top-right"
          ? m
          : canvasSize.height - h - m;

      return { ox, oy, w, h, pad };
    }, [minimap, canvasSize]);

    const handleMinimapPan = useCallback(
      (screenX: number, screenY: number): boolean => {
        if (!minimapConfig) return false;
        const { ox, oy, w, h, pad } = minimapConfig;

        // Hit test the minimap rect
        if (
          screenX < ox ||
          screenX > ox + w ||
          screenY < oy ||
          screenY > oy + h
        )
          return false;

        // Compute world bounds once and cache — use items only (not viewport)
        // so the mapping stays stable during the entire drag gesture.
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;

        const allItems = getSortedItems();
        for (const item of allItems) {
          const ix = item.x.value;
          const iy = item.y.value;
          if (ix < minX) minX = ix;
          if (iy < minY) minY = iy;
          if (ix + item.width.value > maxX) maxX = ix + item.width.value;
          if (iy + item.height.value > maxY) maxY = iy + item.height.value;
        }

        // Include viewport at the time of the FIRST touch only
        const vpLeft = -translateX.value / scale.value;
        const vpTop = -translateY.value / scale.value;
        const vpRight = vpLeft + canvasSize.width / scale.value;
        const vpBottom = vpTop + canvasSize.height / scale.value;
        if (vpLeft < minX) minX = vpLeft;
        if (vpTop < minY) minY = vpTop;
        if (vpRight > maxX) maxX = vpRight;
        if (vpBottom > maxY) maxY = vpBottom;

        if (!isFinite(minX)) {
          minX = 0;
          minY = 0;
          maxX = 1000;
          maxY = 1000;
        }

        const rangeX = maxX - minX || 100;
        const rangeY = maxY - minY || 100;
        const px = rangeX * 0.08;
        const py = rangeY * 0.08;
        minX -= px;
        minY -= py;
        maxX += px;
        maxY += py;

        const drawW = w - pad * 2;
        const drawH = h - pad * 2;
        const worldW = maxX - minX;
        const worldH = maxY - minY;
        const mScale = Math.min(drawW / worldW, drawH / worldH);

        // Store the mapping for continued drags
        minimapMappingRef.current = { minX, minY, mScale, ox, oy, pad };

        // Convert screen touch → world position
        const worldX = (screenX - ox - pad) / mScale + minX;
        const worldY = (screenY - oy - pad) / mScale + minY;

        // Center camera on that world point
        translateX.value = -(worldX * scale.value - canvasSize.width / 2);
        translateY.value = -(worldY * scale.value - canvasSize.height / 2);

        return true;
      },
      [
        minimapConfig,
        getSortedItems,
        translateX,
        translateY,
        scale,
        canvasSize,
      ],
    );

    // Cached mapping for continued minimap drags (avoids recomputing world bounds)
    const minimapMappingRef = useRef<{
      minX: number;
      minY: number;
      mScale: number;
      ox: number;
      oy: number;
      pad: number;
    } | null>(null);

    const handleMinimapContinue = useCallback(
      (screenX: number, screenY: number): boolean => {
        const mapping = minimapMappingRef.current;
        if (!mapping) return false;

        const { minX, minY, mScale, ox, oy, pad } = mapping;

        // Convert screen touch → world position using cached mapping
        const worldX = (screenX - ox - pad) / mScale + minX;
        const worldY = (screenY - oy - pad) / mScale + minY;

        // Center camera on that world point
        translateX.value = -(worldX * scale.value - canvasSize.width / 2);
        translateY.value = -(worldY * scale.value - canvasSize.height / 2);

        return true;
      },
      [translateX, translateY, scale, canvasSize],
    );

    // ─── Gesture controller ─────────────────────────────────────────────

    const { gesture } = useCanvasGestureController({
      scale,
      translateX,
      translateY,
      findItemAtPoint,
      getGroupItems,
      getItem,
      onItemSelected: handleItemSelected,
      onItemTransformEnd: handleItemTransformEnd,
      isMultiSelectActive: multiSelect.isActive,
      multiSelectIds: multiSelect.selectedIds,
      onMultiSelectActivate: multiSelect.activate,
      onMultiSelectToggle: multiSelect.toggle,
      onMultiSelectClear: multiSelect.clear,
      onMinimapPan: minimap ? handleMinimapPan : undefined,
      onMinimapPanContinue: minimap ? handleMinimapContinue : undefined,
    });

    // ─── Grouping logic ─────────────────────────────────────────────────

    const multiSelectGroupInfo = useMemo(() => {
      if (multiSelect.count === 0)
        return { allSameGroup: false, anyGrouped: false };

      const ids = Array.from(multiSelect.selectedIds);
      let firstGroupId: string | null | undefined = undefined;
      let allSame = true;
      let anyGrouped = false;

      for (const id of ids) {
        const item = items.find((i) => i.id === id);
        const gid = item?.groupId ?? null;
        if (gid) anyGrouped = true;
        if (firstGroupId === undefined) {
          firstGroupId = gid;
        } else if (gid !== firstGroupId) {
          allSame = false;
        }
      }

      return {
        allSameGroup:
          allSame && firstGroupId !== null && firstGroupId !== undefined,
        anyGrouped,
      };
    }, [multiSelect.selectedIds, multiSelect.count, items]);

    const handleGroup = useCallback(() => {
      if (multiSelect.count < 2 || !actions?.onGroup) return;
      actions.onGroup(Array.from(multiSelect.selectedIds));
      multiSelect.clear();
    }, [multiSelect, actions]);

    const handleUngroup = useCallback(() => {
      if (!actions?.onUngroup) return;

      const groupIds = new Set<string>();
      for (const id of multiSelect.selectedIds) {
        const item = items.find((i) => i.id === id);
        if (item?.groupId) groupIds.add(item.groupId);
      }
      if (groupIds.size === 0) return;

      actions.onUngroup(Array.from(groupIds));
      multiSelect.clear();
    }, [multiSelect, items, actions]);

    // ─── Render ─────────────────────────────────────────────────────────

    const sortedItems = getSortedItems();
    const selectedRegistryItem = selectedItemId
      ? getItem(selectedItemId)
      : null;
    const overlayActions =
      selectedItemId && selectionActions
        ? selectionActions(selectedItemId)
        : [];

    return (
      <View style={styles.container}>
        <GestureDetector gesture={gesture}>
          <View style={styles.canvasContainer} onLayout={handleCanvasLayout}>
            <Canvas style={styles.canvas}>
              <Group transform={cameraTransform}>
                {grid !== false && (
                  <SkiaGrid {...(typeof grid === "object" ? grid : {})} />
                )}
                {sortedItems.map((item) => {
                  const state: ItemRenderState = {
                    isSelected: item.id === selectedItemId,
                    isMultiSelected: multiSelect.isSelected(item.id),
                  };

                  if (renderItem) {
                    return (
                      <React.Fragment key={item.id}>
                        {renderItem(item, state)}
                      </React.Fragment>
                    );
                  }

                  return (
                    <DefaultItemRenderer
                      key={item.id}
                      item={item}
                      {...state}
                      {...colors}
                    />
                  );
                })}
              </Group>

              {/* Minimap */}
              {minimap && canvasSize.width > 0 && (
                <Minimap
                  items={sortedItems}
                  scale={scale}
                  translateX={translateX}
                  translateY={translateY}
                  canvasWidth={canvasSize.width}
                  canvasHeight={canvasSize.height}
                  {...(typeof minimap === "object" ? minimap : {})}
                />
              )}
            </Canvas>
          </View>
        </GestureDetector>

        {/* Load images for image-type items only */}
        {loadImage &&
          items
            .filter((item) => item.type === "image")
            .map((item) => (
              <ImageLoaderComponent
                key={item.id}
                itemId={item.id}
                loadImage={loadImage}
                onLoaded={setImage}
              />
            ))}

        {/* Selection overlay */}
        {selectedRegistryItem &&
          !multiSelect.isActive &&
          overlayActions.length > 0 && (
            <SelectionOverlay
              selectedItem={selectedRegistryItem}
              cameraX={translateX.value}
              cameraY={translateY.value}
              cameraScale={scale.value}
              actions={overlayActions}
            />
          )}

        {/* Multiselect toolbar */}
        {multiSelect.isActive && (
          <MultiSelectToolbar
            count={multiSelect.count}
            allSameGroup={multiSelectGroupInfo.allSameGroup}
            anyGrouped={multiSelectGroupInfo.anyGrouped}
            onGroup={handleGroup}
            onUngroup={handleUngroup}
            onClear={multiSelect.clear}
            renderToolbar={renderMultiSelectToolbar}
          />
        )}

        {/* Zoom controls */}
        {zoomControls && (
          <ZoomControls
            scale={scale}
            translateX={translateX}
            translateY={translateY}
            {...(typeof zoomControls === "object" ? zoomControls : {})}
          />
        )}

        {/* Consumer-provided children (FABs, snackbars, etc.) */}
        {children}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});
