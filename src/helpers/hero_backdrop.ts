import { getImageThumbForItem } from "@/helpers/utils";
import { ImageType, type MediaItemType } from "@/plugins/api/interfaces";

/**
 * The artwork behind a hero: wide art (fanart, then landscape) suits it best,
 * a square thumb is the last resort. No size is passed, so the server serves
 * the original image.
 */
export function heroBackdrop(item?: MediaItemType): string | undefined {
  if (!item) return undefined;
  return (
    getImageThumbForItem(item, ImageType.FANART) ||
    getImageThumbForItem(item, ImageType.LANDSCAPE) ||
    getImageThumbForItem(item, ImageType.THUMB)
  );
}
