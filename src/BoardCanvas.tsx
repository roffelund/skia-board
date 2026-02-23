import { Canvas, Group } from "@shopify/react-native-skia";
import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

import { SkiaGrid, SkiaGridProps } from "./SkiaGrid";
import { DefaultItemRenderer } from "./DefaultItemRenderer";
import { SelectionOverlay, SelectionOverlayAction } from "./SelectionOverlay";
import {
  MultiSelectToolbar,
  MultiSelectToolbarProps,
} from "./MultiSelectToolbar";

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
   * Optional children to render inside the canvas container (e.g. FABs, snackbars).
   */
  children?: React.ReactNode;
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
export const BoardCanvas = ({
  items,
  loadImage,
  onTransformEnd,
  actions,
  selectionActions,
  renderItem,
  renderMultiSelectToolbar,
  grid,
  colors,
  children,
}: BoardCanvasProps) => {
  // ─── Registry ────────────────────────────────────────────────────────

  const { getItem, getSortedItems, findItemAtPoint, getGroupItems, setImage } =
    useItemRegistry(items);

  // ─── Selection ───────────────────────────────────────────────────────

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const multiSelect = useMultiSelect();

  // ─── Camera ──────────────────────────────────────────────────────────

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const cameraTransform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value },
  ]);

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
  const selectedRegistryItem = selectedItemId ? getItem(selectedItemId) : null;
  const overlayActions =
    selectedItemId && selectionActions ? selectionActions(selectedItemId) : [];

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <View style={styles.canvasContainer}>
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

      {/* Consumer-provided children (FABs, snackbars, etc.) */}
      {children}
    </View>
  );
};

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
