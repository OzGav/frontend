import {
  RecordingCoverageKind,
  type ClassicalLinkProgress,
  type LifeSpan,
  type Period,
  type RecordingCoverage,
  type WorkMovement,
  type WorkType,
} from "@/plugins/api/interfaces";
import { $t, canonicalizeLocale, i18n } from "@/plugins/i18n";

/** The display name of a work type, e.g. Song cycle. */
export function workTypeLabel(type: WorkType): string {
  return $t(`classical_work_type.${type}`);
}

/** The display name of a composer's period, e.g. Baroque. */
export function periodLabel(period: Period): string {
  return $t(`classical_period.${period}`);
}

/** The name of a country in the user's language, e.g. Poland for PL. */
export function countryLabel(code: string): string {
  const historical = HISTORICAL_COUNTRIES[code];
  if (historical) return $t(historical);
  const locale = canonicalizeLocale(i18n.global.locale.value);
  if (regionNames?.locale !== locale)
    regionNames = {
      locale,
      names: new Intl.DisplayNames([locale], { type: "region" }),
    };
  return regionNames.names.of(code) ?? code;
}

/** A recording count with its noun, e.g. 3 recordings. */
export function recordingCountLabel(count: number): string {
  return $t("classical_n_recordings", count, { named: { count } });
}

/**
 * The note on what is still being linked with MusicBrainz, naming albums and
 * works, or else tracks and composers. Empty when nothing is left.
 */
export function linkProgressLabel(progress: ClassicalLinkProgress): string {
  const counted = (key: string, count: number) =>
    count > 0 ? [$t(key, count, { named: { count } })] : [];
  const main = [
    ...counted("classical_n_albums", progress.albums),
    ...counted("classical_n_works", progress.works),
  ];
  const items = main.length
    ? main
    : [
        ...counted("n_tracks", progress.recordings),
        ...counted("classical_n_composers", progress.composers),
      ];
  if (!items.length) return "";
  return $t("classical_link_progress", {
    items:
      items.length > 1
        ? $t("classical_two_items", { first: items[0], second: items[1] })
        : items[0],
  });
}

/** A work count with its noun, e.g. 12 works. */
export function workCountLabel(count: number): string {
  return $t("classical_n_works", count, { named: { count } });
}

/**
 * A life span as years, e.g. 1833–1897, or 1937– for someone living. Empty
 * without a birth year.
 */
export function lifeYearsLabel(lifeSpan?: LifeSpan | null): string {
  const born = lifeSpan?.begin?.slice(0, 4);
  if (!born) return "";
  return `${born}–${lifeSpan?.end?.slice(0, 4) ?? ""}`;
}

/**
 * What a recording holds, as its row names it: an act or other part it holds
 * whole as complete, e.g. Act I (Complete), some of a part's numbers after the
 * part's name, e.g. Act III (1 of 9), else a count such as 3 of 22. Empty for
 * the whole work.
 *
 * :param coverage: What the recording holds.
 * :param movements: The work's movements, to name the one it holds.
 */
export function movementCoverageLabel(
  coverage: RecordingCoverage | null | undefined,
  movements: WorkMovement[],
): string {
  if (!coverage) return "";
  if (coverage.kind === RecordingCoverageKind.MOVEMENTS)
    return heldCount(coverage.held, coverage.total);
  const name =
    movements.find((m) => m.number === coverage.movement)?.name ?? "";
  if (coverage.kind === RecordingCoverageKind.MOVEMENT)
    return $t("classical_movement_complete", { movement: name });
  return coverage.total
    ? $t("classical_movement_parts", {
        movement: name,
        parts: heldCount(coverage.held, coverage.total),
      })
    : name;
}

/**
 * A movement's short name, its quoted words after the score's number, e.g.
 * XXXIX. Erbarme dich, mein Gott, with an excerpt marked.
 */
export function shortMovementName(movement: WorkMovement): string {
  const name = movement.short_name ?? movement.name;
  return movement.excerpt ? $t("classical_movement_excerpt", { name }) : name;
}

/** Movement lists longer than this are folded. */
export const LONG_MOVEMENT_LIST = 8;

// held movements as a count of all, e.g. 3 of 22
function heldCount(count: number, total: number): string {
  return $t("classical_movements_of", { count, total });
}

// the region names of the locale last asked for, built once rather than per name
let regionNames: { locale: string; names: Intl.DisplayNames } | undefined;

// Former countries the browser names after a successor, e.g. Russia for SU.
const HISTORICAL_COUNTRIES: Partial<Record<string, string>> = {
  SU: "classical_country_soviet_union",
};
