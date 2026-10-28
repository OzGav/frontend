// Service layer for the Classical view, over the server's classical commands.
// Lists are fetched whole in the server's sort order; the views filter them
// client-side.

import api from "@/plugins/api";
import type {
  Artist,
  ClassicalComposer,
  ClassicalLinkProgress,
  ClassicalPerformer,
  ClassicalWorkEntry,
  Recording,
  SortDirection,
  SortField,
  Track,
  Work,
} from "@/plugins/api/interfaces";

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

/** The sort a classical list is fetched in; left out, the server default. */
export interface ClassicalSort {
  sort_field?: SortField;
  sort_direction?: SortDirection;
}

/** Whether the library holds any classical tracks the user can see. */
export function hasClassicalContent(): Promise<boolean> {
  return api.sendCommand("music/has_classical_content");
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

export function getComposers(
  sort: ClassicalSort = {},
): Promise<ClassicalComposer[]> {
  return api.sendCommand("music/classical/composers", { ...sort, limit: 0 });
}

/** A library artist's Classical composer row, absent when they hold no works. */
export async function getComposer(
  artistId: string,
): Promise<ClassicalComposer | undefined> {
  const rows = await api.sendCommand<ClassicalComposer[]>(
    "music/classical/composers",
    { artist_id: artistId, limit: 1 },
  );
  return rows[0];
}

export function getComposerWorks(
  composerId: string,
): Promise<ClassicalWorkEntry[]> {
  return api.sendCommand("music/classical/works", {
    composer_id: composerId,
    limit: 0,
  });
}

export function getWorks(
  sort: ClassicalSort = {},
): Promise<ClassicalWorkEntry[]> {
  return api.sendCommand("music/classical/works", { ...sort, limit: 0 });
}

export function getWork(id: string): Promise<Work> {
  return api.sendCommand("music/classical/work", { item_id: id });
}

/** A work's recordings in their canonical order. */
export function getWorkRecordings(workId: string): Promise<Recording[]> {
  return api.sendCommand("music/classical/recordings", { work_id: workId });
}

/**
 * Every recording an artist performs on, per work in the order of the works
 * listing.
 */
export function getPerformerRecordings(
  performerId: string,
): Promise<Recording[]> {
  return api.sendCommand("music/classical/recordings", {
    performer_id: performerId,
  });
}

/** Artists with a performing role on a classical track. */
export function getPerformers(
  sort: ClassicalSort = {},
): Promise<ClassicalPerformer[]> {
  return api.sendCommand("music/classical/performers", { ...sort, limit: 0 });
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
