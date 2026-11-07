import { getImageThumbForItem, getMediaItemImageUrl } from "@/helpers/utils";
import type {
  ClassicalComposer,
  ClassicalPerformer,
} from "@/plugins/api/interfaces";

// Widths the cards request, so the server sends resized images.
export const WIDE_IMAGE_SIZE = 500;
export const SQUARE_IMAGE_SIZE = 300;
export const LIST_IMAGE_SIZE = 80;

/**
 * The wide card image for a composer or performer row, falling back to the
 * artist's thumb, resized to the given width.
 */
export function cardImage(
  row: ClassicalComposer | ClassicalPerformer,
  size: number,
): string | undefined {
  if (row.fanart) return getMediaItemImageUrl(row.fanart, size);
  return getImageThumbForItem(row.artist, undefined, size);
}

/**
 * The square image for a composer or performer row, falling back to the
 * fanart, resized to the given width.
 */
export function squareImage(
  row: ClassicalComposer | ClassicalPerformer,
  size: number,
): string | undefined {
  return (
    getImageThumbForItem(row.artist, undefined, size) || cardImage(row, size)
  );
}
