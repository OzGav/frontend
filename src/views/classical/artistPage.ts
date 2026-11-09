import { useDetailItemUpdates } from "@/composables/useDetailItemUpdates";
import type { Artist, ClassicalWorkEntry } from "@/plugins/api/interfaces";
import {
  getArtistWorks,
  getClassicalArtist,
  type ClassicalArtistRole,
} from "@/services/classical";
import { useBackScroll } from "@/views/classical/backScroll";
import { ref, watch } from "vue";

/**
 * The content of a composer's or performer's page: the artist and their works,
 * loaded afresh for each artist the page opens. An unknown artist leaves the
 * page loading, on its placeholder, as the artist page does.
 *
 * :param id: The id of the artist the page shows.
 * :param role: Whether the page shows the artist as composer or performer.
 * Returns `artist`, `works` and `loading`.
 */
export function useClassicalArtistPage(
  id: () => string,
  role: ClassicalArtistRole,
) {
  const artist = ref<Artist>();
  const works = ref<ClassicalWorkEntry[]>([]);
  const loading = ref(true);

  useDetailItemUpdates(artist);
  useBackScroll(() => loading.value);

  const load = async (artistId: string) => {
    // the previous artist must not stay actionable under the new route
    artist.value = undefined;
    works.value = [];
    loading.value = true;
    const loaded = await Promise.all([
      getClassicalArtist(artistId),
      getArtistWorks(role, artistId),
    ]).catch(() => undefined);
    // the artist is unknown, or a newer load has taken over the page
    if (!loaded || artistId !== id()) return;
    [artist.value, works.value] = loaded;
    loading.value = false;
  };

  watch(id, load, { immediate: true });

  return { artist, works, loading };
}
