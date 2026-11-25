import {
  createRowRegistry,
  type RowDefinition,
} from "@/components/details/rowRegistry";
import type { Work } from "@/plugins/api/interfaces";
import { useClassicalRows } from "@/views/classical/detailRows";
import type { Ref } from "vue";

export type WorkRowId =
  "description" | "movements" | "recordings" | "related_works";

export const WORK_ROWS: readonly RowDefinition<WorkRowId>[] = [
  { id: "description", labelKey: "description" },
  { id: "movements", labelKey: "classical_movements" },
  { id: "recordings", labelKey: "recordings" },
  { id: "related_works", labelKey: "related_works" },
];

export const WORK_ROWS_PREFERENCE_KEY = "classical_work.rows";

/** Rows the work page can show for this work. */
export function availableWorkRowIds(work: Work): WorkRowId[] {
  const related = !!(work.arrangement_of?.length || work.arrangements?.length);
  return [
    ...(work.metadata.description ? (["description"] as const) : []),
    ...(work.movements?.length ? (["movements"] as const) : []),
    "recordings",
    ...(related ? (["related_works"] as const) : []),
  ];
}

/** The work page's rows and the user's customization of them. */
export const workRows = createRowRegistry<WorkRowId, Work>({
  rows: WORK_ROWS,
  preferenceKey: WORK_ROWS_PREFERENCE_KEY,
});

/**
 * The rows of the work page to show, in the user's order, with the open state
 * of its rows editor.
 */
export function useWorkRows(work: Ref<Work | undefined>) {
  // the recordings show while the work loads
  return useClassicalRows(work, workRows, availableWorkRowIds, ["recordings"]);
}
