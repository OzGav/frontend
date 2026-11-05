// The classical track menu entries (Go to composer / work / performer
// submenu), shared by the Classical pages' menus and the normal track menu.

import type { ContextMenuItem } from "@/helpers/context_menu_item";
import api from "@/plugins/api";
import type { ArtistRole, Credit, Track } from "@/plugins/api/interfaces";
import { Feather, Music3, Users } from "@lucide/vue";
import { creditedComposer, PERFORMER_ROLES } from "@/views/classical/credits";
import { roleLabel } from "@/views/classical/labels";
import type { Router } from "vue-router";

// ranks a role outside PERFORMER_ROLES after all of them
const UNRANKED_ROLE_PRIORITY = PERFORMER_ROLES.length;

interface MenuTarget {
  item_id: string;
  name: string;
}

interface ClassicalMenuTargets {
  credits: Credit[];
  composer?: MenuTarget;
  work?: MenuTarget | null;
}

/**
 * The classical entries for one library track, empty when the track is not
 * classical.
 */
export async function classicalTrackEntries(
  track: Track,
  router: Router,
): Promise<ContextMenuItem[]> {
  if (track.is_classical === false) return [];
  // lists send no credits, only the full track does
  const fullTrack = track.credits?.length
    ? track
    : await api
        .getTrack(track.item_id, "library", undefined, {
          suppressGlobalError: true,
        })
        .catch(() => undefined);
  if (!fullTrack?.is_classical) return [];
  const credits = fullTrack.credits ?? [];
  return classicalMenuEntries(
    {
      credits,
      composer: creditedComposer(credits),
      work: fullTrack.work,
    },
    router,
  );
}

/**
 * Go to composer, Go to work and the Go to performer submenu, each left out
 * when there is nothing to go to.
 */
export function classicalMenuEntries(
  { credits, composer, work }: ClassicalMenuTargets,
  router: Router,
): ContextMenuItem[] {
  return [
    gotoComposer(composer, router),
    work ? gotoWork(work, router) : null,
    performerSubMenu(credits, router),
  ].filter((x): x is ContextMenuItem => x !== null);
}

function gotoComposer(
  composer: MenuTarget | undefined,
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

function gotoWork(work: MenuTarget, router: Router): ContextMenuItem {
  return {
    label: "classical_goto_work",
    labelArgs: [work.name],
    icon: Music3,
    action: () => router.push(`/classical/works/${work.item_id}`),
  };
}

// most important role first
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
    label: qualifier ? "classical_performer_with_qualifier" : name,
    labelArgs: qualifier ? [name, qualifier] : undefined,
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
    const parts = entries.map((e) => e.instrument_label || roleLabel(e.role));
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
  return idx === -1 ? UNRANKED_ROLE_PRIORITY : idx;
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
