import { useCallback, useEffect, useRef } from "react";
import { OnTransformEnd, RegistryItem } from "./types";

const snapshotItem = (item: RegistryItem) => ({
  id: item.id,
  snapshot: {
    x: item.x.value,
    y: item.y.value,
    width: item.width.value,
    height: item.height.value,
    rotation: item.rotation.value,
  },
});

interface Params {
  getItem: (id: string) => RegistryItem | undefined;
  getGroupItems: (groupId: string) => RegistryItem[];
  onTransformEnd?: OnTransformEnd;
}

/**
 * Returns a stable `onItemTransformEnd(id)` callback that batches all
 * dirty items into a single `onTransformEnd` call per gesture session.
 *
 * Any item belonging to a group automatically pulls in its siblings,
 * ensuring the whole group is always persisted as one transaction.
 */
export const useBatchedTransformEnd = ({
  getItem,
  getGroupItems,
  onTransformEnd,
}: Params) => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyIds = useRef<Set<string>>(new Set());
  const callbackRef = useRef({ onTransformEnd, getItem });
  callbackRef.current = { onTransformEnd, getItem };

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      const { onTransformEnd: cb, getItem: gi } = callbackRef.current;
      if (cb && dirtyIds.current.size > 0) {
        const events = Array.from(dirtyIds.current)
          .map((itemId) => gi(itemId))
          .filter((item): item is RegistryItem => item !== undefined)
          .map(snapshotItem);
        cb(events);
      }
      dirtyIds.current.clear();
    };
  }, []);

  return useCallback(
    (id: string) => {
      dirtyIds.current.add(id);

      const item = getItem(id);
      if (item?.groupId) {
        getGroupItems(item.groupId).forEach((gi) =>
          dirtyIds.current.add(gi.id),
        );
      }

      if (timer.current) clearTimeout(timer.current);

      timer.current = setTimeout(() => {
        if (!onTransformEnd || dirtyIds.current.size === 0) return;

        const events = Array.from(dirtyIds.current)
          .map((itemId) => getItem(itemId))
          .filter((gi): gi is RegistryItem => gi !== undefined)
          .map(snapshotItem);

        onTransformEnd(events);
        dirtyIds.current.clear();
      }, 150);
    },
    [getItem, getGroupItems, onTransformEnd],
  );
};
