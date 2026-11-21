import { getEventPosition } from "@/composables/useHoldToOpenMenu";
import { handleMediaItemClick } from "@/helpers/media_item_actions";
import type { Track } from "@/plugins/api/interfaces";
import type { RouteLocationRaw, Router } from "vue-router";

/**
 * Open a list row's page when the click lands on the row itself, leaving
 * clicks on its own links and buttons to them.
 */
export function navigateOnRowClick(
  evt: MouseEvent,
  router: Router,
  to: RouteLocationRaw,
) {
  if (isRowControlClick(evt)) return;
  router.push(to);
}

/**
 * Open or play a track the way a click on any track row does, when the click
 * lands on its row itself, leaving clicks on the row's own links and buttons
 * to them.
 */
export function openTrackOnRowClick(evt: MouseEvent, track: Track) {
  if (isRowControlClick(evt)) return;
  const { x, y } = getEventPosition(evt);
  handleMediaItemClick(track, x, y);
}

/**
 * Whether a click inside a list row landed on one of the row's own links or
 * buttons, which handle it themselves.
 */
function isRowControlClick(evt: MouseEvent): boolean {
  return !!(evt.target as HTMLElement).closest("a, button");
}
