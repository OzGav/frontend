import { normalizeForFilter } from "@/helpers/utils";
import type {
  ClassicalComposer,
  ClassicalPerformer,
} from "@/plugins/api/interfaces";
import type { ClassicalArtistGridItem } from "@/views/classical/components/ClassicalArtistGrid.vue";
import {
  cardImage,
  LIST_IMAGE_SIZE,
  SQUARE_IMAGE_SIZE,
  squareImage,
  WIDE_IMAGE_SIZE,
} from "@/views/classical/images";
import { computed, type Ref } from "vue";

interface ArtistGridOptions<T> {
  rows: () => T[];
  // the classical section the items link into
  section: "composers" | "performers";
  search: Ref<string>;
  favoritesOnly: Ref<boolean>;
  // the text under the name
  details: (row: T) => Pick<ClassicalArtistGridItem, "role" | "lines">;
  // the tab's own filters
  matches: (row: T) => boolean;
}

/**
 * The grid items of a composers or performers tab, narrowed to the favourites
 * while that filter is on, to the rows the tab's own filters keep and to the
 * names matching the search.
 */
export function useArtistGridItems<
  T extends ClassicalComposer | ClassicalPerformer,
>(options: ArtistGridOptions<T>) {
  // Built once per load, so filtering and redrawing reuse the folded name and
  // image urls.
  const rows = computed(() =>
    options.rows().map((row) => ({
      row,
      haystack: normalizeForFilter(row.artist.name),
      item: {
        id: row.artist.item_id,
        artist: row.artist,
        name: row.artist.name,
        link: `/classical/${options.section}/${row.artist.item_id}`,
        wideImage: cardImage(row, WIDE_IMAGE_SIZE),
        squareImage: squareImage(row, SQUARE_IMAGE_SIZE),
        listImage: squareImage(row, LIST_IMAGE_SIZE),
        ...options.details(row),
      } satisfies ClassicalArtistGridItem,
    })),
  );

  return computed<ClassicalArtistGridItem[]>(() => {
    const q = normalizeForFilter(options.search.value.trim());
    return rows.value
      .filter(
        (r) =>
          (!options.favoritesOnly.value || r.row.artist.favorite === true) &&
          options.matches(r.row) &&
          (!q || r.haystack.includes(q)),
      )
      .map((r) => r.item);
  });
}
