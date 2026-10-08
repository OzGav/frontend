import { getImageThumbForItem } from "@/helpers/utils";
import { ImageType, type Artist } from "@/plugins/api/interfaces";

/**
 * The wide card image for a composer or performer, falling back to a thumb.
 */
export function cardImage(artist: Artist): string | undefined {
  return (
    getImageThumbForItem(artist, ImageType.FANART) ||
    getImageThumbForItem(artist, ImageType.THUMB)
  );
}
