import {
  clearFavorite,
  favoriteState,
  setFavoriteState,
} from "@/helpers/favorites";
import api from "@/plugins/api";
import type { Track } from "@/plugins/api/interfaces";

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
