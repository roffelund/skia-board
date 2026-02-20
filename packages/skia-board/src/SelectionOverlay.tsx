import React from "react";
import { StyleSheet, TouchableOpacity, View, Text } from "react-native";
import { RegistryItem } from "./types";

export interface SelectionOverlayAction {
  /** Unique key for the action */
  key: string;
  /** Display label */
  label: string;
  /** Background color for the button */
  color?: string;
  /** Text / icon color */
  textColor?: string;
  /** Handler */
  onPress: () => void;
}

export interface SelectionOverlayProps {
  selectedItem: RegistryItem | null;
  /** Camera transform to position overlay correctly */
  cameraX: number;
  cameraY: number;
  cameraScale: number;
  /** Array of action buttons to render */
  actions: SelectionOverlayAction[];
}

/**
 * Native View overlay positioned on top of the Skia canvas.
 * Shows action buttons for the selected item.
 * Positioned using the item's shared values + camera transform.
 *
 * This is a generic version that takes an array of actions rather
 * than hardcoded buttons.
 */
export const SelectionOverlay = ({
  selectedItem,
  cameraX,
  cameraY,
  cameraScale,
  actions,
}: SelectionOverlayProps) => {
  if (!selectedItem || actions.length === 0) return null;

  const screenX = selectedItem.x.value * cameraScale + cameraX;
  const screenY = selectedItem.y.value * cameraScale + cameraY;
  const screenWidth = selectedItem.width.value * cameraScale;

  const controlsTop = screenY - 52;
  const controlsRight = screenX + screenWidth;
  const controlsWidth = actions.length * 44;

  return (
    <View
      style={[
        styles.controls,
        {
          top: controlsTop,
          left: controlsRight - controlsWidth,
        },
      ]}
      pointerEvents="box-none"
    >
      {actions.map((action) => (
        <TouchableOpacity
          key={action.key}
          style={[
            styles.controlButton,
            action.color ? { backgroundColor: action.color } : undefined,
          ]}
          onPress={action.onPress}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.buttonText,
              action.textColor ? { color: action.textColor } : undefined,
            ]}
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  controls: {
    position: "absolute",
    flexDirection: "row",
    gap: 4,
    zIndex: 1000,
  },
  controlButton: {
    backgroundColor: "rgba(33, 150, 243, 0.9)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
