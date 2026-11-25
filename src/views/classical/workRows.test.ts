import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { Work, WorkMovement } from "@/plugins/api/interfaces";
import { work } from "../../../tests/fixtures/work";

const { storeMock, setUserPreferenceMock } = vi.hoisted(() => ({
  storeMock: {
    currentUser: null as { preferences?: Record<string, unknown> } | null,
  },
  setUserPreferenceMock: vi.fn(),
}));

vi.mock("@/plugins/store", () => ({ store: storeMock }));
vi.mock("@/composables/userPreferences", () => ({
  setUserPreference: setUserPreferenceMock,
}));

import {
  availableWorkRowIds,
  useWorkRows,
  workRows,
} from "@/views/classical/workRows";

const movement = { number: 1, name: "Allegro" } as WorkMovement;

describe("work rows", () => {
  beforeEach(() => {
    storeMock.currentUser = { preferences: {} };
    setUserPreferenceMock.mockReset();
  });

  it("offers only the rows the work has content for", () => {
    expect(availableWorkRowIds(work())).toEqual(["recordings"]);
    expect(
      availableWorkRowIds(
        work({
          metadata: { description: "A sonata" },
          movements: [movement],
          arrangements: [work({ item_id: "2" })],
        }),
      ),
    ).toEqual(["description", "movements", "recordings", "related_works"]);
  });

  it("counts a work it is arranged from as related", () => {
    expect(
      availableWorkRowIds(work({ arrangement_of: [work({ item_id: "2" })] })),
    ).toEqual(["recordings", "related_works"]);
  });

  it("shows the recordings while the work loads, then the user's order", () => {
    storeMock.currentUser = {
      preferences: {
        "classical_work.rows": {
          order: ["recordings", "movements"],
          hidden: ["description"],
        },
      },
    };
    const shown = ref<Work>();
    const { visibleRows } = useWorkRows(shown);

    expect(visibleRows.value).toEqual(["recordings"]);

    shown.value = work({
      metadata: { description: "A sonata" },
      movements: [movement],
    });
    expect(visibleRows.value).toEqual(["recordings", "movements"]);
  });

  it("keeps the work rows under their own preference", async () => {
    await workRows.setHidden("movements", true);

    expect(setUserPreferenceMock).toHaveBeenCalledWith(
      "classical_work.rows",
      expect.objectContaining({ hidden: ["movements"] }),
    );
  });
});
