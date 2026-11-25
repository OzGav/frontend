import {
  createRowRegistry,
  type RowDefinition,
  type RowRegistry,
} from "@/components/details/rowRegistry";
import type { Artist } from "@/plugins/api/interfaces";
import { useClassicalRows } from "@/views/classical/detailRows";
import type { Ref } from "vue";

export type ClassicalArtistRowId = "description" | "works" | "other_tracks";

export const COMPOSER_ROWS_PREFERENCE_KEY = "classical_composer.rows";
export const PERFORMER_ROWS_PREFERENCE_KEY = "classical_performer.rows";

/** Rows a composer or performer page can show for this artist. */
export function availableClassicalArtistRowIds(
  artist: Artist,
): ClassicalArtistRowId[] {
  return [
    ...(artist.metadata.description ? (["description"] as const) : []),
    "works",
    "other_tracks",
  ];
}

/** The composer page's rows and the user's customization of them. */
export const composerRows = createRowRegistry<ClassicalArtistRowId, Artist>({
  rows: classicalArtistRows("works"),
  preferenceKey: COMPOSER_ROWS_PREFERENCE_KEY,
});

/** The performer page's rows and the user's customization of them. */
export const performerRows = createRowRegistry<ClassicalArtistRowId, Artist>({
  rows: classicalArtistRows("works_performed"),
  preferenceKey: PERFORMER_ROWS_PREFERENCE_KEY,
});

/**
 * The rows of a composer or performer page to show, in the user's order, with
 * the open state of its rows editor.
 */
export function useClassicalArtistRows(
  artist: Ref<Artist | undefined>,
  registry: RowRegistry<ClassicalArtistRowId, Artist>,
) {
  // the works and other tracks show while the artist loads
  return useClassicalRows(artist, registry, availableClassicalArtistRowIds, [
    "works",
    "other_tracks",
  ]);
}

function classicalArtistRows(
  worksLabelKey: string,
): readonly RowDefinition<ClassicalArtistRowId>[] {
  return [
    { id: "description", labelKey: "biography" },
    { id: "works", labelKey: worksLabelKey },
    { id: "other_tracks", labelKey: "classical_other_tracks" },
  ];
}
