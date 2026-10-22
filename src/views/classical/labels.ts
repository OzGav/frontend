import { normalizeForFilter } from "@/helpers/utils";
import type {
  ArtistRole,
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

/** A number as a Roman numeral, e.g. IV for 4. */
export function romanNumeral(n: number): string {
  const numerals: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  for (const [value, numeral] of numerals)
    for (; n >= value; n -= value) out += numeral;
  return out;
}

/**
 * The movements a recording covers, e.g. Complete, I, I–II, Act I: Aria,
 * Includes Aria or 3 of 32. Empty when they are unknown.
 *
 * :param recording: The recording, with the movement numbers it covers.
 * :param movements: The work's movements.
 */
export function movementCoverageLabel(
  recording: Recording,
  movements: WorkMovement[],
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
  const topLevel = movements.filter((m) => m.parent == null);
  if (numbers.length > 1)
    return topLevel.every((m) => NUMBERED_NAME.test(m.name)) &&
      topLevel.length <= LONG_MOVEMENT_LIST
      ? romanRanges(numbers)
      : $t("classical_movements_of", {
          count: numbers.length,
          total: topLevel.length,
        });
  const name = movements.find((m) => m.number === numbers[0])?.name;
  const label =
    name && !NUMBERED_NAME.test(name) ? name : romanNumeral(numbers[0]);
  if (recording.part_movements?.length)
    return $t("classical_movement_parts", {
      movement: label,
      parts: recording.part_movements
        .map((m) => shortMovementName(m.name))
        .join(", "),
    });
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

// sorted numbers as Roman numeral runs, e.g. 1, 2, 3, 5 as I–III, V
function romanRanges(numbers: number[]): string {
  const runs: Array<[number, number]> = [];
  for (const n of numbers) {
    const last = runs.at(-1);
    if (last && n === last[1] + 1) last[1] = n;
    else runs.push([n, n]);
  }
  return runs
    .map(([first, last]) =>
      first === last
        ? romanNumeral(first)
        : `${romanNumeral(first)}–${romanNumeral(last)}`,
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
