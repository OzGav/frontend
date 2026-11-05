import { getEventPosition } from "@/composables/useHoldToOpenMenu";
import {
  getDefaultEnqueueOptionFor,
  showPlayMenuForMediaItem,
} from "@/layouts/default/ItemContextMenu.vue";
import {
  handlePlayBtnClick,
  reportPlayError,
} from "@/helpers/media_item_actions";
import api from "@/plugins/api";
import {
  MediaType,
  PlaybackState,
  type QueueOption,
  type Track,
  type Work,
} from "@/plugins/api/interfaces";
import { store } from "@/plugins/store";

/**
 * Play tracks in order the way the standard play buttons do, straight away on
 * an available player, otherwise through the player menu opened at the click.
 */
export function playTracks(tracks: Track[], evt?: Event): void {
  playInOrder(tracks, evt, false);
}

/**
 * Play a recording's tracks the way the standard play buttons play an album,
 * with the queue option set for albums, straight away on an available player,
 * otherwise through the player menu opened at the click.
 */
export function playRecording(tracks: Track[], evt?: Event): void {
  playInOrder(tracks, evt, true);
}

/**
 * Play a work the way the standard play buttons play an album: its first
 * recording, or for a work with parts, such as an opera, without a recording of
 * its own, the first recording of each part.
 */
export function playWork(work: Work, evt?: Event): void {
  const { x, y } = evt ? getEventPosition(evt) : { x: 0, y: 0 };
  handlePlayBtnClick(work, x, y);
}

/** Whether the active player is playing this track, decided as the standard rows do. */
export function isTrackPlaying(track: Track): boolean {
  if (store.activePlayer?.playback_state != PlaybackState.PLAYING) return false;
  return store.curQueueItem?.media_item?.item_id === track.item_id;
}

function playInOrder(
  tracks: Track[],
  evt: Event | undefined,
  asAlbum: boolean,
) {
  if (!tracks.length) return;
  const { x, y } = evt ? getEventPosition(evt) : { x: 0, y: 0 };
  // a single track plays as the standard track rows play it
  if (!asAlbum && tracks.length === 1) {
    handlePlayBtnClick(tracks[0], x, y);
    return;
  }
  if (store.activePlayer?.available) {
    const option: Promise<QueueOption | undefined> = asAlbum
      ? getDefaultEnqueueOptionFor(MediaType.ALBUM)
      : Promise.resolve(undefined);
    option
      .then((o) =>
        api.playMedia(
          tracks.map((t) => t.uri),
          o,
        ),
      )
      .catch(reportPlayError);
    return;
  }
  showPlayMenuForMediaItem(tracks, undefined, x, y).catch(reportPlayError);
}
