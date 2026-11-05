import {
  favoriteState,
  setFavoriteState,
  subscribeOwnFavorites,
} from "@/helpers/favorites";
import api from "@/plugins/api";
import { $t } from "@/plugins/i18n";
import type { Track } from "@/plugins/api/interfaces";
import { onBeforeUnmount } from "vue";
import { toast } from "vue-sonner";

/** Whether every track is liked; an empty list never is. */
export function allLiked(tracks: Track[]): boolean {
  return tracks.length > 0 && tracks.every((t) => t.favorite === true);
}

/**
 * Like every track, or clear the state on every track. The new state shows
 * on the given tracks straight away; when saving stops at a track, it and the
 * tracks after it get their previous state back.
 */
export async function setTracksLiked(
  tracks: Track[],
  liked: boolean,
): Promise<void> {
  const previous = tracks.map(favoriteState);
  for (const track of tracks) setFavoriteState(track, liked ? true : null);
  let saved = 0;
  try {
    saved = await api.setFavorites(
      tracks.map((t) => t.uri),
      liked ? true : null,
    );
    if (saved < tracks.length) toast.error($t("favorites_save_failed"));
  } catch {
    // the api layer already reports the error
  }
  tracks
    .slice(saved)
    .forEach((t, i) => setFavoriteState(t, previous[saved + i]));
}

/**
 * Keep the like state of the given items in step with the signed-in user's
 * own changes, wherever they make them, while the calling component lives.
 */
export function useOwnFavorites(
  items: () => Array<{ uri: string; favorite?: boolean | null }>,
): void {
  const unsubscribe = subscribeOwnFavorites((update) => {
    for (const item of items())
      if (item.uri === update.uri) item.favorite = update.favorite;
  });
  onBeforeUnmount(unsubscribe);
}
