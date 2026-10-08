import { ArtistRole, type Credit } from "@/plugins/api/interfaces";

/** Performing roles, in the order credits are ranked for display. */
export const PERFORMER_ROLES: readonly ArtistRole[] = [
  ArtistRole.CONDUCTOR,
  ArtistRole.ENSEMBLE,
  ArtistRole.ORCHESTRA,
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
export function creditedArtists(
  credits: Credit[],
  roles: readonly ArtistRole[],
  withInstruments = false,
): CreditedArtist[] {
  const seen = new Set<string>();
  const artists: CreditedArtist[] = [];
  for (const c of credits) {
    if (!roles.includes(c.role)) continue;
    const instrument = (withInstruments && c.instrument) || undefined;
    const key = `${c.artist.item_id}|${instrument ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    artists.push({ id: c.artist.item_id, name: c.artist.name, instrument });
  }
  return artists;
}
