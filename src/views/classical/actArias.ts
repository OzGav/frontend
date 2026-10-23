import {
  ExternalID,
  type Recording,
  type Track,
  type Work,
} from "@/plugins/api/interfaces";
import { getWorkRecordings } from "@/services/classical";
import { shortMovementName } from "@/views/classical/labels";
import { computed, ref, watch, type Ref } from "vue";

/** An aria some recordings of an act hold, as an opera page offers it. */
export interface ActAria {
  // e.g. "1-13", the act's number on the opera then the aria's in the act
  key: string;
  act: number;
  number: number;
  name: string;
  mbid: string | null;
}

/** A recording with its tracks of one aria. */
export interface AriaRow {
  recording: Recording;
  tracks: Track[];
}

/**
 * The arias of an opera's acts that its recordings hold, and each recording's
 * tracks of them. A work without acts has none.
 *
 * Which track is which aria comes from the acts' own recordings, fetched once
 * the opera's recordings are in.
 *
 * :param work: The opera.
 * :param recordings: All recordings of the opera.
 * :param shown: The recordings the page shows, which the counts and rows keep to.
 */
export function useActArias(
  work: Ref<Work | undefined>,
  recordings: Ref<Recording[]>,
  shown: Ref<Recording[]>,
) {
  // the act's number on the opera by the act's work id
  const actNumbers = computed(
    () =>
      new Map(
        (work.value?.movements ?? [])
          .filter((m) => m.work_id)
          .map((m) => [m.work_id!, m.number]),
      ),
  );

  const arias = computed<ActAria[]>(() => {
    const byKey = new Map<string, ActAria>();
    for (const r of recordings.value) {
      const act = actNumbers.value.get(r.work.item_id);
      if (act == null) continue;
      for (const m of r.part_movements ?? []) {
        const key = `${act}-${m.number}`;
        if (!byKey.has(key))
          byKey.set(key, {
            key,
            act,
            number: m.number,
            name: shortMovementName(m.name),
            mbid: m.mbid,
          });
      }
    }
    return [...byKey.values()].sort(
      (a, b) => a.act - b.act || a.number - b.number,
    );
  });

  // each act's own recordings, by the act's work id
  const actRecordings = ref(new Map<string, Recording[]>());
  let loadId = 0;
  watch(arias, async (list) => {
    const id = ++loadId;
    actRecordings.value = new Map();
    const actIds = [...actNumbers.value]
      .filter(([, act]) => list.some((a) => a.act === act))
      .map(([workId]) => workId);
    const entries = await Promise.all(
      actIds.map(async (workId) => {
        const recs = await getWorkRecordings(workId).catch(() => []);
        return [workId, recs] as const;
      }),
    );
    // a newer opera has taken over the page
    if (id === loadId) actRecordings.value = new Map(entries);
  });

  // the act's own recording of a track, by the track's id
  const actRecordingByTrack = computed(() => {
    const byTrack = new Map<string, Recording>();
    for (const recs of actRecordings.value.values())
      for (const r of recs) for (const t of r.tracks) byTrack.set(t.item_id, r);
    return byTrack;
  });

  /** The shown recordings holding an aria, each with its tracks of it. */
  const ariaRows = (aria: ActAria): AriaRow[] =>
    shown.value.flatMap((recording) => {
      // aria numbers restart in every act, and one recording may span acts
      const actRecording = recording.tracks
        .map((t) => actRecordingByTrack.value.get(t.item_id))
        .find((r) => r && actNumbers.value.get(r.work.item_id) === aria.act);
      if (!actRecording) return [];
      // a track holding several numbers is numbered as only one of them, but
      // carries the MusicBrainz work id of each
      const tracks = actRecording.tracks.filter(
        (t) => t.movement_number === aria.number,
      );
      const holding = tracks.length
        ? tracks
        : actRecording.tracks.filter((t) => holdsWork(t, aria.mbid));
      if (holding.length) return [{ recording, tracks: holding }];
      // where the aria is cannot be told, so the whole recording plays
      return actRecording.movement_numbers?.includes(aria.number)
        ? [{ recording, tracks: actRecording.tracks }]
        : [];
    });

  // how many shown recordings hold each aria, by its key
  const ariaCounts = computed(() =>
    Object.fromEntries(arias.value.map((a) => [a.key, ariaRows(a).length])),
  );

  return { arias, ariaCounts, ariaRows };
}

function holdsWork(track: Track, mbid: string | null): boolean {
  return (
    mbid != null &&
    track.external_ids.some(
      ([type, id]) => type === ExternalID.MB_WORK && id === mbid,
    )
  );
}
