import { normalizeForFilter } from "@/helpers/utils";
import {
  ExternalID,
  type ArtistRole,
  type ClassicalLinkProgress,
  type LifeSpan,
  type Period,
  type Recording,
  type Track,
  type WorkMovement,
  type WorkType,
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
 * What a recording holds, as its row names it: an act or other part it holds
 * whole as complete, e.g. Act I (Complete), nothing for the whole work, else a
 * count such as 3 of 22.
 * A recording of some of an act's numbers names the act first, e.g. Act III
 * (1 of 9).
 *
 * :param recording: The recording, with the movements it covers.
 * :param movements: The work's movements.
 * :param actMovements: The entries listed under the act, for a recording of
 *   some of its numbers.
 */
export function movementCoverageLabel(
  recording: Recording,
  movements: WorkMovement[],
  actMovements: WorkMovement[] = [],
): string {
  if (recording.complete) return "";
  const covered = new Set(recording.movement_numbers);
  // a part under a covered movement, e.g. an aria of a covered act, adds
  // nothing to it
  const numbers = [...covered].filter((n) => {
    const parent = movements.find((m) => m.number === n)?.parent;
    return parent == null || !covered.has(parent);
  });
  if (!numbers.length) return "";
  const single =
    numbers.length === 1
      ? movements.find((m) => m.number === numbers[0])
      : undefined;
  const parts = recording.part_movements ?? [];
  if (single && parts.length) {
    // a number's pieces are not numbers of the act
    const total = actMovements.filter((m) => m.parent === single.number).length;
    return total
      ? $t("classical_movement_parts", {
          movement: single.name,
          parts: heldCount(parts.length, total),
        })
      : single.name;
  }
  if (single?.work_id)
    return $t("classical_movement_complete", { movement: single.name });
  return heldCount(
    numbers.length,
    movements.filter((m) => m.parent == null).length,
  );
}

/**
 * A track's name in a recording's track list: its movement name, else its own
 * title without the work's name in front, else the names of the movements its
 * MusicBrainz work ids point to. Never just the name of its work or act.
 *
 * :param track: The track.
 * :param workNames: The names of the work and act it is of, e.g. Act I.
 * :param movements: The movements it may hold, e.g. its act's numbers.
 */
export function trackLabel(
  track: Track,
  workNames: string[],
  movements: WorkMovement[] = [],
): string {
  const folded = workNames.map((w) => w.toLowerCase());
  const isWorkName = (text: string) => folded.includes(text.toLowerCase());
  if (track.movement_name && !isWorkName(track.movement_name))
    return track.movement_name;
  const prefix = workNames.find((w) =>
    track.name.toLowerCase().startsWith(w.toLowerCase()),
  );
  const title = (prefix ? track.name.slice(prefix.length) : track.name)
    .replace(/^[\s:,.–—-]+/, "")
    .trim();
  if (title && !isWorkName(title)) return title;
  const held = movements
    .filter(
      (m) =>
        m.mbid &&
        track.external_ids.some(
          ([type, id]) => type === ExternalID.MB_WORK && id === m.mbid,
        ),
    )
    .map((m) => m.name);
  return held.join(", ") || track.name;
}

/**
 * A movement's name shortened to its quoted parts, keeping the score's number
 * in front and an excerpt marked, e.g. XXXIX. Erbarme dich, mein Gott for
 * XXXIX. Aria (Alto) "Erbarme dich, mein Gott", or LX. Sehet, Jesus hat die
 * Hand – Wohin? for a name quoting two. A name without quotes stays whole.
 */
export function shortMovementName(name: string): string {
  const quoted = [...name.matchAll(QUOTED)];
  if (!quoted.length) return name;
  const words = quoted
    .map((q) => q.slice(1).find((part) => part !== undefined)!)
    .join(" – ");
  const number = name.match(SCORE_NUMBER)?.[1] ?? name.match(SCENE)?.[1];
  const short = number ? `${number}. ${words}` : words;
  return EXCERPT.test(name) ? `${short} (excerpt)` : short;
}

/** Movement lists longer than this are folded. */
export const LONG_MOVEMENT_LIST = 8;

// held movements as a count of all, e.g. 3 of 22
function heldCount(count: number, total: number): string {
  return $t("classical_movements_of", { count, total });
}

// the score's number leading a name, e.g. XXXIX., IVa., 36a. or no. 6:; the
// "." or ":" keeps a word such as Il from passing for one
const SCORE_NUMBER =
  /^((?:[IVXLCDM]+|\d+)[a-z]?|(?:no\.|No\.|Nr\.|N°)\s*\d+[a-z]?)[.:]/;

// a scene leading a name, e.g. Scene V. or Scene I before its quoted words
const SCENE = /^((?:Scene|Scène|Szene|Scena|Bild)\s+(?:[IVXLCDM]+|\d+))[.:\s]/;

// a name marked as an excerpt at its end
const EXCERPT = /\s\(excerpt\)$/i;

// a quoted part of a name, e.g. “Che gelida manina!” or « Salut ! »
const QUOTED = /“([^”]+)”|«\s*([^»]+?)\s*»|"([^"]+)"/g;

// the words of a name, folded for comparing, e.g. ["brodsky", "quartet"]
function words(text: string): string[] {
  return normalizeForFilter(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}
