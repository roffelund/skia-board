import React from "react";
import { StyleSheet, TouchableOpacity, View, Text } from "react-native";

export interface MultiSelectToolbarProps {
  /** Number of items currently selected */
  count: number;
  /** Whether all selected items share the same groupId */
  allSameGroup: boolean;
  /** Whether any selected item is already in a group */
  anyGrouped: boolean;
  /** Callback to create a group from selected items */
  onGroup: () => void;
  /** Callback to ungroup selected items */
  onUngroup: () => void;
  /** Callback to clear selection and exit multiselect */
  onClear: () => void;
  /** Optional: render a custom toolbar. Receives the default props. */
  renderToolbar?: (props: MultiSelectToolbarProps) => React.ReactNode;
}

/**
 * Default toolbar that appears at the bottom of the board when
 * multiselect is active. Provides Group / Ungroup / Clear actions.
 *
 * Uses only React Native primitives — no external UI library required.
 */
export const MultiSelectToolbar = (props: MultiSelectToolbarProps) => {
  const {
    count,
    allSameGroup,
    anyGrouped,
    onGroup,
    onUngroup,
    onClear,
    renderToolbar,
  } = props;

  if (count === 0) return null;

  // Allow consumer to fully replace the toolbar UI
  if (renderToolbar) {
    return <>{renderToolbar(props)}</>;
  }

  const canGroup = count >= 2 && !allSameGroup;
  const canUngroup = anyGrouped;

  return (
    <View style={styles.container}>
      <Text style={styles.countText}>
        {count} item{count !== 1 ? "s" : ""} selected
      </Text>

      <View style={styles.actions}>
        {canGroup && (
          <TouchableOpacity
            style={[styles.button, styles.groupButton]}
            onPress={onGroup}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Group</Text>
          </TouchableOpacity>
        )}

        {canUngroup && (
          <TouchableOpacity
            style={[styles.button, styles.ungroupButton]}
            onPress={onUngroup}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Ungroup</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={onClear}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(30, 30, 30, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  countText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  groupButton: {
    backgroundColor: "#2196F3",
  },
  ungroupButton: {
    backgroundColor: "#9C27B0",
  },
  clearButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  buttonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
