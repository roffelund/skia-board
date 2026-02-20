import { Skia, SkImage } from "@shopify/react-native-skia";
import { useEffect, useRef } from "react";
import { ImageLoader } from "./types";

/**
 * Loads an image using a consumer-provided loader function and
 * decodes it into a Skia SkImage. Calls onLoaded when ready,
 * which registers the image in the item registry and triggers a re-render.
 *
 * The loader is fully generic — the consumer is responsible for auth,
 * URL building, caching, etc.
 */
export const useSkiaImageLoader = (
  itemId: string | undefined,
  loadImage: ImageLoader,
  onLoaded?: (id: string, image: SkImage | null) => void,
) => {
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const loadImageRef = useRef(loadImage);
  loadImageRef.current = loadImage;

  useEffect(() => {
    if (!itemId) return;

    let cancelled = false;

    const load = async () => {
      try {
        const arrayBuffer = await loadImageRef.current(itemId);

        if (cancelled) return;

        const skiaImage = Skia.Image.MakeImageFromEncoded(
          Skia.Data.fromBytes(new Uint8Array(arrayBuffer)),
        );

        if (cancelled) return;

        onLoadedRef.current?.(itemId, skiaImage);
      } catch (err) {
        console.error(`[skia-board] Failed to load image ${itemId}:`, err);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [itemId]);
};
