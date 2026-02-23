import { useCallback, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";
import { SharedValue, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { RegistryItem, Point } from "./types";

export interface UseCanvasGestureControllerParams {
  /** Camera shared values */
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  /** Hit test function from registry */
  findItemAtPoint: (point: Point) => RegistryItem | null;
  /** Get all items in a group */
  getGroupItems: (groupId: string) => RegistryItem[];
  /** Get a registry item by ID */
  getItem: (id: string) => RegistryItem | undefined;
  /** Callbacks */
  onItemSelected: (id: string | null) => void;
  onItemTransformEnd: (id: string) => void;
  /** Multiselect callbacks */
  isMultiSelectActive: boolean;
  multiSelectIds: Set<string>;
  onMultiSelectActivate: (id: string) => void;
  onMultiSelectToggle: (id: string) => void;
  onMultiSelectClear: () => void;
}

/**
 * Centralized gesture controller for the board canvas.
 *
 * Handles pan (canvas panning + item dragging), tap (selection),
 * long-press (multiselect activation), and pinch (zoom).
 *
 * Gesture callbacks run on the UI thread (worklets). We must:
 * - Use SharedValues for all gesture state (not useRef)
 * - Use scheduleOnRN for hit testing and JS callbacks
 * - Inline coordinate math (no calling non-worklet functions)
 */
export const useCanvasGestureController = ({
  scale,
  translateX,
  translateY,
  findItemAtPoint,
  getGroupItems,
  getItem,
  onItemSelected,
  onItemTransformEnd,
  isMultiSelectActive,
  multiSelectIds,
  onMultiSelectActivate,
  onMultiSelectToggle,
  onMultiSelectClear,
}: UseCanvasGestureControllerParams) => {
  // Gesture state as shared values (accessible from worklets)
  // mode: 0=idle, 1=panning-canvas, 2=dragging-item
  const mode = useSharedValue(0);

  // Saved values for gesture start
  const savedCameraX = useSharedValue(0);
  const savedCameraY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  // Per-item drag start positions (shared values, worklet-accessible)
  const dragStartItemX = useSharedValue(0);
  const dragStartItemY = useSharedValue(0);

  // JS-thread refs for item identity (only accessed via scheduleOnRN)
  const activeItemRef = useRef<RegistryItem | null>(null);
  const groupItemsRef = useRef<RegistryItem[]>([]);
  const groupStartPositions = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );

  /**
   * JS-thread: called from onBegin via scheduleOnRN to do hit test and set up drag.
   */
  const beginGesture = useCallback(
    (screenX: number, screenY: number) => {
      const canvasX = (screenX - translateX.value) / scale.value;
      const canvasY = (screenY - translateY.value) / scale.value;
      const hitItem = findItemAtPoint({ x: canvasX, y: canvasY });

      if (hitItem) {
        activeItemRef.current = hitItem;
        dragStartItemX.value = hitItem.x.value;
        dragStartItemY.value = hitItem.y.value;

        // In multiselect mode, drag all selected items together
        if (isMultiSelectActive && multiSelectIds.has(hitItem.id)) {
          const selectedItems: RegistryItem[] = [];
          for (const id of multiSelectIds) {
            const item = getItem(id);
            if (item) selectedItems.push(item);
          }
          groupItemsRef.current = selectedItems;
          groupStartPositions.current.clear();
          for (const si of selectedItems) {
            groupStartPositions.current.set(si.id, {
              x: si.x.value,
              y: si.y.value,
            });
          }
        } else if (hitItem.groupId) {
          const groupItems = getGroupItems(hitItem.groupId);
          groupItemsRef.current = groupItems;
          groupStartPositions.current.clear();
          for (const gi of groupItems) {
            groupStartPositions.current.set(gi.id, {
              x: gi.x.value,
              y: gi.y.value,
            });
          }
        } else {
          groupItemsRef.current = [];
          groupStartPositions.current.clear();
        }

        mode.value = 2; // dragging-item
      } else {
        activeItemRef.current = null;
        savedCameraX.value = translateX.value;
        savedCameraY.value = translateY.value;
        mode.value = 1; // panning-canvas
      }
    },
    [
      findItemAtPoint,
      getGroupItems,
      getItem,
      translateX,
      translateY,
      scale,
      mode,
      dragStartItemX,
      dragStartItemY,
      savedCameraX,
      savedCameraY,
      isMultiSelectActive,
      multiSelectIds,
    ],
  );

  /**
   * JS-thread: apply drag delta to active item and group/selected members.
   */
  const applyDrag = useCallback(
    (dx: number, dy: number) => {
      const item = activeItemRef.current;
      if (!item) return;

      item.x.value = dragStartItemX.value + dx;
      item.y.value = dragStartItemY.value + dy;

      for (const gi of groupItemsRef.current) {
        if (gi.id === item.id) continue;
        const start = groupStartPositions.current.get(gi.id);
        if (start) {
          gi.x.value = start.x + dx;
          gi.y.value = start.y + dy;
        }
      }
    },
    [dragStartItemX, dragStartItemY],
  );

  /**
   * JS-thread: persist transforms for dragged item and group, then reset.
   */
  const endDrag = useCallback(() => {
    const item = activeItemRef.current;
    if (item) {
      if (groupItemsRef.current.length > 0) {
        for (const gi of groupItemsRef.current) {
          onItemTransformEnd(gi.id);
        }
      } else {
        onItemTransformEnd(item.id);
      }
    }
    activeItemRef.current = null;
    groupItemsRef.current = [];
    groupStartPositions.current.clear();
    mode.value = 0;
  }, [onItemTransformEnd, mode]);

  /**
   * JS-thread: tap hit test.
   */
  const doTapHitTest = useCallback(
    (screenX: number, screenY: number) => {
      const canvasX = (screenX - translateX.value) / scale.value;
      const canvasY = (screenY - translateY.value) / scale.value;
      const hitItem = findItemAtPoint({ x: canvasX, y: canvasY });

      if (isMultiSelectActive) {
        if (hitItem) {
          onMultiSelectToggle(hitItem.id);
        } else {
          onMultiSelectClear();
          onItemSelected(null);
        }
      } else {
        onItemSelected(hitItem ? hitItem.id : null);
      }
    },
    [
      findItemAtPoint,
      onItemSelected,
      translateX,
      translateY,
      scale,
      isMultiSelectActive,
      onMultiSelectToggle,
      onMultiSelectClear,
    ],
  );

  /**
   * JS-thread: long-press hit test → activate multiselect.
   */
  const doLongPressHitTest = useCallback(
    (screenX: number, screenY: number) => {
      const canvasX = (screenX - translateX.value) / scale.value;
      const canvasY = (screenY - translateY.value) / scale.value;
      const hitItem = findItemAtPoint({ x: canvasX, y: canvasY });

      if (hitItem) {
        if (isMultiSelectActive) {
          onMultiSelectToggle(hitItem.id);
        } else {
          onMultiSelectActivate(hitItem.id);
          onItemSelected(null);
        }
      }
    },
    [
      findItemAtPoint,
      translateX,
      translateY,
      scale,
      isMultiSelectActive,
      onMultiSelectActivate,
      onMultiSelectToggle,
      onItemSelected,
    ],
  );

  // ─── Gestures ──────────────────────────────────────────────────────────────

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      "worklet";
      scheduleOnRN(beginGesture, e.x, e.y);
    })
    .onUpdate((e) => {
      "worklet";
      if (mode.value === 1) {
        translateX.value = savedCameraX.value + e.translationX;
        translateY.value = savedCameraY.value + e.translationY;
      } else if (mode.value === 2) {
        const dx = e.translationX / scale.value;
        const dy = e.translationY / scale.value;
        scheduleOnRN(applyDrag, dx, dy);
      }
    })
    .onEnd(() => {
      "worklet";
      if (mode.value === 2) {
        scheduleOnRN(endDrag);
      } else {
        mode.value = 0;
      }
    });

  const tapGesture = Gesture.Tap().onEnd((e) => {
    "worklet";
    scheduleOnRN(doTapHitTest, e.x, e.y);
  });

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onEnd((e) => {
      "worklet";
      scheduleOnRN(doLongPressHitTest, e.x, e.y);
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      "worklet";
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      "worklet";
      scale.value = savedScale.value * e.scale;
    });

  const composed = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Race(longPressGesture, tapGesture, panGesture),
  );

  return { gesture: composed };
};
