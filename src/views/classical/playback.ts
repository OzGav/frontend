import { getEventPosition } from "@/composables/useHoldToOpenMenu";
import { showPlayMenuForMediaItem } from "@/layouts/default/ItemContextMenu.vue";
import { handlePlayBtnClick } from "@/helpers/media_item_actions";
import api from "@/plugins/api";
import {
  PlaybackState,
  type Recording,
  type Track,
  type Work,
} from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import { getWork, getWorkRecordings } from "@/services/classical";
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
 * Play a work: its first recording in the server's order. A work with parts,
 * such as an opera, without a recording of its own plays the first recording
 * of each part, in the work's order.
 */
export async function playWork(workId: string, evt?: Event): Promise<void> {
  let work: Work;
  let recordings: Recording[];
  try {
    [work, recordings] = await Promise.all([
      getWork(workId),
      getWorkRecordings(workId),
    ]);
  } catch (err) {
    onPlayError(err as Error);
    return;
  }
  const own = recordings.find((r) => r.work.item_id === workId);
  const picked = own
    ? [own]
    : (work.parts ?? []).flatMap(
        (part) => recordings.find((r) => r.work.item_id === part.item_id) ?? [],
      );
  playTracks(
    picked.flatMap((r) => r.tracks),
    evt,
  );
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
