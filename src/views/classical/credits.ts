import {
  ArtistRole,
  type Credit,
  type Recording,
} from "@/plugins/api/interfaces";
import { instrumentLabel } from "@/views/classical/labels";

/** Performing roles, in the order credits are ranked for display. */
export const PERFORMER_ROLES: readonly ArtistRole[] = [
  ArtistRole.CONDUCTOR,
  ArtistRole.ORCHESTRA,
  ArtistRole.ENSEMBLE,
  ArtistRole.CHOIR,
  ArtistRole.SOLOIST,
  ArtistRole.PERFORMER,
];

export interface CreditedArtist {
  id: string;
  name: string;
  instrument?: string;
}

/**
 * The artists credited with any of the given roles, in credit order and
 * without repeats. With instruments, each credit's instrument is kept, so an
 * artist playing two instruments appears once per instrument.
 */
function creditedArtists(
  credits: Credit[],
  roles: readonly ArtistRole[],
  withInstruments = false,
): CreditedArtist[] {
  const seen = new Set<string>();
  const artists: CreditedArtist[] = [];
  for (const c of credits) {
    if (!roles.includes(c.role)) continue;
    const instrument =
      (withInstruments && instrumentLabel(c.instrument, c.artist.name)) ||
      undefined;
    const key = `${c.artist.item_id}|${instrument ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    artists.push({ id: c.artist.item_id, name: c.artist.name, instrument });
  }
  return artists;
}

/**
 * A recording's credits as its header shows them: conductors and orchestras
 * lead, then ensembles, choirs, soloists and other performers. Without a
 * conductor or orchestra those performers lead instead, each with their
 * instrument.
 */
export function recordingCredits(recording: Recording) {
  const { credits } = recording;
  const conductors = creditedArtists(credits, [ArtistRole.CONDUCTOR]);
  const orchestras = creditedArtists(credits, [ArtistRole.ORCHESTRA]);
  const performers = creditedArtists(credits, NON_CONDUCTING_ROLES);
  const leadPerformers =
    conductors.length || orchestras.length
      ? []
      : creditedArtists(credits, NON_CONDUCTING_ROLES, true);
  return { conductors, orchestras, performers, leadPerformers };
}

/** The names leading a recording's header, or its work's name without any. */
export function recordingName(recording: Recording): string {
  const { conductors, orchestras, leadPerformers } =
    recordingCredits(recording);
  return (
    [...conductors, ...orchestras, ...leadPerformers]
      .map((a) => a.name)
      .join(", ") || recording.work.name
  );
}

/**
 * The names of everyone performing on some recordings besides one artist,
 * without repeats: orchestras and ensembles, conductors, soloists, choirs,
 * then other performers.
 *
 * :param recordings: The recordings, e.g. a performer's of one work.
 * :param artistId: The artist to leave out.
 */
export function coPerformerNames(
  recordings: Recording[],
  artistId: string,
): string[] {
  const credits = recordings
    .flatMap((r) => r.credits)
    .filter((c) => c.artist.item_id !== artistId && c.role in CO_PERFORMER_RANK)
    .sort(
      (a, b) =>
        CO_PERFORMER_RANK[a.role]! - CO_PERFORMER_RANK[b.role]! ||
        a.position - b.position,
    );
  return [
    ...new Map(credits.map((c) => [c.artist.item_id, c.artist.name])).values(),
  ];
}

// the performing roles besides conductor and orchestra
const NON_CONDUCTING_ROLES = PERFORMER_ROLES.filter(
  (role) => role !== ArtistRole.CONDUCTOR && role !== ArtistRole.ORCHESTRA,
);

// the order co-performers are named in
const CO_PERFORMER_RANK: Partial<Record<ArtistRole, number>> = {
  [ArtistRole.ORCHESTRA]: 0,
  [ArtistRole.ENSEMBLE]: 0,
  [ArtistRole.CONDUCTOR]: 1,
  [ArtistRole.SOLOIST]: 2,
  [ArtistRole.CHOIR]: 3,
  [ArtistRole.PERFORMER]: 4,
};
