import React, { useCallback } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  ViewStyle,
} from "react-native";
import { SharedValue, withTiming } from "react-native-reanimated";

export interface ZoomControlsProps {
  /** Camera scale shared value */
  scale: SharedValue<number>;
  /** Camera translateX shared value */
  translateX: SharedValue<number>;
  /** Camera translateY shared value */
  translateY: SharedValue<number>;
  /** Zoom step multiplier (default: 1.3) */
  step?: number;
  /** Minimum zoom level (default: 0.1) */
  minScale?: number;
  /** Maximum zoom level (default: 5) */
  maxScale?: number;
  /** Whether to animate zoom transitions (default: true) */
  animated?: boolean;
  /** Animation duration in ms (default: 200) */
  animationDuration?: number;
  /**
   * Position of the controls on screen.
   * Default: "bottom-left"
   */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Override container style */
  style?: ViewStyle;
  /** Override button style */
  buttonStyle?: ViewStyle;
  /** Button background color (default: "rgba(0,0,0,0.6)") */
  buttonColor?: string;
  /** Button text color (default: "#fff") */
  textColor?: string;
  /** Button size in px (default: 40) */
  buttonSize?: number;
}

/**
 * Optional zoom control buttons for the board canvas.
 *
 * Renders +, −, and reset buttons that programmatically adjust
 * the camera scale and translation shared values.
 * Useful on web where pinch-to-zoom isn't available, but can
 * also be shown on mobile as an accessibility aid.
 */
export const ZoomControls = ({
  scale,
  translateX,
  translateY,
  step = 1.3,
  minScale = 0.1,
  maxScale = 5,
  animated = true,
  animationDuration = 200,
  position = "bottom-left",
  style,
  buttonStyle,
  buttonColor = "rgba(0,0,0,0.6)",
  textColor = "#fff",
  buttonSize = 40,
}: ZoomControlsProps) => {
  const animateValue = useCallback(
    (sv: SharedValue<number>, to: number) => {
      if (animated) {
        sv.value = withTiming(to, { duration: animationDuration });
      } else {
        sv.value = to;
      }
    },
    [animated, animationDuration],
  );

  const handleZoomIn = useCallback(() => {
    const next = Math.min(scale.value * step, maxScale);
    animateValue(scale, next);
  }, [scale, step, maxScale, animateValue]);

  const handleZoomOut = useCallback(() => {
    const next = Math.max(scale.value / step, minScale);
    animateValue(scale, next);
  }, [scale, step, minScale, animateValue]);

  const handleReset = useCallback(() => {
    animateValue(scale, 1);
    animateValue(translateX, 0);
    animateValue(translateY, 0);
  }, [scale, translateX, translateY, animateValue]);

  const positionStyle = getPositionStyle(position);
  const btnBase: ViewStyle = {
    width: buttonSize,
    height: buttonSize,
    borderRadius: buttonSize / 2,
    backgroundColor: buttonColor,
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <View
      style={[styles.container, positionStyle, style]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        onPress={handleZoomIn}
        style={[btnBase, buttonStyle]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Zoom in"
      >
        <Text
          style={[styles.label, { color: textColor, fontSize: buttonSize * 0.5 }]}
        >
          +
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleZoomOut}
        style={[btnBase, styles.middleButton, buttonStyle]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Zoom out"
      >
        <Text
          style={[styles.label, { color: textColor, fontSize: buttonSize * 0.5 }]}
        >
          −
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleReset}
        style={[btnBase, buttonStyle]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Reset zoom"
      >
        <Text
          style={[styles.label, { color: textColor, fontSize: buttonSize * 0.4 }]}
        >
          ⟲
        </Text>
      </TouchableOpacity>
    </View>
  );
};

function getPositionStyle(
  position: ZoomControlsProps["position"],
): ViewStyle {
  switch (position) {
    case "top-left":
      return { top: 16, left: 16 };
    case "top-right":
      return { top: 16, right: 16 };
    case "bottom-right":
      return { bottom: 16, right: 16 };
    case "bottom-left":
    default:
      return { bottom: 16, left: 16 };
  }
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  middleButton: {
    marginVertical: 0, // gap handles spacing
  },
  label: {
    fontWeight: "700",
    textAlign: "center",
  },
});
