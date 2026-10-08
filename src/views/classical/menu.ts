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
import { Feather, Info, Music3, Users } from "@lucide/vue";
import { PERFORMER_ROLES } from "@/views/classical/credits";
import { roleLabel } from "@/views/classical/labels";
import type { Router } from "vue-router";

export interface ClassicalMenuContext {
  router: Router;
  work: Work;
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
// spliced near "Go to album". "Go to work" is omitted entirely, as there is
// no work to navigate to, so the spec opts for absence over a greyed entry.
export async function openOtherTrackMenu(
  track: Track,
  router: Router,
  evt: Event | MouseEvent,
) {
  const credits = track.credits ?? [];
  const composer = credits.find((c) => c.role === ArtistRole.COMPOSER)?.artist;
  const playItems = await getPlaybackContextMenuItems([track]);
  const standardItems = await getContextMenuItems([track]);

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
 * and led by Show info, which opens the artist's normal page. With ownPage it
 * is the menu of the artist's own page, which adds the page-only entries such
 * as Update metadata and Refresh item.
 */
export async function classicalArtistMenuItems(
  artist: Artist,
  router: Router,
  ownPage = false,
): Promise<ContextMenuItem[]> {
  const items = await getContextMenuItems(
    [artist],
    ownPage ? artist : undefined,
  );
  const showInfo =
    items.find((i) => i.label === "show_info") ??
    artistShowInfoEntry(artist, router);
  return [showInfo, ...items.filter((i) => i.label !== "show_info")];
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
  const standardItems = await getContextMenuItems(tracks);

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
    gotoWork(ctx),
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

function gotoComposer(
  composer: { item_id: string; name: string } | undefined,
  router: Router,
): ContextMenuItem | null {
  if (!composer) return null;
  return {
    label: "classical_goto_composer",
    labelArgs: [composer.name],
    icon: Feather,
    action: () => router.push(`/classical/composers/${composer.item_id}`),
  };
}

function gotoWork(ctx: ClassicalMenuContext): ContextMenuItem {
  return {
    label: "classical_goto_work",
    labelArgs: [ctx.work.name],
    icon: Music3,
    action: () => ctx.router.push(`/classical/works/${ctx.work.item_id}`),
  };
}

function performerSubMenu(
  credits: Credit[],
  router: Router,
): ContextMenuItem | null {
  const grouped = aggregateCredits(credits);
  if (grouped.length === 0) return null;
  return {
    label: "classical_goto_performer",
    labelArgs: [],
    icon: Users,
    subItems: grouped.map((g) =>
      performerSubmenuEntry(g.artistId, g.name, g.qualifier, router),
    ),
  };
}

// Submenu entry, a name plus a role or instrument qualifier in parens. Shown
// under the parent "Go to performer" item, so the verb is already implied.
function performerSubmenuEntry(
  artistId: string,
  name: string,
  qualifier: string,
  router: Router,
): ContextMenuItem {
  return {
    label: qualifier
      ? "classical_performer_with_qualifier"
      : "classical_role_label_performer",
    labelArgs: qualifier ? [name, qualifier] : [name],
    icon: Users,
    action: () => router.push(`/classical/performers/${artistId}`),
  };
}

interface AggregatedCredit {
  artistId: string;
  name: string;
  // role(s) + instrument(s) collected from all credits referencing this artist
  qualifier: string;
  // priority of the artist's highest-ranked role
  priority: number;
}

// Aggregate credits by Artist. A single artist with multiple credits on the
// same recording (e.g. conductor + harpsichord) collapses to one entry with
// role/instrument qualifiers combined in parens. Sorted by role priority.
function aggregateCredits(credits: Credit[]): AggregatedCredit[] {
  const map = new Map<string, Credit[]>();
  for (const credit of credits) {
    if (!PERFORMER_ROLES.includes(credit.role)) continue;
    const id = credit.artist.item_id;
    const existing = map.get(id);
    if (existing) existing.push(credit);
    else map.set(id, [credit]);
  }

  const aggregates: AggregatedCredit[] = [];
  for (const [artistId, entries] of map) {
    entries.sort((a, b) => rolePriority(a.role) - rolePriority(b.role));
    const parts = entries.map((e) =>
      e.instrument ? e.instrument : roleLabel(e.role),
    );
    aggregates.push({
      artistId,
      name: entries[0].artist.name,
      qualifier: dedupe(parts).join(", "),
      priority: rolePriority(entries[0].role),
    });
  }
  aggregates.sort((a, b) => a.priority - b.priority);
  return aggregates;
}

function rolePriority(role: ArtistRole): number {
  const idx = PERFORMER_ROLES.indexOf(role);
  return idx === -1 ? 99 : idx;
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/** Show info for a composer or performer, opening the artist's normal page. */
function artistShowInfoEntry(artist: Artist, router: Router): ContextMenuItem {
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
