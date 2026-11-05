// Service layer for the Classical view, over the server's classical commands.
// The browse lists are searched, filtered and paged by the server; the lists
// of one composer, performer or work are fetched whole.

import api from "@/plugins/api";
import type {
  Artist,
  ArtistRole,
  ClassicalComposer,
  ClassicalComposerFilters,
  ClassicalLinkProgress,
  ClassicalPerformer,
  ClassicalPerformerFilters,
  ClassicalWorkEntry,
  ClassicalWorkFilters,
  Period,
  Recording,
  SortDirection,
  SortField,
  Track,
  Work,
  WorkType,
} from "@/plugins/api/interfaces";

/** The sort a classical list is fetched in; left out, the server default. */
export interface ClassicalSort {
  sort_field?: SortField;
  sort_direction?: SortDirection;
}

/**
 * A page of a classical browse list. A filter left out or empty does not
 * narrow the list; one with several values keeps items matching any of them.
 */
export interface ClassicalListQuery extends ClassicalSort {
  // accent and case free
  search?: string;
  // true for the user's likes, false for their dislikes
  favorite?: boolean;
  // 0 fetches every item
  limit?: number;
  offset?: number;
}

/** A page of the composers list. */
export interface ClassicalComposerQuery extends ClassicalListQuery {
  period?: Period[];
  country?: string[];
  // also keeps composers without a country
  country_unknown?: boolean;
}

/** A page of the performers list. */
export interface ClassicalPerformerQuery extends ClassicalListQuery {
  role?: ArtistRole[];
}

/** A page of the works list. */
export interface ClassicalWorkQuery extends Omit<
  ClassicalListQuery,
  "favorite"
> {
  period?: Period[];
  work_type?: WorkType[];
  // also keeps works without a type
  work_type_unknown?: boolean;
  // inclusive; works without a composition year drop out once either is set
  year_from?: number;
  year_to?: number;
}

/**
 * How much of the classical library the server still has to look up on
 * MusicBrainz. Fails quietly, leaving the caller to treat it as unknown.
 */
export function getLinkProgress(): Promise<ClassicalLinkProgress> {
  return api.sendCommand(
    "music/classical/link_progress",
    {},
    { suppressGlobalError: true },
  );
}

/** Whether the library holds any classical tracks the user can see. */
export function hasClassicalContent(): Promise<boolean> {
  return api.sendCommand("music/classical/has_content");
}

/**
 * A composer's or performer's full library artist, for a detail page header.
 */
export function getClassicalArtist(id: string): Promise<Artist> {
  return api.getArtist(id, "library");
}

/**
 * The Classical composer and performer rows of a library artist, each absent
 * when the artist holds no such role. Fails quietly, leaving both absent.
 */
export async function getClassicalRoles(artistId: string): Promise<{
  composer?: ClassicalComposer;
  performer?: ClassicalPerformer;
}> {
  const args = { artist_id: artistId, limit: 1 };
  const options = { suppressGlobalError: true };
  try {
    const [composers, performers] = await Promise.all([
      api.sendCommand<ClassicalComposer[]>(
        "music/classical/composers",
        args,
        options,
      ),
      api.sendCommand<ClassicalPerformer[]>(
        "music/classical/performers",
        args,
        options,
      ),
    ]);
    return { composer: composers[0], performer: performers[0] };
  } catch {
    return {};
  }
}

/** A page of the library's composers. */
export function getComposers(
  query: ClassicalComposerQuery = {},
): Promise<ClassicalComposer[]> {
  return api.sendCommand("music/classical/composers", { ...query });
}

/** The values the composers list can be filtered on. */
export function getComposerFilters(): Promise<ClassicalComposerFilters> {
  return api.sendCommand("music/classical/composer_filters");
}

/** The works of a composer. */
export function getComposerWorks(
  composerId: string,
): Promise<ClassicalWorkEntry[]> {
  return api.sendCommand("music/classical/works", {
    composer_id: composerId,
    limit: 0,
  });
}

/** A page of the library's works. */
export function getWorks(
  query: ClassicalWorkQuery = {},
): Promise<ClassicalWorkEntry[]> {
  return api.sendCommand("music/classical/works", { ...query });
}

/** The values the works list can be filtered on. */
export function getWorkFilters(): Promise<ClassicalWorkFilters> {
  return api.sendCommand("music/classical/work_filters");
}

/** One work, with its parts and arrangements filled in. */
export function getWork(id: string): Promise<Work> {
  return api.sendCommand("music/classical/work", { item_id: id });
}

/** A work's recordings in their canonical order. */
export function getWorkRecordings(workId: string): Promise<Recording[]> {
  return api.sendCommand("music/classical/recordings", { work_id: workId });
}

/** The recordings an artist performs on of a work, its parts included. */
export function getPerformerWorkRecordings(
  performerId: string,
  workId: string,
): Promise<Recording[]> {
  return api.sendCommand("music/classical/recordings", {
    performer_id: performerId,
    work_id: workId,
  });
}

/** A page of the artists with a performing role on a classical track. */
export function getPerformers(
  query: ClassicalPerformerQuery = {},
): Promise<ClassicalPerformer[]> {
  return api.sendCommand("music/classical/performers", { ...query });
}

/** The values the performers list can be filtered on. */
export function getPerformerFilters(): Promise<ClassicalPerformerFilters> {
  return api.sendCommand("music/classical/performer_filters");
}

/**
 * The works a performer appears on, with recording counts scoped to them.
 */
export function getPerformerWorks(
  performerId: string,
): Promise<ClassicalWorkEntry[]> {
  return api.sendCommand("music/classical/works", {
    performer_id: performerId,
    limit: 0,
  });
}

/**
 * Classical tracks credited to an artist that are not linked to any work.
 * With asComposer only composer credits count, otherwise only the others.
 */
export function getOtherTracks(
  artistId: string,
  asComposer: boolean,
  sort: ClassicalSort = {},
): Promise<Track[]> {
  return api.sendCommand("music/classical/other_tracks", {
    ...sort,
    artist_id: artistId,
    as_composer: asComposer,
    limit: 0,
  });
}
