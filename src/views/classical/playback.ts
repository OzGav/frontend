import { getEventPosition } from "@/composables/useHoldToOpenMenu";
import { showPlayMenuForMediaItem } from "@/layouts/default/ItemContextMenu.vue";
import { handlePlayBtnClick } from "@/helpers/media_item_actions";
import api from "@/plugins/api";
import { PlaybackState, type Track, type Work } from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import { toast } from "vue-sonner";

/**
 * Play tracks in order the way the standard play buttons do, straight away on
 * an available player, otherwise through the player menu opened at the click.
 */
export function playTracks(tracks: Track[], evt?: Event): void {
  if (!tracks.length) return;
  const { x, y } = evt ? getEventPosition(evt) : { x: 0, y: 0 };
  if (tracks.length === 1) {
    handlePlayBtnClick(tracks[0], x, y);
    return;
  }
  if (store.activePlayer?.available) {
    api.playMedia(tracks.map((t) => t.uri)).catch(onPlayError);
    return;
  }
  showPlayMenuForMediaItem(tracks, undefined, x, y).catch(onPlayError);
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

function onPlayError(err: Error) {
  console.error("Play action failed:", err);
  toast.error($t("play_failed"));
}
