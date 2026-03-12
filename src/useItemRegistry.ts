import { useCallback, useEffect, useRef, useState } from "react";
import { RegistryItem, ItemRegistry, Point, BoardItemData } from "./types";
import { makeMutable } from "react-native-reanimated";
import { SkImage } from "@shopify/react-native-skia";

/**
 * Manages the centralized registry of all board items.
 * Each item's transforms are stored as shared values so Skia
 * and gestures can read/write them on the UI thread.
 */
export const useItemRegistry = (items: BoardItemData[] | undefined) => {
  const registry = useRef<ItemRegistry>(new Map());
  // Version counter — incremented after registry sync & image loads to trigger re-render
  const [version, setVersion] = useState(0);

  // Sync registry with input data
  useEffect(() => {
    if (!items || items.length === 0) {
      if (registry.current.size > 0) {
        registry.current.clear();
        setVersion((v) => v + 1);
      }
      return;
    }

    let changed = false;

    // Remove items no longer in the data
    const itemIds = new Set(items.map((item) => item.id));
    for (const id of registry.current.keys()) {
      if (!itemIds.has(id)) {
        registry.current.delete(id);
        changed = true;
      }
    }

    // Add or update items
    items.forEach((item) => {
      const existing = registry.current.get(item.id);
      if (existing) {
        // Only write shared values that actually changed — each write
        // schedules a UI-thread sync and Skia canvas redraw
        const x = item.x ?? 0;
        const y = item.y ?? 0;
        const w = item.width ?? 200;
        const h = item.height ?? 200;
        const r = item.rotation ?? 0;
        const z = item.zIndex ?? 0;
        const g = item.groupId ?? null;

        if (existing.x.value !== x) {
          existing.x.value = x;
          changed = true;
        }
        if (existing.y.value !== y) {
          existing.y.value = y;
          changed = true;
        }
        if (existing.width.value !== w) {
          existing.width.value = w;
          changed = true;
        }
        if (existing.height.value !== h) {
          existing.height.value = h;
          changed = true;
        }
        if (existing.rotation.value !== r) {
          existing.rotation.value = r;
          changed = true;
        }
        if (existing.zIndex !== z) {
          existing.zIndex = z;
          changed = true;
        }
        if (existing.groupId !== g) {
          existing.groupId = g;
          changed = true;
        }
        existing.data = item;
      } else {
        registry.current.set(item.id, {
          id: item.id,
          groupId: item.groupId ?? null,
          x: makeMutable(item.x ?? 0),
          y: makeMutable(item.y ?? 0),
          width: makeMutable(item.width ?? 200),
          height: makeMutable(item.height ?? 200),
          rotation: makeMutable(item.rotation ?? 0),
          zIndex: item.zIndex ?? 0,
          image: null,
          data: item,
        });
        changed = true;
      }
    });

    // Only re-render if something actually changed
    if (changed) {
      setVersion((v) => v + 1);
    }
  }, [items]);

  /** Set the loaded SkImage for an item and trigger a re-render */
  const setImage = useCallback((id: string, skImage: SkImage | null) => {
    const item = registry.current.get(id);
    if (item) {
      item.image = skImage;
      setVersion((v) => v + 1);
    }
  }, []);

  /** Get a specific item */
  const getItem = useCallback((id: string): RegistryItem | undefined => {
    return registry.current.get(id);
  }, []);

  /** Get all items sorted by zIndex */
  const getSortedItems = useCallback((): RegistryItem[] => {
    return Array.from(registry.current.values()).sort(
      (a, b) => a.zIndex - b.zIndex,
    );
  }, []);

  /**
   * Hit test: find the topmost item at a given canvas point.
   * Iterates in reverse zIndex order so the topmost item wins.
   */
  const findItemAtPoint = useCallback((point: Point): RegistryItem | null => {
    const items = Array.from(registry.current.values()).sort(
      (a, b) => b.zIndex - a.zIndex,
    );

    for (const item of items) {
      const ix = item.x.value;
      const iy = item.y.value;
      const iw = item.width.value;
      const ih = item.height.value;

      if (
        point.x >= ix &&
        point.x <= ix + iw &&
        point.y >= iy &&
        point.y <= iy + ih
      ) {
        return item;
      }
    }
    return null;
  }, []);

  /** Get all items in a group */
  const getGroupItems = useCallback((groupId: string): RegistryItem[] => {
    return Array.from(registry.current.values()).filter(
      (item) => item.groupId === groupId,
    );
  }, []);

  return {
    registry: registry.current,
    version,
    getItem,
    getSortedItems,
    findItemAtPoint,
    getGroupItems,
    setImage,
  };
};
