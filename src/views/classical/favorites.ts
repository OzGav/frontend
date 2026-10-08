import {
  clearFavorite,
  favoriteState,
  setFavoriteState,
  subscribeOwnFavorites,
} from "@/helpers/favorites";
import api from "@/plugins/api";
import type { Track } from "@/plugins/api/interfaces";
import { onBeforeUnmount } from "vue";

/** Whether every track is liked; an empty list never is. */
export function allLiked(tracks: Track[]): boolean {
  return tracks.length > 0 && tracks.every((t) => t.favorite === true);
}

/**
 * Like every track, or clear the state on every track. The new state shows
 * on the given tracks straight away; when a write fails, the tracks not yet
 * saved get their previous state back and the rest are not sent.
 */
export async function setTracksLiked(
  tracks: Track[],
  liked: boolean,
): Promise<void> {
  const previous = tracks.map(favoriteState);
  for (const track of tracks) setFavoriteState(track, liked ? true : null);
  for (const [i, track] of tracks.entries()) {
    try {
      if (liked) await api.setFavorite(track, true);
      else await clearFavorite(track);
    } catch {
      // the api layer already reports the error
      tracks.slice(i).forEach((t, j) => setFavoriteState(t, previous[i + j]));
      return;
    }
  }
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
