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
      registry.current.clear();
      return;
    }

    // Remove items no longer in the data
    const itemIds = new Set(items.map((item) => item.id));
    for (const id of registry.current.keys()) {
      if (!itemIds.has(id)) {
        registry.current.delete(id);
      }
    }

    // Add or update items
    items.forEach((item) => {
      const existing = registry.current.get(item.id);
      if (existing) {
        existing.x.value = item.x ?? 0;
        existing.y.value = item.y ?? 0;
        existing.width.value = item.width ?? 200;
        existing.height.value = item.height ?? 200;
        existing.rotation.value = item.rotation ?? 0;
        existing.zIndex = item.zIndex ?? 0;
        existing.groupId = item.groupId ?? null;
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
      }
    });

    // Force a re-render so getSortedItems() picks up the populated registry
    setVersion((v) => v + 1);
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
