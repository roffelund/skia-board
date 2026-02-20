import { useCallback, useState } from "react";

export interface MultiSelectState {
  /** Whether multiselect mode is active */
  isActive: boolean;
  /** Set of currently selected item IDs */
  selectedIds: Set<string>;
  /** Enter multiselect mode with an initial item */
  activate: (itemId: string) => void;
  /** Toggle an item in/out of the selection */
  toggle: (itemId: string) => void;
  /** Clear selection and exit multiselect mode */
  clear: () => void;
  /** Check if an item is selected */
  isSelected: (itemId: string) => boolean;
  /** Number of selected items */
  count: number;
}

/**
 * Manages multiselect state for the board canvas.
 *
 * Activation: long-press an item to enter multiselect + select it.
 * While active: taps toggle items. Tapping empty space clears.
 */
export const useMultiSelect = (): MultiSelectState => {
  const [isActive, setIsActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activate = useCallback((itemId: string) => {
    setIsActive(true);
    setSelectedIds(new Set([itemId]));
  }, []);

  const toggle = useCallback((itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      if (next.size === 0) {
        setIsActive(false);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setIsActive(false);
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (itemId: string) => selectedIds.has(itemId),
    [selectedIds],
  );

  return {
    isActive,
    selectedIds,
    activate,
    toggle,
    clear,
    isSelected,
    count: selectedIds.size,
  };
};
