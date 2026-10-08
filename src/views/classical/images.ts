import { getImageThumbForItem, getMediaItemImageUrl } from "@/helpers/utils";
import type {
  ClassicalComposer,
  ClassicalPerformer,
} from "@/plugins/api/interfaces";

/**
 * The wide card image for a composer or performer row, falling back to the
 * artist's thumb.
 */
export function cardImage(
  row: ClassicalComposer | ClassicalPerformer,
): string | undefined {
  if (row.fanart) return getMediaItemImageUrl(row.fanart);
  return getImageThumbForItem(row.artist);
}
