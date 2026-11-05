import {
  RecordingHeadingKind,
  type Recording,
  type RecordingHeading,
  type Track,
  type Work,
  type WorkMovement,
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
 * tracks. Recordings without such a track are left out.
 *
 * :param recordings: The recordings, as fetched for the work's page.
 * :param number: The movement's number.
 */
export function movementRows(
  recordings: Recording[],
  number: number,
): MovementRow[] {
  return recordings
    .map((recording) => ({
      recording,
      tracks: recording.tracks.filter((t) =>
        recording.track_movements?.[t.uri]?.includes(number),
      ),
    }))
    .filter((row) => row.tracks.length);
}

/**
 * The recordings under the headings of the work's page, in the page's order.
 * Recordings without a heading are left out.
 *
 * :param w: The page's work.
 * :param recordings: The recordings, as fetched for the work's page.
 * :param composerId: The work's composer, whom the groups leave unnamed.
 */
export function groupByHeading(
  w: Work,
  recordings: Recording[],
  composerId?: string,
): RecordingGroup[] {
  const groups = new Map<
    string,
    { heading: RecordingHeading; recordings: Recording[] }
  >();
  for (const r of recordings) {
    if (!r.heading) continue;
    const key = headingKey(r.heading);
    if (!groups.has(key))
      groups.set(key, { heading: r.heading, recordings: [] });
    groups.get(key)!.recordings.push(r);
  }
  const rank = (r: Recording) => r.heading?.rank ?? 0;
  return [...groups.entries()]
    .sort(([, a], [, b]) => a.heading.order - b.heading.order)
    .map(([key, g]) => ({
      key,
      ...headingTitle(w, g.heading, composerId),
      recordings: g.recordings.sort((a, b) => rank(a) - rank(b)),
    }));
}

// a heading's group key, unique on the page
function headingKey(heading: RecordingHeading): string {
  switch (heading.kind) {
    case RecordingHeadingKind.MOVEMENT:
      return `movement-${heading.movement}`;
    case RecordingHeadingKind.WORK:
      return heading.work?.item_id ?? "";
    default:
      return heading.kind;
  }
}

// what a heading shows: its name, and for a work its link, composer and version
function headingTitle(
  w: Work,
  heading: RecordingHeading,
  composerId?: string,
): Omit<RecordingGroup, "key" | "recordings"> {
  switch (heading.kind) {
    case RecordingHeadingKind.COMPLETE:
      return { name: $t("classical_complete_recordings") };
    case RecordingHeadingKind.OTHER:
      return { name: $t("classical_other_recordings") };
    case RecordingHeadingKind.MOVEMENT: {
      const m = w.movements?.find((x) => x.number === heading.movement);
      return {
        name: m?.name ?? "",
        link: m?.work_id ? `/classical/works/${m.work_id}` : undefined,
      };
    }
    case RecordingHeadingKind.WORK: {
      const id = heading.work?.item_id;
      // the heading's work has its full name and no composers, unlike the
      // page's work and its parts
      const shown =
        id === w.item_id
          ? w
          : (w.parts?.find((p) => p.item_id === id) ?? heading.work);
      const c = shown && "composers" in shown ? shown.composers[0] : undefined;
      return {
        name: shown?.name ?? "",
        version: shown?.version,
        link: id === w.item_id ? undefined : `/classical/works/${id}`,
        composer: c && c.item_id !== composerId ? c.name : undefined,
      };
    }
  }
}
