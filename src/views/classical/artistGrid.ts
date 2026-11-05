import type {
  Artist,
  ClassicalComposer,
  ClassicalPerformer,
} from "@/plugins/api/interfaces";
import {
  cardImage,
  LIST_IMAGE_SIZE,
  SQUARE_IMAGE_SIZE,
  squareImage,
  WIDE_IMAGE_SIZE,
} from "@/views/classical/images";
import { computed } from "vue";

/** A composer or performer as the grid shows it. */
export interface ClassicalArtistGridItem {
  id: string;
  // the artist the item's menu acts on
  artist: Artist;
  name: string;
  link: string;
  wideImage?: string;
  squareImage?: string;
  listImage?: string;
  // a performer's role, the first line below the name
  role?: string;
  // text below the name, one line each in the picture views
  lines: string[];
}

interface ArtistGridOptions<T> {
  rows: () => T[];
  // the classical section the items link into
  section: "composers" | "performers";
  // the text under the name
  details: (row: T) => Pick<ClassicalArtistGridItem, "role" | "lines">;
}

/** The grid items of a composers or performers tab. */
export function useArtistGridItems<
  T extends ClassicalComposer | ClassicalPerformer,
>(options: ArtistGridOptions<T>) {
  return computed<ClassicalArtistGridItem[]>(() =>
    options.rows().map((row) => ({
      id: row.artist.item_id,
      artist: row.artist,
      name: row.artist.name,
      link: `/classical/${options.section}/${row.artist.item_id}`,
      wideImage: cardImage(row, WIDE_IMAGE_SIZE),
      squareImage: squareImage(row, SQUARE_IMAGE_SIZE),
      listImage: squareImage(row, LIST_IMAGE_SIZE),
      ...options.details(row),
    })),
  );
}
