import type {
  ItemMapping,
  Recording,
  Track,
  Work,
  WorkMovement,
} from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";

/** Recordings shown together under one heading of a work's page. */
export interface RecordingGroup {
  key: string;
  name: string;
  // the group's own work page, absent for the page's work
  link?: string;
  // named only where it differs from the work's composer
  composer?: string;
  // tells apart works sharing a title, e.g. 1888 version
  version?: string;
  recordings: Recording[];
}

/** A recording with its tracks of one movement or aria. */
export interface MovementRow {
  recording: Recording;
  tracks: Track[];
}

/** A chosen movement or aria with its tracks from each shown recording. */
export interface MovementGroup {
  key: string;
  name: string;
  rows: MovementRow[];
}

/**
 * Each movement number followed by those of the movements it sits under,
 * e.g. an aria's then its act's.
 *
 * :param movements: The work's movements.
 */
export function movementLineage(
  movements: WorkMovement[],
): Map<number, number[]> {
  const byNumber = new Map(movements.map((m) => [m.number, m]));
  const lineage = new Map<number, number[]>();
  for (const m of byNumber.values()) {
    const chain = [m.number];
    for (let p = m.parent; p != null; p = byNumber.get(p)?.parent)
      chain.push(p);
    lineage.set(m.number, chain);
  }
  return lineage;
}

/**
 * Each recording with its tracks of a movement; an act brings its arias'
 * tracks.
 *
 * :param recordings: The recordings to take the tracks from.
 * :param number: The movement's number.
 * :param lineageOf: A movement number with those of the movements above it.
 */
export function movementRows(
  recordings: Recording[],
  number: number,
  lineageOf: (number: number) => number[],
): MovementRow[] {
  return recordings
    .map((recording) => ({
      recording,
      tracks: recording.tracks.filter(
        (t) =>
          t.movement_number != null &&
          lineageOf(t.movement_number).includes(number),
      ),
    }))
    .filter((row) => row.tracks.length);
}

/**
 * The recordings by the work they are of: the page's own work first, then, on
 * a work with parts such as an opera, each part in the work's order.
 *
 * :param w: The page's work.
 * :param recordings: The recordings to group.
 * :param composerId: The work's composer, whom the groups leave unnamed.
 */
export function groupByPart(
  w: Work,
  recordings: Recording[],
  composerId?: string,
): RecordingGroup[] {
  const groups = new Map<
    string,
    { work: Work | ItemMapping; recordings: Recording[] }
  >();
  for (const part of [w, ...(w.parts ?? [])])
    groups.set(part.item_id, { work: part, recordings: [] });
  for (const r of recordings) {
    // a part of a listed part, e.g. an aria of an act, goes with that part
    const id =
      !groups.has(r.work.item_id) &&
      r.parent_work &&
      groups.has(r.parent_work.item_id)
        ? r.parent_work.item_id
        : r.work.item_id;
    // a part the work does not list still shows, last
    if (!groups.has(id)) groups.set(id, { work: r.work, recordings: [] });
    groups.get(id)!.recordings.push(r);
  }
  return [...groups.entries()]
    .filter(([, g]) => g.recordings.length)
    .map(([id, g]) => {
      const c = "composers" in g.work ? g.work.composers[0] : undefined;
      return {
        key: id,
        name: g.work.name,
        version: g.work.version,
        link: id === w.item_id ? undefined : `/classical/works/${id}`,
        composer: c && c.item_id !== composerId ? c.name : undefined,
        recordings: g.recordings,
      };
    });
}

/**
 * Each recording under the top-level movement it belongs to, e.g. an aria's
 * recording under its act, in movement order. Recordings of the whole work
 * come first and any that fit nowhere last.
 *
 * :param movements: The work's movements.
 * :param workId: The page's work.
 * :param recordings: The recordings to group.
 * :param lineageOf: A movement number with those of the movements above it.
 */
export function groupByMovement(
  movements: WorkMovement[],
  workId: string,
  recordings: Recording[],
  lineageOf: (number: number) => number[],
): RecordingGroup[] {
  const byWork = new Map(
    movements.filter((m) => m.work_id).map((m) => [m.work_id!, m.number]),
  );
  const byTop = new Map<number, Array<{ r: Recording; rank: number }>>();
  const complete: Recording[] = [];
  const other: Recording[] = [];
  for (const r of recordings) {
    const number =
      byWork.get(r.work.item_id) ??
      (r.parent_work && byWork.get(r.parent_work.item_id)) ??
      r.movement_numbers?.[0];
    if (number != null) {
      const top = lineageOf(number).at(-1)!;
      // the whole movement first, then by the first part held
      const rank = r.movement_numbers?.includes(top)
        ? 0
        : (r.movement_numbers?.find((n) => n !== top) ?? number);
      byTop.set(top, [...(byTop.get(top) ?? []), { r, rank }]);
    } else if (r.work.item_id === workId) complete.push(r);
    else other.push(r);
  }
  const year = (r: Recording) => r.year ?? Number.MAX_SAFE_INTEGER;
  const groups: RecordingGroup[] = [
    {
      key: "complete",
      name: $t("classical_complete_recordings"),
      recordings: complete,
    },
    ...movements
      .filter((m) => byTop.has(m.number))
      .map((m) => ({
        key: `movement-${m.number}`,
        name: m.name,
        link: m.work_id ? `/classical/works/${m.work_id}` : undefined,
        recordings: byTop
          .get(m.number)!
          .sort((a, b) => a.rank - b.rank || year(a.r) - year(b.r))
          .map((x) => x.r),
      })),
    {
      key: "other",
      name: $t("classical_other_recordings"),
      recordings: other,
    },
  ];
  return groups.filter((g) => g.recordings.length);
}
