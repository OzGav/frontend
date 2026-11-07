import { ArtistRole, type Credit } from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";

/** Performing roles, in the order credits are ranked for display. */
export const PERFORMER_ROLES: readonly ArtistRole[] = [
  ArtistRole.CONDUCTOR,
  ArtistRole.ORCHESTRA,
  ArtistRole.ENSEMBLE,
  ArtistRole.CHOIR,
  ArtistRole.SOLOIST,
  ArtistRole.PERFORMER,
];

/** The first artist credited as composer, if any. */
export function creditedComposer(credits: Credit[]) {
  return credits.find((c) => c.role === ArtistRole.COMPOSER)?.artist;
}

/** The display name of a classical credit role, e.g. Conductor. */
export function roleLabel(role: ArtistRole): string {
  return $t(`classical_artist_role.${role}`);
}
