// Context-menu construction for classical row items.
//
// Movement and other-track rows are real library tracks, so they go through
// the standard menu builders (getPlaybackContextMenuItems +
// getContextMenuItems), then classical-specific entries (Go to composer /
// work / performer submenu) are spliced in adjacent to Go to album.

import {
  getContextMenuItems,
  getPlaybackContextMenuItems,
  type ContextMenuItem,
} from "@/layouts/default/ItemContextMenu.vue";
import {
  ArtistRole,
  type Artist,
  type Credit,
  type ItemMapping,
  type Recording,
  type Track,
  type Work,
} from "@/plugins/api/interfaces";
import { getEventPosition } from "@/composables/useHoldToOpenMenu";
import { eventbus } from "@/plugins/eventbus";
import { Info } from "@lucide/vue";
import {
  gotoComposer,
  gotoWork,
  performerSubMenu,
} from "@/views/classical/trackMenuEntries";
import type { Router } from "vue-router";

export interface ClassicalMenuContext {
  router: Router;
  work: Work | ItemMapping;
  composer?: ItemMapping | Artist;
}

/**
 * Menu for one movement of a recording, the standard track menu plus the
 * classical entries.
 */
export async function openMovementMenu(
  movement: Track,
  recording: Recording,
  ctx: ClassicalMenuContext,
  evt: Event | MouseEvent,
) {
  const items = await buildMenuItems({
    tracks: [movement],
    credits: recording.credits,
    ctx,
    includeRemoveFromLibrary: true,
    includeMoreInfo: true,
  });
  emit(items, evt);
}

/**
 * Menu for one or more recordings of the same work, acting on all their
 * movement tracks in order.
 */
export async function openRecordingMenu(
  recordings: Recording[],
  ctx: ClassicalMenuContext,
  evt: Event | MouseEvent,
) {
  // Pass every movement track. The standard builders' multi-item path emits
  // per-track operations under each menu action, which is how recording-level
  // favourite / add to playlist lands as one write per movement.
  const items = await buildMenuItems({
    tracks: recordings.flatMap((r) => r.tracks),
    credits: recordings.flatMap((r) => r.credits),
    ctx,
    // The recording menu omits Remove from library and Show info.
    includeRemoveFromLibrary: false,
    includeMoreInfo: false,
  });
  emit(items, evt);
}

// Workless tracks reuse the standard track menu, plus the classical entries
// spliced near "Go to album". With no work to go to, "Go to work" is left out
// rather than shown greyed out.
export async function openOtherTrackMenu(
  track: Track,
  router: Router,
  evt: Event | MouseEvent,
) {
  const credits = track.credits ?? [];
  const composer = credits.find((c) => c.role === ArtistRole.COMPOSER)?.artist;
  const playItems = await getPlaybackContextMenuItems([track]);
  const standardItems = await getContextMenuItems([track], undefined, {
    withoutClassicalEntries: true,
  });

  const filtered = standardItems.filter((item) => item.label !== "goto_artist");

  const classicalEntries: ContextMenuItem[] = [
    gotoComposer(composer, router),
    performerSubMenu(credits, router),
  ].filter((x): x is ContextMenuItem => x !== null);
  spliceAfterAlbum(filtered, classicalEntries);

  emit([...playItems, ...filtered], evt);
}

/**
 * The standard artist menu for a composer or performer, without play entries
 * and led by Show info, which opens the artist's normal page.
 */
async function classicalArtistMenuItems(
  artist: Artist,
  router: Router,
): Promise<ContextMenuItem[]> {
  const items = await getContextMenuItems([artist]);
  const showInfo =
    items.find((i) => i.label === "show_info") ??
    artistShowInfoEntry(artist, router);
  return [showInfo, ...items.filter((i) => i.label !== "show_info")];
}

/** Show info for a composer or performer, opening the artist's normal page. */
export function artistShowInfoEntry(
  artist: Artist,
  router: Router,
): ContextMenuItem {
  return {
    label: "show_info",
    labelArgs: [],
    icon: Info,
    action: () =>
      router.push({
        name: artist.media_type,
        params: { itemId: artist.item_id, provider: artist.provider },
      }),
  };
}

/** Open the composer or performer menu at the pointer. */
export async function openArtistMenu(
  artist: Artist,
  router: Router,
  evt: Event | MouseEvent,
) {
  emit(await classicalArtistMenuItems(artist, router), evt, false);
}

/** Open a plain menu of the given entries at the pointer, e.g. a section's sort. */
export function openMenu(items: ContextMenuItem[], evt: Event | MouseEvent) {
  emit(items, evt, false);
}

interface BuildArgs {
  tracks: Track[];
  credits: Credit[];
  ctx: ClassicalMenuContext;
  includeRemoveFromLibrary: boolean;
  includeMoreInfo: boolean;
}

async function buildMenuItems({
  tracks,
  credits,
  ctx,
  includeRemoveFromLibrary,
  includeMoreInfo,
}: BuildArgs): Promise<ContextMenuItem[]> {
  const playItems = await getPlaybackContextMenuItems(tracks);
  const standardItems = await getContextMenuItems(tracks, undefined, {
    withoutClassicalEntries: true,
  });

  // Go to artist gives way to the Go to performer submenu, and the recording
  // menu leaves out Remove from library and Show info.
  const filtered = standardItems.filter((item) => {
    if (item.label === "goto_artist") return false;
    if (!includeRemoveFromLibrary && item.label === "remove_library")
      return false;
    if (!includeMoreInfo && item.label === "show_info") return false;
    return true;
  });

  const classicalEntries: ContextMenuItem[] = [
    gotoComposer(ctx.composer, ctx.router),
    gotoWork(ctx.work, ctx.router),
    performerSubMenu(credits, ctx.router),
  ].filter((x): x is ContextMenuItem => x !== null);
  spliceAfterAlbum(filtered, classicalEntries);

  return [...playItems, ...filtered];
}

// Go to album only exists for a single track; without it (the multi-track
// recording menu) the classical entries lead the standard block.
function spliceAfterAlbum(
  items: ContextMenuItem[],
  entries: ContextMenuItem[],
) {
  const albumIdx = items.findIndex((i) => i.label === "goto_album");
  if (albumIdx >= 0) items.splice(albumIdx + 1, 0, ...entries);
  else items.unshift(...entries);
}

function emit(
  items: ContextMenuItem[],
  evt: Event | MouseEvent,
  showPlayMenuHeader = true,
) {
  if (items.length === 0) return;
  const { x, y } = getEventPosition(evt);
  eventbus.emit("contextmenu", {
    items,
    posX: x,
    posY: y,
    showPlayMenuHeader,
  });
}
