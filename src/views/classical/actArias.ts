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

/** An entry of an act's own list, as an opera page offers it. */
export interface ActAria {
  // e.g. "1-13", the act's number on the opera then the aria's in the act
  key: string;
  act: number;
  number: number;
  name: string;
  mbid: string | null;
  // for a piece of a number, e.g. one dance of a set, that number
  parent: number | null;
}

/** A recording with its tracks of one aria. */
interface AriaRow {
  recording: Recording;
  tracks: Track[];
}

/**
 * The arias of an opera's acts, and each recording's tracks of them. A work
 * without acts has none.
 *
 * The arias are every entry of the acts' own lists of numbers, and which track
 * is which aria comes from the acts' own recordings, both fetched once the
 * opera is in.
 *
 * :param work: The opera.
 * :param shown: The recordings the page shows, which the counts and rows keep to.
 */
export function useActArias(
  work: Ref<Work | undefined>,
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

  // the act a recording is of: the one act it covers, else the act that is its
  // work or, for a recording of a scene, its parent work
  const actOf = (r: Recording) => {
    const acts = (r.movement_numbers ?? []).filter((n) =>
      actWorkIds.value.has(n),
    );
    if (acts.length === 1) return acts[0];
    return (
      actNumbers.value.get(r.work.item_id) ??
      (r.parent_work ? actNumbers.value.get(r.parent_work.item_id) : undefined)
    );
  };

  // each act's own list of numbers and recordings, by its number and work id
  const actMovements = ref(new Map<number, WorkMovement[]>());
  const actRecordings = ref(new Map<string, Recording[]>());
  let loadId = 0;
  watch(
    () => [...actNumbers.value.keys()],
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

  // every entry of every act, in each act's own order, a piece after its number
  const arias = computed<ActAria[]>(() =>
    [...actMovements.value]
      .sort(([a], [b]) => a - b)
      .flatMap(([act, movements]) =>
        movements.map((m) => ({
          key: `${act}-${m.number}`,
          act,
          number: m.number,
          name: shortMovementName(m.name),
          mbid: m.mbid,
          parent: m.parent ?? null,
        })),
      ),
  );

  // the act's own recordings of a track, by the track's id; a scene's
  // recording on the act's page counts as the act's
  const actRecordingsByTrack = computed(() => {
    const byTrack = new Map<
      string,
      Array<{ act: number; recording: Recording }>
    >();
    for (const [workId, recs] of actRecordings.value) {
      const act = actNumbers.value.get(workId)!;
      for (const recording of recs)
        for (const t of recording.tracks)
          byTrack.set(t.item_id, [
            ...(byTrack.get(t.item_id) ?? []),
            { act, recording },
          ]);
    }
    return byTrack;
  });

  /** The shown recordings holding an aria, each with its tracks of it. */
  const ariaRows = (aria: ActAria): AriaRow[] =>
    shown.value.flatMap((recording) => {
      // aria numbers restart in every act, and one recording may span acts
      // a group that is a work of its own comes as a recording of its own, so
      // the performance can be spread over several of the act's recordings
      const actRecordings = [
        ...new Set(
          recording.tracks
            .flatMap((t) => actRecordingsByTrack.value.get(t.item_id) ?? [])
            .filter((entry) => entry.act === aria.act)
            .map((entry) => entry.recording),
        ),
      ];
      if (!actRecordings.length) return [];
      const actTracks = actRecordings.flatMap((r) => r.tracks);
      // a piece plays only from a track of its own
      if (aria.parent != null) {
        const tracks = actTracks.filter(
          (t) => t.movement_number === aria.number,
        );
        return tracks.length ? [{ recording, tracks }] : [];
      }
      // a number plays its own tracks and those of its pieces
      const numbers = new Set([
        aria.number,
        ...(actMovements.value.get(aria.act) ?? [])
          .filter((m) => m.parent === aria.number)
          .map((m) => m.number),
      ]);
      // a track holding several numbers is numbered as only one of them, but
      // carries the MusicBrainz work id of each
      const tracks = actTracks.filter(
        (t) => t.movement_number != null && numbers.has(t.movement_number),
      );
      const holding = tracks.length
        ? tracks
        : actTracks.filter((t) => holdsWork(t, aria.mbid));
      if (holding.length) return [{ recording, tracks: holding }];
      // where the aria is cannot be told, so the act's main recording plays
      const main =
        actRecordings.find(
          (r) => r.work.item_id === actWorkIds.value.get(aria.act),
        ) ?? actRecordings[0];
      return main.movement_numbers?.includes(aria.number)
        ? [{ recording, tracks: main.tracks }]
        : [];
    });

  // how many shown recordings hold each aria, by its key
  const ariaCounts = computed(() =>
    Object.fromEntries(arias.value.map((a) => [a.key, ariaRows(a).length])),
  );

  /** The own numbers of the act a recording is of, once fetched. */
  const actMovementsOf = (recording: Recording) => {
    const act = actOf(recording);
    return act != null ? actMovements.value.get(act) : undefined;
  };

  return { arias, ariaCounts, ariaRows, actMovementsOf };
}

function holdsWork(track: Track, mbid: string | null): boolean {
  return (
    mbid != null &&
    track.external_ids.some(
      ([type, id]) => type === ExternalID.MB_WORK && id === mbid,
    )
  );
}
