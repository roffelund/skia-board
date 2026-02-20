# @roffelund/skia-board

A generic, high-performance interactive canvas for React Native built with [Skia](https://shopify.github.io/react-native-skia/) and [Reanimated](https://docs.swmansion.com/react-native-reanimated/).

## Features

- **Multiple item types** — images, URLs, text notes, and color swatches out of the box
- **Pan & Zoom** — infinite canvas with pinch-to-zoom
- **Drag items** — move items individually, in groups, or via multiselect
- **Tap to select** — single item selection with customizable action overlay
- **Long-press to multiselect** — select multiple items, then group/ungroup
- **Grouping** — items move together when grouped; group/ungroup via toolbar
- **Custom rendering** — provide your own `renderItem` for full control
- **Fully generic** — no hardcoded API calls, auth, or UI libraries. You provide callbacks.

## Installation

```bash
npm install @roffelund/skia-board
```

### Peer Dependencies

```
@shopify/react-native-skia >= 2.0.0
react >= 18.0.0
react-native >= 0.72.0
react-native-gesture-handler >= 2.14.0
react-native-reanimated >= 3.0.0
react-native-worklets >= 0.5.0
```

## Quick Start

```tsx
import { BoardCanvas, BoardItemData } from "@roffelund/skia-board";

const items: BoardItemData[] = [
  // Image — loaded asynchronously via loadImage
  { id: "1", type: "image", x: 50, y: 50, width: 200, height: 200, zIndex: 0 },

  // URL card — rendered as a styled link card
  {
    id: "2",
    type: "url",
    url: "https://example.com",
    title: "Example",
    x: 300,
    y: 50,
    width: 220,
    height: 100,
    zIndex: 1,
  },

  // Text note
  {
    id: "3",
    type: "text",
    text: "Hello world!",
    fontSize: 18,
    x: 50,
    y: 300,
    width: 200,
    height: 80,
    zIndex: 2,
  },

  // Color swatch
  {
    id: "4",
    type: "color",
    color: "#FF6B6B",
    x: 300,
    y: 300,
    width: 100,
    height: 100,
    zIndex: 3,
  },
];

// Only required for image-type items
async function loadImage(id: string): Promise<ArrayBuffer> {
  const response = await fetch(`https://my-api.com/images/${id}/file`);
  return response.arrayBuffer();
}

export default function MyBoard() {
  return (
    <BoardCanvas
      items={items}
      loadImage={loadImage}
      onTransformEnd={(id, snapshot) => api.updatePosition(id, snapshot)}
      actions={{
        onDelete: (id) => api.deleteItem(id),
        onGroup: (ids) => api.createGroup(ids),
        onUngroup: (groupIds) => groupIds.forEach(api.deleteGroup),
      }}
    />
  );
}
```

## Item Types

### `ImageBoardItem`

Loaded asynchronously via the `loadImage` prop. Renders the decoded image on the canvas.

```ts
{ id: "1", type: "image", x: 0, y: 0, width: 200, height: 200 }
```

### `UrlBoardItem`

Rendered as a card with an accent bar, title, optional description, and URL.

```ts
{ id: "2", type: "url", url: "https://example.com", title: "My Link", description: "A description" }
```

### `TextBoardItem`

A text note with customizable font size, color, and background.

```ts
{ id: "3", type: "text", text: "Hello!", fontSize: 18, fontColor: "#333", backgroundColor: "#FFFDE7" }
```

### `ColorBoardItem`

A solid color swatch.

```ts
{ id: "4", type: "color", color: "#FF6B6B", label: "Coral" }
```

## API

### `<BoardCanvas />`

| Prop                       | Type                                       | Description                                     |
| -------------------------- | ------------------------------------------ | ----------------------------------------------- |
| `items`                    | `BoardItemData[]`                          | Array of typed items to display                 |
| `loadImage`                | `(id: string) => Promise<ArrayBuffer>`     | Loads image bytes (only needed for image items) |
| `onTransformEnd`           | `(id, snapshot) => void`                   | Called when a drag ends to persist position     |
| `actions`                  | `BoardActions`                             | Callbacks for delete, duplicate, group, etc.    |
| `selectionActions`         | `(id: string) => SelectionOverlayAction[]` | Build overlay action buttons per item           |
| `renderItem`               | `(item, state) => ReactNode`               | Custom Skia renderer (replaces built-in)        |
| `renderMultiSelectToolbar` | `(props) => ReactNode`                     | Custom multiselect toolbar                      |
| `grid`                     | `SkiaGridProps \| false`                   | Grid configuration or `false` to hide           |
| `colors`                   | `object`                                   | Selection/group border colors                   |
| `children`                 | `ReactNode`                                | Extra UI (FABs, snackbars, etc.)                |

### Custom Rendering

Use `renderItem` for full control over how items are drawn. This must return Skia elements:

```tsx
import { SkiaImageItem, SkiaColorItem } from "@roffelund/skia-board";

<BoardCanvas
  items={items}
  renderItem={(item, state) => {
    switch (item.data.type) {
      case "image":
        return <SkiaImageItem item={item} {...state} />;
      case "color":
        return <SkiaColorItem item={item} {...state} />;
      default:
        return <MyCustomRenderer item={item} />;
    }
  }}
/>;
```

### Hooks (advanced)

All internal hooks are exported for custom composition:

- `useItemRegistry(items)` — manages the Skia shared-value registry
- `useCanvasGestureController(params)` — pan/zoom/drag/tap/long-press gestures
- `useMultiSelect()` — multiselect state management
- `useSkiaImageLoader(id, loader, onLoaded)` — image loading (image items only)

## Gestures

| Gesture                 | Action                      |
| ----------------------- | --------------------------- |
| Pan on empty space      | Pan canvas                  |
| Pan on item             | Drag item (+ group members) |
| Tap on item             | Select item                 |
| Tap on empty space      | Deselect                    |
| Long-press on item      | Enter multiselect mode      |
| Tap items (multiselect) | Toggle selection            |
| Pinch                   | Zoom canvas                 |
