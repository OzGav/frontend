import type {
  ArtistRole,
  LifeSpan,
  Period,
  WorkMovement,
  WorkType,
} from "@/plugins/api/interfaces";
import { $t, canonicalizeLocale, i18n } from "@/plugins/i18n";

/** The display name of a classical credit role, e.g. Conductor. */
export function roleLabel(role: ArtistRole): string {
  return $t(`classical_artist_role.${role}`);
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
 * The movements a recording covers, e.g. Complete, I only, I–II, I, III,
 * Aria only or 3 of 32. Empty when they are unknown.
 *
 * :param numbers: The covered movement numbers, sorted.
 * :param complete: Whether every movement is covered; null to name the
 *   movements without saying whether that is all of them.
 * :param movements: The work's movements.
 */
export function movementCoverageLabel(
  numbers: number[],
  complete: boolean | null,
  movements: WorkMovement[],
): string {
  if (complete) return $t("classical_complete");
  if (!numbers.length) return "";
  const numbered = movements.every((m) => NUMBERED_NAME.test(m.name));
  let label: string;
  if (numbers.length === 1)
    label =
      (!numbered && movements.find((m) => m.number === numbers[0])?.name) ||
      romanNumeral(numbers[0]);
  else if (!numbered || movements.length > LONG_MOVEMENT_LIST)
    return $t("classical_movements_of", {
      count: numbers.length,
      total: movements.length,
    });
  else label = romanRanges(numbers);
  return complete === false && numbers.length === 1
    ? $t("classical_movement_only", { movement: label })
    : label;
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
