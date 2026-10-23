import {
  ExternalID,
  type Recording,
  type Track,
  type Work,
  type WorkMovement,
} from "@/plugins/api/interfaces";
import { getWork, getWorkRecordings } from "@/services/classical";
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
 * The arias come from the acts' own lists of numbers, and which track is which
 * aria from the acts' own recordings, both fetched once the opera's
 * recordings are in.
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

  // the act's work id by its number on the opera
  const actWorkIds = computed(
    () => new Map([...actNumbers.value].map(([id, act]) => [act, id])),
  );

  // the numbers the recordings hold of each act they hold part of, by act
  // number; null for an act a recording holds whole
  const heldNumbers = computed(() => {
    const held = new Map<number, Set<number> | null>();
    for (const r of recordings.value) {
      if (r.part_movements?.length) {
        const act = actNumbers.value.get(r.work.item_id);
        const numbers = act != null ? held.get(act) : null;
        if (act == null || numbers === null) continue;
        held.set(
          act,
          new Set([
            ...(numbers ?? []),
            ...r.part_movements.map((m) => m.number),
          ]),
        );
      } else {
        for (const n of r.movement_numbers ?? [])
          if (actWorkIds.value.has(n)) held.set(n, null);
      }
    }
    return held;
  });

  // each act's own list of numbers and recordings, by its number and work id
  const actMovements = ref(new Map<number, WorkMovement[]>());
  const actRecordings = ref(new Map<string, Recording[]>());
  let loadId = 0;
  watch(
    () =>
      [...heldNumbers.value.keys()].map((act) => actWorkIds.value.get(act)!),
    async (workIds) => {
      const id = ++loadId;
      actMovements.value = new Map();
      actRecordings.value = new Map();
      const movements = await Promise.all(
        workIds.map((workId) =>
          getWork(workId)
            .then((w) => w.movements ?? [])
            .catch(() => []),
        ),
      );
      // only acts with numbers of their own have arias to play, so a
      // symphony's movements need no recordings
      const withNumbers = workIds.filter((_, i) => movements[i].length);
      const ownRecordings = await Promise.all(
        withNumbers.map((workId) => getWorkRecordings(workId).catch(() => [])),
      );
      // a newer opera has taken over the page
      if (id !== loadId) return;
      actMovements.value = new Map(
        workIds.map((workId, i) => [
          actNumbers.value.get(workId)!,
          movements[i],
        ]),
      );
      actRecordings.value = new Map(
        withNumbers.map((workId, i) => [workId, ownRecordings[i]]),
      );
    },
  );

  const arias = computed<ActAria[]>(() =>
    [...heldNumbers.value]
      .flatMap(([act, numbers]) =>
        (actMovements.value.get(act) ?? [])
          .filter((m) => numbers === null || numbers.has(m.number))
          .map((m) => ({
            key: `${act}-${m.number}`,
            act,
            number: m.number,
            name: shortMovementName(m.name),
            mbid: m.mbid,
          })),
      )
      .sort((a, b) => a.act - b.act || a.number - b.number),
  );

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
