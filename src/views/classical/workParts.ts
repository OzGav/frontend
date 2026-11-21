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

  /**
   * The numbers of everything listed under a part, e.g. an act's arias. On a
   * part's own page, e.g. an act's, they stay its movements.
   */
  const partEntries = computed(
    () =>
      new Set(movements.value.filter((m) => m.under_part).map((m) => m.number)),
  );

  /** The work's own movements, without the entries listed under its parts. */
  const ownMovements = computed(() =>
    movements.value.filter((m) => !m.under_part),
  );

  /** Each shown recording with its tracks of a movement. */
  const rowsOf = (m: WorkMovement) => movementRows(shown.value, m.number);

  return { lineageOf, partEntries, ownMovements, rowsOf };
}
