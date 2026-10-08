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

/**
 * Names of the artists credited with any of the given roles, in credit order
 * and without repeats.
 */
export function creditNames(
  credits: Credit[],
  roles: readonly ArtistRole[],
): string[] {
  const names = credits
    .filter((c) => roles.includes(c.role))
    .map((c) => c.artist.name);
  return Array.from(new Set(names));
}
