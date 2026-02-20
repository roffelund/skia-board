import React, { useState, useCallback } from "react";
import { SafeAreaView, StyleSheet, Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BoardCanvas, BoardItemData, TransformSnapshot } from "skia-board";

// ─── Sample data ─────────────────────────────────────────────────────────────

const INITIAL_ITEMS: BoardItemData[] = [
  {
    id: "url-1",
    type: "url",
    url: "https://reactnative.dev",
    title: "React Native",
    description: "Learn once, write anywhere.",
    x: 40,
    y: 60,
    width: 240,
    height: 110,
    zIndex: 1,
  },
  {
    id: "text-1",
    type: "text",
    text: "Hello from skia-board!",
    fontSize: 20,
    fontColor: "#1a1a2e",
    backgroundColor: "#FFFDE7",
    x: 40,
    y: 200,
    width: 240,
    height: 80,
    zIndex: 2,
  },
  {
    id: "color-1",
    type: "color",
    color: "#6C63FF",
    label: "Indigo",
    x: 40,
    y: 320,
    width: 100,
    height: 100,
    zIndex: 3,
  },
  {
    id: "color-2",
    type: "color",
    color: "#FF6584",
    label: "Pink",
    x: 170,
    y: 320,
    width: 100,
    height: 100,
    zIndex: 4,
  },
  {
    id: "text-2",
    type: "text",
    text: "Drag, pinch-zoom, long-press to multiselect ✌️",
    fontSize: 14,
    x: 40,
    y: 460,
    width: 260,
    height: 60,
    zIndex: 5,
  },
];

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [items, setItems] = useState<BoardItemData[]>(INITIAL_ITEMS);

  const handleTransformEnd = useCallback(
    (id: string, snapshot: TransformSnapshot) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                x: snapshot.x,
                y: snapshot.y,
                width: snapshot.width,
                height: snapshot.height,
              }
            : item,
        ),
      );
    },
    [],
  );

  const handleDelete = useCallback((id: string) => {
    Alert.alert("Delete", `Delete item ${id}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => setItems((prev) => prev.filter((i) => i.id !== id)),
      },
    ]);
  }, []);

  const handleGroup = useCallback((ids: string[]) => {
    const groupId = `group-${Date.now()}`;
    setItems((prev) =>
      prev.map((item) => (ids.includes(item.id) ? { ...item, groupId } : item)),
    );
  }, []);

  const handleUngroup = useCallback((groupIds: string[]) => {
    setItems((prev) =>
      prev.map((item) =>
        item.groupId && groupIds.includes(item.groupId)
          ? { ...item, groupId: null }
          : item,
      ),
    );
  }, []);

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <BoardCanvas
          items={items}
          onTransformEnd={handleTransformEnd}
          actions={{
            onDelete: handleDelete,
            onGroup: handleGroup,
            onUngroup: handleUngroup,
          }}
          grid={{ gridSize: 40, color: "#e0e0e0" }}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#ffffff" },
});
