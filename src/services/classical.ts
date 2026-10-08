// Service layer for the Classical view, over the server's classical commands.
// Lists are fetched whole; the views filter and sort them client-side.

import api from "@/plugins/api";
import type {
  Artist,
  ArtistRole,
  ClassicalComposer,
  ClassicalPerformer,
  ClassicalWorkEntry,
  Recording,
  Track,
  Work,
} from "@/plugins/api/interfaces";

/**
 * Whether the library holds any classical tracks the user can see. False
 * when the server does not offer the classical commands.
 */
export function hasClassicalContent(): Promise<boolean> {
  return api
    .sendCommand<boolean>("music/has_classical_content", undefined, {
      suppressGlobalError: true,
    })
    .catch(() => false);
}

/**
 * A composer's or performer's full library artist, for a detail page header.
 */
export function getClassicalArtist(id: string): Promise<Artist> {
  return api.getArtist(id, "library");
}

export function getComposers(): Promise<ClassicalComposer[]> {
  return api.sendCommand("music/classical/composers", { limit: 0 });
}

export function getComposerWorks(
  composerId: string,
): Promise<ClassicalWorkEntry[]> {
  return api.sendCommand("music/classical/works", {
    composer_id: composerId,
    limit: 0,
  });
}

export function getWorks(): Promise<ClassicalWorkEntry[]> {
  return api.sendCommand("music/classical/works", { limit: 0 });
}

export function getWork(id: string): Promise<Work> {
  return api.sendCommand("music/works/get", {
    item_id: id,
    provider_instance_id_or_domain: "library",
  });
}

/**
 * A work's recordings in their canonical order, optionally narrowed to those
 * an artist performs on.
 */
export function getWorkRecordings(
  workId: string,
  performerId?: string,
): Promise<Recording[]> {
  return api.sendCommand("music/classical/recordings", {
    work_id: workId,
    performer_id: performerId,
  });
}

/**
 * Artists with a performing role on a classical track. With a role given,
 * only those holding that role among their roles.
 */
export function getPerformers(
  role?: ArtistRole,
): Promise<ClassicalPerformer[]> {
  return api.sendCommand("music/classical/performers", { role, limit: 0 });
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
): Promise<Track[]> {
  return api.sendCommand("music/classical/other_tracks", {
    artist_id: artistId,
    as_composer: asComposer,
    limit: 0,
  });
}
