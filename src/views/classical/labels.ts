import { normalizeForFilter } from "@/helpers/utils";
import type {
  ArtistRole,
  ClassicalLinkProgress,
  LifeSpan,
  Period,
  Recording,
  WorkMovement,
  WorkType,
} from "@/plugins/api/interfaces";
import { $t, canonicalizeLocale, i18n } from "@/plugins/i18n";

/** The display name of a classical credit role, e.g. Conductor. */
export function roleLabel(role: ArtistRole): string {
  return $t(`classical_artist_role.${role}`);
}

/**
 * A credit's instrument as shown after the performer's name, with a voice
 * named alone, e.g. tenor for "tenor vocals". Empty for plain vocals and when
 * the name already says it, e.g. string quartet for Brodsky Quartet.
 */
export function instrumentLabel(
  instrument: string | null | undefined,
  name: string,
): string {
  const label = (instrument ?? "").replace(/\s*\bvocals$/i, "").trim();
  const lastWord = words(label).at(-1);
  return lastWord && words(name).includes(lastWord) ? "" : label;
}

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
  return (
    new Intl.DisplayNames([canonicalizeLocale(i18n.global.locale.value)], {
      type: "region",
    }).of(code) ?? code
  );
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
        ...counted("classical_n_tracks", progress.recordings),
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
 * The movements a recording covers, e.g. Complete, I, I–II, Includes Aria or
 * 3 of 32. Under a heading naming the one movement it covers, its track count
 * instead, e.g. 6 tracks. Empty when they are unknown.
 *
 * :param recording: The recording, with the movement numbers it covers.
 * :param movements: The work's movements.
 * :param heading: The number of the movement the recording is listed under.
 */
export function movementCoverageLabel(
  recording: Recording,
  movements: WorkMovement[],
  heading?: number,
): string {
  if (recording.complete) return $t("classical_complete");
  const covered = new Set(recording.movement_numbers);
  // a part under a covered movement, e.g. an aria of a covered act, adds
  // nothing to it
  const numbers = [...covered].filter((n) => {
    const parent = movements.find((m) => m.number === n)?.parent;
    return parent == null || !covered.has(parent);
  });
  if (!numbers.length) return "";
  if (numbers.length === 1 && numbers[0] === heading)
    return $t("classical_n_tracks", recording.tracks.length, {
      named: { count: recording.tracks.length },
    });
  // the number the score gives a movement, as its name leads with it
  const ownNumber = (n: number) =>
    movements.find((m) => m.number === n)?.name.match(NUMBERED_NAME)?.[1];
  const topLevel = movements.filter((m) => m.parent == null);
  if (numbers.length > 1)
    return topLevel.every((m) => NUMBERED_NAME.test(m.name)) &&
      topLevel.length <= LONG_MOVEMENT_LIST
      ? numberRanges(numbers, (n) => ownNumber(n) ?? "")
      : $t("classical_movements_of", {
          count: numbers.length,
          total: topLevel.length,
        });
  const name = movements.find((m) => m.number === numbers[0])?.name;
  const label = (name && ownNumber(numbers[0])) ?? name;
  if (!label) return "";
  // tracks matched to no movement mean it holds more than the listed part
  const trackNumbers = recording.tracks.map((t) => t.movement_number);
  if (
    trackNumbers.some((n) => n == null) &&
    trackNumbers.some((n) => n != null)
  )
    return $t("classical_movement_includes", { movement: label });
  return label;
}

/**
 * A movement's name shortened to its quoted part when it has exactly one, e.g.
 * Che gelida manina! for no. 6. “Che gelida manina!” (Rodolfo).
 */
export function shortMovementName(name: string): string {
  const quoted = [...name.matchAll(QUOTED)];
  return quoted.length === 1
    ? quoted[0].slice(1).find((part) => part !== undefined)!
    : name;
}

/** Movement lists longer than this are summarised and folded. */
export const LONG_MOVEMENT_LIST = 8;

// a name led by its number, e.g. "II. Andante" or "2. Andante"
const NUMBERED_NAME = /^([IVXLCDM]+|\d+)\./;

// sorted movement numbers as runs of the numbers their names give, e.g.
// 1, 2, 3, 5 as I–III, V
function numberRanges(
  numbers: number[],
  ownNumber: (n: number) => string,
): string {
  const runs: Array<[number, number]> = [];
  for (const n of numbers) {
    const last = runs.at(-1);
    if (last && n === last[1] + 1) last[1] = n;
    else runs.push([n, n]);
  }
  return runs
    .map(([first, last]) =>
      first === last
        ? ownNumber(first)
        : `${ownNumber(first)}–${ownNumber(last)}`,
    )
    .join(", ");
}

// a quoted part of a name, e.g. “Che gelida manina!” or « Salut ! »
const QUOTED = /“([^”]+)”|«\s*([^»]+?)\s*»|"([^"]+)"/g;

// the words of a name, folded for comparing, e.g. ["brodsky", "quartet"]
function words(text: string): string[] {
  return normalizeForFilter(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}
