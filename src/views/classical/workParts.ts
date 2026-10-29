import type { Recording, Work, WorkMovement } from "@/plugins/api/interfaces";
import {
  movementLineage,
  movementRows,
} from "@/views/classical/recordingGroups";
import { computed, type Ref } from "vue";

/**
 * The movements of a work's page split into the work's own and the entries it
 * lists under its parts, such as the arias under an opera's acts.
 *
 * :param work: The page's work.
 * :param shown: The recordings the page shows, which the rows keep to.
 */
export function useWorkParts(
  work: Ref<Work | undefined>,
  shown: Ref<Recording[]>,
) {
  const movements = computed(() => work.value?.movements ?? []);

  const lineage = computed(() => movementLineage(movements.value));

  /** A movement number followed by those of the movements above it. */
  const lineageOf = (n: number) => lineage.value.get(n) ?? [n];

  // the part a movement sits under at the top, e.g. an aria's act
  const topOf = (n: number) => lineageOf(n).at(-1)!;

  // the top-level movements that are works of their own, e.g. acts, by work id
  const partNumbers = computed(
    () =>
      new Map(
        movements.value
          .filter((m) => m.parent == null && m.work_id)
          .map((m) => [m.work_id!, m.number]),
      ),
  );

  // everything listed under a part, e.g. an act's arias
  const underParts = computed(() => {
    const parts = new Set(partNumbers.value.values());
    return movements.value.filter(
      (m) => m.parent != null && parts.has(topOf(m.number)),
    );
  });

  /**
   * The numbers of everything listed under a part, e.g. an act's arias. On a
   * part's own page, e.g. an act's, they stay its movements.
   */
  const partEntries = computed(
    () =>
      new Set(
        work.value?.parent_work ? [] : underParts.value.map((m) => m.number),
      ),
  );

  /** The work's own movements, without the entries listed under its parts. */
  const ownMovements = computed(() =>
    movements.value.filter((m) => !partEntries.value.has(m.number)),
  );

  /**
   * Each shown recording with its tracks of a movement. A number of a part,
   * unlike a piece of one, also finds the tracks carrying its MusicBrainz work
   * id, as a track holding several numbers is numbered as only one of them.
   */
  const rowsOf = (m: WorkMovement) =>
    movementRows(
      shown.value,
      m.number,
      lineageOf,
      partEntries.value.has(m.number) && !partEntries.value.has(m.parent!)
        ? m.mbid
        : null,
    );

  // the part a recording is of: the one part it covers, else the part that is
  // its work or, for a recording of a scene, its parent work
  const partOf = (r: Recording) => {
    const parts = new Set(partNumbers.value.values());
    const covered = (r.movement_numbers ?? []).filter((n) => parts.has(n));
    if (covered.length === 1) return covered[0];
    return (
      partNumbers.value.get(r.work.item_id) ??
      (r.parent_work ? partNumbers.value.get(r.parent_work.item_id) : undefined)
    );
  };

  /** The entries listed under the part a recording is of. */
  const partEntriesOf = (r: Recording): WorkMovement[] => {
    const part = partOf(r);
    if (part == null) return [];
    return underParts.value.filter((m) => topOf(m.number) === part);
  };

  return { lineageOf, partEntries, ownMovements, rowsOf, partEntriesOf };
}
